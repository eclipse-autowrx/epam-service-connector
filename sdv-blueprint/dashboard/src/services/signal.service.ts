// Copyright (c) 2026 Eclipse Foundation.
// SPDX-License-Identifier: MIT

import { io as ioClient } from 'socket.io-client'
import type { VSSPath, SignalUpdate } from '../types'

type SignalCallback = (path: VSSPath, value: number | null, ts: number) => void
type StatusCallback = (connected: boolean) => void
type LogCallback = (msg: string) => void

export class SignalService {
  private kitSocket: any = null
  private relaySocket: any = null
  private isConnected = false
  private onSignal: SignalCallback | null = null
  private onStatus: StatusCallback | null = null
  private onLog: LogCallback | null = null

  constructor(
    private kitManagerUrl: string = 'https://kit.digitalauto.tech'
  ) {}

  setCallbacks(opts: {
    onSignal?: SignalCallback
    onStatus?: StatusCallback
    onLog?: LogCallback
  }) {
    if (opts.onSignal) this.onSignal = opts.onSignal
    if (opts.onStatus) this.onStatus = opts.onStatus
    if (opts.onLog) this.onLog = opts.onLog
  }

  private log(msg: string) {
    if (this.onLog) this.onLog(msg)
  }

  connect(instanceId: string): void {
    this.disconnect()

    const relayHost = window.location.hostname || 'localhost'
    const relayUrl = `http://${relayHost}:9100`

    this.log('Connecting to relay at ' + relayUrl)
    this.relaySocket = ioClient(relayUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
    })

    this.relaySocket.on('connect', () => {
      this.isConnected = true
      this.onStatus?.(true)
      this.log('Connected to signal relay (real-time)')
    })

    this.relaySocket.on('history', (signals: any[]) => {
      signals.forEach((s: any) => this.handleSignal(s.signal, s.value, s.ts))
      this.log('Loaded ' + signals.length + ' historical signals')
    })

    this.relaySocket.on('signal', (s: any) => {
      this.handleSignal(s.signal, s.value, s.ts)
    })

    this.relaySocket.on('disconnect', () => {
      this.isConnected = false
      this.onStatus?.(false)
      this.log('Relay disconnected, reconnecting...')
    })

    this.relaySocket.on('connect_error', (err: any) => {
      this.log('Relay error: ' + err.message)
    })

    this.log('Connecting to Kit Manager...')
    this.kitSocket = ioClient(this.kitManagerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    })

    this.kitSocket.on('connect', () => {
      this.log('Connected to Kit Manager')
      this.kitSocket.emit('messageToKit', {
        id: 'dash-' + Date.now(),
        cmd: 'aos_signal_stream',
        to_kit_id: instanceId,
        type: 'aos_signal_stream',
        limit: 100,
      })
    })

    this.kitSocket.on('messageToKit-kitReply', (msg: any) => {
      if (msg.type === 'aos_signal_stream' && msg.signals) {
        msg.signals.forEach((s: any) => this.handleSignal(s.signal, s.value, s.ts))
        this.log('Kit Manager: ' + msg.signals.length + ' signals')
      }
    })

    this.kitSocket.on('broadcastToClient', (msg: any) => {
      if (msg.type === 'signal-update' && msg.signal) {
        this.handleSignal(msg.signal, msg.value, msg.ts)
      }
    })
  }

  private handleSignal(path: string, value: any, ts: number) {
    let v = parseFloat(value)
    if (isNaN(v)) v = value === 'true' ? 1 : (value === 'false' ? 0 : 0)
    this.onSignal?.(path as VSSPath, v, ts)
  }

  disconnect(): void {
    if (this.relaySocket) { this.relaySocket.disconnect(); this.relaySocket = null }
    if (this.kitSocket) { this.kitSocket.disconnect(); this.kitSocket = null }
    this.isConnected = false
    this.onStatus?.(false)
  }

  connected(): boolean {
    return this.isConnected
  }
}
