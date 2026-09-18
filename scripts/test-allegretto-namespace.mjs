#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const home = mkdtempSync(join(tmpdir(), 'allegretto-namespace-'))
const env = { ...process.env, HOME: home }
delete env.RADIANT_DIR

const probe = `
  import assert from 'node:assert/strict'
  import fs from 'node:fs'
  import path from 'node:path'
  import { defaultDataDir, DIR_POINTER, loadMachineSettings, saveMachineSettings, RADIANT_DIR } from './server/config.js'
  import { LOCK_NAME, readLock, writeLock } from './server/lock.js'

  const home = process.env.HOME
  assert.equal(defaultDataDir(), path.join(home, '.allegretto'), 'default data directory uses Allegretto')
  assert.equal(DIR_POINTER, path.join(home, '.allegretto-location'), 'data pointer filename uses Allegretto')
  assert.equal(RADIANT_DIR, defaultDataDir(), 'default active data directory follows the Allegretto default')

  saveMachineSettings({ defaultModel: 'namespace-regression' })
  const machineFile = path.join(home, '.allegretto-machine.json')
  assert.deepEqual(loadMachineSettings(), { defaultModel: 'namespace-regression' }, 'machine settings round-trip')
  assert.equal(fs.existsSync(machineFile), true, 'machine settings file uses the Allegretto filename')
  assert.equal(fs.existsSync(path.join(home, '.radiant-machine.json')), false, 'machine settings never use the Radiant filename')

  const lockDir = fs.mkdtempSync(path.join(home, 'lock-'))
  assert.equal(LOCK_NAME, '.allegretto-lock.json', 'lock filename uses Allegretto')
  assert.equal(writeLock(lockDir, { host: 'namespace-test', pid: 1, startedAt: 'now', beatAt: 'now' }), true, 'lock writes')
  assert.deepEqual(readLock(lockDir), { host: 'namespace-test', pid: 1, startedAt: 'now', beatAt: 'now' }, 'lock is written at the Allegretto filename')
  assert.equal(fs.existsSync(path.join(lockDir, '.radiant-lock.json')), false, 'lock never uses the Radiant filename')
`

try {
  execFileSync(process.execPath, ['--input-type=module', '--eval', probe], { cwd: root, env, stdio: 'pipe' })

  const index = readFileSync(join(root, 'server', 'index.js'), 'utf8')
  assert.match(index, /const DL_DIR = path\.join\(os\.homedir\(\), '\.allegretto', 'downloads'\)/, 'model download path uses Allegretto')
  assert.doesNotMatch(index, /const DL_DIR = path\.join\(os\.homedir\(\), '\.radiant', 'downloads'\)/i, 'model download path never uses Radiant')
  assert.match(index, /path\.join\(dir, 'Allegretto'\)/, 'cloud sync target product folder uses Allegretto')
  assert.doesNotMatch(index, /path\.join\(dir, 'Radiant'\)/, 'cloud sync target product folder never uses Radiant')

  const windowState = readFileSync(join(root, 'electron', 'window-state.cjs'), 'utf8')
  assert.match(windowState, /const FILE = path\.join\(os\.homedir\(\), '\.allegretto', 'window-state\.json'\)/, 'window-state path uses Allegretto')
  assert.doesNotMatch(windowState, /const FILE = path\.join\(os\.homedir\(\), '\.radiant', 'window-state\.json'\)/i, 'window-state path never uses Radiant')

  console.log('16 Allegretto namespace assertions passed')

} finally {
  rmSync(home, { recursive: true, force: true })
}
