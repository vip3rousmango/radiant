#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = file => readFileSync(join(root, file), 'utf8')

const manifest = JSON.parse(read('extension/manifest.json'))
assert.equal(manifest.name, 'Allegretto Browser Bridge', 'manifest name uses Allegretto')
assert.equal(
  manifest.description,
  'Lets Allegretto see and act in the Chrome you are already signed into.',
  'manifest description uses Allegretto',
)
assert.equal(
  manifest.action.default_title,
  'Allegretto — click for connection status',
  'manifest action title uses Allegretto',
)
assert.deepEqual(manifest.permissions, ['tabs', 'scripting', 'activeTab', 'alarms'], 'extension permissions are preserved')
assert.deepEqual(manifest.host_permissions, ['<all_urls>'], 'extension host access is preserved')
assert.equal(manifest.background.service_worker, 'sw.js', 'service-worker filename is preserved')
assert.equal(manifest.action.default_popup, 'popup.html', 'popup filename is preserved')

const popupHtml = read('extension/popup.html')
const popupJs = read('extension/popup.js')
assert.match(popupHtml, /<h1>Allegretto Browser Bridge<\/h1>/, 'popup heading uses Allegretto')
assert.match(popupJs, /Connected to Allegretto on port/, 'popup connected status uses Allegretto')
assert.match(popupJs, /Allegretto can see this browser/, 'popup connected guidance uses Allegretto')
assert.match(popupJs, /Open Allegretto\./, 'popup reconnect guidance uses Allegretto')

// Comments can explain compatibility history without becoming extension copy. Strip
// them before checking the service worker's strings that can reach Chrome's console,
// error surfaces, or the popup.
const serviceWorker = read('extension/sw.js')
const visibleServiceWorker = serviceWorker
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
assert.match(visibleServiceWorker, /console\.log\('\[allegretto\]'/, 'service-worker diagnostics use Allegretto')
assert.match(visibleServiceWorker, /'allegretto-keepalive'/, 'service-worker keepalive identifier uses Allegretto')
assert.match(visibleServiceWorker, /127\.0\.0\.1:\$\{port\}\/ws\/extension/, 'loopback socket protocol is preserved')

// A few old names are deliberately retained as non-user-facing compatibility
// identifiers: the package zip is consumed by existing internal automation, and
// server-side environment/protocol names must continue to interoperate. Remove
// only those exact forms before checking visible copy; never allow a general
// Radiant or Templeton mention through the exception.
const compatibilityIdentifiers = source => source
  .replace(/release\/radiant-extension-[^\s)`]+/gi, '')
  .replace(/\bRADIANT_(?:PORT|DIR)\b/g, '')
  .replace(/\b(?:radiant-control|radiantNative)\b/g, '')

function assertNoLegacyVisibleBrand (label, source) {
  const checked = compatibilityIdentifiers(source)
  assert.doesNotMatch(checked, /\bRadiant\b/i, `${label} has no visible Radiant branding`)
  assert.doesNotMatch(checked, /\bTempleton(?: Technologies)?\b/i, `${label} has no visible Templeton branding`)
}

assertNoLegacyVisibleBrand('manifest', JSON.stringify(manifest))
assertNoLegacyVisibleBrand('popup HTML', popupHtml)
assertNoLegacyVisibleBrand('popup script', popupJs)
assertNoLegacyVisibleBrand('service worker', visibleServiceWorker)

const store = read('extension/STORE.md')
assert.match(store, /^# Allegretto Browser Bridge — internal distribution guide/m, 'STORE title uses Allegretto')
assert.match(store, /\*\*Name:\*\* Allegretto Browser Bridge/, 'STORE listing name uses Allegretto')
assert.match(store, /\*\*Summary \(132 max\):\*[\s\S]*Lets the Allegretto agent/, 'STORE summary uses Allegretto')
assert.match(store, /internal agency distribution/, 'STORE marks internal agency distribution as current')
assert.match(store, /Virtually\(Creative\)/, 'STORE names Virtually(Creative) as the agency distributor')
assert.match(store, /not a public Chrome Web Store release/, 'STORE does not claim a public release')
assert.match(store, /127\.0\.0\.1/, 'STORE preserves loopback privacy guidance')
for (const permission of ['tabs', 'scripting', 'activeTab', 'alarms', '<all_urls>']) {
  const escaped = permission.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = permission === '<all_urls>' ? /<all_urls>/ : new RegExp(`\\b${escaped}\\b`)
  assert.match(store, pattern, `STORE explains ${permission}`)
}
assert.match(store, /no analytics/, 'STORE preserves no-analytics guidance')
assert.match(store, /no outbound internet request/, 'STORE preserves outbound-request guidance')
assertNoLegacyVisibleBrand('STORE', store)

console.log('Allegretto extension branding checks passed (no network calls)')
