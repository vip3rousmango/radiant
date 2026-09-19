#!/usr/bin/env node
// The machine-readable ship check must stay machine-readable when expected git
// probes fail. Exercise a clean feature branch with no remote branch and no
// release tag, then parse stdout as JSON rather than accepting a mixed stream.
import { execFileSync } from 'node:child_process'
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const root = mkdtempSync(join(tmpdir(), 'allegretto-ship-check-'))
mkdirSync(join(root, 'scripts'))
cpSync('scripts/ship-check.mjs', join(root, 'scripts/ship-check.mjs'))
cpSync('scripts/ship-judge.mjs', join(root, 'scripts/ship-judge.mjs'))
writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'allegretto', version: JSON.parse(readFileSync('package.json', 'utf8')).version }) + '\n')

const git = (...args) => execFileSync('git', args, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
const remote = mkdtempSync(join(tmpdir(), 'allegretto-ship-remote-'))
git('init', '-q')
git('config', 'user.name', 'ship-check-test')
git('config', 'user.email', 'ship-check-test@example.invalid')
git('add', '.')
git('commit', '-qm', 'test ship check')
git('init', '--bare', '-q', remote)
git('remote', 'add', 'origin', remote)

let stdout = ''
let stderr = ''
try {
  stdout = execFileSync(process.execPath, ['scripts/ship-check.mjs', '--json'], {
    cwd: root,
    encoding: 'utf8'
  })
} catch (error) {
  stdout = String(error.stdout || '')
  stderr = String(error.stderr || '')
}
if (stderr.trim()) {
  throw new Error(`ship-check --json wrote unexpected stderr: ${stderr}`)
}
const report = JSON.parse(stdout)
const pushed = report.checks.find(check => check.id === 'pushed')
const tagged = report.checks.find(check => check.id === 'tagged')
if (pushed?.ok !== false || tagged?.ok !== false) {
  throw new Error(`expected missing remote/tag checks to fail: ${JSON.stringify(report.checks)}`)
}
console.log('ship-check JSON remains parseable for missing remote and tag probes')
