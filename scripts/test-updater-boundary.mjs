#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { updaterEnabledForPackage, disableAutoUpdater, registerDisabledUpdater } = require('../electron/updater-config.cjs')
const { menuTemplate } = require('../electron/menu.cjs')

assert.equal(updaterEnabledForPackage({ radiantUpdaterEnabled: true }), true)
assert.equal(updaterEnabledForPackage({ radiantUpdaterEnabled: false }), false)
assert.equal(updaterEnabledForPackage({}), true)
assert.equal(updaterEnabledForPackage(null), true)
const autoUpdater = { autoDownload: true, autoInstallOnAppQuit: true }
disableAutoUpdater(autoUpdater)
assert.deepEqual(autoUpdater, { autoDownload: false, autoInstallOnAppQuit: false })

const handlers = new Map()
const events = new Set()
const ipcMain = {
  handle: (name, callback) => handlers.set(name, callback),
  on: name => events.add(name)
}
const app = { getVersion: () => '0.9.23' }
const disabled = registerDisabledUpdater({ ipcMain, app })
assert.deepEqual([...handlers.keys()].sort(), ['rad:check-update', 'rad:install-location', 'rad:update-state'])
assert.deepEqual([...events], [])
assert.deepEqual(await handlers.get('rad:check-update')(), {
  version: null,
  current: '0.9.23',
  hasUpdate: false,
  disabled: true,
  blocked: 'Updates are disabled for this build.'
})
assert.deepEqual(handlers.get('rad:update-state')(), {
  phase: 'disabled',
  percent: 0,
  version: null,
  current: '0.9.23'
})
assert.deepEqual(handlers.get('rad:install-location')(), {
  bundle: null,
  translocated: false,
  inApplications: false,
  updatable: false,
  disabled: true
})
assert.equal(disabled.startAutoCheck(), undefined)

const disabledMenu = menuTemplate({ checkNow: () => {}, updatesEnabled: false })
const enabledMenu = menuTemplate({ checkNow: () => {}, updatesEnabled: true })
const labels = menu => JSON.stringify(menu)
assert.equal(labels(disabledMenu).includes('Check for Updates'), false)
assert.equal(labels(enabledMenu).split('Check for Updates').length - 1, process.platform === 'darwin' ? 2 : 1)
assert.deepEqual(disabledMenu.filter(item => item.role), [{ role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }])

console.log('14 updater boundary assertions passed')
