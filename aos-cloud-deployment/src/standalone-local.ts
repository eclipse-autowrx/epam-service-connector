// Copyright (c) 2026 Eclipse Foundation.
//
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Local-testing entry point: points the plugin at a local Kit Manager relay
// (see /tmp/aos-local-kit-manager) instead of the shared kit.digitalauto.tech.
import './setup-react'
import * as React from 'react'
import * as ReactDOM from 'react-dom/client'
import Page from './components/Page'

const container = document.getElementById('root')!
const root = ReactDOM.createRoot(container)

root.render(
  React.createElement(Page as any, {
    data: { prototype: { name: 'Local Test Mode' } },
    config: { aosServiceUrl: 'http://localhost:4010' },
  })
)
