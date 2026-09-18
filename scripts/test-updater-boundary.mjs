#!/usr/bin/env node
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { updaterEnabledForPackage } = require('../electron/updater-config.cjs')

assert.equal(updaterEnabledForPackage({ radiantUpdaterEnabled: true }), true)
assert.equal(updaterEnabledForPackage({ radiantUpdaterEnabled: false }), false)
assert.equal(updaterEnabledForPackage({}), true)
assert.equal(updaterEnabledForPackage(null), true)

console.log('4/4 updater boundary checks passed')
