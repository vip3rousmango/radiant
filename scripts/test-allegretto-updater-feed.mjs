#!/usr/bin/env node
/**
 * The browser updater is deliberately tested in a child process.  That gives
 * each case a fresh module and a clean environment, while the fetch stub makes
 * it impossible for a regression to contact GitHub (or any other network).
 */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { assetFor, isNewer, resolveFeed } from '../server/updater.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const UPDATER = pathToFileURL(join(ROOT, 'server', 'updater.js')).href
const TARGET_ENV = ['ALLEGRETTO_UPDATE_FEED', 'ALLEGRETTO_UPDATE_OWNER', 'ALLEGRETTO_UPDATE_REPO']

// Packaged electron metadata is an explicit feed configuration too. Keep the
// environment empty so these cases prove metadata is read intentionally, not
// inherited from the invoking shell.
const metadataEnv = {}
const agencyOwnerRepo = resolveFeed({
  env: metadataEnv,
  packageMetadata: {
    allegrettoUpdateOwner: 'virtuallycreative',
    allegrettoUpdateRepo: 'allegretto'
  }
})
assert.equal(agencyOwnerRepo?.owner, 'virtuallycreative')
assert.equal(agencyOwnerRepo?.repo, 'allegretto')
assert.equal(agencyOwnerRepo?.apiUrl, 'https://api.github.com/repos/virtuallycreative/allegretto/releases/latest')

const agencyFeedMetadata = resolveFeed({
  env: metadataEnv,
  packageMetadata: {
    allegrettoUpdateFeed: 'https://github.com/virtuallycreative/allegretto'
  }
})
assert.equal(agencyFeedMetadata?.owner, 'virtuallycreative')
assert.equal(agencyFeedMetadata?.repo, 'allegretto')
assert.equal(agencyFeedMetadata?.apiUrl, 'https://api.github.com/repos/virtuallycreative/allegretto/releases/latest')

assert.equal(resolveFeed({
  env: metadataEnv,
  packageMetadata: {
    allegrettoUpdateOwner: 'templetongroup',
    allegrettoUpdateRepo: 'radiant'
  }
}), null, 'packaged Templeton/Radiant owner/repo metadata must fail closed')
assert.equal(resolveFeed({
  env: metadataEnv,
  packageMetadata: {
    allegrettoUpdateFeed: 'https://github.com/templetongroup/radiant'
  }
}), null, 'packaged Templeton/Radiant feed metadata must fail closed')

