// Copyright (c) 2026 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

import './setup-react'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import Page from './components/Page'

export const components = { Page }

// Ensure the host element gives our plugin a constrained, scrollable
// container. Without this, in some hosts the mount element has no explicit
// height, so our `height:100%` cascade resolves to content height and the
// dockerColumn's `overflowY:auto` never engages — the user has to scroll
// the host page instead of the panel. We snapshot the original inline style
// so unmount() can restore it cleanly.
function constrainHostElement(el: HTMLElement) {
  const prev = {
    height: el.style.height,
    maxHeight: el.style.maxHeight,
    minHeight: el.style.minHeight,
    position: el.style.position,
    overflow: el.style.overflow,
    display: el.style.display
  }
  ;(el as any).__aw_prev_style = prev

  if (!el.style.height) el.style.height = '100%'
  if (!el.style.maxHeight) el.style.maxHeight = '100vh'
  el.style.minHeight = '0'
  if (!el.style.position) el.style.position = 'relative'
  el.style.overflow = 'hidden'
  if (!el.style.display) el.style.display = 'flex'
}

function restoreHostElement(el: HTMLElement) {
  const prev = (el as any).__aw_prev_style as Record<string, string> | undefined
  if (!prev) return
  el.style.height = prev.height
  el.style.maxHeight = prev.maxHeight
  el.style.minHeight = prev.minHeight
  el.style.position = prev.position
  el.style.overflow = prev.overflow
  el.style.display = prev.display
  delete (el as any).__aw_prev_style
}

export function mount(el: HTMLElement, props?: any) {
  constrainHostElement(el)
  const root = ReactDOM.createRoot(el)
  root.render(React.createElement(Page as any, props || {}))
  ;(el as any).__aw_root = root
}

export function unmount(el: HTMLElement) {
  const r = (el as any).__aw_root
  if (r && r.unmount) r.unmount()
  delete (el as any).__aw_root
  restoreHostElement(el)
}

// Register plugin globally for digital.auto
// NOTE: PluginPageRender expects the key to be 'page-plugin'
if (typeof window !== 'undefined') {
  ;(window as any).DAPlugins = (window as any).DAPlugins || {}
  ;(window as any).DAPlugins['page-plugin'] = { components, mount, unmount }
  console.log('AOS Cloud Deployment plugin registered as page-plugin')
}
