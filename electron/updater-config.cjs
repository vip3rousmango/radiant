const UPSTREAM_TARGET = 'templetongroup/radiant'

function cleanPart (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function targetFromFeed (feed) {
  if (!feed) return null
  try {
    const url = new URL(feed)
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch { return null }
}
function isUpstreamTarget (owner, repo) {
  const normalizedRepo = cleanPart(repo).toLowerCase().replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  return `${cleanPart(owner).toLowerCase()}/${normalizedRepo}` === UPSTREAM_TARGET
}

function agencyUpdateTarget (pkg = {}, env = process.env) {
  const configured = targetFromFeed(env.ALLEGRETTO_UPDATE_FEED || pkg.allegrettoUpdateFeed)
  const owner = cleanPart(env.ALLEGRETTO_UPDATE_OWNER || pkg.allegrettoUpdateOwner || configured?.owner)
  const repo = cleanPart(env.ALLEGRETTO_UPDATE_REPO || pkg.allegrettoUpdateRepo || configured?.repo)
  if (!owner || !repo || isUpstreamTarget(owner, repo)) return null
  return { provider: 'github', owner, repo }
}

function configureUpdater (autoUpdater, { packageMetadata = {}, env = process.env } = {}) {
  const target = agencyUpdateTarget(packageMetadata, env)
  if (!target || typeof autoUpdater?.setFeedURL !== 'function') return false
  try {
    autoUpdater.setFeedURL(target)
    return true
  } catch { return false }
}

function updaterEnabledForPackage (pkg) {
  return pkg?.allegrettoUpdaterEnabled !== false && pkg?.radiantUpdaterEnabled !== false
}

function disableAutoUpdater (autoUpdater) {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
}

function registerDisabledUpdater ({ ipcMain, app }) {
  const disabled = () => ({
    version: null,
    current: app.getVersion(),
    hasUpdate: false,
    disabled: true,
    blocked: 'Updates are disabled for this build.'
  })
  ipcMain.handle('rad:check-update', async () => disabled())
  ipcMain.handle('rad:update-state', () => ({ phase: 'disabled', percent: 0, version: null, current: app.getVersion() }))
  ipcMain.handle('rad:install-location', () => ({ bundle: null, translocated: false, inApplications: false, updatable: false, disabled: true }))
  return { checkNow: async () => disabled(), startAutoCheck: () => {} }
}
module.exports = { agencyUpdateTarget, configureUpdater, updaterEnabledForPackage, disableAutoUpdater, registerDisabledUpdater }
