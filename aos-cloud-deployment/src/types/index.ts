// Copyright (c) 2026 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// Type definitions for AOS Cloud Deployment Plugin

// Plugin API provided by host application
export interface PluginAPI {
  updateModel?: (updates: any) => Promise<any>
  updatePrototype?: (updates: any) => Promise<any>
  getComputedAPIs?: (model_id?: string) => Promise<any>
  getApiDetail?: (api_name: string, model_id?: string) => Promise<any>
  listVSSVersions?: () => Promise<string[]>
}

// Plugin props
export interface PluginProps {
  data?: {
    model?: any
    prototype?: any
  }
  config?: {
    plugin_id?: string
    runtimeUrl?: string
    kitManagerUrl?: string
    aosServiceUrl?: string
  }
  api?: PluginAPI
}

// AOS Application types
export interface AosApp {
  app_id: string
  name: string
  version?: string
  status: 'building' | 'deployed' | 'running' | 'stopped' | 'error'
  deploy_time: string
  type: 'cpp'
  container_id?: string
  pid?: number
  exit_code?: number
  config?: AosAppConfig
}

// AOS App Configuration (from config.yaml)
export interface AosAppConfig {
  publisher: {
    author: string
    company: string
  }
  build: {
    os: string
    arch: string
    sign_pkcs12?: string
    symlinks: string
  }
  publish: {
    url: string
    service_uid: string
    tls_pkcs12?: string
    version: string
  }
  configuration: {
    cmd: string
    workingDir: string
    state: {
      filename: string
      required: boolean
    }
    instances: {
      minInstances: number
      priority: number
    }
    isResourceLimits: boolean
    requestedResources: {
      cpu: number
      ram: string
      storage: string
      state: string
    }
    quotas: {
      cpu: number
      mem: string
      state: string
      storage: string
    }
  }
}

// Build request
export interface BuildRequest {
  name: string
  displayName?: string
  cppCode: string
  yamlConfig: string
}

// Build response
export interface BuildResponse {
  status: 'success' | 'error' | 'building'
  appId?: string
  executionId?: string
  message?: string
  error?: string
  output?: string
}

// Deployment status response from AosCloud
export interface DeploymentStatusResponse {
  status: 'success' | 'error'
  service: {
    uuid: string
    name: string
    description: string
    currentVersion: string
    totalVersions: number
    versions: Array<{
      version: string
      state: string | null
      createdAt: string
    }>
  }
  subject: {
    id: string
    name: string
  } | null
  unit: {
    uid: string
    name: string
    ip: string
    online: boolean
    lastSeen?: string
  } | null
  timestamp: string
}

// Deployment status
export interface DeploymentStatus {
  appId: string
  status: string
  progress?: number
  message?: string
  logs?: string[]
  containerId?: string
}

// Console output
export interface ConsoleOutput {
  appId: string
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
}
