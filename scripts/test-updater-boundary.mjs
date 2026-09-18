#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { updaterEnabledForPackage, registerDisabledUpdater } = require('../electron/updater-config.cjs')
const { menuTemplate } = require('../electron/menu.cjs')

assert.equal(updaterEnabledForPackage({ radiantUpdaterEnabled: true }), true)
assert.equal(updaterEnabledForPackage({ radiantUpdaterEnabled: false }), false)
assert.equal(updaterEnabledForPackage({}), true)
assert.equal(updaterEnabledForPackage(null), true)

const handlers = new Set()
const events = new Set()
const ipcMain = {
  handle: name => handlers.add(name),
  on: name => events.add(name)
}
const disabled = registerDisabledUpdater({ ipcMain, app: { getVersion: () => '0.9.23' } })
assert.deepEqual([...handlers].sort(), ['rad:check-update', 'rad:install-location', 'rad:update-state'])
assert.deepEqual([...events], [])
assert.deepEqual(await disabled.checkNow(), {
  version: null,
  current: '0.9.23',
  hasUpdate: false,
  disabled: true,
  blocked: 'Updates are disabled for this build.'
})
assert.equal(disabled.startAutoCheck(), undefined)

const disabledMenu = menuTemplate({ checkNow: () => {}, updatesEnabled: false })
const enabledMenu = menuTemplate({ checkNow: () => {}, updatesEnabled: true })
const labels = menu => JSON.stringify(menu)
assert.equal(labels(disabledMenu).includes('Check for Updates'), false)
assert.equal(labels(enabledMenu).split('Check for Updates').length - 1, process.platform === 'darwin' ? 2 : 1)
assert.deepEqual(disabledMenu.filter(item => item.role), [{ role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }])

console.log('12/12 updater boundary checks passed')
