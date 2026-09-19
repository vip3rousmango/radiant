#!/usr/bin/env node
// Is this change actually shipped, or just written?
//
// ⚠️ WRITTEN IS NOT SHIPPED. On 2026-08-22 six fixed files sat uncommitted
// while Tony tested the released app and reported the bug as unfixed. Twice
// more the same day, a feature changed behavior without the in-app Read me
// being told. This script is the objective half of that check — it answers the
// questions a script CAN answer, so the agent running the loop doesn't have to
// take anyone's word for it.
//
//   node scripts/ship-check.mjs [--json]
//
// ClickUp is deliberately NOT checked here (no API key in the repo); the
// agency tracking step covers that half.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const git = (...a) => execFileSync('git', a, {
  cwd: ROOT,
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'ignore']
}).trim()
const tryGit = (...a) => { try { return git(...a) } catch { return '' } }

// Code whose behavior a user could notice. Docs and this script don't count.
const USER_FACING = /^(src|server|electron|public|build)\//
const GUIDE_FILE = 'src/components/Settings.jsx'

const checks = []
const add = (id, ok, detail, fix) => checks.push({ id, ok, detail, fix })

// ── 1. Is everything committed? ──────────────────────────────────────────────
// tryGit trims, so the first porcelain line loses its leading status space
// (' M path' arrives as 'M path') — strip the status flags tolerantly.
const dirty = tryGit('status', '--porcelain').split('\n').filter(Boolean)
add(
  'committed',
  dirty.length === 0,
  dirty.length ? `${dirty.length} uncommitted file(s): ${dirty.slice(0, 6).map(l => l.replace(/^\s*\S{1,2}\s+/, '')).join(', ')}${dirty.length > 6 ? '…' : ''}` : 'working tree clean',
  'git add -A && git commit'
)

// ── 2. Is it pushed? ─────────────────────────────────────────────────────────
// Cached remote-tracking refs can outlive a deleted or force-moved server
// branch. Ask the remote every time and require its advertised commit to match
// HEAD exactly.
const branch = tryGit('rev-parse', '--abbrev-ref', 'HEAD')
const remoteLine = branch ? tryGit('ls-remote', '--exit-code', 'origin', `refs/heads/${branch}`) : ''
const remoteSha = remoteLine.split(/\s+/)[0] || ''
const currentSha = tryGit('rev-parse', 'HEAD')
const pushed = Boolean(remoteSha && currentSha && remoteSha === currentSha)
add(
  'pushed',
  pushed,
  pushed
    ? `origin/${branch} points at HEAD`
    : remoteSha
      ? `origin/${branch} points at ${remoteSha}, not HEAD ${currentSha || 'an unreadable commit'}`
      : `origin/${branch} does not exist`,
  `git push origin ${branch}`
)

// ── 3. Does the in-app Read me know about it? ────────────────────────────────
// ⚠️ COMPARE THE RELEASE, NOT "SINCE THE LAST TAG". Once a release is tagged,
// lastTag..HEAD is empty and this check passed no matter what — v0.6.87 shipped
// user-facing code with no Read me entry and still came back green. When HEAD's
// version is already tagged, the range that matters is the release itself:
// previous tag .. this tag.
const thisTag = tryGit('tag', '-l', `v${JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version}`)
const lastTag = tryGit('describe', '--tags', '--abbrev=0')
const prevTag = thisTag ? tryGit('describe', '--tags', '--abbrev=0', `${thisTag}^`) : ''
const range = thisTag && prevTag ? `${prevTag}..${thisTag}` : lastTag ? `${lastTag}..HEAD` : ''

if (!range) {
  add('readme', true, 'no tags yet — nothing to compare against', '')
} else {
  const changed = tryGit('diff', '--name-only', range).split('\n').filter(Boolean)
  const codeChanged = changed.filter(f => USER_FACING.test(f) && f !== GUIDE_FILE)
  const guideDiff = tryGit('diff', range, '--', GUIDE_FILE)
  // a GUIDE entry is a line like:   ['Title', 'Body'],
  const guideTouched = guideDiff.split('\n').some(l => /^[+-]\s*\['/.test(l))
  // Some changes genuinely are invisible to users — an icon that stopped being
  // wrong, a refactor. That is a decision, not a silence: record it with a
  // `Read-me: n/a — <reason>` trailer in the commit and this passes.
  const exempt = /^Read-me:\s*n\/a\b/im.test(tryGit('log', '--format=%B', range))
  add(
    'readme',
    codeChanged.length === 0 || guideTouched || exempt,
    codeChanged.length === 0
      ? `no user-facing code changed in ${range}`
      : guideTouched
        ? `Read me updated alongside ${codeChanged.length} changed file(s)`
        : exempt
          ? `${codeChanged.length} file(s) changed; declared not user-visible via a Read-me trailer`
          : `${codeChanged.length} user-facing file(s) changed in ${range} but the Read me (GUIDE in ${GUIDE_FILE}) was not touched`,
    `add an entry to the GUIDE array in ${GUIDE_FILE}, or record why not with a "Read-me: n/a — <reason>" commit trailer`
  )
}

// The version tag must identify THIS release commit. A tag with the right name
// pointing at an older commit is not evidence that these files shipped.
const pkgVersion = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version
const tagName = `v${pkgVersion}`
const tagSha = tryGit('rev-parse', `${tagName}^{commit}`)
const headSha = tryGit('rev-parse', 'HEAD')
const tagForPkg = tryGit('tag', '-l', tagName)
const tagMatchesHead = Boolean(tagForPkg && tagSha && headSha && tagSha === headSha)
add(
  'tagged',
  tagMatchesHead,
  tagMatchesHead
    ? `${tagName} points at HEAD`
    : tagForPkg
      ? `${tagName} points at ${tagSha || 'an unreadable commit'}, not HEAD ${headSha || 'an unreadable commit'}`
      : `package.json is ${pkgVersion} but there is no ${tagName} tag`,
  `git tag ${tagName} at the release commit`
)

// ── judged ───────────────────────────────────────────────────────────────────
// The four checks above are facts. This one is a judgment — is the commit
// message a why, is the Read me written for a person using the app — made by
// Jev in a third of a second (scripts/ship-judge.mjs). It caught two entries
// on its first run that talked about prompt caches and tool schemas to users.
// Unreachable, it reports so and passes: a judge that is down must not block.
{
  const { spawnSync } = await import('node:child_process')
  const r = spawnSync(process.execPath, [new URL('./ship-judge.mjs', import.meta.url).pathname, 'HEAD'], { encoding: 'utf8' })
  const out = (r.stdout || '').trim()
  const advisory = /cannot judge|nothing to judge/.test(out)
  const bad = out.split('\n').filter(l => l.trim().startsWith('✗')).map(l => l.trim().slice(2).trim())
  add('judged', advisory || r.status === 0,
    advisory ? out.split('\n')[0] : (r.status === 0 ? 'commit message and Read me judged fit for a user' : `${bad.length} judgment(s) below the bar: ${bad.join(' · ')}`),
    'rewrite the flagged text in plain words, for the person using the app, and commit again')
}

// ── report ───────────────────────────────────────────────────────────────────
const failed = checks.filter(c => !c.ok)
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ok: failed.length === 0, version: pkgVersion, branch, checks }, null, 2))
} else {
  for (const c of checks) console.log(`  ${c.ok ? 'OK  ' : 'TODO'}  ${c.id.padEnd(10)} ${c.detail}`)
  if (failed.length) {
    console.log('\noutstanding:')
    for (const c of failed) console.log(`  - ${c.id}: ${c.fix}`)
  }
}
process.exit(failed.length ? 1 : 0)
