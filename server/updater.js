import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_METADATA = (() => {
  try {
    const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  } catch {
    return {}
  }
})()

// Update checking against an explicitly configured Allegretto GitHub feed.
// Works unsigned: this only *detects* a newer release and points at the
// download. Silent apply-and-relaunch would additionally require a signed
// build.

// This is a guard, not a release target. The upstream project is deliberately
// rejected so a missing agency configuration can never fall back to it.
const UPSTREAM_OWNER = 'templetongroup'
const UPSTREAM_REPO = 'radiant'
const GITHUB_HOST = 'github.com'

function cleanPart (value) {
  return typeof value === 'string' ? value.trim() : ''
}

function validPart (value) {
  // GitHub owner/repository names cannot contain a slash. Keeping this
  // allow-list here also prevents an environment variable from changing the
  // API path or introducing credentials/query syntax into a URL.
  return /^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value)
}

function isUpstreamTarget (owner, repo) {
  return cleanPart(owner).toLowerCase() === UPSTREAM_OWNER &&
    cleanPart(repo).toLowerCase().replace(/\.git$/, '') === UPSTREAM_REPO
}

function targetFromFeed (feed) {
  if (!feed) return null
  try {
    const url = new URL(feed)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash) return null
    const host = url.hostname.toLowerCase()
    const parts = url.pathname.split('/').filter(Boolean)
    let owner, repo, apiUrl
    if (host === GITHUB_HOST && parts.length === 2) {
      owner = cleanPart(parts[0])
      repo = cleanPart(parts[1]).replace(/\.git$/, '')
      apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    } else if (host === 'api.github.com' && parts.length === 5 &&
      parts[0] === 'repos' && parts[3] === 'releases' && parts[4] === 'latest') {
      owner = cleanPart(parts[1])
      repo = cleanPart(parts[2]).replace(/\.git$/, '')
      apiUrl = url.toString()
    } else {
      return null
    }
    if (!validPart(owner) || !validPart(repo) || isUpstreamTarget(owner, repo)) return null
    return { owner, repo, apiUrl }
  } catch {
    return null
  }
}

/**
 * Resolve the agency-owned update repository. A feed URL is preferred, while
 * owner/repo variables support deployment environments that do not use URLs.
 * Invalid, incomplete, and upstream targets all resolve to null.
 */
export function resolveFeed ({ env = process.env, packageMetadata = {} } = {}) {
  const pkg = packageMetadata && typeof packageMetadata === 'object' ? packageMetadata : {}
  const configured = targetFromFeed(env?.ALLEGRETTO_UPDATE_FEED || pkg.allegrettoUpdateFeed)
  const envOwner = cleanPart(env?.ALLEGRETTO_UPDATE_OWNER)
  const envRepo = cleanPart(env?.ALLEGRETTO_UPDATE_REPO).replace(/\.git$/, '')
  const owner = envOwner || cleanPart(pkg.allegrettoUpdateOwner || configured?.owner)
  const repo = envRepo || cleanPart(pkg.allegrettoUpdateRepo || configured?.repo).replace(/\.git$/, '')
  if (!validPart(owner) || !validPart(repo) || isUpstreamTarget(owner, repo)) return null
  const apiUrl = (configured && !envOwner && !envRepo)
    ? configured.apiUrl
    : `https://api.github.com/repos/${owner}/${repo}/releases/latest`
  return {
    owner,
    repo,
    apiUrl,
    releaseUrl: `https://${GITHUB_HOST}/${owner}/${repo}/releases/latest`
  }
}

// Compatibility helpers for callers that only need environment resolution.
export function resolveUpdateFeed (env = process.env) {
  return resolveFeed({ env, packageMetadata: PACKAGE_METADATA })
}

export const agencyUpdateTarget = resolveUpdateFeed

function safeTargetUrl (value, target, suffix) {
  if (!value) return null
  try {
    const url = new URL(value)
    const prefix = `/${target.owner}/${target.repo}/${suffix}/`.toLowerCase()
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== GITHUB_HOST ||
      url.username || url.password || url.port || !url.pathname.toLowerCase().startsWith(prefix)) return null
    return url.toString()
  } catch {
    return null
  }
}

function disabledUpdateResult (currentVersion, reason = 'no safe Allegretto update feed is configured') {
  return {
    current: currentVersion,
    latest: null,
    hasUpdate: false,
    htmlUrl: null,
    downloadUrl: null,
    notes: '',
    publishedAt: null,
    disabled: true,
    code: 'UPDATE_FEED_DISABLED',
    error: `Updates are disabled: ${reason}.`
  }
}

// compare "1.2.0" style strings; returns true if b is strictly newer than a
export function isNewer (a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number)
  const pb = String(b).replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0, y = pb[i] || 0
    if (y > x) return true
    if (y < x) return false
  }
  return false
}

// ⚠️ THE ASSET THAT RUNS ON THIS MACHINE, NOT THE FIRST ONE IN THE LIST. This
// matched /\.dmg$/ and nothing else, so anywhere but a Mac it found none and
// silently handed back the releases page instead — a wall of files to choose
// from, when the whole point of the check is that Radiant already knows which
// one is wanted. The fallback stays for the case that is genuinely unknown: a
// platform with no asset published yet, where a page you can read beats a link
// that is wrong.
const ASSET_FOR = {
  darwin: /\.dmg$/i,
  linux: /\.AppImage$/i,
  win32: /\.exe$/i
}

export function assetFor (assets, platform = process.platform) {
  const pattern = ASSET_FOR[platform]
  if (!pattern) return null
  return (assets || []).find(a => pattern.test(a?.name || '')) || null
}

export async function checkForUpdate (currentVersion, { env = process.env, packageMetadata = PACKAGE_METADATA, fetchImpl = fetch } = {}) {
  const target = resolveFeed({ env, packageMetadata })
  if (!target) return disabledUpdateResult(currentVersion)

  const res = await fetchImpl(target.apiUrl, {
    headers: { 'user-agent': 'Allegretto-Updater', accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000)
  })
  if (!res.ok) throw new Error(`GitHub ${res.status}`)
  const r = await res.json()
  const latest = String(r.tag_name || '').replace(/^v/, '')
  const asset = assetFor(r.assets)
  const htmlUrl = safeTargetUrl(r.html_url, target, 'releases') || target.releaseUrl
  const downloadUrl = safeTargetUrl(asset?.browser_download_url, target, 'releases/download') || htmlUrl
  return {
    current: currentVersion,
    latest,
    hasUpdate: Boolean(latest) && isNewer(currentVersion, latest),
    htmlUrl,
    downloadUrl,
    notes: r.body || '',
    publishedAt: r.published_at
  }
}
