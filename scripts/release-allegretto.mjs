#!/usr/bin/env node
// Build and publish Allegretto only when the operator explicitly opts in.
// The default invocation is a validation-only dry run; unsigned internal builds
// belong to `npm run dist:allegretto:unsigned` and can never publish.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { platform } from 'node:os'
import path from 'node:path'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
const build = pkg.build || {}
const releaseMode = process.argv.includes('--release')
const upstream = 'templetongroup/radiant'

function fail (message) {
  console.error(`[release:allegretto] ${message}`)
  process.exit(1)
}

function clean (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function isUpstream (owner, repo) {
  const normalizedRepo = clean(repo).toLowerCase().replace(/\.git$/, '').replace(/^\/+|\/+$/g, '')
  return `${clean(owner).toLowerCase()}/${normalizedRepo}` === upstream
}

function parseFeed (value) {
  if (!value) return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') return null
    const parts = url.pathname.split('/').filter(Boolean)
    if (parts.length !== 2) return null
    return { owner: parts[0], repo: parts[1].replace(/\.git$/, '') }
  } catch { return null }
}

function validateIdentity () {
  if (pkg.name !== 'allegretto') fail(`package name must be allegretto, got ${pkg.name || '(missing)'}`)
  if (build.productName !== 'Allegretto') fail(`productName must be Allegretto, got ${build.productName || '(missing)'}`)
  if (!/^com\.virtuallycreative\.allegretto(?:\.|$)/.test(clean(build.appId))) fail(`appId must use the Allegretto namespace, got ${build.appId || '(missing)'}`)
  if (Array.isArray(build.publish) && build.publish.length) fail('package.json must not contain a default publish target')
  const serialized = JSON.stringify(build.publish || '').toLowerCase()
  if (serialized.includes(upstream)) fail('package.json still contains the Templeton/Radiant publish target')
  if (build.mac?.identity && /anthony ricciardi|5vy66s6g3m/i.test(String(build.mac.identity))) fail('package.json still names the upstream signing identity')
}

function resolveTarget () {
  const fromFeed = parseFeed(process.env.ALLEGRETTO_UPDATE_FEED)
  const owner = clean(process.env.ALLEGRETTO_PUBLISH_OWNER || process.env.ALLEGRETTO_UPDATE_OWNER || fromFeed?.owner)
  const repo = clean(process.env.ALLEGRETTO_PUBLISH_REPO || process.env.ALLEGRETTO_UPDATE_REPO || fromFeed?.repo)
  if (owner || repo) {
    if (!owner || !repo) fail('ALLEGRETTO_PUBLISH_OWNER and ALLEGRETTO_PUBLISH_REPO must be supplied together')
    if (isUpstream(owner, repo)) fail('refusing the Templeton/Radiant publish or update target')
    return { owner, repo }
  }
  return null
}

const KNOWN_RADIANT_ICON_SHA256 = new Set([
  'be3e87f57859e5c348fa9731ed0899905b199ba7acd77f45a9bff09bdc6c0c3e',
  '99809ef7d3f9a963400a73b56d5e3f4b9c1e9738b162d653d06b649e12a0640e',
  'a92bb68fae851d6b5462cf6f3adc1df2d26f708a69e9c07c9f81d0a9408290c7',
  '8d7d82d92c9b9ee7833e0d1ccb82e0ef951798eb5af7bb32b9a8e81c2cb86d56',
  '9b9f27cf737066dde49701452fe632c6664b11a2216e8e875749406d79de1934',
  'ad31eede75ad101cb7af9a5adfdf49e45dcafea79dcbb40cc55ee4033a673d02',
  '14de4a3e5720235273a09a38d0f8ed2d3d0ee14c0411dc75c529cdf7671a8287',
  '955ca3094372ae0c7ce3b5c0bda771d12abc87ba43beac7e9056a9e177a200d2',
  'ab1118900b561bc16ea5935054dae29b0536e73e81550b3def066455120e98f0'
])

