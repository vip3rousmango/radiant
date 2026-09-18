function updaterEnabledForPackage (pkg) {
  return pkg?.radiantUpdaterEnabled !== false
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

module.exports = { updaterEnabledForPackage, registerDisabledUpdater }
