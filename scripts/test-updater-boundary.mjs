#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { agencyUpdateTarget, configureUpdater, updaterEnabledForPackage, disableAutoUpdater, registerDisabledUpdater } = require('../electron/updater-config.cjs')
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

function assertUpdaterNotConfigured (caseName, packageMetadata, env) {
  const calls = []
  assert.equal(agencyUpdateTarget(packageMetadata, env), null, `${caseName} must resolve to no target`)
  assert.equal(configureUpdater({ setFeedURL: target => calls.push(target) }, { packageMetadata, env }), false, `${caseName} must not configure the updater`)
  assert.deepEqual(calls, [], `${caseName} must not call setFeedURL`)
}

assertUpdaterNotConfigured(
  'owner-only environment target',
  { allegrettoUpdateRepo: 'allegretto' },
  { ALLEGRETTO_UPDATE_OWNER: 'virtuallycreative' }
)
assertUpdaterNotConfigured(
  'repo-only environment target',
  { allegrettoUpdateOwner: 'virtuallycreative' },
  { ALLEGRETTO_UPDATE_REPO: 'allegretto' }
)
assertUpdaterNotConfigured(
  'mixed package owner/feed target',
  {
    allegrettoUpdateOwner: 'virtuallycreative',
    allegrettoUpdateFeed: 'https://github.com/other-owner/other-repo'
  },
  {}
)
assertUpdaterNotConfigured(
  'mixed environment/package target',
  { allegrettoUpdateRepo: 'allegretto' },
  { ALLEGRETTO_UPDATE_OWNER: 'virtuallycreative' }
)
assertUpdaterNotConfigured(
  'mixed environment feed/package target',
  { allegrettoUpdateOwner: 'other-owner' },
  { ALLEGRETTO_UPDATE_FEED: 'https://github.com/virtuallycreative/allegretto' }
)
assertUpdaterNotConfigured(
  'upstream target',
  {},
  { ALLEGRETTO_UPDATE_OWNER: 'templetongroup', ALLEGRETTO_UPDATE_REPO: 'radiant' }
)

const agencyTarget = { provider: 'github', owner: 'virtuallycreative', repo: 'allegretto' }
assert.deepEqual(
  agencyUpdateTarget(
    { allegrettoUpdateFeed: 'https://github.com/virtuallycreative/allegretto' },
    {}
  ),
  agencyTarget
)
const configuredCalls = []
assert.equal(
  configureUpdater({ setFeedURL: target => configuredCalls.push(target) }, {
    packageMetadata: { allegrettoUpdateOwner: 'virtuallycreative', allegrettoUpdateRepo: 'allegretto' },
    env: {}
  }),
  true
)
assert.deepEqual(configuredCalls, [agencyTarget])

console.log('updater boundary assertions passed')
