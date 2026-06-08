// Copyright (c) 2026 Eclipse Foundation.
// SPDX-License-Identifier: MIT

import './setup-react'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import Dashboard from './components/Dashboard'

const container = document.getElementById('root')!
const root = ReactDOM.createRoot(container)

root.render(
  React.createElement(Dashboard as any, {
    data: { prototype: { name: 'Standalone Mode' } },
    config: {},
  })
)
