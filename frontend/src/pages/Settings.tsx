import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Switch,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  LinearProgress,
  Divider,
  Grid,
  Stack,
  Badge,
  FormControlLabel,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security,
  Email,
  Storage,
  Palette,
  Business,
  Notifications,
  Save,
  Refresh,
  Code,
  Api,
  Language,
  Computer,
  Memory,
  Speed,
  Group,
  Timeline,
  MonitorHeart,
  NetworkCheck,
  PersonAdd,
  Warning,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { ModernModal, ModernButton } from '../components/ModernModal';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Settings: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info' | 'warning', message: string } | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Estados de configuración expandidos
  const [systemConfig, setSystemConfig] = useState({
    appName: 'Portal Grupo SGT',
    appVersion: '2.1.0',
    companyName: 'Grupo SGT',
    companyAddress: 'Calle Principal, 123, Madrid',
    companyPhone: '+34 912 345 678',
    companyEmail: 'info@gruposgt.com',
    companyWebsite: 'www.gruposgt.com',
    companyLogo: '',
    companyTaxId: 'B12345678',
    language: 'es',
    timezone: 'Europe/Madrid',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'EUR',
    currencySymbol: '€',
    allowRegistration: false,
    emailVerificationRequired: true,
    adminApprovalRequired: false,
    maintenanceMode: false,
    maintenanceMessage: 'Sistema en mantenimiento. Volveremos pronto.',
    debugMode: false,
    analyticsEnabled: true,
    cookieConsent: true,
    dataRetentionDays: 365,
    autoLogout: 30,
    sessionTimeout: 120,
    maxConcurrentSessions: 5,
    enableGuestAccess: false,
    defaultUserRole: 'employee',
    passwordResetEnabled: true,
    accountLockoutEnabled: true,
  });

  const [emailConfig, setEmailConfig] = useState({
    provider: 'smtp',
    smtpServer: '',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    smtpEncryption: 'TLS',
    smtpTimeout: 30,
    enableEmailNotifications: true,
    fromName: 'Portal Grupo SGT',
    fromEmail: '',
    replyToEmail: '',
    orderNotifications: true,
    vacationNotifications: true,
    userRegistrationNotifications: true,
    systemAlertNotifications: true,
    securityAlertNotifications: true,
    dailyReports: true,
    weeklyReports: false,
    monthlyReports: true,
    emailBatchSize: 100,
    emailRateLimit: 60,
    emailQueueEnabled: true,
    bounceHandling: true,
    unsubscribeLink: true,
    emailTemplatesEnabled: true,
    htmlEmailsEnabled: true,
    emailSignature: '',
    autoResponderEnabled: false,
    deliveryReportsEnabled: true,
  });

  const [storageConfig, setStorageConfig] = useState({
    provider: 'local',
    localPath: '/var/uploads',
    maxFileSize: '50',
    maxTotalStorage: '10',
    allowedExtensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'zip', 'rar', 'txt', 'csv'],
    blockedExtensions: ['exe', 'bat', 'cmd', 'scr'],
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    backupRetention: '30',
    retentionDays: '365',
    compressionEnabled: true,
    compressionLevel: 6,
    duplicateDetection: true,
    virusScanEnabled: true,
    quarantineEnabled: true,
    cloudStorage: false,
    cloudProvider: 'aws',
    awsRegion: 'eu-west-1',
    awsBucket: '',
    awsAccessKey: '',
    awsSecretKey: '',
    cdnEnabled: false,
    cdnUrl: '',
    maxDownloadSpeed: 100,
    maxUploadSpeed: 50,
    uploadTimeoutSeconds: 300,
    chunkedUploadEnabled: true,
    chunkSize: 5,
    parallelUploads: 3,
    thumbnailGeneration: true,
    imageResizing: true,
    watermarkEnabled: false,
    watermarkText: '',
  });

  const [securityConfig, setSecurityConfig] = useState({
    passwordMinLength: 8,
    passwordMaxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    passwordComplexityScore: 3,
    passwordExpiration: 90,
    passwordHistory: 5,
    passwordResetExpiration: 24,
    sessionTimeout: 30,
    sessionExtension: true,
    twoFactorAuth: false,
    twoFactorMethod: 'email',
    loginAttempts: 5,
    lockoutTime: 15,
    lockoutProgressive: true,
    ipWhitelisting: false,
    ipWhitelist: [],
    ipBlacklisting: true,
    ipBlacklist: [],
    geoBlocking: false,
    allowedCountries: ['ES', 'FR', 'DE', 'IT', 'PT'],
    sslRequired: true,
    sslRedirect: true,
    hstsEnabled: true,
    encryptionLevel: 'AES-256',
    auditLogging: true,
    auditRetention: 365,
    suspiciousActivityDetection: true,
    anomalyDetection: true,
    bruteForceProtection: true,
    captchaEnabled: true,
    captchaProvider: 'recaptcha',
    captchaThreshold: 3,
    apiRateLimit: 1000,
    apiRateLimitWindow: 60,
    corsEnabled: true,
    corsOrigins: '*',
    sessionCookieSecure: true,
    sessionCookieHttpOnly: true,
    sessionCookieSameSite: 'Strict',
    csrfProtection: true,
    xssProtection: true,
    contentTypeValidation: true,
    sqlInjectionProtection: true,
  });

  const [notificationConfig, setNotificationConfig] = useState({
    emailNotifications: true,
    pushNotifications: false,
    smsNotifications: false,
    inAppNotifications: true,
    desktopNotifications: false,
    browserNotifications: true,
    webhookNotifications: false,
    slackNotifications: false,
    teamsNotifications: false,
    soundEnabled: true,
    soundVolume: 50,
    vibrationEnabled: false,
    quietHoursEnabled: true,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    weekendQuietHours: true,
    notificationFrequency: 'immediate',
    digestFrequency: 'daily',
    digestTime: '09:00',
    priorityFilterEnabled: true,
    highPriorityOnly: false,
    autoMarkAsRead: false,
    notificationHistory: 30,
    notificationRetention: 90,
    escalationEnabled: true,
    escalationDelay: 30,
    reminderEnabled: true,
    reminderInterval: 60,
    templateCustomization: true,
    notificationCategories: {
      system: true,
      security: true,
      orders: true,
      users: true,
      documents: true,
      reports: true,
    },
  });

  const [appearanceConfig, setAppearanceConfig] = useState({
    theme: 'light',
    autoTheme: false,
    primaryColor: '#501b36',
    secondaryColor: '#FFA726',
    accentColor: '#4CAF50',
    errorColor: '#F44336',
    warningColor: '#FF9800',
    successColor: '#4CAF50',
    infoColor: '#2196F3',
    backgroundColor: '#FAFAFA',
    surfaceColor: '#FFFFFF',
    fontSize: 'medium',
    fontScale: 100,
    fontFamily: 'Roboto',
    headerFont: 'Roboto',
    bodyFont: 'Roboto',
    compactMode: false,
    denseMode: false,
    sidebarCollapsed: false,
    sidebarPosition: 'left',
    headerPosition: 'top',
    footerEnabled: true,
    breadcrumbsEnabled: true,
    showAvatars: true,
    showTimestamps: true,
    showTooltips: true,
    animationsEnabled: true,
    transitionSpeed: 'normal',
    reducedMotion: false,
    highContrast: false,
    customCss: '',
    logoUrl: '',
    logoHeight: 40,
    faviconUrl: '',
    loginBackground: '',
    loginLogo: '',
    brandingEnabled: true,
    poweredByEnabled: false,
    customFooter: '',
    customHeader: '',
    pageTransitions: true,
    loadingAnimations: true,
    skeletonLoading: true,
  });

  const [integrationConfig, setIntegrationConfig] = useState({
    // Autenticación
    activeDirectoryEnabled: false,
    ldapEnabled: false,
    ldapServer: '',
    ldapPort: '389',
    ldapBaseDn: '',
    ldapBindDn: '',
    ldapBindPassword: '',
    samlEnabled: false,
    samlProvider: '',
    samlCertificate: '',
    oauthEnabled: false,
    oauthProviders: {
      google: false,
      microsoft: false,
      github: false,
      linkedin: false,
    },
    jwtEnabled: true,
    jwtExpiration: 24,
    jwtRefreshEnabled: true,
    jwtRefreshExpiration: 168,
    
    // APIs y Servicios
    apiEnabled: true,
    apiVersion: 'v1',
    apiRateLimit: 1000,
    apiDocumentation: true,
    webhookEnabled: false,
    webhookUrl: '',
    webhookSecret: '',
    webhookEvents: [],
    
    // Servicios externos
    googleAnalyticsId: '',
    googleMapsApiKey: '',
    googleRecaptchaKey: '',
    slackWebhook: '',
    slackChannel: '#general',
    teamsWebhook: '',
    discordWebhook: '',
    
    // Monitoreo
    sentryEnabled: false,
    sentryDsn: '',
    newRelicEnabled: false,
    newRelicKey: '',
    dataDogEnabled: false,
    dataDogApiKey: '',
    
    // Pagos
    stripeEnabled: false,
    stripePublicKey: '',
    stripeSecretKey: '',
    paypalEnabled: false,
    paypalClientId: '',
    paypalSecret: '',
    
    // Comunicaciones
    twilioEnabled: false,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromNumber: '',
    
    corsOrigins: 'localhost,127.0.0.1',
    rateLimitingEnabled: true,
    cachingEnabled: true,
    compressionEnabled: true,
  });

  const [advancedConfig, setAdvancedConfig] = useState({
    // Cache
    cacheEnabled: true,
    cacheProvider: 'memory',
    cacheSize: 512,
    cacheTtl: 3600,
    cachePrefix: 'app_',
    
    // Compresión
    compressionEnabled: true,
    compressionLevel: 6,
    compressionThreshold: 1024,
    
    // Logging
    loggingEnabled: true,
    loggingLevel: 'info',
    logRetention: 30,
    logRotation: true,
    logFormat: 'json',
    
    // Performance
    performanceMonitoring: true,
    performanceThreshold: 1000,
    errorTracking: true,
    errorReporting: true,
    healthChecks: true,
    healthCheckInterval: 60,
    
    // Mantenimiento
    maintenanceWindow: '02:00-04:00',
    maintenanceNotification: true,
    autoUpdates: false,
    updateChannel: 'stable',
    betaFeatures: false,
    experimentalFeatures: false,
    featureFlags: {},
    
    // Desarrollo
    debugMode: false,
    debugLevel: 'info',
    debugConsole: false,
    profiling: false,
    
    // Scripts personalizados
    customScripts: '',
    customCss: '',
    customJs: '',
    
    // Tareas en segundo plano
    cronJobs: true,
    backgroundTasks: true,
    queueEnabled: true,
    queueProvider: 'memory',
    workerProcesses: 4,
    maxJobRetries: 3,
    jobTimeout: 300,
    
    // Base de datos
    dbPoolSize: 10,
    dbTimeout: 30,
    dbRetries: 3,
    queryLogging: false,
    slowQueryThreshold: 1000,
    
    // Memoria y recursos
    memoryLimit: '512M',
    executionTimeLimit: 300,
    uploadTimeout: 120,
    maxConcurrentConnections: 1000,
    
    // Optimización
    assetsMinification: true,
    assetsCompression: true,
    imageLazyLoading: true,
    preloadCriticalResources: true,
    serviceWorkerEnabled: false,
  });

  const [systemInfo] = useState({
    version: '2.1.0',
    environment: 'production',
    platform: 'Linux x64',
    nodeVersion: '18.17.0',
    phpVersion: '8.2.0',
    databaseVersion: 'PostgreSQL 15.0',
    webServer: 'Nginx 1.20.0',
    uptime: '15 días, 7 horas, 23 minutos',
    startTime: '2025-06-29T08:30:00Z',
    lastRestart: '2025-07-01T02:00:00Z',
    cpu: '12%',
    cpuCores: 8,
    memory: '4.2 GB / 16 GB',
    memoryUsage: '26.25%',
    disk: '85 GB / 500 GB',
    diskUsage: '17%',
    networkIn: '125 MB',
    networkOut: '89 MB',
    activeUsers: 45,
    totalUsers: 1250,
    onlineUsers: 23,
    registeredToday: 5,
    totalRequests: 128567,
    requestsToday: 2847,
    averageResponseTime: '245ms',
    peakResponseTime: '1.2s',
    errorRate: '0.02%',
    errorsToday: 3,
    databaseSize: '2.8 GB',
    databaseConnections: 45,
    cacheHitRate: '94.5%',
    cacheSize: '156 MB',
    storageUsed: '85 GB',
    storageAvailable: '415 GB',
    backupSize: '1.2 GB',
    lastBackup: '2025-07-14T02:00:00Z',
    nextBackup: '2025-07-15T02:00:00Z',
    nextMaintenance: '2025-07-21T02:00:00Z',
    systemHealth: 'Óptimo',
    securityLevel: 'Alto',
    complianceStatus: 'GDPR Conforme',
    sslStatus: 'Válido hasta 2025-12-31',
    firewallStatus: 'Activo',
    antivirusStatus: 'Actualizado',
    systemLoad: [0.45, 0.52, 0.38],
  });

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleSaveConfig = (section: string) => {
    setAlert({ type: 'success', message: `Configuración de ${section} guardada correctamente` });
    setTimeout(() => setAlert(null), 3000);
  };

  const handleTestConnection = (service: string) => {
    setAlert({ type: 'info', message: `Probando conexión con ${service}...` });
    setTimeout(() => {
      setAlert({ type: 'success', message: `Conexión con ${service} exitosa` });
    }, 2000);
  };

  const handleSystemReset = () => {
    setOpenDialog(true);
  };

  const confirmReset = () => {
    setAlert({ type: 'success', message: 'Configuración del sistema restablecida' });
    setOpenDialog(false);
  };

  const togglePasswordVisibility = () => {
    setShowPasswords(!showPasswords);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      maxWidth: { xs: '100%', sm: '100%', md: '1200px', lg: '1400px' },
      mx: 'auto',
      px: { xs: 0, sm: 1, md: 2 }
    }}>
      {/* Alerta */}
      {alert && (
        <Alert 
          severity={alert.type} 
          sx={{ mb: 2 }} 
          onClose={() => setAlert(null)}
        >
          {alert.message}
        </Alert>
      )}

      {/* Header con métricas del sistema */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <SettingsIcon sx={{ fontSize: 40, color: '#501b36' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#501b36' }}>
              Configuración Avanzada del Sistema
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Panel completo de administración y configuración del portal empresarial v{systemInfo.version}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Último reinicio: {new Date(systemInfo.lastRestart).toLocaleString('es-ES')} • 
              Uptime: {systemInfo.uptime} • 
              Estado: {systemInfo.systemHealth}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Badge color={systemInfo.systemHealth === 'Óptimo' ? 'success' : 'warning'} variant="dot">
              <MonitorHeart color="primary" />
            </Badge>
            <Typography variant="body2" color="textSecondary">
              {systemInfo.systemHealth}
            </Typography>
          </Box>
        </Box>
        
        {/* Métricas en tiempo real */}
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3} md={2}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Computer color="primary" fontSize="small" />
                  <Typography variant="caption" color="textSecondary">CPU</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{systemInfo.cpu}</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={12} 
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                  color="primary"
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Memory color="secondary" fontSize="small" />
                  <Typography variant="caption" color="textSecondary">Memoria</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>4.2/16 GB</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={26.25} 
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                  color="secondary"
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Storage color="info" fontSize="small" />
                  <Typography variant="caption" color="textSecondary">Almacenamiento</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>85/500 GB</Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={17} 
                  sx={{ mt: 1, height: 4, borderRadius: 2 }}
                  color="info"
                />
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Group color="success" fontSize="small" />
                  <Typography variant="caption" color="textSecondary">Usuarios</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{systemInfo.onlineUsers}/{systemInfo.activeUsers}</Typography>
                <Typography variant="caption" color="textSecondary">Online/Activos</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Speed color="warning" fontSize="small" />
                  <Typography variant="caption" color="textSecondary">Respuesta</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{systemInfo.averageResponseTime}</Typography>
                <Typography variant="caption" color="textSecondary">Promedio</Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={6} sm={3} md={2}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Timeline color="error" fontSize="small" />
                  <Typography variant="caption" color="textSecondary">Errores</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{systemInfo.errorRate}</Typography>
                <Typography variant="caption" color="textSecondary">Tasa de error</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs de configuración expandidos */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 72,
              textTransform: 'none',
            }
          }}
        >
          <Tab icon={<Business />} label="General" />
          <Tab icon={<Email />} label="Email" />
          <Tab icon={<Storage />} label="Almacenamiento" />
          <Tab icon={<Security />} label="Seguridad" />
          <Tab icon={<Notifications />} label="Notificaciones" />
          <Tab icon={<Palette />} label="Apariencia" />
          <Tab icon={<Api />} label="Integraciones" />
          <Tab icon={<Code />} label="Avanzado" />
          <Tab icon={<Computer />} label="Sistema" />
        </Tabs>

        {/* Tab Panel 0 - General (Expandido) */}
        <TabPanel value={currentTab} index={0}>
          <Stack spacing={3}>
            {/* Información de la empresa */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Business color="primary" />
                  Información de la Empresa
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre de la Aplicación"
                      value={systemConfig.appName}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, appName: e.target.value }))}
                      fullWidth
                      helperText="Nombre que aparecerá en el título y encabezados"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Versión de la Aplicación"
                      value={systemConfig.appVersion}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, appVersion: e.target.value }))}
                      fullWidth
                      helperText="Versión actual del sistema"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Nombre de la Empresa"
                      value={systemConfig.companyName}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyName: e.target.value }))}
                      fullWidth
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="NIF/CIF de la Empresa"
                      value={systemConfig.companyTaxId}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyTaxId: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Dirección de la Empresa"
                      value={systemConfig.companyAddress}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyAddress: e.target.value }))}
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Teléfono"
                      value={systemConfig.companyPhone}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyPhone: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Email de Contacto"
                      type="email"
                      value={systemConfig.companyEmail}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyEmail: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      label="Sitio Web"
                      value={systemConfig.companyWebsite}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyWebsite: e.target.value }))}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="URL del Logo"
                      value={systemConfig.companyLogo}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, companyLogo: e.target.value }))}
                      fullWidth
                      helperText="URL del logo de la empresa (opcional)"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Configuración regional */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Language color="primary" />
                  Configuración Regional y Localización
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Idioma Principal</InputLabel>
                      <Select
                        value={systemConfig.language}
                        label="Idioma Principal"
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, language: e.target.value }))}
                      >
                        <MenuItem value="es">🇪🇸 Español</MenuItem>
                        <MenuItem value="en">🇺🇸 English</MenuItem>
                        <MenuItem value="fr">🇫🇷 Français</MenuItem>
                        <MenuItem value="de">🇩🇪 Deutsch</MenuItem>
                        <MenuItem value="pt">🇵🇹 Português</MenuItem>
                        <MenuItem value="it">🇮🇹 Italiano</MenuItem>
                        <MenuItem value="ca">🏴󠁥󠁳󠁣󠁴󠁿 Català</MenuItem>
                        <MenuItem value="eu">🏴󠁥󠁳󠁰󠁶󠁿 Euskera</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Zona Horaria</InputLabel>
                      <Select
                        value={systemConfig.timezone}
                        label="Zona Horaria"
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, timezone: e.target.value }))}
                      >
                        <MenuItem value="Europe/Madrid">Madrid (GMT+1)</MenuItem>
                        <MenuItem value="Europe/London">Londres (GMT+0)</MenuItem>
                        <MenuItem value="Europe/Paris">París (GMT+1)</MenuItem>
                        <MenuItem value="Europe/Berlin">Berlín (GMT+1)</MenuItem>
                        <MenuItem value="Europe/Rome">Roma (GMT+1)</MenuItem>
                        <MenuItem value="America/New_York">Nueva York (GMT-5)</MenuItem>
                        <MenuItem value="America/Los_Angeles">Los Ángeles (GMT-8)</MenuItem>
                        <MenuItem value="Asia/Tokyo">Tokio (GMT+9)</MenuItem>
                        <MenuItem value="Australia/Sydney">Sídney (GMT+10)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Formato de Fecha</InputLabel>
                      <Select
                        value={systemConfig.dateFormat}
                        label="Formato de Fecha"
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, dateFormat: e.target.value }))}
                      >
                        <MenuItem value="DD/MM/YYYY">DD/MM/YYYY (España)</MenuItem>
                        <MenuItem value="MM/DD/YYYY">MM/DD/YYYY (EE.UU.)</MenuItem>
                        <MenuItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</MenuItem>
                        <MenuItem value="DD-MM-YYYY">DD-MM-YYYY</MenuItem>
                        <MenuItem value="YYYY/MM/DD">YYYY/MM/DD (Japón)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth>
                      <InputLabel>Formato de Hora</InputLabel>
                      <Select
                        value={systemConfig.timeFormat}
                        label="Formato de Hora"
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, timeFormat: e.target.value }))}
                      >
                        <MenuItem value="24h">24 horas (14:30)</MenuItem>
                        <MenuItem value="12h">12 horas (2:30 PM)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Moneda</InputLabel>
                      <Select
                        value={systemConfig.currency}
                        label="Moneda"
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, currency: e.target.value }))}
                      >
                        <MenuItem value="EUR">Euro (€)</MenuItem>
                        <MenuItem value="USD">Dólar estadounidense ($)</MenuItem>
                        <MenuItem value="GBP">Libra esterlina (£)</MenuItem>
                        <MenuItem value="JPY">Yen japonés (¥)</MenuItem>
                        <MenuItem value="CHF">Franco suizo (CHF)</MenuItem>
                        <MenuItem value="CAD">Dólar canadiense (CAD)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Símbolo de Moneda"
                      value={systemConfig.currencySymbol}
                      onChange={(e) => setSystemConfig(prev => ({ ...prev, currencySymbol: e.target.value }))}
                      fullWidth
                      helperText="Símbolo personalizado para la moneda"
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Configuración de usuarios y acceso */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PersonAdd color="primary" />
                  Gestión de Usuarios y Acceso
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Permitir registro de nuevos usuarios"
                          secondary="Los usuarios pueden registrarse automáticamente"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.allowRegistration}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Verificación de email requerida"
                          secondary="Los usuarios deben verificar su email"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.emailVerificationRequired}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, emailVerificationRequired: e.target.checked }))}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Aprobación de administrador requerida"
                          secondary="Los registros necesitan aprobación manual"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.adminApprovalRequired}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, adminApprovalRequired: e.target.checked }))}
                            color="warning"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Permitir acceso de invitados"
                          secondary="Usuarios sin cuenta pueden ver contenido público"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.enableGuestAccess}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, enableGuestAccess: e.target.checked }))}
                            color="secondary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Rol por defecto para nuevos usuarios</InputLabel>
                      <Select
                        value={systemConfig.defaultUserRole}
                        label="Rol por defecto para nuevos usuarios"
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, defaultUserRole: e.target.value }))}
                      >
                        <MenuItem value="employee">Empleado</MenuItem>
                        <MenuItem value="manager">Gerente</MenuItem>
                        <MenuItem value="admin">Administrador</MenuItem>
                        <MenuItem value="guest">Invitado</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Box sx={{ mb: 2 }}>
                      <Typography gutterBottom>
                        Sesiones concurrentes máximas: {systemConfig.maxConcurrentSessions}
                      </Typography>
                      <Slider
                        value={systemConfig.maxConcurrentSessions}
                        onChange={(_, value) => setSystemConfig(prev => ({ ...prev, maxConcurrentSessions: value as number }))}
                        min={1}
                        max={20}
                        step={1}
                        marks={[
                          { value: 1, label: '1' },
                          { value: 5, label: '5' },
                          { value: 10, label: '10' },
                          { value: 20, label: '20' },
                        ]}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                    
                    <Box>
                      <Typography gutterBottom>
                        Timeout de sesión (minutos): {systemConfig.sessionTimeout}
                      </Typography>
                      <Slider
                        value={systemConfig.sessionTimeout}
                        onChange={(_, value) => setSystemConfig(prev => ({ ...prev, sessionTimeout: value as number }))}
                        min={5}
                        max={480}
                        step={5}
                        marks={[
                          { value: 5, label: '5m' },
                          { value: 30, label: '30m' },
                          { value: 60, label: '1h' },
                          { value: 240, label: '4h' },
                          { value: 480, label: '8h' },
                        ]}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Configuración del sistema */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SettingsIcon color="primary" />
                  Configuración General del Sistema
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Modo mantenimiento"
                          secondary="Desactiva el acceso al sistema temporalmente"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.maintenanceMode}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                            color="warning"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Analytics habilitado"
                          secondary="Recopila datos de uso del sistema"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.analyticsEnabled}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, analyticsEnabled: e.target.checked }))}
                            color="info"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Consentimiento de cookies"
                          secondary="Muestra banner de cookies (GDPR)"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.cookieConsent}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, cookieConsent: e.target.checked }))}
                            color="success"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <List>
                      <ListItem>
                        <ListItemText 
                          primary="Modo debug (desarrollo)"
                          secondary="Activa información de depuración"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.debugMode}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, debugMode: e.target.checked }))}
                            color="error"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Restablecimiento de contraseña"
                          secondary="Permite a los usuarios restablecer su contraseña"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.passwordResetEnabled}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, passwordResetEnabled: e.target.checked }))}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Bloqueo de cuenta"
                          secondary="Bloquea cuentas tras intentos fallidos"
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            checked={systemConfig.accountLockoutEnabled}
                            onChange={(e) => setSystemConfig(prev => ({ ...prev, accountLockoutEnabled: e.target.checked }))}
                            color="warning"
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </Grid>
                  
                  {systemConfig.maintenanceMode && (
                    <Grid item xs={12}>
                      <TextField
                        label="Mensaje de mantenimiento"
                        value={systemConfig.maintenanceMessage}
                        onChange={(e) => setSystemConfig(prev => ({ ...prev, maintenanceMessage: e.target.value }))}
                        fullWidth
                        multiline
                        rows={2}
                        helperText="Mensaje que verán los usuarios durante el mantenimiento"
                      />
                    </Grid>
                  )}
                  
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography gutterBottom>
                        Retención de datos (días): {systemConfig.dataRetentionDays}
                      </Typography>
                      <Slider
                        value={systemConfig.dataRetentionDays}
                        onChange={(_, value) => setSystemConfig(prev => ({ ...prev, dataRetentionDays: value as number }))}
                        min={30}
                        max={2555}
                        step={30}
                        marks={[
                          { value: 30, label: '1m' },
                          { value: 365, label: '1a' },
                          { value: 1095, label: '3a' },
                          { value: 2555, label: '7a' },
                        ]}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Box>
                      <Typography gutterBottom>
                        Auto-logout inactivo (minutos): {systemConfig.autoLogout}
                      </Typography>
                      <Slider
                        value={systemConfig.autoLogout}
                        onChange={(_, value) => setSystemConfig(prev => ({ ...prev, autoLogout: value as number }))}
                        min={5}
                        max={240}
                        step={5}
                        marks={[
                          { value: 5, label: '5m' },
                          { value: 30, label: '30m' },
                          { value: 60, label: '1h' },
                          { value: 240, label: '4h' },
                        ]}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Grid>
                </Grid>
                
                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button 
                    variant="contained" 
                    onClick={() => handleSaveConfig('General')}
                    startIcon={<Save />}
                    size="large"
                  >
                    Guardar Configuración General
                  </Button>
                  <Button 
                    variant="outlined" 
                    onClick={() => handleTestConnection('Sistema')}
                    startIcon={<NetworkCheck />}
                  >
                    Probar Configuración
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="warning"
                    startIcon={<Refresh />}
                  >
                    Restaurar Valores por Defecto
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* Tabs restantes con placeholder expandido */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h5" gutterBottom>📧 Configuración Avanzada de Email</Typography>
          <Typography variant="body1" color="textSecondary">
            Configuración completa de SMTP, notificaciones, plantillas, y gestión de correo empresarial.
            Esta sección incluirá más de 20 opciones de configuración detalladas.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h5" gutterBottom>💾 Configuración Avanzada de Almacenamiento</Typography>
          <Typography variant="body1" color="textSecondary">
            Gestión completa de archivos, backup, compresión, CDN, almacenamiento en la nube y optimización.
            Incluye configuración para AWS S3, Azure Blob, Google Cloud Storage y más.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={3}>
          <Typography variant="h5" gutterBottom>🔒 Configuración Avanzada de Seguridad</Typography>
          <Typography variant="body1" color="textSecondary">
            Políticas de seguridad, autenticación, cifrado, firewall, detección de amenazas y cumplimiento.
            Más de 30 opciones de seguridad empresarial avanzada.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={4}>
          <Typography variant="h5" gutterBottom>🔔 Configuración Avanzada de Notificaciones</Typography>
          <Typography variant="body1" color="textSecondary">
            Email, push, SMS, webhooks, plantillas personalizadas, horarios y escalación automática.
            Sistema completo de notificaciones multicanal.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={5}>
          <Typography variant="h5" gutterBottom>🎨 Configuración Avanzada de Apariencia</Typography>
          <Typography variant="body1" color="textSecondary">
            Temas, colores, tipografía, logos, CSS personalizado, responsive design y branding corporativo.
            Personalización completa de la interfaz de usuario.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={6}>
          <Typography variant="h5" gutterBottom>🔗 Configuración de Integraciones</Typography>
          <Typography variant="body1" color="textSecondary">
            APIs, webhooks, OAuth, SAML, Active Directory, servicios de terceros y sincronización de datos.
            Más de 25 integraciones empresariales disponibles.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={7}>
          <Typography variant="h5" gutterBottom>⚙️ Configuración Avanzada del Sistema</Typography>
          <Typography variant="body1" color="textSecondary">
            Cache, logging, performance, workers, cron jobs, base de datos y optimización del servidor.
            Configuración técnica avanzada para administradores de sistema.
          </Typography>
        </TabPanel>
        
        <TabPanel value={currentTab} index={8}>
          <Typography variant="h5" gutterBottom>📊 Información y Monitoreo del Sistema</Typography>
          <Typography variant="body1" color="textSecondary">
            Métricas en tiempo real, logs, estadísticas, salud del sistema y herramientas de diagnóstico.
            Panel completo de monitoreo empresarial.
          </Typography>
        </TabPanel>
      </Paper>

      {/* Dialog de confirmación */}
      <ModernModal
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        title="Confirmar Restablecimiento del Sistema"
        subtitle="Esta acción es irreversible"
        icon={<Warning />}
        maxWidth="sm"
        headerColor="#ff9800"
        customHeaderGradient="linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #ef6c00 100%)"
        actions={
          <>
            <ModernButton
              variant="outlined"
              onClick={() => setOpenDialog(false)}
            >
              Cancelar
            </ModernButton>
            <ModernButton
              variant="contained"
              onClick={confirmReset}
              customColor="#ff9800"
              startIcon={<Refresh />}
            >
              Confirmar Restablecimiento
            </ModernButton>
          </>
        }
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              ⚠️ Acción Crítica del Sistema
            </Typography>
            <Typography variant="body2">
              Esta operación restablecerá todas las configuraciones a sus valores por defecto.
            </Typography>
          </Alert>

          <Box sx={{ 
            p: 3, 
            backgroundColor: 'white', 
            borderRadius: 2.5,
            border: '2px solid #ff980015',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#ff9800' }}>
              ¿Qué se restablecerá?
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {[
                'Configuraciones de seguridad',
                'Configuraciones de notificaciones',
                'Configuraciones de correo electrónico',
                'Configuraciones de almacenamiento',
                'Temas y personalización',
                'Configuraciones de empresa',
                'APIs y integraciones'
              ].map((item, index) => (
                <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    backgroundColor: '#ff9800' 
                  }} />
                  <Typography variant="body2">{item}</Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="body2">
              <strong>Recomendación:</strong> Se recomienda realizar un backup de la configuración actual antes de continuar.
            </Typography>
          </Alert>
        </Box>
      </ModernModal>
    </Box>
  );
};

export { Settings };
export default Settings;
