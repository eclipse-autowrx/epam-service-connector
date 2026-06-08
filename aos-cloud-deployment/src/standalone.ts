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

const container = document.getElementById('root')!
const root = ReactDOM.createRoot(container)

root.render(
  React.createElement(Page as any, {
    data: { prototype: { name: 'Standalone Mode' } },
    config: {},
  })
)