function checkInIsolatedProcess (target = {}, withRelease = false) {
  const env = { ...process.env }
  for (const name of TARGET_ENV) delete env[name]
  Object.assign(env, target)

  const probe = `
    import { checkForUpdate } from ${JSON.stringify(UPDATER)}

    const calls = []
    globalThis.fetch = async (...args) => {
      calls.push(String(args[0]))
      ${withRelease ? `
        return {
          ok: true,
          json: async () => ({
            tag_name: 'v0.9.25',
            html_url: 'https://github.com/virtuallycreative/allegretto/releases/tag/v0.9.25',
            assets: [
              {
                name: 'Allegretto-0.9.25-arm64.dmg',
                browser_download_url: 'https://github.com/virtuallycreative/allegretto/releases/download/v0.9.25/Allegretto-0.9.25-arm64.dmg'
              },
              {
                name: 'Allegretto-0.9.25.AppImage',
                browser_download_url: 'https://github.com/virtuallycreative/allegretto/releases/download/v0.9.25/Allegretto-0.9.25.AppImage'
              },
              {
                name: 'Allegretto-0.9.25.exe',
                browser_download_url: 'https://github.com/virtuallycreative/allegretto/releases/download/v0.9.25/Allegretto-0.9.25.exe'
              }
            ],
            body: 'agency release',
            published_at: '2026-09-18T00:00:00Z'
          })
        }
      ` : `
        throw new Error('NETWORK_CALL:' + String(args[0]))
      `}
    }

    try {
      const result = await checkForUpdate('0.9.24')
      console.log(JSON.stringify({ ok: true, result, calls }))
    } catch (error) {
      console.log(JSON.stringify({ ok: false, error: String(error?.message || error), calls }))
    }
  `

  const output = execFileSync(process.execPath, ['--input-type=module', '--eval', probe], {
    cwd: ROOT,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
  return JSON.parse(output)
}

function assertDisabled (caseName, observed) {
  assert.equal(observed.calls.length, 0, `${caseName} must not call fetch`)
  if (observed.ok) {
    assert.equal(observed.result?.disabled, true, `${caseName} must return a disabled result`)
    assert.match(String(observed.result?.error || observed.result?.blocked || observed.result?.reason || ''), /update|feed|target|configur|disabled/i, `${caseName} must explain why updates are disabled`)
  } else {
    assert.match(observed.error, /update|feed|target|configur|disabled/i, `${caseName} must explain why updates are disabled`)
  }
}

// No target means no implicit/default repository and, importantly, no request.
assertDisabled('missing Allegretto update target', checkInIsolatedProcess())

// The upstream repository is never an acceptable agency target, even when it
// is supplied explicitly through either supported configuration form.
assertDisabled(
  'Templeton/Radiant feed target',
  checkInIsolatedProcess({ ALLEGRETTO_UPDATE_FEED: 'https://github.com/templetongroup/radiant' })
)
assertDisabled(
  'Templeton/Radiant owner/repo target',
  checkInIsolatedProcess({ ALLEGRETTO_UPDATE_OWNER: 'templetongroup', ALLEGRETTO_UPDATE_REPO: 'radiant' })
)

// A configured agency GitHub feed is accepted without falling back to a
// package or builder default. Both the direct API feed and the repository URL
// form resolve only to the agency's release data.
const agencyFeed = 'https://api.github.com/repos/virtuallycreative/allegretto/releases/latest'
const agencyRepoFeed = 'https://github.com/virtuallycreative/allegretto'
const agency = checkInIsolatedProcess({ ALLEGRETTO_UPDATE_FEED: agencyFeed }, true)
assert.equal(agency.ok, true, 'a valid Allegretto feed must be accepted')
assert.deepEqual(agency.calls, [agencyFeed], 'the direct feed must be the only API request')
assert.equal(agency.result.latest, '0.9.25')
assert.equal(agency.result.hasUpdate, true)
const expectedAgencyDownload = {
  darwin: 'https://github.com/virtuallycreative/allegretto/releases/download/v0.9.25/Allegretto-0.9.25-arm64.dmg',
  linux: 'https://github.com/virtuallycreative/allegretto/releases/download/v0.9.25/Allegretto-0.9.25.AppImage',
  win32: 'https://github.com/virtuallycreative/allegretto/releases/download/v0.9.25/Allegretto-0.9.25.exe'
}[process.platform] || 'https://github.com/virtuallycreative/allegretto/releases/tag/v0.9.25'
assert.equal(agency.result.downloadUrl, expectedAgencyDownload)
assert.doesNotMatch(agency.result.downloadUrl, /templetongroup\/radiant/i)
const agencyFromRepoFeed = checkInIsolatedProcess({ ALLEGRETTO_UPDATE_FEED: agencyRepoFeed }, true)
assert.equal(agencyFromRepoFeed.ok, true, 'a valid Allegretto repository feed must be accepted')
assert.deepEqual(agencyFromRepoFeed.calls, [agencyFeed])

// The owner/repo form is an equivalent explicit configuration and must build
// the same GitHub API endpoint without relying on a package or builder default.
const agencyByParts = checkInIsolatedProcess({ ALLEGRETTO_UPDATE_OWNER: 'virtuallycreative', ALLEGRETTO_UPDATE_REPO: 'allegretto' }, true)
assert.equal(agencyByParts.ok, true, 'a valid Allegretto owner/repo target must be accepted')
assert.deepEqual(agencyByParts.calls, [agencyFeed])

// Keep the existing pure helpers covered alongside feed resolution.
const assets = [
  { name: 'latest-mac.yml' },
  { name: 'Allegretto-0.9.25-arm64.dmg.blockmap' },
  { name: 'Allegretto-0.9.25-arm64.dmg' }
]
assert.equal(assetFor(assets, 'darwin')?.name, 'Allegretto-0.9.25-arm64.dmg')
assert.equal(assetFor(assets, 'linux'), null)
assert.equal(isNewer('0.9.24', 'v0.9.25'), true)
assert.equal(isNewer('0.9.25', '0.9.25'), false)
assert.equal(isNewer('0.9.26', '0.9.25'), false)

console.log('Allegretto updater feed tests passed (no network calls)')
