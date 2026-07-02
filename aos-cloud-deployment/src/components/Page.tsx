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

  const [languageMode, setLanguageMode] = React.useState<'cpp' | 'python'>('python')
  const [cppCode, setCppCode] = React.useState((PRESETS as any).helloAos?.cpp || '')
  const [pythonCode, setPythonCode] = React.useState((PRESETS as any).helloPython?.python || '')
  const [yamlConfig, setYamlConfig] = React.useState((PRESETS as any).helloPython?.yaml || (PRESETS as any).helloAos?.yaml || '')
  const [appName, setAppName] = React.useState('hello-world-python')
  const [isBuilding, setIsBuilding] = React.useState(false)
  const [buildStatus, setBuildStatus] = React.useState<string>('')
  const [buildLogs, setBuildLogs] = React.useState<string[]>([])
  const [deployedApps, setDeployedApps] = React.useState<AosApp[]>([])
  const [connectionStatus, setConnectionStatus] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [selectedPreset, setSelectedPreset] = React.useState('custom')
  const [autoIncVersion, setAutoIncVersion] = React.useState(true)
  const [autoSyncServiceUid, setAutoSyncServiceUid] = React.useState(true)
  const [activeEditorTab, setActiveEditorTab] = React.useState<'cpp' | 'python' | 'yaml'>('python')
  const cppCodeRef = React.useRef(cppCode)
  const pythonCodeRef = React.useRef(pythonCode)
  const yamlConfigRef = React.useRef(yamlConfig)
  cppCodeRef.current = cppCode
  pythonCodeRef.current = pythonCode
  yamlConfigRef.current = yamlConfig

  // Docker instances state
  const [dockerInstances, setDockerInstances] = React.useState<DockerInstance[]>([])
  const [selectedInstance, setSelectedInstance] = React.useState<string>('')
  const [showDockerPanel, setShowDockerPanel] = React.useState<boolean>(true)

  // Deployment status state
  const [deploymentStatus, setDeploymentStatus] = React.useState<DeploymentStatusResponse | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = React.useState<boolean>(false)
  const [statusError, setStatusError] = React.useState<string>('')

  // Certificate state
  type CertIdentity = {
    cn?: string | null
    issuer?: string | null
    notBefore?: string | null
    notAfter?: string | null
    expiresInDays?: number | null
  } | null
  const [certStatus, setCertStatus] = React.useState<{
    loaded: boolean
    source: string
    size?: number
    message?: string
    identity?: CertIdentity
  } | null>(null)
  const [isUploadingCert, setIsUploadingCert] = React.useState<boolean>(false)
  const [isRemovingCert, setIsRemovingCert] = React.useState<boolean>(false)
  const [certError, setCertError] = React.useState<string>('')

  // AosCloud state
  const [aosServices, setAosServices] = React.useState<any[]>([])
  const [selectedServiceUuid, setSelectedServiceUuid] = React.useState<string>('')
  const [selectedServiceCodename, setSelectedServiceCodename] = React.useState<string>('')
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

  // Unit-detail overlay: opened when the user clicks a unit row. Holds the
  // uid of the unit to show details for; null = closed.
  const [detailUnitUid, setDetailUnitUid] = React.useState<string | null>(null)

  // Lucide-style line icons. Path strings copied from lucide.dev (the same
  // set the host uses). Multiple subpaths joined with '|'. Renders as a 24x24
  // viewBox SVG with currentColor stroke — colour and size controlled by the
  // caller via props or ambient CSS.
  const ICONS: Record<string, string> = {
    'box':             'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z|m3.3 7 8.7 5 8.7-5|M12 22V12',
    'shield-check':    'M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.79 17 5 19 5a1 1 0 0 1 1 1z|m9 12 2 2 4-4',
    'cloud':           'M17.5 19a4.5 4.5 0 1 0 0-9c0-3.31-2.69-6-6-6a6 6 0 0 0-5.29 8.79c-1.43.95-2.21 2.65-2.21 4.21a4 4 0 0 0 4 4z',
    'server':          'M5 12h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z|M5 4h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z|M6 8h.01|M6 16h.01',
    'clipboard-list':  'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2|M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z|M12 11h4|M12 16h4|M8 11h.01|M8 16h.01',
    'rocket':          'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z|m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z|M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0|M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5',
    'activity':        'M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.5.5 0 0 1-.96 0L9.68 3.18a.5.5 0 0 0-.96 0l-2.35 8.36A2 2 0 0 1 4.45 13H2',
    'triangle-alert':  'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z|M12 9v4|M12 17h.01',
    'file-code':       'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v4a2 2 0 0 0 2 2h4|m9 18 3-3-3-3|m5 12-3 3 3 3',
    'settings':        'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z|M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    'refresh':         'M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16|M8 16H3v5',
    'x':               'M18 6 6 18|m6 6 12 12',
    'upload':          'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|M17 8l-5-5-5 5|M12 3v12',
    'trash':           'M3 6h18|m19 6-1.4 14a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8L5 6|M10 11v6|M14 11v6|M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2',
    'copy':            'M16 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z|M4 6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2',
    'check':           'M20 6 9 17l-5-5',
    'chevron-down':    'm6 9 6 6 6-6',
    'chevron-up':      'm18 15-6-6-6 6',
    'maximize':        'M8 3H5a2 2 0 0 0-2 2v3|M21 8V5a2 2 0 0 0-2-2h-3|M3 16v3a2 2 0 0 0 2 2h3|M16 21h3a2 2 0 0 0 2-2v-3'
  }
  type IconName = keyof typeof ICONS
  const Icon = ({ name, size = 16, stroke = 2, color = 'currentColor', style }: { name: IconName; size?: number; stroke?: number; color?: string; style?: any }) => {
    const d = ICONS[name]
    if (!d) return null
    return React.createElement('svg', {
      width: size, height: size, viewBox: '0 0 24 24',
      fill: 'none', stroke: color, strokeWidth: stroke,
      strokeLinecap: 'round', strokeLinejoin: 'round',
      style: { display: 'inline-block', flexShrink: 0, verticalAlign: 'middle', ...(style || {}) }
    }, ...d.split('|').map((p: string, i: number) =>
      React.createElement('path', { key: i, d: p })
    ))
  }

  // Styles
  const styles = {
    page: {
      width: '100%',
      height: '100%',
      // Cap to viewport height so plugin mode (where the host may not
      // constrain height) still gives flex children a finite size. Without
      // this, dockerColumn's overflowY:auto can't engage and the left
      // column overflows when the user zooms in or the viewport shrinks.
      maxHeight: '100vh',
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
      overflow: 'hidden'
    },
    dockerColumn: {
      width: '280px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
      flexShrink: 0,
      minHeight: 0,
      overflowY: 'auto' as const,
      paddingRight: '4px'
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
    },
    editorContainer: {
      display: 'flex',
      flex: 1,
      overflow: 'hidden',
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
      animation: 'aos-spin 0.8s linear infinite',
      display: 'inline-block'
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
    const service = new AosService(serviceUrl, selectedInstance || 'AET-ORCHESTRATOR')
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
    // With the orchestrator architecture, there is a single entry point.
    // The orchestrator auto-routes to per-user workers based on cert identity.
    const orchestratorId = 'AET-ORCHESTRATOR';
    const orchestratorInst: DockerInstance = {
      instance_id: orchestratorId,
      name: 'AOS Edge Toolchain',
      online: true,
      last_seen: new Date().toISOString(),
      type: 'aos-edge-toolchain',
      suffix: 'AET'
    };
    setDockerInstances([orchestratorInst]);
    if (!selectedInstance) {
      setSelectedInstance(orchestratorId);
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
      setCertStatus({
        loaded: result.certLoaded,
        source: result.source || 'none',
        size: result.certSize,
        message: result.message,
        identity: result.identity ?? null
      })
      // Capture worker info from orchestrator response
      if (result.worker) {
        setWorkerInfo(result.worker)
      }
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
        const items = res.items || []
        setAosServices(items)
        if (!selectedServiceUuid && res.defaults?.serviceUuid) {
          setSelectedServiceUuid(res.defaults.serviceUuid)
          const svc = items.find((s: any) => s.uuid === res.defaults.serviceUuid)
          if (svc?.codename) setSelectedServiceCodename(svc.codename)
          loadServiceDetails(res.defaults.serviceUuid)
        } else if (!selectedServiceUuid && items.length) {
          setSelectedServiceUuid(items[0].uuid)
          if (items[0].codename) setSelectedServiceCodename(items[0].codename)
          loadServiceDetails(items[0].uuid)
        }
        addLog(`[AosCloud] Loaded ${items.length} services`)
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
          // Update version in code (C++ or Python) and YAML
          if (languageMode === 'python') {
            setPythonCode(prev => prev.replace(/VERSION\s*=\s*"[^"]+"/, `VERSION = "${next}"`))
          } else {
            setCppCode(prev => prev.replace(/#define\s+VERSION\s+"[^"]+"/, `#define VERSION "${next}"`))
          }
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
          loadUnitInfo(firstUid)
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
    setShowAllUnits(false)

    // Look up the codename from the services list
    const svc = aosServices.find((s: any) => s.uuid === uuid)
    const codename = svc?.codename || ''
    setSelectedServiceCodename(codename)

    // Auto-sync: replace UUID-based identity with codename in config.yaml.
    // When a service is selected, its codename replaces any id:/service_uid:
    // field so the YAML uses the human-readable codename as the primary identity.
    if (uuid && autoSyncServiceUid) {
      setYamlConfig(prev => {
        let next = prev
        let synced = false

        const isUuidLike = (s: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(s)
        if (codename && !isUuidLike(codename)) {
          // Replace v2 id: <uuid> with codename: "<codename>"
          if (/(\s+)id:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
            next = next.replace(/(\s+)id:\s*["']?[a-f0-9-]+["']?/i, `$1codename: "${codename}"`)
            synced = true
          }
          // Replace v1 service_uid: <uuid> with codename: "<codename>"
          if (/service_uid:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
            next = next.replace(/service_uid:\s*["']?[a-f0-9-]+["']?/i, `codename: "${codename}"`)
            synced = true
          }
          // Update existing codename only if current one is UUID-like or empty
          const currentCodenameMatch = next.match(/codename:\s*["']?([^"'\n]+)["']?/)
          if (currentCodenameMatch) {
            const currentCodename = currentCodenameMatch[1]
            if (!currentCodename || isUuidLike(currentCodename)) {
              next = next.replace(/codename:\s*["']?[^"'\n]+["']?/, `codename: "${codename}"`)
              synced = true
            }
          }
        } else if (!codename) {
          // No codename — fall back to UUID sync
          if (/(\s+)id:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
            next = next.replace(/(\s+)id:\s*["']?[a-f0-9-]+["']?/i, `$1id: ${uuid}`)
            synced = true
          }
          if (/service_uid:\s*["']?[a-f0-9-]+["']?/i.test(next)) {
            next = next.replace(/service_uid:\s*["']?[a-f0-9-]+["']?/i, `service_uid: ${uuid}`)
            synced = true
          }
        }

        if (synced) {
          addLog(`[Config] Auto-synced codename: ${codename || uuid}`)
        } else {
          addLog(`[Config] No id, service_uid, or codename field found in config.yaml — not synced`)
        }
        return next
      })
    }

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

  const loadUnitInfo = async (uid: string) => {
    if (!aosServiceRef.current || !uid) return
    try {
      const res = await aosServiceRef.current.getUnitInfo(uid)
      if (res.status === 'success') {
        setUnitInfo({
          name: res.name,
          onlineStatus: res.onlineStatus,
          versions: res.versions,
          nodeCount: res.nodeCount
        })
        const verParts = res.versions && Object.keys(res.versions).length > 0
          ? Object.entries(res.versions).map(([k, v]) => `${k}=${v}`).join(', ')
          : 'no version fields'
        addLog(`[Unit] ${res.name || uid}: ${verParts}, ${res.nodeCount} node(s), ${res.onlineStatus}`)
        if (res._rawKeys) {
          addLog(`[Unit] API response keys: ${res._rawKeys.join(', ')}`)
        }
      }
    } catch (err: any) {
      // non-fatal — unit info is supplementary
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

  // Worker info returned by coordinator after cert upload
  const [workerInfo, setWorkerInfo] = React.useState<{ instanceId?: string; port?: number; userCN?: string } | null>(null)

  // Toolchain package versions (fetched after cert upload)
  const [toolchainVersions, setToolchainVersions] = React.useState<Record<string, string> | null>(null)

  // Unit list view toggle: false = this service, true = all units
  const [showAllUnits, setShowAllUnits] = React.useState<boolean>(false)
  const [allUnits, setAllUnits] = React.useState<any[]>([])

  // Unit version info (fetched when a unit is selected)
  const [unitInfo, setUnitInfo] = React.useState<{ name?: string; onlineStatus?: string; versions?: Record<string, string>; nodeCount?: number } | null>(null)

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
        setCertStatus({
          loaded: true,
          source: 'manual',
          size: file.size,
          message: result.message,
          identity: result.identity ?? null
        })
        if (result.identity?.cn) {
          addLog(`[Cert] Identity: CN=${result.identity.cn}, expires ${result.identity.notAfter || '?'}`)
        }
        // Store worker info from orchestrator (port, instanceId, userCN)
        if (result.worker) {
          setWorkerInfo(result.worker)
          addLog(`[Worker] Dedicated environment ready on port ${result.worker.port}`)
        }
        // Fetch toolchain package versions
        try {
          const tcInfo = await aosServiceRef.current.getToolchainInfo()
          if (tcInfo.status === 'success' && tcInfo.packages) {
            setToolchainVersions(tcInfo.packages)
            addLog(`[Toolchain] aos-signer ${tcInfo.packages['aos-signer'] || '?'}, aos-keys ${tcInfo.packages['aos-keys'] || '?'}, aos-prov ${tcInfo.packages['aos-prov'] || '?'}`)
          }
        } catch (tcErr: any) {
          addLog(`[Toolchain] Version check skipped: ${tcErr.message}`)
        }
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

  const handleCertRemove = async () => {
    if (!aosServiceRef.current) return
    if (typeof window !== 'undefined' && !window.confirm('Remove your certificate and shut down your build environment? Other users will not be affected.')) {
      return
    }
    setIsRemovingCert(true)
    setCertError('')
    try {
      const result = await aosServiceRef.current.removeCertificate()
      if (result.status === 'success') {
        addLog(`[Cert] ${result.message}`)
        setCertStatus({ loaded: false, source: 'none', message: result.message, identity: null })
        setWorkerInfo(null)
        setToolchainVersions(null)
      } else {
        setCertError(result.message || 'Remove failed')
      }
    } catch (err: any) {
      setCertError(err.message || 'Remove failed')
      addLog(`[Cert] Remove failed: ${err.message}`)
    } finally {
      setIsRemovingCert(false)
    }
  }

  const handleBuildDeploy = async () => {
    if (!aosServiceRef.current || !aosServiceRef.current.isServiceConnected()) {
      addLog('[Error] Not connected to AOS service')
      return
    }

    setBuildLogs([])

    let finalCode = languageMode === 'python' ? pythonCodeRef.current : cppCodeRef.current
    let finalYaml = yamlConfigRef.current



    setIsBuilding(true)
    setBuildStatus('Starting build...')
    addLog(`[Build] Target: ${selectedInstance}`)
    addLog(`[Build] Starting AOS ${languageMode === 'python' ? 'Python' : 'C++'} application build...`)

    const stageLabels: Record<string, string> = {
      init: 'Init', config: 'Config', proto: 'Proto',
      compile: 'Compile', bundle: 'Bundle',
      sign: 'Sign', upload: 'Publish', error: 'Error'
    }

    // Capture the build ID in a closure-level variable so the timeout
    // recovery path can query the specific build, not just the latest.
    let activeExecutionId: string | undefined

    try {
      const response = await aosServiceRef.current.buildAndDeploy({
        language: languageMode,
        cppCode: languageMode === 'cpp' ? finalCode : undefined,
        pythonCode: languageMode === 'python' ? finalCode : undefined,
        yamlConfig: finalYaml,
      })

      // Save build ID for recovery across page reloads
      if (response.executionId) {
        activeExecutionId = response.executionId
        localStorage.setItem('aos_build_id', response.executionId)
      }

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
        localStorage.removeItem('aos_build_id')
        refreshApps()
        // Refresh the AosCloud Service card so the new version shows up
        // (and, if auto-inc is on, the editor bumps to the next version
        // ready for the next build). Small delay gives AosCloud a moment
        // to register the freshly uploaded version.
        if (selectedServiceUuid) {
          setTimeout(() => {
            loadServiceDetails(selectedServiceUuid)
            addLog('[AosCloud] Refreshed service versions and units')
          }, 1000)
        }
      } else if (response.status === 'error') {
        const lastLog = (response.message || '').split('\n').filter((l: string) => l.trim()).pop() || 'Unknown error'
        setBuildStatus(`Build failed: ${lastLog.replace(/^\[.*?\]\s*/, '').slice(0, 80)}`)
        setIsBuilding(false)
        localStorage.removeItem('aos_build_id')
      } else {
        setBuildStatus('Build completed')
        setIsBuilding(false)
        localStorage.removeItem('aos_build_id')
      }
    } catch (err: any) {
      const msg = err.message || 'Unknown error'
      if (msg.includes('\n')) {
        msg.split('\n').filter((l: string) => l.trim()).forEach((line: string) => addLog(line))
      } else {
        addLog(`[Error] ${msg}`)
      }

      // If the request timed out, the build may still be running on the worker.
      // Try to recover by polling build status for the specific execution.
      if (msg.includes('timeout') || msg.includes('Timeout')) {
        addLog('[Build] Request timed out — the build may still be running. Checking status...')
        setBuildStatus('Build timed out — checking if build is still running...')
        try {
          const statusRes = await aosServiceRef.current.getBuildStatus(activeExecutionId)
          // When an executionId is passed, the response has a singular "build" field;
          // without one it returns a "builds" array.
          const build = statusRes.build || (statusRes.builds && statusRes.builds.length > 0
            ? statusRes.builds[statusRes.builds.length - 1]
            : null)

          if (build) {
            if (build.status === 'success') {
              addLog('[Build] Build completed successfully on the server!')
              setBuildStatus('Build completed successfully!')
              setIsBuilding(false)
              localStorage.removeItem('aos_build_id')
              refreshApps()
              if (selectedServiceUuid) {
                setTimeout(() => {
                  loadServiceDetails(selectedServiceUuid)
                  addLog('[AosCloud] Refreshed service versions and units')
                }, 1000)
              }
              return  // Don't fall through to the error display below
            } else if (build.status === 'building' || build.status === 'running') {
              addLog('[Build] Build is still in progress on the server. It will complete shortly.')
              setBuildStatus('Build still running on server — check back soon')
              // Keep isBuilding=true so the spinner stays visible while the
              // build is still in progress. The user can refresh the page to
              // trigger the localStorage-based recovery path.
              localStorage.removeItem('aos_build_id')
              return
            } else if (build.status === 'error') {
              addLog(`[Build] Build failed on server: ${build.message || 'Unknown error'}`)
              setBuildStatus('Build failed on server')
            } else {
              addLog(`[Build] Unexpected build status: ${build.status}`)
              setBuildStatus(`Build status: ${build.status}`)
            }
          } else {
            addLog('[Build] No build status available — the build may not have started.')
            setBuildStatus('Build timed out — no status available')
          }
        } catch (statusErr: any) {
          addLog(`[Build] Could not check build status: ${statusErr.message}`)
          setBuildStatus('Build timed out — could not check status')
        }
        setIsBuilding(false)
        localStorage.removeItem('aos_build_id')
        return
      }

      const lastLine = msg.split('\n').filter((l: string) => l.trim()).pop() || msg
      let statusText = `Build failed: ${lastLine.replace(/^\[.*?\]\s*/, '').slice(0, 80)}`

      // Append recovery hints for known error patterns
      if (msg.includes('re-upload')) {
        statusText += ' → Go to Setup panel and upload your .p12 again'
      } else if (msg.includes('No certificate uploaded')) {
        statusText += ' → Go to Setup panel and upload your .p12 first'
      }

      setBuildStatus(statusText)
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

  // Switch between C++ and Python mode — resets editor to the default preset
  const switchLanguage = (lang: 'cpp' | 'python') => {
    if (lang === languageMode) return
    setLanguageMode(lang)
    if (lang === 'cpp') {
      const preset = (PRESETS as any).helloAos
      if (preset) {
        setCppCode(preset.cpp || '')
        setYamlConfig(preset.yaml || '')
        setAppName(preset.appName || 'hello-aos')
        setActiveEditorTab('cpp')
        setSelectedPreset('helloAos')
      }
    } else {
      const preset = (PRESETS as any).helloPython
      if (preset) {
        setPythonCode(preset.python || '')
        setYamlConfig(preset.yaml || '')
        setAppName(preset.appName || 'hello-world-python')
        setActiveEditorTab('python')
        setSelectedPreset('helloPython')
      }
    }
  }

  const handlePresetChange = (presetName: string) => {
    setSelectedPreset(presetName)
    const preset = (PRESETS as any)[presetName]
    if (preset) {
      const isPython = preset.language === 'python' || !!preset.python
      let code = isPython ? preset.python : preset.cpp
      let yaml = preset.yaml

      if (isPython) {
        setLanguageMode('python')
        setActiveEditorTab('python')
      } else {
        setLanguageMode('cpp')
        setActiveEditorTab('cpp')
      }

      if (autoIncVersion && serviceVersions.length > 0) {
        const latest = serviceVersions[0].version
        const parts = latest.split('.')
        parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1)
        const next = parts.join('.')
        if (isPython) {
          code = code.replace(/VERSION\s*=\s*"[^"]+"/, `VERSION = "${next}"`)
        } else {
          code = code.replace(/#define\s+VERSION\s+"[^"]+"/, `#define VERSION "${next}"`)
        }
        yaml = yaml.replace(/version:\s*"[^"]+"/, `version: "${next}"`)
        addLog(`[Preset] Loaded: ${preset.name || presetName} (version: ${next})`)
      } else {
        addLog(`[Preset] Loaded: ${preset.name || presetName}`)
      }

      if (isPython) {
        setPythonCode(code)
      } else {
        setCppCode(code)
      }
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

    // Global keyframes for build-progress animations. Injected once; the GPU
    // handles painting on the compositor thread, so there is no JS cost while
    // animations run.
    React.createElement('style', null,
      '@keyframes aos-spin { to { transform: rotate(360deg); } }' +
      '@keyframes aos-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }' +
      '@keyframes aos-bar { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }'
    ),

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

          React.createElement('h3', { style: { fontSize: '14px', marginTop: 0, marginBottom: '8px' } }, '1. Upload your certificate'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'Click ', React.createElement('strong', null, 'Choose File'), ' in the Setup card and select your .p12 certificate. ',
            'The orchestrator extracts your identity (CN) and creates a dedicated, isolated build environment just for you. ',
            'Once loaded, the Certificate card shows your CN, toolchain versions (aos-signer, aos-keys, aos-prov), and unit info when a unit is selected. ',
            'If your worker becomes unresponsive, Remove and re-upload the certificate to get a fresh environment.'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '2. Choose an AosCloud Service'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'Pick a service from the AosCloud Service dropdown. The service\u2019s codename is synced into ',
            React.createElement('code', null, 'config.yaml'), '. ',
            'Version pills show deployed versions; enable ',
            React.createElement('strong', null, 'Auto-increment version'), ' to bump the patch number after each build.'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '3. Edit your code'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '4px' } },
            'Use the preset dropdown in the header to load a starting point, then edit:'
          ),
          React.createElement('ul', { style: { color: '#6b7280', marginBottom: '16px', paddingLeft: '20px' } },
            React.createElement('li', null, React.createElement('strong', null, 'main.py'), ' \u2014 your Python application'),
            React.createElement('li', null, React.createElement('strong', null, 'config.yaml'), ' \u2014 service metadata: codename, version, quotas, entry point')
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '4. Build & Deploy'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'Click ', React.createElement('strong', null, 'Build & Deploy'), '. Your code is packaged, signed with your certificate, and uploaded to AosCloud. ',
            'The target unit picks up the new version via OTA. Watch the Build Log for live progress.'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, '5. Inspect units'),
          React.createElement('p', { style: { color: '#6b7280', marginBottom: '16px' } },
            'The Units card shows units assigned to the selected service. Toggle ', React.createElement('strong', null, 'All units'), ' to see every unit. ',
            'Click any unit row to open a detail overlay with hardware specs, live CPU/RAM/disk, and alerts. ',
            React.createElement('em', null, 'Note: '), 'monitoring requires the unit\u2019s OEM account; units from other accounts show "Hardware monitoring not available".'
          ),

          React.createElement('h3', { style: { fontSize: '14px', marginBottom: '8px' } }, 'Available Presets'),
          React.createElement('ul', { style: { color: '#6b7280', paddingLeft: '20px', marginBottom: 0 } },
            React.createElement('li', null, React.createElement('strong', null, 'Hello Python'), ' \u2014 simple Python hello world'),
            React.createElement('li', null, React.createElement('strong', null, 'Seat ECU'), ' \u2014 seat heating/cooling control via Zenoh + Kuksa'),
            React.createElement('li', null, React.createElement('strong', null, 'HVAC ECU'), ' \u2014 HVAC fan-speed control via Zenoh + Kuksa'),
            React.createElement('li', null, React.createElement('strong', null, 'BMS'), ' \u2014 battery monitoring (voltage, current, SoC) via Zenoh + Kuksa'),
            React.createElement('li', null, React.createElement('strong', null, 'Range AI'), ' \u2014 range computation from battery + cabin signals')
          )
        )
      )
    ),

    // Unit Detail Overlay — opens when user clicks a unit row in the Units
    // card. Shows that unit's monitoring + alerts in a focused, scrollable
    // modal. Closes on backdrop click or ✕ Close button. The Clear button
    // empties the alert list (does NOT close the alerts area).
    detailUnitUid && React.createElement('div', {
      onClick: () => setDetailUnitUid(null),
      style: {
        position: 'fixed' as const, inset: 0, zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }
    },
      React.createElement('div', {
        onClick: (e: any) => e.stopPropagation(),
        style: {
          backgroundColor: 'white', borderRadius: '12px',
          width: '640px', maxWidth: '95vw', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column' as const,
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' as const
        }
      },
        // Modal header
        React.createElement('div', {
          style: {
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px', borderBottom: '1px solid #e5e7eb', flexShrink: 0
          }
        },
          (() => {
            const u = serviceUnits.find((x: any) => x.uid === detailUnitUid)
            const displayUid = u?.systemUid || detailUnitUid || ''
            const shortUid = displayUid.length > 12 ? displayUid.substring(0, 8) + '…' : displayUid
            const chip = (bg: string, fg: string, text: string, title?: string) =>
              React.createElement('span', {
                title,
                style: {
                  fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                  backgroundColor: bg, color: fg, whiteSpace: 'nowrap' as const,
                  display: 'inline-flex', alignItems: 'center', gap: '4px'
                }
              }, text)
            return React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: '10px', minWidth: 0, flex: 1 } },
              React.createElement(Icon, { name: 'server', size: 22, color: '#6366f1', style: { marginTop: '2px' } }),
              React.createElement('div', { style: { minWidth: 0, flex: 1 } },
                React.createElement('div', { style: { fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word' as const } }, u?.name || 'Unit'),
                React.createElement('div', {
                  style: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' as const }
                },
                  // Short UID + copy
                  React.createElement('span', {
                    style: {
                      fontSize: '11px', fontFamily: 'monospace',
                      backgroundColor: '#f3f4f6', color: '#374151',
                      padding: '2px 8px', borderRadius: '10px',
                      display: 'inline-flex', alignItems: 'center', gap: '4px'
                    },
                    title: displayUid
                  },
                    shortUid,
                    React.createElement('button', {
                      onClick: () => { if (displayUid) { navigator.clipboard.writeText(displayUid); addLog(`[Copied] Unit UID: ${displayUid}`) } },
                      style: { border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '11px', padding: 0 },
                      title: 'Copy full UID'
                    }, '📋')
                  ),
                  u?.version && chip('#dbeafe', '#1d4ed8', `v${u.version}`),
                  u && chip(u.online ? '#dcfce7' : '#fee2e2', u.online ? '#16a34a' : '#dc2626', u.online ? '●Online' : '●Offline')
                )
              )
            )
          })(),
          React.createElement('button', {
            onClick: () => setDetailUnitUid(null),
            style: { border: 'none', background: 'none', fontSize: '14px', cursor: 'pointer', color: '#6b7280', padding: '4px 8px', flexShrink: 0, whiteSpace: 'nowrap' as const, display: 'inline-flex', alignItems: 'center', gap: '4px' },
            title: 'Close'
          },
            React.createElement(Icon, { name: 'x', size: 14 }),
            'Close'
          )
        ),
        // Modal body — scrollable
        React.createElement('div', {
          style: {
            padding: '14px 18px', overflowY: 'auto' as const, flex: 1,
            display: 'flex', flexDirection: 'column' as const, gap: '14px'
          }
        },
          // Monitoring section
          React.createElement('div', null,
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
              React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' } },
                React.createElement(Icon, { name: 'activity', size: 14, color: '#3b82f6' }),
                'Resource Monitoring'
              ),
              React.createElement('button', {
                onClick: () => { loadUnitMonitoring(detailUnitUid); loadUnitInfo(detailUnitUid) },
                style: { ...styles.iconButton, width: '22px', height: '22px', fontSize: '12px' },
                title: 'Refresh'
              }, '↻')
            ),
            !unitMonitoring
              ? React.createElement('div', { style: { fontSize: '12px', color: '#6b7280', fontStyle: 'italic' as const } }, 'Loading…')
              : unitMonitoring.status === 'error'
                ? React.createElement('div', { style: { fontSize: '12px', color: '#6b7280', fontStyle: 'italic' as const } },
                    unitMonitoring.message?.includes('forbidden')
                      ? React.createElement('div', null,
                          React.createElement('div', { style: { fontWeight: 500, color: '#92400e', marginBottom: '4px' } },
                            'Hardware monitoring not available on this unit.'
                          ),
                          React.createElement('div', { style: { color: '#6b7280' } },
                            'AosCloud restricts CPU/RAM/disk metrics to the unit\u2019s OEM account. ',
                            'Your services are running fine here (see version above), but device-level monitoring belongs to whoever provisioned the unit.'
                          )
                        )
                      : (unitMonitoring.message || 'Unavailable')
                  )
                : (() => {
                    const fmtBytes = (n: number) => {
                      if (!n) return '0'
                      if (n < 1024) return `${n} B`
                      if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`
                      if (n < 1073741824) return `${(n / 1048576).toFixed(1)} MB`
                      return `${(n / 1073741824).toFixed(2)} GB`
                    }
                    const hw: any = unitMonitoring.hw || null
                    const ramUsed = unitMonitoring.ram?.used || 0
                    const ramTotal = unitMonitoring.ram?.total || 0
                    const cpuVal = unitMonitoring.cpu || 0
                    // AosCloud reports CPU as milli-CPU (1000 = one full core).
                    // Compute usage relative to total available CPU on this node:
                    //    cores_busy = cpuVal / 1000
                    //    pct_total  = cpuVal / (numCpus * 1000) * 100
                    const numCpus = hw?.numCpus || 1
                    const coresBusy = cpuVal / 1000
                    const cpuPctTotal = (cpuVal / (numCpus * 1000)) * 100
                    const partitions: Array<{ name: string; used: number; total: number }> =
                      unitMonitoring.diskPartitions || []

                    return React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '10px' } },
                      // Hardware summary header
                      hw && React.createElement('div', {
                        style: {
                          fontSize: '11px', color: '#6b7280', backgroundColor: '#f9fafb',
                          border: '1px solid #e5e7eb', borderRadius: '4px', padding: '6px 10px'
                        }
                      },
                        React.createElement('div', { style: { display: 'flex', gap: '6px', alignItems: 'baseline', flexWrap: 'wrap' as const } },
                          hw.cpuModel && React.createElement('span', { style: { color: '#374151', fontWeight: 500, wordBreak: 'break-word' as const } }, hw.cpuModel),
                          hw.cpuModel && React.createElement('span', null, '·'),
                          React.createElement('span', null, `${hw.numCores} core${hw.numCores === 1 ? '' : 's'}`),
                          hw.numThreads && hw.numThreads !== hw.numCores && React.createElement('span', null, ` / ${hw.numThreads} threads`),
                          hw.ramTotal > 0 && React.createElement('span', null, '·'),
                          hw.ramTotal > 0 && React.createElement('span', null, `${fmtBytes(hw.ramTotal)} RAM`),
                          hw.nodeCount > 1 && React.createElement('span', null, '·'),
                          hw.nodeCount > 1 && React.createElement('span', null, `${hw.nodeCount} nodes (showing node 0)`)
                        )
                      ),

                      // CPU
                      React.createElement('div', null,
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' } },
                          React.createElement('span', {
                            style: { color: '#6b7280' },
                            title: hw ? `${cpuVal} milli-CPU on a ${numCpus}-core node = ${coresBusy.toFixed(2)} cores busy` : 'CPU value reported in milli-CPU; total core count unknown'
                          }, 'CPU'),
                          React.createElement('span', { style: { fontWeight: 500 } },
                            hw
                              ? `${cpuPctTotal.toFixed(1)}% · ${coresBusy.toFixed(2)} / ${numCpus} cores`
                              : `${coresBusy.toFixed(2)} cores busy (total unknown)`
                          )
                        ),
                        React.createElement('div', { style: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' as const } },
                          React.createElement('div', { style: {
                            height: '100%',
                            width: `${Math.min(hw ? cpuPctTotal : (coresBusy * 100 / 4), 100)}%`,
                            backgroundColor: cpuPctTotal > 80 ? '#dc2626' : cpuPctTotal > 50 ? '#d97706' : '#3b82f6',
                            borderRadius: '3px', transition: 'width 0.3s'
                          } })
                        )
                      ),

                      // RAM
                      React.createElement('div', null,
                        React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' } },
                          React.createElement('span', { style: { color: '#6b7280' } }, 'RAM'),
                          React.createElement('span', { style: { fontWeight: 500 } },
                            ramTotal
                              ? `${((ramUsed / ramTotal) * 100).toFixed(1)}% · ${fmtBytes(ramUsed)} / ${fmtBytes(ramTotal)}`
                              : (ramUsed ? `${fmtBytes(ramUsed)} (total unknown)` : '—')
                          )
                        ),
                        ramTotal > 0 && React.createElement('div', { style: { height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' as const } },
                          React.createElement('div', { style: {
                            height: '100%',
                            width: `${Math.min((ramUsed / ramTotal) * 100, 100)}%`,
                            backgroundColor: (ramUsed / ramTotal) > 0.85 ? '#dc2626' : (ramUsed / ramTotal) > 0.65 ? '#d97706' : '#8b5cf6',
                            borderRadius: '3px', transition: 'width 0.3s'
                          } })
                        )
                      ),

                      // Disk — per-partition rows
                      partitions.length > 0 && React.createElement('div', null,
                        React.createElement('div', { style: { fontSize: '12px', color: '#6b7280', marginBottom: '4px' } }, 'Disk'),
                        React.createElement('div', { style: { display: 'flex', flexDirection: 'column' as const, gap: '6px', paddingLeft: '8px' } },
                          ...partitions.map((p) => {
                            const pct = p.total ? (p.used / p.total) * 100 : 0
                            return React.createElement('div', { key: p.name },
                              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px', color: '#6b7280' } },
                                React.createElement('span', { style: { fontFamily: 'monospace' } }, p.name),
                                React.createElement('span', { style: { fontWeight: 500, color: '#374151' } },
                                  p.total
                                    ? `${pct.toFixed(1)}% · ${fmtBytes(p.used)} / ${fmtBytes(p.total)}`
                                    : (p.used ? `${fmtBytes(p.used)} (total unknown)` : '—')
                                )
                              ),
                              p.total > 0 && React.createElement('div', { style: { height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' as const } },
                                React.createElement('div', { style: {
                                  height: '100%',
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: pct > 85 ? '#dc2626' : pct > 65 ? '#d97706' : '#f59e0b',
                                  borderRadius: '2px', transition: 'width 0.3s'
                                } })
                              )
                            )
                          })
                        )
                      )
                    )
                  })()
          ),
          // Alerts section
          React.createElement('div', null,
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' } },
              React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: '6px' } },
                React.createElement(Icon, { name: 'triangle-alert', size: 14, color: '#d97706' }),
                `Alerts (${alerts.length})`
              ),
              alerts.length > 0 && React.createElement('button', {
                onClick: () => { setAlerts([]); addLog('[Alerts] Cleared') },
                style: {
                  fontSize: '11px', padding: '3px 10px', cursor: 'pointer',
                  border: '1px solid #fca5a5', borderRadius: '4px',
                  background: 'white', color: '#dc2626',
                  display: 'flex', alignItems: 'center', gap: '4px'
                },
                title: 'Clear all alerts from the list'
              },
                React.createElement(Icon, { name: 'trash', size: 12 }),
                'Clear'
              )
            ),
            alerts.length === 0
              ? React.createElement('div', { style: { fontSize: '12px', color: '#6b7280', fontStyle: 'italic' as const } }, 'No alerts')
              : React.createElement('div', { style: { maxHeight: '220px', overflowY: 'auto' as const, border: '1px solid #f3f4f6', borderRadius: '6px' } },
                  ...alerts.map((a: any, i: number) =>
                    React.createElement('div', {
                      key: a.id || i,
                      style: { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', fontSize: '11px' }
                    },
                      React.createElement('div', { style: { color: '#dc2626', fontWeight: 500 } }, a.tag || 'Alert'),
                      React.createElement('div', { style: { color: '#6b7280', marginTop: '2px' } },
                        typeof a.message === 'string' ? a.message : JSON.stringify(a.message)
                      ),
                      a.timestamp && React.createElement('div', { style: { color: '#9ca3af', marginTop: '2px', fontSize: '10px' } }, a.timestamp)
                    )
                  )
                )
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
        // Language toggle — segmented pill
        React.createElement('div', {
          style: {
            display: 'inline-flex', borderRadius: '6px', overflow: 'hidden',
            border: '1px solid #d1d5db', flexShrink: 0
          }
        },
          React.createElement('button', {
            onClick: () => switchLanguage('cpp'),
            style: {
              padding: '5px 12px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              backgroundColor: languageMode === 'cpp' ? '#3b82f6' : 'white',
              color: languageMode === 'cpp' ? 'white' : '#6b7280',
              transition: 'all 0.15s ease'
            }
          }, 'C++'),
          React.createElement('button', {
            onClick: () => switchLanguage('python'),
            style: {
              padding: '5px 12px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              backgroundColor: languageMode === 'python' ? '#3b82f6' : 'white',
              color: languageMode === 'python' ? 'white' : '#6b7280',
              transition: 'all 0.15s ease'
            }
          }, 'Python')
        ),
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
          languageMode === 'cpp' ? React.createElement('optgroup', { label: 'C++ Presets' },
            React.createElement('option', { value: 'helloAos' }, 'Hello AOS — simple C++ starter'),
            React.createElement('option', { value: 'kuksaWriter' }, 'Signal Writer — write vehicle signals'),
            React.createElement('option', { value: 'kuksaReader' }, 'KUKSA Reader — read vehicle signals'),
            React.createElement('option', { value: 'evRangeExtender' }, 'EV Range Extender — battery management'),
            React.createElement('option', { value: 'batteryEnergySaver' }, 'Battery Energy Saver — HVAC/seat cutoff'),
            React.createElement('option', { value: 'batteryEnergySaverSdvRuntime' }, 'Battery Energy Saver — sdv-runtime / VSS 4.0'),
            React.createElement('option', { value: 'signalReporter' }, 'Signal Reporter — relay to dashboard')
          ) : null,
          languageMode === 'python' ? React.createElement('optgroup', { label: 'Python Presets' },
            React.createElement('option', { value: 'helloPython' }, 'Hello Python — simple Python starter'),
            React.createElement('option', { value: 'seatEcu' }, 'Seat ECU — seat heating/cooling control'),
            React.createElement('option', { value: 'hvacEcu' }, 'HVAC ECU — fan speed / climate control'),
            React.createElement('option', { value: 'bms' }, 'BMS — battery monitoring system'),
            React.createElement('option', { value: 'rangeAi' }, 'Range AI — driving range computation')
          ) : null
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

      // Left Column — Orchestrator + Flow
      showDockerPanel && React.createElement('div', { style: styles.dockerColumn },

        // ── Orchestrator Status Card ──────────────────────────────────────
        React.createElement('div', { style: styles.card },
          React.createElement('div', { style: { ...styles.cardHeader, padding: '8px 12px' } },
            React.createElement('div', { style: { ...styles.cardTitle, fontSize: '13px', gap: '6px' } },
              React.createElement(Icon, { name: 'server', size: 15, color: '#2563eb' }),
              'Orchestrator',
              React.createElement('span', {
                style: {
                  fontSize: '11px', fontWeight: 400,
                  color: connectionStatus === 'connected' ? '#16a34a' : '#dc2626'
                }
              }, connectionStatus === 'connected' ? '· Online' : '· Offline')
            )
          ),
          React.createElement('div', { style: { padding: '6px 12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' } },
            React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' } },
              React.createElement('span', null, 'Active workers'),
              React.createElement('span', { style: { fontWeight: 600, color: '#374151' } }, String(dockerInstances.filter(d => d.online).length))
            ),
            workerInfo && React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', display: 'flex', justifyContent: 'space-between' } },
              React.createElement('span', null, 'Your port'),
              React.createElement('span', { style: { fontWeight: 600, color: '#374151', fontFamily: 'monospace' } }, String(workerInfo.port))
            )
          )
        ),

        // ── No-cert banner ──────────────────────────────────────────────────
        !certStatus?.loaded && React.createElement('div', {
          style: {
            ...styles.card,
            backgroundColor: '#fffbeb', border: '1px solid #fcd34d',
            padding: '10px 14px', marginBottom: '10px',
            display: 'flex', alignItems: 'center', gap: '10px'
          }
        },
          React.createElement('span', { style: { fontSize: '18px', flexShrink: 0 } }, '🔐'),
          React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { fontSize: '13px', fontWeight: 600, color: '#92400e' } },
              'Upload your .p12 certificate to begin'
            ),
            React.createElement('div', { style: { fontSize: '11px', color: '#a16207', marginTop: '2px' } },
              'Your certificate creates an isolated build environment. Without it, deployment is not possible.'
            )
          )
        ),

        // ── Flow Steps Card ────────────────────────────────────────────────
        React.createElement('div', { style: styles.card },
          React.createElement('div', { style: { ...styles.cardHeader, padding: '8px 12px' } },
            React.createElement('div', { style: { ...styles.cardTitle, fontSize: '13px', gap: '6px' } },
              React.createElement(Icon, { name: 'activity', size: 15, color: '#7c3aed' }),
              'Setup'
            )
          ),

          // Step ① — Certificate
          (() => {
            const step1Done = certStatus?.loaded;
            const step1Active = isUploadingCert;
            const stepNum = step1Done ? '✓' : '①';
            const stepColor = step1Done ? '#16a34a' : step1Active ? '#d97706' : '#9ca3af';
            const stepBg = step1Done ? '#dcfce7' : step1Active ? '#fef3c7' : '#f3f4f6';
            return React.createElement('div', {
              style: { padding: '6px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px', borderBottom: '1px solid #f3f4f6' }
            },
              React.createElement('span', {
                style: {
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: stepBg, color: stepColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, marginTop: '1px'
                }
              }, stepNum),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: '#374151' } }, 'Certificate'),
                step1Done
                  ? React.createElement('div', { style: { fontSize: '11px', color: '#16a34a', marginTop: '2px' } },
                      certStatus?.identity?.cn
                        ? `Loaded — ${certStatus.identity.cn}`
                        : 'Loaded'
                    )
                  : step1Active
                    ? React.createElement('div', { style: { fontSize: '11px', color: '#d97706', marginTop: '2px' } }, 'Uploading...')
                    : React.createElement('div', { style: { marginTop: '4px' } },
                        React.createElement('label', {
                          style: {
                            fontSize: '11px', color: '#2563eb', cursor: 'pointer',
                            padding: '3px 10px', borderRadius: '4px',
                            border: '1px solid #bfdbfe', backgroundColor: '#eff6ff',
                            display: 'inline-block'
                          }
                        },
                          React.createElement('input', {
                            type: 'file', accept: '.p12,.pfx', onChange: handleCertUpload,
                            disabled: connectionStatus !== 'connected' || isUploadingCert,
                            style: { display: 'none' }
                          }),
                          'Upload .p12'
                        )
                      )
              )
            );
          })(),

          // Step ② — Environment (worker)
          (() => {
            const step2Done = workerInfo !== null;
            const step2Active = certStatus?.loaded && !workerInfo;
            const step2Waiting = !certStatus?.loaded;
            const stepNum = step2Done ? '✓' : '②';
            const stepColor = step2Done ? '#16a34a' : step2Active ? '#d97706' : '#d1d5db';
            const stepBg = step2Done ? '#dcfce7' : step2Active ? '#fef3c7' : '#f9fafb';
            return React.createElement('div', {
              style: { padding: '6px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px', borderBottom: '1px solid #f3f4f6' }
            },
              React.createElement('span', {
                style: {
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: stepBg, color: stepColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, marginTop: '1px'
                }
              }, stepNum),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: '#374151' } }, 'Environment'),
                step2Done
                  ? React.createElement('div', null,
                      React.createElement('div', { style: { fontSize: '11px', color: '#16a34a', marginTop: '2px' } },
                        `Ready — port ${workerInfo.port}`
                      ),
                      React.createElement('div', { style: { fontSize: '10px', color: '#9ca3af', marginTop: '3px', lineHeight: '1.4' } },
                        'If the worker becomes unresponsive, Remove your certificate below and re-upload it to get a fresh environment.'
                      )
                    )
                  : step2Active
                    ? React.createElement('div', { style: { fontSize: '11px', color: '#d97706', marginTop: '2px' } }, 'Creating...')
                    : React.createElement('div', { style: { fontSize: '11px', color: '#9ca3af', marginTop: '2px' } },
                        step2Waiting ? 'Upload certificate first' : 'Waiting...'
                      )
              )
            );
          })(),

          // Step ③ — Build & Deploy
          (() => {
            const step3Ready = workerInfo !== null && connectionStatus === 'connected';
            const stepNum = step3Ready ? '✓' : '③';
            const stepColor = step3Ready ? '#16a34a' : '#d1d5db';
            const stepBg = step3Ready ? '#dcfce7' : '#f9fafb';
            return React.createElement('div', {
              style: { padding: '6px 12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }
            },
              React.createElement('span', {
                style: {
                  width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                  backgroundColor: stepBg, color: stepColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, marginTop: '1px'
                }
              }, stepNum),
              React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                React.createElement('div', { style: { fontSize: '12px', fontWeight: 600, color: '#374151' } }, 'Build & Deploy'),
                React.createElement('div', { style: { fontSize: '11px', color: step3Ready ? '#16a34a' : '#9ca3af', marginTop: '2px' } },
                  step3Ready ? 'Ready to build' : 'Complete steps above'
                )
              )
            );
          })()
        ),

        // ── Certificate Management (compact, below flow) ──────────────────
        (certStatus?.loaded || certError) && React.createElement('div', { style: { ...styles.card, padding: '8px 12px' } },
          certStatus?.loaded && certStatus.identity?.cn && React.createElement('div', {
            style: {
              fontSize: '11px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: '4px', padding: '6px 10px', marginBottom: '8px',
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              display: 'flex', gap: '6px', alignItems: 'baseline'
            }
          },
            React.createElement('span', { style: { color: '#6b7280', flexShrink: 0 } }, 'CN:'),
            React.createElement('span', { style: { color: '#111827', overflowWrap: 'anywhere' as const, wordBreak: 'break-word' as const } }, certStatus.identity.cn)
          ),
          toolchainVersions && React.createElement('div', {
            style: {
              fontSize: '11px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: '4px', padding: '6px 10px', marginBottom: '8px',
              fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
              display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' as const
            }
          },
            React.createElement('span', { style: { color: '#6b7280', flexShrink: 0 } }, 'Toolchain:'),
            React.createElement('span', { style: { color: '#065f46' } }, `aos-signer ${toolchainVersions['aos-signer'] || '?'}`),
            React.createElement('span', { style: { color: '#065f46' } }, `aos-keys ${toolchainVersions['aos-keys'] || '?'}`),
            React.createElement('span', { style: { color: '#065f46' } }, `aos-prov ${toolchainVersions['aos-prov'] || '?'}`)
          ),
          unitInfo && (Object.keys(unitInfo.versions || {}).length > 0
            ? React.createElement('div', {
                style: {
                  fontSize: '11px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: '4px', padding: '6px 10px', marginBottom: '8px',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                  display: 'flex', gap: '8px', alignItems: 'baseline', flexWrap: 'wrap' as const
                }
              },
                React.createElement('span', { style: { color: '#6b7280', flexShrink: 0 } }, 'Unit:'),
                ...Object.entries(unitInfo.versions!).map(([k, v]) =>
                  React.createElement('span', { key: k, style: { color: '#1e40af' } }, `${k}=${v}`)
                ),
                React.createElement('span', { style: { color: '#6b7280' } }, `(${unitInfo.nodeCount} node(s))`)
              )
            : unitInfo.name && React.createElement('div', {
                style: {
                  fontSize: '11px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe',
                  borderRadius: '4px', padding: '6px 10px', marginBottom: '8px',
                  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
                }
              },
                React.createElement('span', { style: { color: '#6b7280' } }, 'Unit: '),
                React.createElement('span', { style: { color: '#1e40af' } }, unitInfo.name),
                React.createElement('span', { style: { color: '#9ca3af' } }, ' — no version fields in API response')
              )
          ),
          certError && React.createElement('div', { style: { fontSize: '12px', color: '#dc2626', marginBottom: '8px' } }, certError),
          React.createElement('div', { style: { display: 'flex', gap: '6px' } },
            React.createElement('label', {
              style: {
                ...styles.button, ...styles.buttonSm,
                ...(connectionStatus !== 'connected' || isUploadingCert || isRemovingCert ? styles.buttonDisabled : {}),
                flex: 1, textAlign: 'center', fontSize: '11px',
                cursor: connectionStatus === 'connected' && !isUploadingCert && !isRemovingCert ? 'pointer' : 'not-allowed'
              }
            },
              React.createElement('input', {
                type: 'file', accept: '.p12,.pfx', onChange: handleCertUpload,
                disabled: connectionStatus !== 'connected' || isUploadingCert || isRemovingCert,
                style: { display: 'none' }
              }),
              isUploadingCert ? 'Uploading...' : 'Replace .p12'
            ),
            certStatus?.loaded && React.createElement('button', {
              onClick: handleCertRemove,
              disabled: connectionStatus !== 'connected' || isUploadingCert || isRemovingCert,
              style: {
                ...styles.button, ...styles.buttonSm, fontSize: '11px',
                ...(connectionStatus !== 'connected' || isUploadingCert || isRemovingCert ? styles.buttonDisabled : {}),
                backgroundColor: 'transparent', color: '#dc2626', border: '1px solid #fca5a5',
                display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center'
              },
              title: 'Remove certificate and shut down your build environment'
            },
              isRemovingCert ? 'Removing...' : 'Remove'
            )
          )
        ),

        // AosCloud Service Card
        React.createElement('div', { style: styles.card },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement(Icon, { name: 'cloud', size: 16, color: '#3b82f6' }),
              'AosCloud Service'
            ),
            React.createElement('button', {
              onClick: async () => {
                await fetchAosCloudServices()
                if (selectedServiceUuid) await loadServiceDetails(selectedServiceUuid)
              },
              disabled: isLoadingAosCloud || connectionStatus !== 'connected',
              style: { ...styles.iconButton, ...(isLoadingAosCloud ? { opacity: 0.5 } : {}) },
              title: 'Refresh services, versions, and units from AosCloud'
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
            // Service UUID + codename display (right under the dropdown)
            serviceName && React.createElement('div', {
              style: { display: 'flex', flexDirection: 'column' as const, gap: '3px', marginTop: '6px', minWidth: 0 }
            },
              // UUID row
              React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }
              },
                React.createElement('span', {
                  title: selectedServiceUuid,
                  style: {
                    fontSize: '11px', color: '#6c757d', fontFamily: 'monospace',
                    flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap' as const,
                    overflow: 'hidden' as const,
                    textOverflow: 'ellipsis' as const
                  }
                }, selectedServiceUuid),
                React.createElement('button', {
                  onClick: () => { navigator.clipboard.writeText(selectedServiceUuid); addLog(`[Copied] Service UUID: ${selectedServiceUuid}`) },
                  style: { ...styles.iconButton, width: '20px', height: '20px', fontSize: '11px', flexShrink: 0 },
                  title: selectedServiceUuid
                }, '📋')
              ),
              // Codename row
              selectedServiceCodename && React.createElement('div', {
                style: { display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }
              },
                React.createElement('span', {
                  style: {
                    fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace',
                    backgroundColor: '#f3f4f6', padding: '1px 6px', borderRadius: '4px',
                    flexShrink: 0
                  }
                }, 'codename:'),
                React.createElement('span', {
                  title: selectedServiceCodename,
                  style: {
                    fontSize: '11px', color: '#374151', fontFamily: 'monospace',
                    flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap' as const,
                    overflow: 'hidden' as const,
                    textOverflow: 'ellipsis' as const
                  }
                }, selectedServiceCodename),
                React.createElement('button', {
                  onClick: () => { navigator.clipboard.writeText(selectedServiceCodename); addLog(`[Copied] Codename: ${selectedServiceCodename}`) },
                  style: { ...styles.iconButton, width: '20px', height: '20px', fontSize: '11px', flexShrink: 0 },
                  title: selectedServiceCodename
                }, '📋')
              )
            ),
            // Auto-sync service_uid checkbox (sits under the UUID — it's a
            // setting that controls what happens to that UUID when copied
            // into config.yaml)
            React.createElement('label', {
              style: {
                display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                fontSize: '11px', color: '#6b7280', cursor: 'pointer', userSelect: 'none'
              }
            },
              React.createElement('input', {
                type: 'checkbox',
                checked: autoSyncServiceUid,
                onChange: (e: any) => setAutoSyncServiceUid(e.target.checked),
                style: { cursor: 'pointer' }
              }),
              'Auto-sync codename to config.yaml'
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
            ),
            // Auto-increment version checkbox — placed right under the version
            // pills so it's clear what it operates on (the "next" version after
            // the latest pill).
            serviceVersions.length > 0 && React.createElement('label', {
              style: {
                display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px',
                fontSize: '11px', color: '#6b7280', cursor: 'pointer', userSelect: 'none'
              },
              title: 'When enabled, after a successful build the version in code (C++ #define VERSION / Python VERSION = "...") and YAML version: are bumped to the next patch (e.g. 1.0.5 → 1.0.6)'
            },
              React.createElement('input', {
                type: 'checkbox',
                checked: autoIncVersion,
                onChange: (e: any) => setAutoIncVersion(e.target.checked),
                style: { cursor: 'pointer', margin: 0 }
              }),
              'Auto-increment version after build'
            )
          )
        ),

        // Units card — always visible, toggle between service units and all units
        React.createElement('div', { style: styles.card },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement(Icon, { name: 'server', size: 16, color: '#6366f1' }),
              'Units'
            ),
            // Toggle pills: This service | All units
            React.createElement('div', {
              style: {
                display: 'flex', border: '1px solid #d1d5db', borderRadius: '4px',
                overflow: 'hidden', marginRight: '6px'
              }
            },
              React.createElement('button', {
                onClick: () => setShowAllUnits(false),
                style: {
                  border: 'none', padding: '2px 8px', fontSize: '10px', fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: !showAllUnits ? '#6366f1' : 'transparent',
                  color: !showAllUnits ? '#fff' : '#6b7280'
                }
              }, 'This service'),
              React.createElement('button', {
                onClick: async () => {
                  setShowAllUnits(true)
                  if (!aosServiceRef.current) return
                  try {
                    const res = await aosServiceRef.current.listUnits()
                    if (res.status === 'success' && res.items?.length) {
                      setAllUnits(res.items.map((u: any) => ({
                        uid: u.uid || u.systemUid,
                        systemUid: u.system_uid || u.systemUid || u.uid || '',
                        name: u.name || u.system_uid || u.systemUid || 'Unknown',
                        online: u.online,
                        status: u.status || 'Unknown',
                        runState: '',
                        version: '',
                        error: '',
                        ip: ''
                      })))
                    }
                  } catch (err: any) { /* silent */ }
                },
                style: {
                  border: 'none', padding: '2px 8px', fontSize: '10px', fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: showAllUnits ? '#6366f1' : 'transparent',
                  color: showAllUnits ? '#fff' : '#6b7280'
                }
              }, 'All units')
            ),
            React.createElement('button', {
              onClick: () => {
                if (showAllUnits) {
                  setShowAllUnits(true) // trigger re-render; re-fetch below
                  if (aosServiceRef.current) {
                    aosServiceRef.current.listUnits().then(res => {
                      if (res.status === 'success' && res.items?.length) {
                        setAllUnits(res.items.map((u: any) => ({
                          uid: u.uid || u.systemUid,
                          systemUid: u.system_uid || u.systemUid || u.uid || '',
                          name: u.name || u.system_uid || u.systemUid || 'Unknown',
                          online: u.online,
                          status: u.status || 'Unknown',
                          runState: '', version: '', error: '', ip: ''
                        })))
                      }
                    }).catch(() => {})
                  }
                } else if (selectedServiceUuid) {
                  loadServiceDetails(selectedServiceUuid)
                }
              },
              style: styles.iconButton,
              title: 'Refresh'
            }, '↻')
          ),
          (() => {
            const units = showAllUnits ? allUnits : serviceUnits
            if (units.length === 0) {
              return React.createElement('div', {
                style: { padding: '14px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }
              },
                showAllUnits
                  ? 'No units available'
                  : !certStatus?.loaded
                    ? 'Upload a certificate and select a service to see units'
                    : !selectedServiceUuid
                      ? 'Select a service to see its assigned units'
                      : 'No units assigned to this service'
              )
            }
            return React.createElement('div', { style: { maxHeight: '150px', overflowY: 'auto' } },
              ...units.map((u: any) =>
                React.createElement('div', {
                  key: u.uid,
                  onClick: () => { loadUnitMonitoring(u.uid); loadUnitInfo(u.uid); setDetailUnitUid(u.uid) },
                  onMouseEnter: (e: any) => {
                    if (selectedMonitorUnit !== u.uid) e.currentTarget.style.backgroundColor = '#f9fafb'
                  },
                  onMouseLeave: (e: any) => {
                    e.currentTarget.style.backgroundColor = selectedMonitorUnit === u.uid ? '#f0f7ff' : 'transparent'
                  },
                  title: 'Click to view monitoring + alerts',
                  style: {
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                    backgroundColor: selectedMonitorUnit === u.uid ? '#f0f7ff' : 'transparent',
                    transition: 'background-color 0.15s'
                  }
                },
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: 0 } },
                    React.createElement('span', {
                      style: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, backgroundColor: u.online ? '#16a34a' : '#dc2626' }
                    }),
                    React.createElement('span', { style: { fontSize: '12px', fontWeight: 500 } }, u.name),
                    React.createElement('button', {
                      onClick: (e: any) => { e.stopPropagation(); navigator.clipboard.writeText(u.systemUid || u.uid); addLog(`[Copied] Unit UID: ${u.systemUid || u.uid}`) },
                      style: { ...styles.iconButton, width: '18px', height: '18px', fontSize: '10px', flexShrink: 0 },
                      title: u.systemUid || u.uid
                    }, '📋')
                  ),
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 } },
                    u.version && React.createElement('span', {
                      style: { fontSize: '10px', padding: '1px 5px', borderRadius: '6px', backgroundColor: '#e7f3ff', color: '#2563eb' }
                    }, `v${u.version}`),
                    u.error && React.createElement('span', {
                      style: { fontSize: '10px', color: '#dc2626' }, title: u.error
                    }, '⚠'),
                    React.createElement('span', {
                      style: { fontSize: '12px', color: '#9ca3af', flexShrink: 0, marginLeft: '2px' },
                      title: 'Click to open details'
                    }, '›')
                  )
                )
              )
            )
          })()
        ),

        // Monitoring + Alerts moved to the Unit Detail overlay (opens on
        // unit-row click) to avoid duplication with the inline cards.

      ),  // End of dockerColumn

      // Middle Column - Tabbed Code Editor
      React.createElement('div', { style: styles.editorsColumn },

        // Editor with tabs
        React.createElement('div', { style: { ...styles.card, ...styles.editorCard, flex: 1, display: 'flex', flexDirection: 'column' as const } },
          // Tab bar — shows only the active language's code tab + shared YAML tab
          React.createElement('div', { style: { display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' } },
            languageMode === 'cpp' ? React.createElement('button', {
              onClick: () => setActiveEditorTab('cpp'),
              style: {
                padding: '8px 16px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeEditorTab === 'cpp' ? '#fff' : 'transparent',
                color: activeEditorTab === 'cpp' ? '#2563eb' : '#6b7280',
                borderBottom: activeEditorTab === 'cpp' ? '2px solid #2563eb' : '2px solid transparent',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }
            },
              React.createElement(Icon, { name: 'file-code', size: 14 }),
              'main.cpp'
            ) : null,
            languageMode === 'python' ? React.createElement('button', {
              onClick: () => setActiveEditorTab('python'),
              style: {
                padding: '8px 16px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeEditorTab === 'python' ? '#fff' : 'transparent',
                color: activeEditorTab === 'python' ? '#2563eb' : '#6b7280',
                borderBottom: activeEditorTab === 'python' ? '2px solid #2563eb' : '2px solid transparent',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }
            },
              React.createElement(Icon, { name: 'file-code', size: 14 }),
              'main.py'
            ) : null,
            React.createElement('button', {
              onClick: () => setActiveEditorTab('yaml'),
              style: {
                padding: '8px 16px', fontSize: '13px', fontWeight: 500, border: 'none', cursor: 'pointer',
                background: activeEditorTab === 'yaml' ? '#fff' : 'transparent',
                color: activeEditorTab === 'yaml' ? '#2563eb' : '#6b7280',
                borderBottom: activeEditorTab === 'yaml' ? '2px solid #2563eb' : '2px solid transparent',
                display: 'inline-flex', alignItems: 'center', gap: '6px'
              }
            },
              React.createElement(Icon, { name: 'settings', size: 14 }),
              'config.yaml'
            )
          ),
          // Active editor with line numbers
          React.createElement('div', { style: styles.editorContainer },
            React.createElement('pre', { style: styles.lineNumbers },
              (activeEditorTab === 'cpp' ? cppCode : activeEditorTab === 'python' ? pythonCode : yamlConfig).split('\n').map((_: string, i: number) => `${i + 1}`).join('\n')
            ),
            React.createElement('textarea', {
              style: { ...styles.textarea, flex: 1 },
              value: activeEditorTab === 'cpp' ? cppCode : activeEditorTab === 'python' ? pythonCode : yamlConfig,
              onChange: (e: any) => activeEditorTab === 'cpp' ? setCppCode(e.target.value) : activeEditorTab === 'python' ? setPythonCode(e.target.value) : setYamlConfig(e.target.value),
              placeholder: activeEditorTab === 'cpp' ? '// Enter your C++ code here...' : activeEditorTab === 'python' ? '# Enter your Python code here...' : '# Enter your YAML configuration here...',
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
            title: !selectedInstance ? 'Connecting to build service...' : ''
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
            React.createElement(Icon, { name: 'triangle-alert', size: 14, color: '#d97706' }),
            React.createElement('span', null, 'Waiting for build service connection...')
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
                     buildStatus.includes('failed') || buildStatus.includes('Error') ? '#fecaca' : '#bfdbfe'}`,
            ...(isBuilding ? { animation: 'aos-pulse 1.6s ease-in-out infinite' } : {})
          }
        },
          React.createElement('span', {
            style: { display: 'inline-flex', alignItems: 'center', ...(isBuilding ? { animation: 'aos-spin 1s linear infinite' } : {}) }
          },
            buildStatus.includes('successfully')
              ? React.createElement(Icon, { name: 'check', size: 14 })
              : buildStatus.includes('failed') || buildStatus.includes('Error')
                ? React.createElement(Icon, { name: 'x', size: 14 })
                : isBuilding
                  ? React.createElement(Icon, { name: 'refresh', size: 14 })
                  : '●'
          ),
          buildStatus
        ),

        // Deployed Apps Card (hide when empty)
        deployedApps.length > 0 && React.createElement('div', { style: styles.card },
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement(Icon, { name: 'rocket', size: 16, color: '#dc2626' }),
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
        React.createElement('div', { style: { ...styles.card, ...styles.logsCard, position: 'relative' as const } },
          // Indeterminate progress bar — fills the gap during long silent steps
          // (uploading, signing, AosCloud round-trip). Pure CSS, GPU-painted.
          isBuilding && React.createElement('div', {
            style: {
              position: 'absolute' as const, top: 0, left: 0, right: 0,
              height: '2px', overflow: 'hidden', backgroundColor: '#dbeafe',
              borderTopLeftRadius: '8px', borderTopRightRadius: '8px',
              pointerEvents: 'none' as const
            }
          },
            React.createElement('div', {
              style: {
                position: 'absolute' as const, top: 0, left: 0,
                height: '100%', width: '25%',
                backgroundColor: '#3b82f6',
                animation: 'aos-bar 1.4s ease-in-out infinite'
              }
            })
          ),
          React.createElement('div', { style: styles.cardHeader },
            React.createElement('div', { style: styles.cardTitle },
              React.createElement(Icon, { name: 'clipboard-list', size: 16, color: '#374151' }),
              'Build Logs'
            ),
            buildLogs.length > 0 && React.createElement('button', {
              onClick: () => {
                const text = buildLogs.join('\n')
                const blob = new Blob([text], { type: 'text/plain' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `build-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`
                a.click()
                URL.revokeObjectURL(url)
              },
              style: styles.iconButton,
              title: 'Download build log'
            }, '💾'),
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
              React.createElement(Icon, { name: 'activity', size: 16, color: '#374151' }),
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
                    const res = await aosServiceRef.current.getServiceStdout(sshPort, 80, undefined, selectedServiceUuid, selectedMonitorUnit, selectedSubjectId)
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
              serviceLogs.length > 0 && React.createElement('button', {
                onClick: () => {
                  const text = serviceLogs.map((l: any) => l.text).join('\n')
                  const blob = new Blob([text], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `service-log-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                },
                style: styles.iconButton,
                title: 'Download log as text file'
              }, '💾'),
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
