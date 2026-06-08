// Copyright (c) 2026 Eclipse Foundation.
// SPDX-License-Identifier: MIT

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const React: any = (globalThis as any).React

import { SignalService } from '../services/signal.service'
import { SIGNAL_META, ALL_SIGNALS } from '../types'
import type { PluginProps, VSSPath } from '../types'

const SOC_THRESHOLD = 20

export default function Dashboard({ config }: PluginProps) {
  const kitUrl = config?.kitManagerUrl || config?.runtimeUrl || 'https://kit.digitalauto.tech'

  const [signals, setSignals] = React.useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {}
    ALL_SIGNALS.forEach(p => { init[p] = null })
    return init
  })
  const [connected, setConnected] = React.useState(false)
  const [instanceId, setInstanceId] = React.useState('AET-TOOLCHAIN-001')
  const [logs, setLogs] = React.useState<{ ts: string; msg: string }[]>([])

  const serviceRef = React.useRef<SignalService | null>(null)

  const addLog = React.useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString()
    setLogs((prev: { ts: string; msg: string }[]) => {
      const next = [...prev, { ts, msg }]
      return next.length > 200 ? next.slice(-200) : next
    })
  }, [])

  const handleConnect = React.useCallback(() => {
    if (!instanceId.trim()) return
    if (!serviceRef.current) {
      serviceRef.current = new SignalService(kitUrl)
    }
    serviceRef.current.setCallbacks({
      onSignal: (path: VSSPath, value: number | null) => {
        setSignals((prev: Record<string, number | null>) => ({ ...prev, [path]: value }))
      },
      onStatus: (c: boolean) => setConnected(c),
      onLog: addLog,
    })
    serviceRef.current.connect(instanceId.trim())
  }, [instanceId, kitUrl, addLog])

  React.useEffect(() => {
    return () => { serviceRef.current?.disconnect() }
  }, [])

  // Derived state
  const soc = signals['Vehicle.Powertrain.TractionBattery.StateOfCharge.Current']
  const mode = (soc !== null && soc < SOC_THRESHOLD) ? 'POWER_SAVE' : 'NORMAL'
  const range = signals['Vehicle.Powertrain.Range']
  const lights = signals['Vehicle.Cabin.Lights.AmbientLight.Intensity']
  const seatHeat = signals['Vehicle.Cabin.Seat.Heating']

  // --- Styles (dark theme matching dashboard.css) ---
  const S = {
    page: { width: '100%', height: '100%', backgroundColor: '#0f1117', color: '#e1e4ed', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace", display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', backgroundColor: '#1a1d27', borderBottom: '1px solid #2e3347' },
    connBar: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px', backgroundColor: '#1a1d27', borderBottom: '1px solid #2e3347', fontSize: '13px' },
    input: { background: '#222632', border: '1px solid #2e3347', color: '#e1e4ed', padding: '4px 10px', borderRadius: '8px', fontSize: '13px', width: '260px' },
    btn: { padding: '4px 14px', borderRadius: '8px', border: 'none', background: '#4f8ff7', color: '#fff', fontSize: '13px', cursor: 'pointer' },
    dot: (on: boolean) => ({ width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', background: on ? '#34d399' : '#f87171' }),
    main: { display: 'grid', gridTemplateColumns: '340px 1fr 300px', gap: '12px', padding: '12px 20px', flex: 1, overflow: 'hidden' as const },
    card: { background: '#222632', border: '1px solid #2e3347', borderRadius: '8px', overflow: 'hidden' as const },
    cardTitle: { fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '.6px', color: '#8b90a5', padding: '10px 14px 6px', borderBottom: '1px solid #2e3347' },
    cardBody: { padding: '10px 14px' },
    col: { display: 'flex', flexDirection: 'column' as const, gap: '12px', overflowY: 'auto' as const },
    archNode: (color: string) => ({ padding: '8px 10px', marginBottom: '6px', borderRadius: '8px', border: '1px solid #2e3347', borderLeft: `3px solid ${color}`, fontSize: '13px' }),
    archArrow: { textAlign: 'center' as const, color: '#8b90a5', fontSize: '11px', padding: '2px 0' },
    signalsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' },
    gauge: { background: '#1a1d27', border: '1px solid #2e3347', borderRadius: '8px', padding: '10px', textAlign: 'center' as const },
    gaugeLabel: { fontSize: '11px', color: '#8b90a5', marginBottom: '4px' },
    gaugeValue: { fontSize: '22px', fontWeight: 700 },
    gaugeUnit: { fontSize: '11px', color: '#8b90a5' },
    bar: { height: '4px', background: '#2e3347', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' as const },
    barFill: (pct: number, color: string) => ({ height: '100%', borderRadius: '2px', transition: 'width .4s ease', width: pct + '%', background: color }),
    modeBox: (m: string) => ({ textAlign: 'center' as const, padding: '14px', borderRadius: '8px', fontSize: '18px', fontWeight: 700, letterSpacing: '1px', marginBottom: '10px', background: m === 'NORMAL' ? '#163a2a' : '#3d1e1e', color: m === 'NORMAL' ? '#34d399' : '#f87171' }),
    restRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #2e3347', fontSize: '12px' },
    restVal: { fontWeight: 600 },
    logArea: { fontFamily: "'Fira Code', monospace", fontSize: '11px', overflowY: 'auto' as const, maxHeight: '260px', padding: '6px 10px', background: '#0f1117', borderRadius: '8px' },
    logTs: { color: '#8b90a5', marginRight: '6px' },
    muted: { color: '#8b90a5' },
  }

  const fmtVal = (v: number | null) => v !== null ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : '--'

  return React.createElement('div', { style: S.page },

    // Header
    React.createElement('header', { style: S.header },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
        React.createElement('h1', { style: { fontSize: '16px', fontWeight: 600, margin: 0 } }, 'Eclipse SDV Blueprint'),
        React.createElement('span', { style: { color: '#8b90a5', fontSize: '12px', marginLeft: '8px' } }, 'EV Range Extender Demo')
      ),
      React.createElement('div', { style: { fontSize: '12px', color: '#8b90a5' } }, 'HPC \u00b7 Zonal \u00b7 End \u2192 Live Signals')
    ),

    // Connection bar
    React.createElement('div', { style: S.connBar },
      React.createElement('label', null, 'Broadcaster ID:'),
      React.createElement('input', { style: S.input, value: instanceId, onChange: (e: any) => setInstanceId(e.target.value), placeholder: 'e.g. AET-TOOLCHAIN-001' }),
      React.createElement('button', { style: S.btn, onClick: handleConnect }, 'Connect'),
      React.createElement('span', { style: S.dot(connected) }),
      React.createElement('span', { style: { ...S.muted, fontSize: '12px' } }, connected ? 'Connected' : 'Disconnected')
    ),

    // Main 3-column layout
    React.createElement('main', { style: S.main },

      // LEFT column: Architecture + Signal Flow + Log
      React.createElement('div', { style: S.col },
        React.createElement('div', { style: S.card },
          React.createElement('div', { style: S.cardTitle }, 'Architecture'),
          React.createElement('div', { style: S.cardBody },
            React.createElement('div', { style: S.archNode('#4f8ff7') },
              React.createElement('div', { style: { fontWeight: 600 } }, 'HPC Node (VM1)'),
              React.createElement('div', { style: { color: '#8b90a5', fontSize: '11px', marginTop: '2px' } }, 'KUKSA :55555 \u00b7 EV Range Extender, Signal Reporter')
            ),
            React.createElement('div', { style: S.archArrow }, '\u2193 gRPC sync (kuksa-bridge) \u2193'),
            React.createElement('div', { style: S.archNode('#34d399') },
              React.createElement('div', { style: { fontWeight: 600 } }, 'Zonal Node (VM2)'),
              React.createElement('div', { style: { color: '#8b90a5', fontSize: '11px', marginTop: '2px' } }, 'KUKSA :55556 \u00b7 Signal Writer')
            ),
            React.createElement('div', { style: S.archArrow }, '\u2193 gRPC \u2193'),
            React.createElement('div', { style: S.archNode('#fb923c') },
              React.createElement('div', { style: { fontWeight: 600 } }, 'End Node (Simulated)'),
              React.createElement('div', { style: { color: '#8b90a5', fontSize: '11px', marginTop: '2px' } }, 'HVAC Target, Display, Seat Vent')
            )
          )
        ),
        React.createElement('div', { style: { ...S.card, flex: 1, minHeight: 0 } },
          React.createElement('div', { style: S.cardTitle }, 'Event Log'),
          React.createElement('div', { style: S.logArea },
            logs.slice().reverse().slice(0, 100).map((l: { ts: string; msg: string }, i: number) =>
              React.createElement('div', { key: i, style: { padding: '1px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
                React.createElement('span', { style: S.logTs }, l.ts),
                l.msg
              )
            )
          )
        )
      ),

      // CENTER column: Live Signals
      React.createElement('div', { style: S.col },
        React.createElement('div', { style: { ...S.card, flex: 1, minHeight: 0 } },
          React.createElement('div', { style: S.cardTitle }, 'Live Vehicle Signals'),
          React.createElement('div', { style: S.cardBody },
            React.createElement('div', { style: S.signalsGrid },
              ALL_SIGNALS.map((path: VSSPath) => {
                const meta = SIGNAL_META[path]
                const v = signals[path]
                const pct = v !== null ? Math.min(100, Math.max(0, (v / meta.max) * 100)) : 0
                return React.createElement('div', { key: path, style: S.gauge },
                  React.createElement('div', { style: S.gaugeLabel }, meta.shortName),
                  React.createElement('div', { style: S.gaugeValue }, fmtVal(v), ' ', React.createElement('span', { style: S.gaugeUnit }, meta.unit)),
                  React.createElement('div', { style: S.bar },
                    React.createElement('div', { style: S.barFill(pct, meta.color) })
                  )
                )
              })
            )
          )
        )
      ),

      // RIGHT column: EV Range Extender + Use Case + Legend
      React.createElement('div', { style: S.col },
        React.createElement('div', { style: S.card },
          React.createElement('div', { style: S.cardTitle }, 'EV Range Extender'),
          React.createElement('div', { style: S.cardBody },
            React.createElement('div', { style: S.modeBox(mode) }, mode.replace('_', ' ')),
            React.createElement('div', null,
              React.createElement('div', { style: S.restRow }, React.createElement('span', null, 'Mode'), React.createElement('span', { style: S.restVal }, mode)),
              React.createElement('div', { style: S.restRow }, React.createElement('span', null, 'Range'), React.createElement('span', { style: S.restVal }, range !== null ? range.toFixed(0) + ' km' : '--')),
              React.createElement('div', { style: S.restRow }, React.createElement('span', null, 'SoC'), React.createElement('span', { style: S.restVal }, soc !== null ? soc.toFixed(1) + '%' : '--')),
              React.createElement('div', { style: S.restRow }, React.createElement('span', null, 'Lights'), React.createElement('span', { style: S.restVal }, lights !== null ? lights.toFixed(0) + '%' : '--')),
              React.createElement('div', { style: S.restRow }, React.createElement('span', null, 'Seat Heating'), React.createElement('span', { style: S.restVal }, seatHeat !== null ? (seatHeat > 0 ? 'ON' : 'OFF') : '--'))
            )
          )
        ),
        React.createElement('div', { style: S.card },
          React.createElement('div', { style: S.cardTitle }, 'Use Case'),
          React.createElement('div', { style: { ...S.cardBody, fontSize: '12px', color: '#8b90a5', lineHeight: 1.6 } },
            React.createElement('p', null, 'When battery SoC drops below ', React.createElement('strong', { style: { color: '#f87171' } }, '20%'), ', POWER SAVE activates:'),
            React.createElement('ul', { style: { margin: '8px 0 0 16px', listStyle: 'disc' } },
              React.createElement('li', null, 'Ambient lights dimmed to 30%'),
              React.createElement('li', null, 'Seat heating disabled'),
              React.createElement('li', null, 'Range at degraded efficiency')
            )
          )
        ),
        React.createElement('div', { style: S.card },
          React.createElement('div', { style: S.cardTitle }, 'Signal Legend'),
          React.createElement('div', { style: { ...S.cardBody, fontSize: '11px' } },
            React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' } },
              React.createElement('tbody', null,
                React.createElement('tr', null, React.createElement('td', { style: { color: '#34d399', padding: '2px 0' } }, 'Zonal'), React.createElement('td', null, 'Speed, SoC, Ambient Temp')),
                React.createElement('tr', null, React.createElement('td', { style: { color: '#fb923c', padding: '2px 0' } }, 'End'), React.createElement('td', null, 'Target Temp, Display, Seat Vent')),
                React.createElement('tr', null, React.createElement('td', { style: { color: '#4f8ff7', padding: '2px 0' } }, 'HPC'), React.createElement('td', null, 'Range (computed)')),
                React.createElement('tr', null, React.createElement('td', { style: { color: '#f87171', padding: '2px 0' } }, 'HPC'), React.createElement('td', null, 'Lights, Seat Heat (actuated)'))
              )
            )
          )
        )
      )
    )
  )
}
