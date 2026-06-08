// Copyright (c) 2026 Eclipse Foundation.
// SPDX-License-Identifier: MIT

export interface PluginProps {
  data?: {
    model?: any
    prototype?: any
  }
  config?: {
    plugin_id?: string
    runtimeUrl?: string
    kitManagerUrl?: string
  }
}

export type VSSPath =
  | 'Vehicle.Speed'
  | 'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current'
  | 'Vehicle.Powertrain.Range'
  | 'Vehicle.Cabin.HVAC.AmbientAirTemperature'
  | 'Vehicle.Cabin.HVAC.TargetTemperature'
  | 'Vehicle.Cabin.Lights.AmbientLight.Intensity'
  | 'Vehicle.Cabin.Seat.Heating'
  | 'Vehicle.Cabin.Seat.VentilationLevel'
  | 'Vehicle.Infotainment.Display.Brightness'

export interface SignalUpdate {
  signal: VSSPath
  value: number | null
  ts: number
}

export interface SignalMeta {
  shortName: string
  unit: string
  max: number
  color: string
}

export const SIGNAL_META: Record<VSSPath, SignalMeta> = {
  'Vehicle.Speed':
    { shortName: 'Speed', unit: 'km/h', max: 200, color: '#4f8ff7' },
  'Vehicle.Powertrain.TractionBattery.StateOfCharge.Current':
    { shortName: 'SoC', unit: '%', max: 100, color: '#34d399' },
  'Vehicle.Powertrain.Range':
    { shortName: 'Range', unit: 'km', max: 550, color: '#a78bfa' },
  'Vehicle.Cabin.HVAC.AmbientAirTemperature':
    { shortName: 'Ambient Temp', unit: '\u00b0C', max: 50, color: '#fbbf24' },
  'Vehicle.Cabin.HVAC.TargetTemperature':
    { shortName: 'Target Temp', unit: '\u00b0C', max: 30, color: '#fb923c' },
  'Vehicle.Cabin.Lights.AmbientLight.Intensity':
    { shortName: 'Lights', unit: '%', max: 100, color: '#fbbf24' },
  'Vehicle.Cabin.Seat.Heating':
    { shortName: 'Seat Heat', unit: '', max: 1, color: '#f87171' },
  'Vehicle.Cabin.Seat.VentilationLevel':
    { shortName: 'Seat Vent', unit: '', max: 3, color: '#34d399' },
  'Vehicle.Infotainment.Display.Brightness':
    { shortName: 'Display', unit: '%', max: 100, color: '#4f8ff7' },
}

export const ALL_SIGNALS: VSSPath[] = Object.keys(SIGNAL_META) as VSSPath[]