function validateIconReadiness () {
  const iconPath = path.join(root, 'build', 'icon.icns')
  let icon
  try {
    const stats = statSync(iconPath)
    if (!stats.isFile() || stats.size < 1024) fail('build/icon.icns is missing an Allegretto icon (install the high-resolution asset before releasing)')
    icon = readFileSync(iconPath)
  } catch {
    fail('build/icon.icns is missing an Allegretto icon (install the high-resolution asset before releasing)')
  }
  if (icon.subarray(0, 4).toString('ascii') !== 'icns' || icon.length < 8 || icon.readUInt32BE(4) !== icon.length) {
    fail('build/icon.icns is not a valid Allegretto icon')
  }
  if (!icon.includes(Buffer.from('ic10'))) {
    fail('build/icon.icns does not contain a high-resolution Allegretto icon')
  }
  const sha256 = createHash('sha256').update(icon).digest('hex')
  if (KNOWN_RADIANT_ICON_SHA256.has(sha256)) {
    fail('build/icon.icns is still the known Radiant icon; install the high-resolution Allegretto icon before releasing')
  }
}

function signedPrerequisites () {
  if (platform() !== 'darwin') fail('a real Allegretto release must be signed and notarized on macOS')
  const identity = clean(process.env.ALLEGRETTO_MAC_IDENTITY)
  if (!identity) fail('set ALLEGRETTO_MAC_IDENTITY for a signed Allegretto release')
  let identities
  try {
    identities = execFileSync('security', ['find-identity', '-v', '-p', 'codesigning'], { encoding: 'utf8' })
  } catch { fail('could not inspect the macOS signing identities') }
  const count = Number((identities.match(/valid identities found:\s*(\d+)/i) || [])[1] || 0)
  if (count < 1) fail('no valid macOS Developer ID signing identity is available')
  const selectedIdentity = identities.split('\n').some(line => {
    const match = line.match(/^\s*\d+\)\s+([0-9A-F]{40})\s+"([^"]+)"/i)
    return match && (match[1].toLowerCase() === identity.toLowerCase() || match[2] === identity)
  })
  if (!selectedIdentity) fail(`ALLEGRETTO_MAC_IDENTITY is not an available valid signing identity: ${identity}`)

  const profile = clean(process.env.ALLEGRETTO_NOTARY_PROFILE)
  if (!profile) fail('set ALLEGRETTO_NOTARY_PROFILE for a notarized Allegretto release')
  let keychain
  try {
    keychain = execFileSync('security', ['dump-keychain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch { fail('could not inspect notarytool keychain profiles') }
  const profiles = [...keychain.matchAll(/com\.apple\.gke\.notary\.tool\.saved-creds\.([A-Za-z0-9._-]+)/g)].map(m => m[1])
  if (!profiles.includes(profile)) fail('ALLEGRETTO_NOTARY_PROFILE is not an available notarytool keychain profile')
  return { identity, profile }
}

validateIdentity()
const target = resolveTarget()
if (!releaseMode) {
  if (target) console.log(`[release:allegretto] validated agency target ${target.owner}/${target.repo}`)
  console.log('[release:allegretto] validation only; no build or publish. Re-run with --release to ship a signed, notarized build.')
  process.exit(0)
}

if (!target) fail('no Allegretto publish target; set ALLEGRETTO_PUBLISH_OWNER and ALLEGRETTO_PUBLISH_REPO')
if (!clean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN)) fail('GH_TOKEN (or GITHUB_TOKEN) is required for a real release')
validateIconReadiness()
const { identity, profile } = signedPrerequisites()
const env = { ...process.env, ALLEGRETTO_NOTARY_PROFILE: profile }
const builder = process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'

console.log(`[release:allegretto] building signed Allegretto for ${target.owner}/${target.repo}`)
execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit', env })
execFileSync('npm', ['run', 'compile:helper'], { cwd: root, stdio: 'inherit', env })
execFileSync(path.join(root, 'node_modules', '.bin', builder), [
  '--mac',
  '--publish', 'always',
  `-c.mac.identity=${identity}`,
  '-c.extraMetadata.allegrettoUpdaterEnabled=true',
  `-c.extraMetadata.allegrettoUpdateOwner=${target.owner}`,
  `-c.extraMetadata.allegrettoUpdateRepo=${target.repo}`,
  '-c.publish.provider=github',
  `-c.publish.owner=${target.owner}`,
  `-c.publish.repo=${target.repo}`
], { cwd: root, stdio: 'inherit', env })
console.log(`[release:allegretto] published ${pkg.name} ${pkg.version} to ${target.owner}/${target.repo}`)
