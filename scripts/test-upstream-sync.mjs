#!/usr/bin/env node
/**
 * Verify that this checkout can only fetch from Templeton upstream and can only
 * publish changes through the agency origin. This intentionally does not push,
 * merge, or contact a remote; it is safe to run in local and CI checkouts.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const UPSTREAM_ID = 'github.com/templetongroup/radiant'
const DISABLED_PUSH_URL = 'disabled'
const failures = []

const gitConfig = (key) => {
  try {
    return execFileSync('git', ['-C', ROOT, 'config', '--get-all', key], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

const gitRemotes = () => {
  try {
    return execFileSync('git', ['-C', ROOT, 'remote'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

const canonicalRemote = (value) => {
  let remote = value.trim().toLowerCase()
  remote = remote.replace(/^\w+:\/\//, '')
  remote = remote.replace(/^[^@]+@/, '')
  remote = remote.replace(/^([^/:]+):/, '$1/')
  remote = remote.replace(/\.git\/?$/, '').replace(/\/+$/, '')
  return remote
}

const isUpstream = (value) => canonicalRemote(value) === UPSTREAM_ID
const isDisabledPushUrl = (value) => value.trim().toLowerCase() === DISABLED_PUSH_URL

const requireOne = (name, values) => {
  if (values.length !== 1 || !values[0]) {
    failures.push(`${name} must have exactly one configured URL`)
    return null
  }
  return values[0]
}

const remotes = gitRemotes()
if (!remotes.includes('upstream')) failures.push('missing upstream remote')
if (!remotes.includes('origin')) failures.push('missing origin remote')

const upstreamUrl = requireOne('upstream.url', gitConfig('remote.upstream.url'))
if (upstreamUrl && !isUpstream(upstreamUrl)) {
  failures.push(`upstream.url must be ${UPSTREAM_ID} (got ${upstreamUrl})`)
}

const upstreamPushUrls = gitConfig('remote.upstream.pushurl')
if (!upstreamPushUrls.length) {
  failures.push('upstream must define pushurl = DISABLED; without it git falls back to pushing to upstream.url')
} else if (upstreamPushUrls.some(url => !isDisabledPushUrl(url))) {
  failures.push(`upstream pushurl must contain only DISABLED (got ${upstreamPushUrls.join(', ')})`)
}

// A pushInsteadOf rule can rewrite even an apparently harmless sentinel URL.
// Rejecting these rules keeps the guarantee independent of global git config.
try {
  const pushInsteadOf = execFileSync(
    'git',
    ['-C', ROOT, 'config', '--get-regexp', '^url\\..*\\.pushInsteadOf$'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
  ).trim()
  if (pushInsteadOf) failures.push('url.*.pushInsteadOf rules are not allowed; they can rewrite a blocked upstream push URL')
} catch {
  // No pushInsteadOf rules is the safe, expected case.
}

const originUrl = requireOne('origin.url', gitConfig('remote.origin.url'))
const originPushUrls = gitConfig('remote.origin.pushurl')
const originDestinations = originPushUrls.length ? originPushUrls : (originUrl ? [originUrl] : [])
if (originDestinations.some(url => isDisabledPushUrl(url))) {
  failures.push('origin must remain a writable agency remote, not DISABLED')
}
if (originDestinations.some(isUpstream)) {
  failures.push('origin push destination must not be templetongroup/radiant')
}
if (originUrl && isUpstream(originUrl)) {
  failures.push('origin.url must be the writable agency remote, not templetongroup/radiant')
}

const releaseConfigFiles = []
const addIfPresent = (relativePath) => {
  const absolutePath = join(ROOT, relativePath)
  if (existsSync(absolutePath)) releaseConfigFiles.push(absolutePath)
}
addIfPresent('package.json')
addIfPresent('electron-builder.yml')
addIfPresent('electron-builder.yaml')
addIfPresent('electron-builder.json')
addIfPresent('forge.config.js')
addIfPresent('forge.config.cjs')
addIfPresent('forge.config.mjs')
addIfPresent('forge.config.ts')

const syncWorkflowPath = join(ROOT, '.github', 'workflows', 'sync-upstream.yml')
if (!existsSync(syncWorkflowPath)) {
  failures.push('missing .github/workflows/sync-upstream.yml')
} else {
  const syncWorkflow = readFileSync(syncWorkflowPath, 'utf8')

  // Every run must discard the remote automation branch tip and rebuild it
  // from the fetched agency base. The lease must cover that exact remote tip:
  // otherwise stale agency commits can be omitted, or a concurrent update can
  // be overwritten.
  const syncContract = [
    ['identify the preparation step for output guards', 'id: prepare'],
    ['fetch the selected agency base', 'git fetch --no-tags --prune origin "$BASE_BRANCH"'],
    ['recreate the sync branch from the agency base', 'git checkout -B "$SYNC_BRANCH" "origin/$BASE_BRANCH"'],
    ['reset the sync branch to the agency base', 'git reset --hard "origin/$BASE_BRANCH"'],
    ['capture the remote sync-branch tip', 'sync_branch_expected_sha=$(git rev-parse "$sync_remote_ref")'],
    ['skip PR creation when there is no upstream delta', 'if [ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BASE_BRANCH")" ]; then'],
    ['record a no-delta preparation result', 'echo "has_delta=false" >> "$GITHUB_OUTPUT"'],
    ['record a delta preparation result', 'echo "has_delta=true" >> "$GITHUB_OUTPUT"'],
    ['force-push only with an explicit lease', '--force-with-lease="refs/heads/$SYNC_BRANCH:$SYNC_BRANCH_EXPECTED_SHA"'],
    ['push the sync branch only to origin', '--set-upstream origin "HEAD:refs/heads/$SYNC_BRANCH"']
  ]
  for (const [description, requiredText] of syncContract) {
    if (!syncWorkflow.includes(requiredText)) {
      failures.push(`sync workflow must ${description}`)
    }
  }
  const deltaGuard = /^\s*if: steps\.prepare\.outputs\.has_delta == 'true'\s*$/gm
  const deltaGuardCount = syncWorkflow.match(deltaGuard)?.length ?? 0
  if (deltaGuardCount !== 2) {
    failures.push(`sync workflow must guard push and PR steps with has_delta (found ${deltaGuardCount})`)
  }
  if (/^\s*git push\b[^\n]*\bupstream\b/m.test(syncWorkflow)) {
    failures.push('sync workflow must never push to upstream')
  }
}

const workflowDir = join(ROOT, '.github', 'workflows')
if (existsSync(workflowDir)) {
  for (const file of readdirSync(workflowDir)) {
    if (/\.(?:ya?ml)$/i.test(file) && file !== 'sync-upstream.yml') addIfPresent(join('.github', 'workflows', file))
  }
}

const scriptsDir = join(ROOT, 'scripts')
if (existsSync(scriptsDir)) {
  for (const file of readdirSync(scriptsDir)) {
    if (/^(?:release|publish)(?:[-.].*)?\.(?:cjs|js|mjs|ts)$/i.test(file)) addIfPresent(join('scripts', file))
  }
}

const forbiddenTarget = /templetongroup\s*[\\/]\s*radiant(?:\.git)?/i
const ownerRepoPair = /["']owner["']\s*:\s*["']templetongroup["'][\s\S]{0,240}["']repo["']\s*:\s*["']radiant["']|["']repo["']\s*:\s*["']radiant["'][\s\S]{0,240}["']owner["']\s*:\s*["']templetongroup["']/i
for (const file of releaseConfigFiles) {
  // The Allegretto release helper intentionally contains the Templeton
  // repository as a rejected-source guard; it validates that target at
  // runtime instead of publishing to it. Keep the generic target scan for
  // every other release configuration.
  if (file.slice(ROOT.length + 1) === 'scripts/release-allegretto.mjs') continue
  const text = readFileSync(file, 'utf8')
  if (forbiddenTarget.test(text) || ownerRepoPair.test(text)) {
    failures.push(`release configuration targets templetongroup/radiant: ${file.slice(ROOT.length + 1)}`)
  }
}

if (failures.length) {
  console.error('[upstream-sync] UNSAFE CHECKOUT')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('[upstream-sync] safe: upstream is fetch-only, origin is agency-writable, and release targets are agency-owned')
