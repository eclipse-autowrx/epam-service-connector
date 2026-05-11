// Copyright (c) 2026 Eclipse Foundation.
// 
// This program and the accompanying materials are made available under the
// terms of the MIT License which is available at
// https://opensource.org/licenses/MIT.
//
// SPDX-License-Identifier: MIT

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const React: any = (globalThis as any).React

import { AosService } from '../services/aos.service'
import { PRESETS } from '../presets'
import type { PluginProps, AosApp, DeploymentStatusResponse } from '../types'

// Docker instance type
interface DockerInstance {
  instance_id: string
  name: string
  online: boolean
  last_seen?: string
  type?: string
  suffix?: string
}

export default function Page({ data, config }: PluginProps) {

  const [cppCode, setCppCode] = React.useState(PRESETS.helloAos.cpp)
  const [yamlConfig, setYamlConfig] = React.useState(PRESETS.helloAos.yaml)
  const [appName, setAppName] = React.useState('hello-aos')
  const [isBuilding, setIsBuilding] = React.useState(false)
  const [buildStatus, setBuildStatus] = React.useState<string>('')
  const [buildLogs, setBuildLogs] = React.useState<string[]>([])
  const [deployedApps, setDeployedApps] = React.useState<AosApp[]>([])
  const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [selectedPreset, setSelectedPreset] = React.useState('custom')
  const [autoIncVersion, setAutoIncVersion] = React.useState(true)
  const [activeEditorTab, setActiveEditorTab] = React.useState<'cpp' | 'yaml'>('cpp')
  const cppCodeRef = React.useRef(cppCode)
  const yamlConfigRef = React.useRef(yamlConfig)
  cppCodeRef.current = cppCode
  yamlConfigRef.current = yamlConfig

  // Docker instances state
  const [dockerInstances, setDockerInstances] = React.useState<DockerInstance[]>([])
  const [filterOnline, setFilterOnline] = React.useState<boolean>(true)
  const [selectedInstance, setSelectedInstance] = React.useState<string>('')
  const [showDockerPanel, setShowDockerPanel] = React.useState<boolean>(true)

  // Deployment status state
  const [deploymentStatus, setDeploymentStatus] = React.useState<DeploymentStatusResponse | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = React.useState<boolean>(false)
  const [statusError, setStatusError] = React.useState<string>('')

  // Certificate state
  const [certStatus, setCertStatus] = React.useState<{ loaded: boolean; source: string; size?: number; message?: string } | null>(null)
  const [isUploadingCert, setIsUploadingCert] = React.useState<boolean>(false)
  const [certError, setCertError] = React.useState<string>('')
  const [showAdvanced, setShowAdvanced] = React.useState<boolean>(false)

  // AosCloud state
  const [aosServices, setAosServices] = React.useState<any[]>([])
  const [selectedServiceUuid, setSelectedServiceUuid] = React.useState<string>('')
  const [serviceUnits, setServiceUnits] = React.useState<any[]>([])
  const [serviceVersions, setServiceVersions] = React.useState<any[]>([])
  const [serviceName, setServiceName] = React.useState<string>('')
  const [selectedMonitorUnit, setSelectedMonitorUnit] = React.useState<string>('')
  const [unitMonitoring, setUnitMonitoring] = React.useState<any>(null)
  const [alerts, setAlerts] = React.useState<any[]>([])
  const [isLoadingAosCloud, setIsLoadingAosCloud] = React.useState<boolean>(false)
  const [showGuide, setShowGuide] = React.useState<boolean>(false)
  const [serviceLogs, setServiceLogs] = React.useState<any[]>([])
  const [isRequestingLog, setIsRequestingLog] = React.useState<boolean>(false)
  const [selectedUnitUid, setSelectedUnitUid] = React.useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = React.useState<string>('')
  const aosCloudLoadedRef = React.useRef<boolean>(false)

  const aosServiceRef = React.useRef<AosService | null>(null)
  const buildLogsRef = React.useRef<HTMLDivElement>(null)
  const pollingIntervalRef = React.useRef<any>(null)

  // Styles
  const styles = {
    page: {
      width: '100%',
      height: '100%',
      backgroundColor: '#f5f5f5',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden' as const,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 20px',
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb'
    },
    headerLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px'
    },
    title: {
      margin: 0,
      fontSize: '18px',
      fontWeight: 600,
      color: '#1f2937'
    },
    statusIndicator: {
      fontSize: '12px',
      padding: '4px 12px',
      borderRadius: '20px',
      fontWeight: 500
    },
    statusConnected: {
      backgroundColor: '#dcfce7',
      color: '#16a34a'
    },
    statusConnecting: {
      backgroundColor: '#fef3c7',
      color: '#b45309'
    },
    statusDisconnected: {
      backgroundColor: '#fee2e2',
      color: '#dc2626'
    },
    headerRight: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    input: {
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      outline: 'none'
    },
    inputSm: {
      padding: '6px 10px',
      fontSize: '13px'
    },
    select: {
      padding: '8px 12px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    content: {
      display: 'flex',
      gap: '16px',
      padding: '16px',
      flex: 1,
      overflow: 'hidden' as const
    },
    editorsColumn: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      minWidth: 0,
      overflowY: 'auto' as const
    },
    dockerColumn: {
      width: '280px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px',
      flexShrink: 0
    },
    statusColumn: {
      width: '320px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      flexShrink: 0,
      overflow: 'hidden'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden' as const
    },
    cardHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #e5e7eb'
    },
    cardTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      fontWeight: 600,
      color: '#1f2937'
    },
    cardIcon: {
      fontSize: '16px'
    },
    cardBadge: {
      fontSize: '10px',
      padding: '2px 8px',
      background: '#3b82f6',
      color: 'white',
      borderRadius: '10px',
      textTransform: 'uppercase',
      fontWeight: 500
    },
    editorCard: {
      flex: 1,
      minHeight: '280px',
      display: 'flex',
      flexDirection: 'column' as const
    },
    textarea: {
      flex: 1,
      width: '100%',
      padding: '12px 16px 12px 0',
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
      fontSize: '13px',
      lineHeight: '20px',
      border: 'none',
      resize: 'none' as const,
      backgroundColor: '#ffffff',
      color: '#1f2937',
      outline: 'none',
      minHeight: '220px'
    },
    editorContainer: {
      display: 'flex',
      flex: 1,
      overflow: 'auto',
      backgroundColor: '#ffffff'
    },
    lineNumbers: {
      padding: '12px 8px 12px 12px',
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace",
      fontSize: '13px',
      lineHeight: '20px',
      color: '#9ca3af',
      backgroundColor: '#f9fafb',
      borderRight: '1px solid #e5e7eb',
      textAlign: 'right' as const,
      userSelect: 'none' as const,
      minWidth: '40px',
      flexShrink: 0
    },
    actions: {
      display: 'flex',
      gap: '12px'
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 20px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      backgroundColor: 'white',
      color: '#475569',
      fontSize: '14px',
      fontWeight: 500,
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    },
    buttonPrimary: {
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none' as const
    },
    buttonDisabled: {
      opacity: 0.5,
      cursor: 'not-allowed'
    },
    buttonSm: {
      padding: '6px 12px',
      fontSize: '12px'
    },
    spinner: {
      width: '14px',
      height: '14px',
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    },
    statusContent: {
      padding: '12px 16px',
      fontSize: '14px',
      color: '#1f2937'
    },
    appsList: {
      maxHeight: '200px',
      overflowY: 'auto' as const
    },
    appItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 16px',
      borderBottom: '1px solid #f3f4f6'
    },
    appInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    appName: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#1f2937'
    },
    statusBadge: {
      fontSize: '10px',
      padding: '2px 8px',
      borderRadius: '10px',
      fontWeight: 500,
      textTransform: 'uppercase'
    },
    statusRunning: {
      backgroundColor: '#dcfce7',
      color: '#16a34a'
    },
    statusDeployed: {
      backgroundColor: '#dbeafe',
      color: '#2563eb'
    },
    statusBuilding: {
      backgroundColor: '#fef3c7',
      color: '#d97706'
    },
    statusStopped: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280'
    },
    statusError: {
      backgroundColor: '#fee2e2',
      color: '#dc2626'
    },
    appActions: {
      display: 'flex',
      gap: '4px'
    },
    actionBtn: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'all 0.15s ease'
    },
    actionStart: {
      backgroundColor: '#dcfce7',
      color: '#16a34a'
    },
    actionStop: {
      backgroundColor: '#fee2e2',
      color: '#dc2626'
    },
    logsCard: {
      flex: 1,
      minHeight: '120px',
      maxHeight: '300px',
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden'
    },
    logs: {
      flex: 1,
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
      fontSize: '12px',
      lineHeight: 1.5,
      overflowY: 'auto' as const,
      maxHeight: '180px',
      borderTop: '1px solid #e5e7eb'
    },
    logEntry: {
      color: '#374151',
      marginBottom: '2px',
      whiteSpace: 'pre-wrap' as const,
      wordBreak: 'break-all'
    },
    emptyState: {
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      backgroundColor: 'white',
      margin: '20px',
      borderRadius: '8px'
    },
    emptyIcon: {
      fontSize: '48px',
      marginBottom: '16px'
    },
    emptyText: {
      color: '#6b7280',
      fontSize: '14px'
    },
    empty: {
      color: '#9ca3af',
      textAlign: 'center',
      padding: '20px',
      fontSize: '13px'
    },
    iconButton: {
      width: '28px',
      height: '28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#9ca3af',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'all 0.15s ease'
    },
    // Docker instance styles
    dockerTabs: {
      display: 'flex',
      gap: '4px',
      padding: '8px 16px',
      borderBottom: '1px solid #e5e7eb'
    },
    tab: {
      padding: '6px 12px',
      fontSize: '12px',
      fontWeight: 500,
      border: 'none',
      borderRadius: '6px',
      backgroundColor: 'transparent',
      color: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    },
    tabActive: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    dockerList: {
      maxHeight: '250px',
      overflowY: 'auto' as const,
      padding: '8px'
    },
    dockerItem: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      marginBottom: '4px',
      borderRadius: '6px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    },
    dockerItemSelected: {
      backgroundColor: '#dbeafe',
      borderColor: '#3b82f6'
    },
    dockerItemOnline: {
      borderLeft: '3px solid #16a34a'
    },
    dockerItemOffline: {
      borderLeft: '3px solid #dc2626'
    },
    dockerItemInfo: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '2px'
    },
    dockerItemName: {
      fontSize: '13px',
      fontWeight: 500,
      color: '#1f2937'
    },
    dockerItemId: {
      fontSize: '11px',
      color: '#6b7280',
      fontFamily: 'monospace'
    },
    onlineIndicator: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '11px',
      fontWeight: 500
    },
    onlineDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#16a34a'
    },
    offlineDot: {
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: '#dc2626'
    },
    onlineText: {
      color: '#16a34a'
    },
    offlineText: {
      color: '#dc2626'
    },
    summaryCard: {
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      borderBottom: '1px solid #e5e7eb'
    },
    summaryText: {
      fontSize: '12px',
      color: '#6b7280'
    },
    summaryNumber: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#1f2937'
    }
  }

  // Initialize AOS service
  React.useEffect(() => {
    const serviceUrl = config?.aosServiceUrl || config?.runtimeUrl || 'https://kit.digitalauto.tech'
    const service = new AosService(serviceUrl, selectedInstance || 'default-aos-target')
    aosServiceRef.current = service

    const stageLabels: Record<string, string> = {
      init: 'Init', config: 'Config', proto: 'Proto',
      compile: 'Compile', bundle: 'Bundle',
      sign: 'Sign', upload: 'Publish', error: 'Error'
    }
    service.onBuildProgress((message: any) => {
      const label = stageLabels[message.stage] || message.stage || 'Build'
      addLog(`[${label}] ${message.message || JSON.stringify(message)}`)
      if (message.progress !== undefined && message.progress >= 0) {
        setBuildStatus(`${label}... ${message.progress}%`)
      }
    })

    service.onDeployStatus((message: any) => {
      if (message.type === 'aos_build_deploy' && message.message && message.message.includes('\n')) {
        message.message.split('\n').filter((l: string) => l.trim()).forEach((line: string) => addLog(line))
      } else {
        addLog(`[Deploy] ${message.message || JSON.stringify(message)}`)
      }
      if (message.status === 'success') {
        setBuildStatus('Build completed successfully!')
        setIsBuilding(false)
        localStorage.removeItem('aos_build_id')
        refreshApps()
      } else if (message.status === 'error') {
        setBuildStatus('Build failed')
        setIsBuilding(false)
        localStorage.removeItem('aos_build_id')
      }
    })

    service.onConsoleOutput((message: any) => {
      addLog(`[${message.appId}] ${message.message}`)
    })

    // Listen for Docker status updates
    service.onAppStatus((message: any) => {
      handleDockerStatusUpdate(message)
    })

    setConnectionStatus('connecting')
    service.connect()
      .then(() => {
        setConnectionStatus('connected')
        refreshApps()
        startDockerPolling()

        const pendingBuildId = localStorage.getItem('aos_build_id')
        if (pendingBuildId && service) {
          addLog(`[Build] Recovering build ${pendingBuildId}...`)
          setIsBuilding(true)
          setBuildStatus('Recovering build status...')
          service.getBuildStatus(pendingBuildId).then((res: any) => {
            if (res.build && res.build.logs) {
              const stageLabels: Record<string, string> = {
                init: 'Init', config: 'Config', proto: 'Proto',
                compile: 'Compile', bundle: 'Bundle',
                sign: 'Sign', upload: 'Publish', error: 'Error'
              }
              res.build.logs.forEach((entry: any) => {
                const label = stageLabels[entry.stage] || entry.stage || 'Build'
                addLog(`[${label}] ${entry.message}`)
              })
              if (res.build.status === 'success') {
                setBuildStatus('Build completed successfully!')
                setIsBuilding(false)
                localStorage.removeItem('aos_build_id')
              } else if (res.build.status === 'error') {
                setBuildStatus('Build failed')
                setIsBuilding(false)
                localStorage.removeItem('aos_build_id')
              } else {
                setBuildStatus('Build still in progress...')
              }
            } else {
              addLog(`[Build] Build ${pendingBuildId} not found on server`)
              setIsBuilding(false)
              localStorage.removeItem('aos_build_id')
            }
          }).catch(() => {
            setIsBuilding(false)
            localStorage.removeItem('aos_build_id')
          })
        }
        setTimeout(async () => {
          await checkCertificate()
          await fetchAosCloudServices()
        }, 500)
      })
      .catch((err) => {
        console.error('[AOS] Connection failed:', err)
        setConnectionStatus('disconnected')
        addLog(`[Error] Failed to connect: ${err.message}`)
      })

    return () => {
      stopDockerPolling()
      service.disconnect()
    }
  }, [config?.aosServiceUrl, config?.runtimeUrl, selectedInstance])

  React.useEffect(() => {
    if (buildLogsRef.current) {
      buildLogsRef.current.scrollTop = buildLogsRef.current.scrollHeight
    }
  }, [buildLogs])

  // Poll for Docker instances
  const startDockerPolling = () => {
    // Initial fetch
    fetchDockerInstances()

    // Poll every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchDockerInstances()
    }, 10000)
  }

  const stopDockerPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  const fetchDockerInstances = async () => {
    try {
      // Try to fetch from Kit Manager API
      const kitManagerUrl = config?.aosServiceUrl || config?.runtimeUrl || 'https://kit.digitalauto.tech'
      const listUrl = kitManagerUrl.replace(/\/$/, '') + '/listAllKits'
      const response = await fetch(listUrl)
      if (response.ok) {
        const data = await response.json()
        const kitsList = data.kits || data.content || []
        if (Array.isArray(kitsList)) {
          const instances: DockerInstance[] = kitsList
            .filter((kit: any) => {
              // Filter for AOS Edge Toolchain instances (AET- prefix) or all instances
              const instanceId = kit.kit_id || kit.instance_id || ''
              return instanceId.startsWith('AET-') || instanceId.startsWith('VEA-') || kit.name?.includes('AOS')
            })
            .map((kit: any) => ({
              instance_id: kit.kit_id || kit.instance_id,
              name: kit.name || 'Unknown',
              online: kit.online !== false, // Assume online unless explicitly false
              last_seen: kit.last_seen,
              type: kit.type,
              suffix: kit.suffix || (kit.kit_id || kit.instance_id || '').split('-')[0]
            }))

          // Ping each instance to verify it's actually alive
          const verified = await Promise.all(instances.map(async (inst: DockerInstance) => {
            try {
              const pingResult = await new Promise<boolean>((resolve) => {
                if (!aosServiceRef.current?.isServiceConnected()) { resolve(false); return }
                const timeout = setTimeout(() => resolve(false), 2000)
                const pingId = 'ping-' + inst.instance_id + '-' + Date.now()
                const s = aosServiceRef.current as any
                if (s.socket) {
                  s.socket.emit('messageToKit', {
                    id: pingId, cmd: 'aos_list_apps', to_kit_id: inst.instance_id, type: 'aos_list_apps'
                  })
                  const handler = (msg: any) => {
                    if (msg.id === pingId || msg.kit_id === inst.instance_id) {
                      clearTimeout(timeout)
                      s.socket.off('messageToKit-kitReply', handler)
                      resolve(true)
                    }
                  }
                  s.socket.on('messageToKit-kitReply', handler)
                  setTimeout(() => { s.socket.off('messageToKit-kitReply', handler) }, 2500)
                } else { resolve(false) }
              })
              return { ...inst, online: pingResult }
            } catch { return { ...inst, online: false } }
          }))

          setDockerInstances(verified)

          // Auto-select first online instance if none selected
          if (!selectedInstance && verified.length > 0) {
            const firstOnline = verified.find((i: DockerInstance) => i.online)
            if (firstOnline) {
              setSelectedInstance(firstOnline.instance_id)
            }
          }
        }
      }
    } catch (err) {
      // If Kit Manager API is not available, use known instance for development
      console.log('[AOS] Kit Manager API not available, using known instance')
      const mockInstances: DockerInstance[] = [
        {
          instance_id: 'AET-TOOLCHAIN-001',
          name: 'AOS Edge Toolchain',
          online: true,
          last_seen: new Date().toISOString(),
          suffix: 'AET'
        }
      ]
      setDockerInstances(mockInstances)
      // Auto-select the first (and only) mock instance
      if (!selectedInstance) {
        setSelectedInstance('AET-TOOLCHAIN-001')
      }
    }
  }

  const handleDockerStatusUpdate = (message: any) => {
    if (message.type === 'docker_status' || message.instance_id) {
      setDockerInstances(prev => {
        const updated = [...prev]
        const index = updated.findIndex(d => d.instance_id === message.instance_id)
        if (index >= 0) {
          updated[index] = {
            ...updated[index],
            online: message.online !== undefined ? message.online : updated[index].online,
            last_seen: message.last_seen || new Date().toISOString()
          }
        } else {
          updated.push({
            instance_id: message.instance_id,
            name: message.name || 'AOS Toolchain',
            online: message.online !== false,
            suffix: message.suffix || 'AET'
          })
        }
        return updated
      })
    }
  }

  const handleSelectDocker = (instance: DockerInstance) => {
    setSelectedInstance(instance.instance_id)
    addLog(`[Docker] Selected instance: ${instance.name} (${instance.instance_id})`)

    // Update AOS service target
    if (aosServiceRef.current) {
      aosServiceRef.current.setTargetId(instance.instance_id)
    }
  }

  const getFilteredInstances = () => {
    if (filterOnline) {
      return dockerInstances.filter(d => d.online)
    }
    return dockerInstances
  }

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setBuildLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const refreshApps = async () => {
    if (!aosServiceRef.current) return
    try {
      const result = await aosServiceRef.current.getDeployedApps()
      setDeployedApps(result.applications)
    } catch (err) {
      console.error('[AOS] Failed to get apps:', err)
    }
  }

  const fetchDeploymentStatus = async () => {
    if (!aosServiceRef.current) return
    setIsLoadingStatus(true)
    setStatusError('')
    try {
      const result = await aosServiceRef.current.getDeploymentStatus(selectedServiceUuid, selectedUnitUid, selectedSubjectId)
      setDeploymentStatus(result)
      addLog('[Status] Deployment status refreshed')
    } catch (err: any) {
      setStatusError(err.message || 'Failed to fetch deployment status')
      console.error('[AOS] Failed to get deployment status:', err)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const checkCertificate = async () => {
    if (!aosServiceRef.current) return
    try {
      const result = await aosServiceRef.current.checkCertificate()
      setCertStatus({ loaded: result.certLoaded, source: result.source || 'none', size: result.certSize, message: result.message })
      setCertError('')
    } catch (err: any) {
      setCertError(err.message || 'Failed to check certificate')
    }
  }

  const fetchAosCloudServices = async () => {
    if (!aosServiceRef.current) return
    setIsLoadingAosCloud(true)
    try {
      const res = await aosServiceRef.current.listServices()
      if (res.status === 'success') {
        setAosServices(res.items || [])
        if (!selectedServiceUuid && res.defaults?.serviceUuid) {
          setSelectedServiceUuid(res.defaults.serviceUuid)
          loadServiceDetails(res.defaults.serviceUuid)
        } else if (!selectedServiceUuid && res.items?.length) {
          setSelectedServiceUuid(res.items[0].uuid)
          loadServiceDetails(res.items[0].uuid)
        }
        addLog(`[AosCloud] Loaded ${res.items?.length || 0} services`)
      }
      // Also fetch alerts
      try {
        const alertRes = await aosServiceRef.current.getAlerts()
        if (alertRes.status === 'success') setAlerts(alertRes.alerts || [])
      } catch (e) { /* alerts are optional */ }
    } catch (err: any) {
      if (!err.message?.includes('Not connected')) {
        addLog(`[AosCloud] Failed to load services: ${err.message}`)
      }
    } finally {
      setIsLoadingAosCloud(false)
    }
  }

  const loadServiceDetails = async (uuid: string) => {
    if (!aosServiceRef.current || !uuid) return
    try {
      const [versRes, unitsRes] = await Promise.all([
        aosServiceRef.current.getServiceVersions(uuid),
        aosServiceRef.current.getServiceUnits(uuid).catch(() => ({ status: 'error', units: [] })),
      ])
      if (versRes.status === 'success') {
        const sorted = (versRes.versions || []).sort((a: any, b: any) => {
          const pa = (a.version || '').split('.').map(Number)
          const pb = (b.version || '').split('.').map(Number)
          for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
            const diff = (pb[i] || 0) - (pa[i] || 0)
            if (diff !== 0) return diff
          }
          return 0
        })
        setServiceVersions(sorted)
        setServiceName(versRes.serviceName || '')

        if (autoIncVersion && sorted.length > 0) {
          const latest = sorted[0].version
          const parts = latest.split('.')
          parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1)
          const next = parts.join('.')
          setCppCode(prev => prev.replace(/#define\s+VERSION\s+"[^"]+"/, `#define VERSION "${next}"`))
          setYamlConfig(prev => prev.replace(/version:\s*"[^"]+"/, `version: "${next}"`))
          addLog(`[Version] Next: ${latest} → ${next}`)
        }
      }
      if (unitsRes.status === 'success') {
        setServiceUnits(unitsRes.units || [])
        if (unitsRes.units?.length) {
          const firstUid = unitsRes.units[0].uid
          setSelectedMonitorUnit(firstUid)
          setSelectedUnitUid(firstUid)
          loadUnitMonitoring(firstUid)
        }
      }
      // Auto-set subject ID from the first available subject
      if (!selectedSubjectId && aosServiceRef.current) {
        try {
          const subRes = await aosServiceRef.current.listSubjects()
          if (subRes.status === 'success' && subRes.items?.length) {
            setSelectedSubjectId(subRes.items[0].id)
          }
        } catch (e) { /* subjects are optional */ }
      }
    } catch (err: any) {
      addLog(`[AosCloud] Failed to load service details: ${err.message}`)
    }
  }

  const handleServiceChange = (uuid: string) => {
    setSelectedServiceUuid(uuid)
    setServiceUnits([])
    setServiceVersions([])
    setUnitMonitoring(null)
    if (uuid) loadServiceDetails(uuid)
  }

  const loadUnitMonitoring = async (uid: string) => {
    if (!aosServiceRef.current || !uid) return
    setSelectedMonitorUnit(uid)
    try {
      const res = await aosServiceRef.current.getUnitMonitoring(uid)
      if (res.status === 'success') setUnitMonitoring(res)
      else setUnitMonitoring({ status: 'error', message: res.message || 'Unavailable' })
    } catch (err: any) {
      setUnitMonitoring({ status: 'error', message: err.message || 'Unavailable' })
    }
  }

  const requestServiceLog = async () => {
    if (!aosServiceRef.current || !selectedServiceUuid || !selectedMonitorUnit) return
    setIsRequestingLog(true)
    try {
      const unit = serviceUnits.find((u: any) => u.uid === selectedMonitorUnit)
      // Find subject from unit's service data — use first available subject
      const unitDetail = await aosServiceRef.current.sendCommand('aos_list_subjects', {})
      const subjectId = unitDetail.items?.[0]?.id || ''
      if (!subjectId) { addLog('[Logs] No subject found'); setIsRequestingLog(false); return }

      const res = await aosServiceRef.current.requestServiceLog(selectedServiceUuid, selectedMonitorUnit, subjectId, 60)
      if (res.status === 'success') {
        addLog(`[Logs] Log request created (${res.requests?.length || 0} entries)`)
        // Poll for status after a delay
        setTimeout(refreshServiceLogs, 5000)
      } else {
        addLog(`[Logs] Request failed: ${res.message}`)
      }
    } catch (err: any) {
      addLog(`[Logs] Error: ${err.message}`)
    } finally {
      setIsRequestingLog(false)
    }
  }

  const refreshServiceLogs = async () => {
    if (!aosServiceRef.current) return
    try {
      const res = await aosServiceRef.current.getServiceLogStatus()
      if (res.status === 'success') setServiceLogs(res.logs || [])
    } catch (e) { /* ignore */ }
  }

  const handleCertUpload = async (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !aosServiceRef.current) return

    setIsUploadingCert(true)
    setCertError('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const result = await aosServiceRef.current.uploadCertificate(base64)

      if (result.status === 'success') {
        addLog(`[Cert] Certificate uploaded: ${result.message}`)
        setCertStatus({ loaded: true, source: 'manual', size: file.size, message: result.message })
        addLog(`[AosCloud] Refreshing services...`)
        fetchAosCloudServices()
      } else {
        setCertError(result.message || 'Upload failed')
      }
    } catch (err: any) {
      setCertError(err.message || 'Upload failed')
      addLog(`[Cert] Upload failed: ${err.message}`)
    } finally {
      setIsUploadingCert(false)
      e.target.value = ''
    }
  }

  const handleBuildDeploy = async () => {
    if (!aosServiceRef.current || !aosServiceRef.current.isServiceConnected()) {
      addLog('[Error] Not connected to AOS service')
      return
    }

    setBuildLogs([])

    let finalCpp = cppCodeRef.current
    let finalYaml = yamlConfigRef.current

    

    setIsBuilding(true)
    setBuildStatus('Starting build...')
    addLog(`[Build] Target: ${selectedInstance}`)
    addLog('[Build] Starting AOS application build...')

    const stageLabels: Record<string, string> = {
      init: 'Init', config: 'Config', proto: 'Proto',
      compile: 'Compile', bundle: 'Bundle',
      sign: 'Sign', upload: 'Publish', error: 'Error'
    }

    try {
      const response = await aosServiceRef.current.buildAndDeploy({
        name: appName,
        displayName: appName,
        cppCode: finalCpp,
        yamlConfig: finalYaml
      })

      if (response.message && response.message.includes('\n')) {
        const lines = response.message.split('\n').filter((l: string) => l.trim())
        for (let i = 0; i < lines.length; i++) {
          addLog(lines[i])
          setBuildStatus(`${lines[i].split(']')[1]?.trim().slice(0, 40) || 'Building...'}`)
          if (i < lines.length - 1) {
            await new Promise(r => setTimeout(r, 300))
          }
        }
      } else {
        addLog(`[Build] ${response.message || JSON.stringify(response)}`)
      }

      if (response.status === 'success') {
        setBuildStatus('Build completed successfully!')
        setIsBuilding(false)
        refreshApps()
      } else if (response.status === 'error') {
        const lastLog = (response.message || '').split('\n').filter((l: string) => l.trim()).pop() || 'Unknown error'
        setBuildStatus(`Build failed: ${lastLog.replace(/^\[.*?\]\s*/, '').slice(0, 80)}`)
        setIsBuilding(false)
      } else {
        setBuildStatus('Build completed')
        setIsBuilding(false)
      }
    } catch (err: any) {
      const msg = err.message || 'Unknown error'
      if (msg.includes('\n')) {
        msg.split('\n').filter((l: string) => l.trim()).forEach((line: string) => addLog(line))
      } else {
        addLog(`[Error] ${msg}`)
      }
      const lastLine = msg.split('\n').filter((l: string) => l.trim()).pop() || msg
      setBuildStatus(`Build failed: ${lastLine.replace(/^\[.*?\]\s*/, '').slice(0, 80)}`)
      setIsBuilding(false)
    }
  }

  const handleStartApp = async (appId: string) => {
    if (!aosServiceRef.current) return
    addLog(`[Action] Starting app: ${appId}`)
    try {
      await aosServiceRef.current.startApp(appId)
      addLog(`[Action] App started: ${appId}`)
      refreshApps()
    } catch (err: any) {
      addLog(`[Error] Failed to start app: ${err.message}`)
    }
  }

  const handleStopApp = async (appId: string) => {
    if (!aosServiceRef.current) return
    addLog(`[Action] Stopping app: ${appId}`)
    try {
      await aosServiceRef.current.stopApp(appId)
      addLog(`[Action] App stopped: ${appId}`)
      refreshApps()
    } catch (err: any) {
      addLog(`[Error] Failed to stop app: ${err.message}`)
    }
  }

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName)
    const preset = (PRESETS as any)[presetName]
    if (preset) {
      let cpp = preset.cpp
      let yaml = preset.yaml

      if (autoIncVersion && serviceVersions.length > 0) {
        const latest = serviceVersions[0].version
        const parts = latest.split('.')
        parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1)
        const next = parts.join('.')
        cpp = cpp.replace(/#define\s+VERSION\s+"[^"]+"/, `#define VERSION "${next}"`)
        yaml = yaml.replace(/version:\s*"[^"]+"/, `version: "${next}"`)
        addLog(`[Preset] Loaded: ${preset.name || presetName} (version: ${next})`)
      } else {
        addLog(`[Preset] Loaded: ${preset.name || presetName}`)
      }

      setCppCode(cpp)
      setYamlConfig(yaml)
      setAppName(preset.appName || presetName)
    }
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'running': return styles.statusRunning
      case 'deployed': return styles.statusDeployed
      case 'building': return styles.statusBuilding
      case 'stopped': return styles.statusStopped
      case 'error': return styles.statusError
      default: return styles.statusStopped
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'running': return 'status-running'
      case 'deployed': return 'status-deployed'
      case 'building': return 'status-building'
      case 'stopped': return 'status-stopped'
      case 'error': return 'status-error'
      default: return 'status-stopped'
    }
  }

  const filteredInstances = getFilteredInstances()
  const onlineCount = dockerInstances.filter(d => d.online).length

  if (!data?.prototype?.name) {
    return React.createElement('div', { style: styles.page },
      React.createElement('div', { style: styles.emptyState },
        React.createElement('div', { style: styles.emptyIcon }, '📦'),
        React.createElement('h2', { style: { margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#1f2937' } }, 'AOS Cloud Deployment'),
        React.createElement('p', { style: styles.emptyText }, 'This plugin is available inside a Prototype. Go to Prototype Library, open a prototype, and select the "aos-cloud" tab.')
      )
    )
  }

  return React.createElement('div', { style: styles.page },

    // Quick Guide Overlay
    showGuide && React.createElement('div', {
      style: {
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
      },
      onClick: () => setShowGuide(false)
    },
      React.createElement('div', {
        style: {
          backgroundColor: 'white', borderRadius: '12px', maxWidth: '640px', width: '90%', maxHeight: '85vh',
          overflowY: 'auto', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        },
        onClick: (e: any) => e.stopPropagation()
      },
        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' } },
          React.createElement('h2', { style: { margin: 0, fontSize: '18px', fontWeight: 600 } }, '📖 Quick Setup Guide'),
          React.createElement('button', {
            onClick: () => setShowGuide(false),
            style: { border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }
          }, '✕')
        ),

        React.createElement('div', { style: { fontSize: '13px', lineHeight: 1.8, color: '#374151' } },

          React.createElement('h3', { style: { fontSize: '14px', marginTop: 0, marginBottom: '8px' } }, '1. Select a Docker Instance'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'Choose an online Docker instance from the left panel. This is the build server that compiles, signs, and uploads your service to AosCloud.'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '2. Choose a Service'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'Select a service from the AosCloud Service dropdown on the left. This determines which service on AosCloud will receive your new version. ' +
            'The version auto-increments based on the latest deployed version.'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '3. Select a Preset or Write Code'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '4px' } },
            'Use the preset dropdown (top-right) to load a pre-built application, or write your own C++ code and YAML config:'
          ),
          React.createElement('ul', { style: { color: '#6b7280', marginBottom: '16px', paddingLeft: '20px' } },
            React.createElement('li', null, React.createElement('strong', null, 'main.cpp'), ' — your C++ application source code'),
            React.createElement('li', null, React.createElement('strong', null, 'config.yaml'), ' — service metadata: architecture, version, resource quotas, entry point')
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '4. Build & Deploy'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'Click the Build & Deploy button. The system compiles your code, signs the package, and uploads it to AosCloud. ' +
            'The edge unit receives the update via OTA and runs your service automatically. ' +
            'Watch the Build Logs panel on the right for progress.'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '5. Monitor'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '4px' } },
            'After deployment, you can:'
          ),
          React.createElement('ul', { style: { color: '#6b7280', marginBottom: '16px', paddingLeft: '20px' } },
            React.createElement('li', null, 'Check service status in the ', React.createElement('strong', null, 'Units'), ' panel'),
            React.createElement('li', null, 'View CPU/RAM usage in the ', React.createElement('strong', null, 'Monitoring'), ' panel'),
            React.createElement('li', null, 'Request service logs via ', React.createElement('strong', null, 'Fetch Logs'), ' button')
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, 'Available Presets'),
          React.createElement('ul', { style: { color: '#6b7280', paddingLeft: '20px', marginBottom: 0 } },
            React.createElement('li', null, React.createElement('strong', null, 'Hello AOS'), ' — simple hello world service'),
            React.createElement('li', null, React.createElement('strong', null, 'Signal Writer'), ' — writes vehicle signals to KUKSA Databroker'),
            React.createElement('li', null, React.createElement('strong', null, 'EV Range Extender'), ' — battery management with power-save mode'),
            React.createElement('li', null, React.createElement('strong', null, 'Signal Reporter'), ' — relays signals to the live dashboard')
          )
        )
      )
    ),

    // Header
    React.createElement('header', { style: styles.header },
      React.createElement('div', { style: styles.headerLeft },
        React.createElement('h1', { style: styles.title }, 'AOS Cloud Deployment'),
        
      ),
      React.createElement('div', { style: styles.headerRight },
        React.createElement('button', {
          onClick: () => setShowGuide(!showGuide),
          style: {
            width: '28px', height: '28px', borderRadius: '50%', border: '1px solid #e5e7eb',
            backgroundColor: showGuide ? '#3b82f6' : 'white', color: showGuide ? 'white' : '#6b7280',
            fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          },
          title: 'Quick Setup Guide'
        }, '?'),
        React.createElement('select', {
          value: selectedPreset,
          onChange: (e: any) => handlePresetChange(e.target.value),
          style: styles.select
        },
          React.createElement('option', { value: 'custom' }, 'Write your own code'),
          React.createElement('optgroup', { label: 'Example Presets' },
            React.createElement('option', { value: 'helloAos' }, 'Hello AOS — simple starter'),
            React.createElement('option', { value: 'kuksaWriter' }, 'Signal Writer — write vehicle signals'),
            React.createElement('option', { value: 'kuksaReader' }, 'KUKSA Reader — read vehicle signals'),
            React.createElement('option', { value: 'evRangeExtender' }, 'EV Range Extender — battery management'),
            React.createElement('option', { value: 'signalReporter' }, 'Signal Reporter — relay to dashboard')
          )
        ),
        React.createElement('span', {
          style: { fontSize: '12px', color: '#6b7280', fontWeight: 500 },
          title: 'The compiled binary name. Must match the "cmd" field in config.yaml (e.g. cmd: /my-app). Auto-filled when selecting a preset.'
        }, 'App name:'),
        React.createElement('input', {
          type: 'text',
          value: appName,
          onChange: (e: any) => setAppName(e.target.value),
          placeholder: 'e.g. my-service',
          title: 'Binary name for the compiled service. Must match cmd in config.yaml.',
          style: { ...styles.input, ...styles.inputSm }
        })
      )
    ),

    // Main Content
    React.createElement('div', { style: styles.content },

      // Left Column - Docker Instances
      showDockerPanel && React.createElement('div', { style: styles.dockerColumn },
        React.createElement('div', { style: styles.card },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '🐳'),
              'Docker Instances'
            ),
            React.createElement('button', {
              onClick: () => fetchDockerInstances(),
              style: styles.iconButton,
              title: 'Refresh'
            }, '↻')
          ),
          // Summary
          React.createElement('div', { style: styles.summaryCard },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } },
              React.createElement('div', null,
                React.createElement('div', { style: styles.summaryText }, 'Online'),
                React.createElement('div', { style: styles.summaryNumber }, onlineCount)
              ),
              React.createElement('div', null,
                React.createElement('div', { style: styles.summaryText }, 'Total'),
                React.createElement('div', { style: styles.summaryNumber }, dockerInstances.length)
              )
            )
          ),
          // Filter Tabs
          React.createElement('div', { style: styles.dockerTabs },
            React.createElement('button', {
              onClick: () => setFilterOnline(false),
              style: { ...styles.tab, ...(!filterOnline ? styles.tabActive : {}) }
            }, 'All Devices'),
            React.createElement('button', {
              onClick: () => setFilterOnline(true),
              style: { ...styles.tab, ...(filterOnline ? styles.tabActive : {}) }
            }, 'Online Only')
          ),
          // Instance List
          React.createElement('div', { style: styles.dockerList },
            filteredInstances.length === 0
              ? React.createElement('div', { style: styles.empty },
                  filterOnline ? 'No online devices' : 'No Docker instances found'
                )
              : filteredInstances.map((instance) =>
                  React.createElement('div', {
                    key: instance.instance_id,
                    onClick: () => handleSelectDocker(instance),
                    style: {
                      ...styles.dockerItem,
                      ...(selectedInstance === instance.instance_id ? styles.dockerItemSelected : {}),
                      ...(instance.online ? styles.dockerItemOnline : styles.dockerItemOffline)
                    }
                  },
                    React.createElement('div', { style: styles.dockerItemInfo },
                      React.createElement('div', { style: styles.dockerItemName }, instance.name),
                      React.createElement('div', { style: styles.dockerItemId }, instance.instance_id)
                    ),
                    React.createElement('div', { style: styles.onlineIndicator },
                      React.createElement('span', {
                        style: instance.online ? styles.onlineDot : styles.offlineDot
                      }),
                      React.createElement('span', {
                        style: instance.online ? styles.onlineText : styles.offlineText
                      }, instance.online ? 'Online' : 'Offline')
                    )
                  )
                )
          )
        ),

        // Certificate Panel (collapsible)
        React.createElement('div', { style: { ...styles.card, marginTop: '8px', padding: showAdvanced ? 0 : '8px 12px' } },
          React.createElement('div', {
            onClick: () => setShowAdvanced(!showAdvanced),
            style: {
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: showAdvanced ? '8px 12px' : 0, cursor: 'pointer', userSelect: 'none'
            }
          },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 500, color: '#374151' } },
              React.createElement('span', null, '🔐'),
              'Certificate',
              React.createElement('span', {
                style: {
                  width: '8px', height: '8px', borderRadius: '50%',
                  backgroundColor: certStatus === null ? '#d97706' : certStatus.loaded ? '#16a34a' : '#dc2626'
                }
              }),
              React.createElement('span', { style: { fontSize: '11px', fontWeight: 400, color: certStatus === null ? '#d97706' : certStatus.loaded ? '#16a34a' : '#dc2626' } },
                certStatus === null ? 'Checking...' : certStatus.loaded ? 'Loaded' : 'Missing'
              )
            ),
            React.createElement('span', { style: { fontSize: '10px', color: '#9ca3af' } }, showAdvanced ? '▲ Hide' : '▼ Upload')
          ),
          showAdvanced && React.createElement('div', { style: { padding: '0 12px 12px', borderTop: '1px solid #f3f4f6', marginTop: '8px', paddingTop: '10px' } },
            certError && React.createElement('div', { style: { fontSize: '12px', color: '#dc2626', marginBottom: '8px' } }, certError),
            React.createElement('label', {
              style: {
                ...styles.button, ...styles.buttonSm,
                ...(connectionStatus !== 'connected' || isUploadingCert ? styles.buttonDisabled : {}),
                textAlign: 'center', cursor: connectionStatus === 'connected' && !isUploadingCert ? 'pointer' : 'not-allowed',
                display: 'block'
              }
            },
              React.createElement('input', {
                type: 'file', accept: '.p12,.pfx', onChange: handleCertUpload,
                disabled: connectionStatus !== 'connected' || isUploadingCert,
                style: { display: 'none' }
              }),
              isUploadingCert ? 'Uploading...' : '📁 Upload .p12 file'
            )
          )
        ),

        // AosCloud Service Card
        React.createElement('div', { style: { ...styles.card, marginTop: '12px' } },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '☁️'),
              'AosCloud Service'
            ),
            React.createElement('button', {
              onClick: fetchAosCloudServices,
              disabled: isLoadingAosCloud || connectionStatus !== 'connected',
              style: { ...styles.iconButton, ...(isLoadingAosCloud ? { opacity: 0.5 } : {}) },
              title: 'Load services from AosCloud'
            }, isLoadingAosCloud ? '⟳' : '↻')
          ),
          React.createElement('div', { style: { padding: '10px 12px' } },
            React.createElement('select', {
              value: selectedServiceUuid,
              onChange: (e: any) => handleServiceChange(e.target.value),
              style: { ...styles.select, width: '100%', fontSize: '12px', padding: '6px 8px' }
            },
              React.createElement('option', { value: '' }, isLoadingAosCloud ? 'Loading services...' : aosServices.length ? '— Select service —' : 'No services found'),
              ...aosServices.map((s: any) =>
                React.createElement('option', { key: s.uuid, value: s.uuid }, s.title || s.uuid)
              )
            ),
            serviceName && React.createElement('div', {
              style: { display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }
            },
              React.createElement('span', { style: { fontSize: '11px', color: '#6c757d', fontFamily: 'monospace' } },
                selectedServiceUuid.substring(0, 8) + '...'
              ),
              React.createElement('button', {
                onClick: () => { navigator.clipboard.writeText(selectedServiceUuid); addLog(`[Copied] Service UUID: ${selectedServiceUuid}`) },
                style: { ...styles.iconButton, width: '20px', height: '20px', fontSize: '11px' },
                title: selectedServiceUuid
              }, '📋')
            ),
            serviceVersions.length > 0 && React.createElement('div', {
              style: { display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }
            },
              ...serviceVersions.slice(0, 5).map((v: any) =>
                React.createElement('span', {
                  key: v.version,
                  style: {
                    fontSize: '10px', padding: '2px 6px', borderRadius: '8px',
                    backgroundColor: v === serviceVersions[0] ? '#dbeafe' : '#f3f4f6',
                    color: v === serviceVersions[0] ? '#2563eb' : '#6b7280'
                  }
                }, `v${v.version}`)
              )
            )
          )
        ),

        // Units running this service
        serviceUnits.length > 0 && React.createElement('div', { style: { ...styles.card, marginTop: '8px' } },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '🖥️'),
              `Units (${serviceUnits.length})`
            ),
            React.createElement('button', {
              onClick: () => { if (selectedServiceUuid) loadServiceDetails(selectedServiceUuid) },
              style: styles.iconButton,
              title: 'Refresh units status'
            }, '↻')
          ),
          React.createElement('div', { style: { maxHeight: '150px', overflowY: 'auto' } },
            ...serviceUnits.map((u: any) =>
              React.createElement('div', {
                key: u.uid,
                onClick: () => loadUnitMonitoring(u.uid),
                style: {
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                  backgroundColor: selectedMonitorUnit === u.uid ? '#f0f7ff' : 'transparent'
                }
              },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 } },
                  React.createElement('span', {
                    style: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: u.online ? '#16a34a' : '#dc2626' }
                  }),
                  React.createElement('span', { style: { fontSize: '12px', fontWeight: 500 } }, u.name),
                  React.createElement('button', {
                    onClick: (e: any) => { e.stopPropagation(); navigator.clipboard.writeText(u.uid); addLog(`[Copied] Unit UID: ${u.uid}`) },
                    style: { ...styles.iconButton, width: '18px', height: '18px', fontSize: '10px', flexShrink: 0 },
                    title: u.uid
                  }, '📋')
                ),
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 } },
                  u.version && React.createElement('span', {
                    style: { fontSize: '10px', padding: '1px 5px', borderRadius: '6px', backgroundColor: '#e7f3ff', color: '#2563eb' }
                  }, `v${u.version}`),
                  u.error && React.createElement('span', {
                    style: { fontSize: '10px', color: '#dc2626' }, title: u.error
                  }, '⚠')
                )
              )
            )
          )
        ),

        // Unit Monitoring (hide when error/forbidden)
        unitMonitoring && unitMonitoring.status !== 'error' && React.createElement('div', { style: { ...styles.card, marginTop: '8px' } },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '📈'),
              'Monitoring'
            ),
            React.createElement('button', {
              onClick: () => loadUnitMonitoring(selectedMonitorUnit),
              style: styles.iconButton, title: 'Refresh'
            }, '↻')
          ),
          unitMonitoring.status === 'error'
          ? React.createElement('div', { style: { padding: '12px', fontSize: '12px', color: '#6c757d', textAlign: 'center' } },
              unitMonitoring.message?.includes('forbidden') ? 'Monitoring not available with current certificate' : (unitMonitoring.message || 'Unavailable')
            )
          : React.createElement('div', { style: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' } },
            // CPU bar
            React.createElement('div', null,
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' } },
                React.createElement('span', { style: { color: '#6c757d' } }, 'CPU'),
                React.createElement('span', { style: { fontWeight: 500 } }, `${Math.round(unitMonitoring.cpu || 0)}%`)
              ),
              React.createElement('div', { style: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' } },
                React.createElement('div', { style: { height: '100%', width: `${Math.min(unitMonitoring.cpu || 0, 100)}%`, backgroundColor: (unitMonitoring.cpu || 0) > 80 ? '#dc2626' : '#3b82f6', borderRadius: '3px', transition: 'width 0.3s' } })
              )
            ),
            // RAM bar
            React.createElement('div', null,
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' } },
                React.createElement('span', { style: { color: '#6c757d' } }, 'RAM'),
                React.createElement('span', { style: { fontWeight: 500 } },
                  unitMonitoring.ram?.total ? `${Math.round((unitMonitoring.ram.used / unitMonitoring.ram.total) * 100)}%` : '—'
                )
              ),
              React.createElement('div', { style: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' } },
                React.createElement('div', { style: {
                  height: '100%',
                  width: unitMonitoring.ram?.total ? `${Math.min((unitMonitoring.ram.used / unitMonitoring.ram.total) * 100, 100)}%` : '0%',
                  backgroundColor: '#8b5cf6', borderRadius: '3px', transition: 'width 0.3s'
                } })
              )
            ),
            // Disk bar
            React.createElement('div', null,
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' } },
                React.createElement('span', { style: { color: '#6c757d' } }, 'Disk'),
                React.createElement('span', { style: { fontWeight: 500 } },
                  unitMonitoring.disk?.total ? `${Math.round((unitMonitoring.disk.used / unitMonitoring.disk.total) * 100)}%` : '—'
                )
              ),
              React.createElement('div', { style: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' } },
                React.createElement('div', { style: {
                  height: '100%',
                  width: unitMonitoring.disk?.total ? `${Math.min((unitMonitoring.disk.used / unitMonitoring.disk.total) * 100, 100)}%` : '0%',
                  backgroundColor: '#f59e0b', borderRadius: '3px', transition: 'width 0.3s'
                } })
              )
            )
          )
        ),

        // Alerts
        alerts.length > 0 && React.createElement('div', { style: { ...styles.card, marginTop: '8px' } },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '⚠️'),
              `Alerts (${alerts.length})`
            )
          ),
          React.createElement('div', { style: { maxHeight: '120px', overflowY: 'auto' } },
            ...alerts.slice(0, 8).map((a: any, i: number) =>
              React.createElement('div', {
                key: a.id || i,
                style: { padding: '6px 12px', borderBottom: '1px solid #f3f4f6', fontSize: '11px' }
              },
                React.createElement('div', { style: { color: '#dc2626', fontWeight: 500 } }, a.tag || 'Alert'),
                React.createElement('div', { style: { color: '#6c757d', marginTop: '2px' } },
                  typeof a.message === 'string' ? a.message.substring(0, 80) : JSON.stringify(a.message).substring(0, 80)
                )
              )
            )
          )
        ),

      ),  // End of dockerColumn

      // Middle Column - Tabbed Code Editor
      React.createElement('div', { style: styles.editorsColumn },

        // Editor with tabs
        React.createElement('div', { style: { ...styles.card, ...styles.editorCard, flex: 1, display: 'flex', flexDirection: 'column' as const } },
          // Tab bar
          React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' } },
            React.createElement('button', {
              onClick: () => setActiveEditorTab('cpp'),
              style: {
                padding: '8px 16px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeEditorTab === 'cpp' ? '#fff' : 'transparent',
                color: activeEditorTab === 'cpp' ? '#2563eb' : '#6b7280',
                borderBottom: activeEditorTab === 'cpp' ? '2px solid #2563eb' : '2px solid transparent'
              }
            }, '📄 main.cpp'),
            React.createElement('button', {
              onClick: () => setActiveEditorTab('yaml'),
              style: {
                padding: '8px 16px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeEditorTab === 'yaml' ? '#fff' : 'transparent',
                color: activeEditorTab === 'yaml' ? '#2563eb' : '#6b7280',
                borderBottom: activeEditorTab === 'yaml' ? '2px solid #2563eb' : '2px solid transparent'
              }
            }, '⚙️ config.yaml')
          ),
          // Active editor with line numbers
          React.createElement('div', { style: styles.editorContainer },
            React.createElement('pre', { style: styles.lineNumbers },
              (activeEditorTab === 'cpp' ? cppCode : yamlConfig).split('\n').map((_: string, i: number) => `${i + 1}`).join('\n')
            ),
            React.createElement('textarea', {
              style: { ...styles.textarea, flex: 1 },
              value: activeEditorTab === 'cpp' ? cppCode : yamlConfig,
              onChange: (e: any) => activeEditorTab === 'cpp' ? setCppCode(e.target.value) : setYamlConfig(e.target.value),
              placeholder: activeEditorTab === 'cpp' ? '// Enter your C++ code here...' : '# Enter your YAML configuration here...',
              spellCheck: false
            })
          )
        ),

        // Action Buttons
        React.createElement('div', { style: styles.actions },
          React.createElement('button', {
            onClick: handleBuildDeploy,
            disabled: isBuilding || connectionStatus !== 'connected' || !selectedInstance,
            style: { ...styles.button, ...styles.buttonPrimary, ...(isBuilding || connectionStatus !== 'connected' || !selectedInstance ? styles.buttonDisabled : {}) },
            title: !selectedInstance ? 'Select a Docker instance first' : ''
          },
            isBuilding
              ? React.createElement(React.Fragment, null,
                  React.createElement('span', { style: styles.spinner }),
                  ' Building...'
                )
              : React.createElement(React.Fragment, null,
                  React.createElement('span', null, '⚡'),
                  ' Build & Deploy'
                )
          ),
          // Auto-increment version toggle
          React.createElement('label', {
            style: {
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '12px', color: '#6b7280', cursor: 'pointer', userSelect: 'none'
            }
          },
            React.createElement('input', {
              type: 'checkbox',
              checked: autoIncVersion,
              onChange: (e: any) => setAutoIncVersion(e.target.checked),
              style: { cursor: 'pointer' }
            }),
            'Auto-increment version'
          ),
          // Warning hint when no instance selected
          !selectedInstance && React.createElement('div', {
            style: {
              padding: '8px 12px',
              marginTop: '8px',
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#856404',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }
          },
            React.createElement('span', null, '⚠️'),
            React.createElement('span', null, 'Select a Docker instance from the list to build & deploy')
          )
        )
      ),

      // Right Column - Status & Logs
      React.createElement('div', { style: styles.statusColumn },

        // Build Status Banner
        buildStatus && React.createElement('div', {
          style: {
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: buildStatus.includes('successfully') ? '#f0fdf4' :
                             buildStatus.includes('failed') || buildStatus.includes('Error') ? '#fef2f2' : '#eff6ff',
            color: buildStatus.includes('successfully') ? '#166534' :
                   buildStatus.includes('failed') || buildStatus.includes('Error') ? '#991b1b' : '#1e40af',
            border: `1px solid ${buildStatus.includes('successfully') ? '#bbf7d0' :
                     buildStatus.includes('failed') || buildStatus.includes('Error') ? '#fecaca' : '#bfdbfe'}`
          }
        },
          React.createElement('span', null,
            buildStatus.includes('successfully') ? '✓' :
            buildStatus.includes('failed') || buildStatus.includes('Error') ? '✗' :
            isBuilding ? '⟳' : '●'
          ),
          buildStatus
        ),

        // Deployed Apps Card (hide when empty)
        deployedApps.length > 0 && React.createElement('div', { style: styles.card },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '🚀'),
              'Deployed Apps'
            ),
            React.createElement('button', {
              onClick: refreshApps,
              style: styles.iconButton,
              title: 'Refresh'
            }, '↻')
          ),
          React.createElement('div', { style: styles.appsList },
            deployedApps.length === 0
              ? React.createElement('div', { style: styles.empty }, 'No applications deployed')
              : deployedApps.map((app) =>
                  React.createElement('div', {
                    key: app.app_id,
                    style: styles.appItem
                  },
                    React.createElement('div', { style: styles.appInfo },
                      React.createElement('span', { style: styles.appName }, app.name),
                      React.createElement('span', { style: { ...styles.statusBadge, ...getStatusBadgeStyle(app.status) } }, getStatusClass(app.status))
                    ),
                    React.createElement('div', { style: styles.appActions },
                      (app.status === 'stopped' || app.status === 'deployed') &&
                        React.createElement('button', {
                          onClick: () => handleStartApp(app.app_id),
                          style: { ...styles.actionBtn, ...styles.actionStart },
                          title: 'Start'
                        }, '▶'),
                      app.status === 'running' &&
                        React.createElement('button', {
                          onClick: () => handleStopApp(app.app_id),
                          style: { ...styles.actionBtn, ...styles.actionStop },
                          title: 'Stop'
                        }, '■')
                    )
                  )
                )
          )
        ),

        // Build Logs Card
        React.createElement('div', { style: { ...styles.card, ...styles.logsCard } },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '📋'),
              'Build Logs'
            ),
            React.createElement('button', {
              onClick: () => setBuildLogs([]),
              style: styles.iconButton,
              title: 'Clear logs'
            }, '✕')
          ),
          React.createElement('div', { ref: buildLogsRef, style: styles.logs },
            buildLogs.length === 0
              ? React.createElement('div', { style: styles.empty }, 'No logs yet')
              : buildLogs.map((log, i) =>
                  React.createElement('div', {
                    key: i,
                    style: styles.logEntry
                  }, log)
                )
          )
        ),

        // Service Stdout Panel
        React.createElement('div', { style: { ...styles.card, ...styles.logsCard } },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement('span', { style: styles.cardIcon }, '📡'),
              'Service Output'
            ),
            React.createElement('div', { style: { display: 'flex', gap: '4px' } },
              React.createElement('button', {
                onClick: async () => {
                  if (!aosServiceRef.current || !selectedMonitorUnit) return
                  setIsRequestingLog(true)
                  try {
                    const unit = serviceUnits.find((u: any) => u.uid === selectedMonitorUnit)
                    const sshPort = unit?.sshPort || 8942
                    const res = await aosServiceRef.current.getServiceStdout(sshPort, 80)
                    if (res.status === 'success' && res.logs) {
                      setServiceLogs(res.logs.split('\n').filter((l: string) => l.trim()).map((l: string, i: number) => ({ id: i, text: l })))
                    } else {
                      setServiceLogs([{ id: 0, text: res.message || 'No output available' }])
                    }
                  } catch (err: any) {
                    setServiceLogs([{ id: 0, text: `Error: ${err.message}` }])
                  } finally {
                    setIsRequestingLog(false)
                  }
                },
                disabled: isRequestingLog || !selectedMonitorUnit,
                style: {
                  ...styles.button, ...styles.buttonSm,
                  ...(isRequestingLog || !selectedMonitorUnit ? styles.buttonDisabled : {})
                },
                title: 'Fetch service stdout from VM'
              }, isRequestingLog ? '⟳ Loading...' : '↻ Refresh'),
              React.createElement('button', {
                onClick: () => setServiceLogs([]),
                style: styles.iconButton,
                title: 'Clear'
              }, '✕')
            )
          ),
          React.createElement('div', { style: styles.logs },
            serviceLogs.length === 0
              ? React.createElement('div', { style: styles.empty },
                  selectedMonitorUnit
                    ? 'Click Refresh to view service output from the VM'
                    : 'Select a unit first'
                )
              : serviceLogs.map((log: any) =>
                  React.createElement('div', {
                    key: log.id,
                    style: { ...styles.logEntry, fontSize: '11px', lineHeight: 1.4 }
                  }, log.text)
                )
          )
        ),

      )
    )
  )
}
