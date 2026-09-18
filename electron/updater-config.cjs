const UPSTREAM_TARGET = 'templetongroup/radiant'

function cleanPart (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validPart (value) {
  return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value)
}

function targetFromParts (owner, repo) {
  const cleanOwner = cleanPart(owner)
  const cleanRepo = cleanPart(repo).replace(/\.git$/, '')
  if (!validPart(cleanOwner) || !validPart(cleanRepo) || isUpstreamTarget(cleanOwner, cleanRepo)) return null
  return { owner: cleanOwner, repo: cleanRepo }
}

function targetFromFeed (feed) {
  if (!feed) return null
  try {
    const url = new URL(feed)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash ||
      url.hostname.toLowerCase() !== 'github.com') return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    return targetFromParts(parts[0], parts[1])
  } catch { return null }
}
function isUpstreamTarget (owner, repo) {
  const normalizedRepo = cleanPart(repo).toLowerCase().replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  return `${cleanPart(owner).toLowerCase()}/${normalizedRepo}` === UPSTREAM_TARGET
}

function targetFromSource (owner, repo, feed) {
  const cleanOwner = cleanPart(owner)
  const cleanRepo = cleanPart(repo)
  if (cleanOwner || cleanRepo) {
    if (!cleanOwner || !cleanRepo) return null
    return targetFromParts(cleanOwner, cleanRepo)
  }
  return cleanPart(feed) ? targetFromFeed(feed) : null
}
function isPartialPair (owner, repo) {
  return Boolean(cleanPart(owner)) !== Boolean(cleanPart(repo))
}


function agencyUpdateTarget (pkg = {}, env = process.env) {
  const packageMetadata = pkg && typeof pkg === 'object' ? pkg : {}
  const envOwner = cleanPart(env?.ALLEGRETTO_UPDATE_OWNER)
  const envRepo = cleanPart(env?.ALLEGRETTO_UPDATE_REPO)
  const envFeed = cleanPart(env?.ALLEGRETTO_UPDATE_FEED)
  const pkgOwner = cleanPart(packageMetadata.allegrettoUpdateOwner)
  const pkgRepo = cleanPart(packageMetadata.allegrettoUpdateRepo)
  const pkgFeed = cleanPart(packageMetadata.allegrettoUpdateFeed)

  // Select one complete source at a time. Explicit environment owner/repo
  // values take precedence over package metadata and feed settings.
  let target
  if (envOwner || envRepo) {
    target = targetFromSource(envOwner, envRepo)
  } else if (envFeed) {
    if (isPartialPair(pkgOwner, pkgRepo)) return null
    target = targetFromSource('', '', envFeed)
  } else if (pkgOwner || pkgRepo) {
    target = targetFromSource(pkgOwner, pkgRepo)
  } else {
    target = targetFromSource('', '', pkgFeed)
  }
  if (!target) return null
  return { provider: 'github', ...target }
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
