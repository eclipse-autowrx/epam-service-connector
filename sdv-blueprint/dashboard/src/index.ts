// Copyright (c) 2026 Eclipse Foundation.
// SPDX-License-Identifier: MIT

import * as ReactDOM from 'react-dom/client'
import * as React from 'react'
import Dashboard from './components/Dashboard'

export const components = { Dashboard }

export function mount(el: HTMLElement, props?: any) {
  const root = ReactDOM.createRoot(el)
  root.render(React.createElement(Dashboard as any, props || {}))
  ;(el as any).__sdv_root = root
}

export function unmount(el: HTMLElement) {
  const r = (el as any).__sdv_root
  if (r && r.unmount) r.unmount()
  delete (el as any).__sdv_root
}

if (typeof window !== 'undefined') {
  ;(window as any).DAPlugins = (window as any).DAPlugins || {}
  ;(window as any).DAPlugins['sdv-blueprint'] = { components, mount, unmount }
  console.log('SDV Blueprint dashboard registered as sdv-blueprint plugin')
}
