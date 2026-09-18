#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { BRAND } from '../server/brand.js'
import { liveSessionBody } from '../server/voice.js'
import { liveInstructions } from '../server/voice-text.js'
import { geminiSetupFrame } from '../server/voice-gemini.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const assignedModules = [
  'providers.js',
  'oauth.js',
  'voice-text.js',
  'dictate.js',
  'mcp.js',
  'chrome-ext.js',
  'chrome-osa.js',
  'computer.js',
  'computer-tools.js',
  'tools.js',
  'index.js',
  'voice.js',
  'voice-gemini.js',
  'brand.js'
]

// Comments preserve useful upstream history, but they are not runtime copy. Keep
// the check focused on code and string literals that can reach a user or model.
function withoutComments (source) {
  let out = ''
  let state = 'code'
  let escaped = false

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i]
    const next = source[i + 1]

    if (state === 'line') {
      if (ch === '\n') {
        state = 'code'
        out += ch
      }
      continue
    }
    if (state === 'block') {
      if (ch === '*' && next === '/') {
        state = 'code'
        i += 1
      } else if (ch === '\n') {
        out += '\n'
      }
      continue
    }
    if (state === 'single' || state === 'double' || state === 'template') {
      out += ch
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if ((state === 'single' && ch === "'") || (state === 'double' && ch === '"') || (state === 'template' && ch === '`')) state = 'code'
      continue
    }

    if (ch === '/' && next === '/') {
      state = 'line'
      i += 1
    } else if (ch === '/' && next === '*') {
      state = 'block'
      i += 1
    } else if (ch === "'") {
      state = 'single'
      out += ch
    } else if (ch === '"') {
      state = 'double'
      out += ch
    } else if (ch === '`') {
      state = 'template'
      out += ch
    } else {
      out += ch
    }
  }
  return out
}

const sourceByModule = new Map(assignedModules.map(name => [name, readFileSync(join(root, 'server', name), 'utf8')]))
const runtimeByModule = new Map([...sourceByModule].map(([name, source]) => [name, withoutComments(source)]))

assert.equal(BRAND.productName, 'Allegretto', 'runtime product name is Allegretto')
assert.equal(BRAND.assistantName, 'Allegretto', 'runtime assistant name is Allegretto')

// The legacy replacement is an implementation detail used to brand shared voice
// instructions. It is not visible copy and must remain allowed during migration.
const legacyVoiceReplacement = /\.replace\(\s*\/\\bRadiant\\b\/g\s*,\s*BRAND\.productName\s*\)/g
const forbiddenVisibleCopy = /\bRadiant\b/g
const forbiddenPhrases = [
  /inside\s+Radiant\b/i,
  /Radiant\s+is\s+signed\s+in/i,
  /Radiant\s+helper/i,
  /Radiant\s+cannot/i,
  /(?:permission|permissions|grant|add|enable|control|Accessibility|Screen\s+Recording|Automation|Privacy|System\s+Settings)[^\n]{0,160}\bRadiant\b/i
]

for (const [name, runtime] of runtimeByModule) {
  const checked = runtime.replace(legacyVoiceReplacement, '')
  // Protocol headers contain the legacy product token by contract; remove that
  // identifier before checking the surrounding prose for accidental branding.
  const visible = checked.replace(/\bx-radiant-token\b/gi, '')
  const bare = visible.match(forbiddenVisibleCopy)
  assert.equal(bare, null, `${name} contains user/model-facing Radiant copy: ${bare?.[0] || ''}`)
  for (const pattern of forbiddenPhrases) {
    assert.equal(pattern.test(visible), false, `${name} contains forbidden runtime copy: ${pattern}`)
  }
}

// Compatibility names are deliberately not product copy and must remain usable.
for (const identifier of ['radiantNative', 'RADIANT_DIR', 'RADIANT_PORT', 'agent-radiant', 'ask_radiant', 'radiant-control']) {
  assert.equal(/\bRadiant\b/.test(identifier), false, `${identifier} remains an allowed compatibility identifier`)
}

const requiredBrandedSurfaces = {
  'providers.js': /running inside \$\{BRAND\.productName\}/,
  'oauth.js': /<h2>\$\{BRAND\.productName\} is signed in<\/h2>/,
  'voice-text.js': /voice of \$\{BRAND\.productName\}/,
  'dictate.js': /The \$\{BRAND\.productName\} helper/,
  'mcp.js': /\$\{BRAND\.productName\} cannot/,
  'chrome-ext.js': /The \$\{BRAND\.productName\} browser extension/,
  'chrome-osa.js': /\$\{BRAND\.productName\} permission/,
  'computer.js': /\$\{BRAND\.productName\} has no desktop helper/,
  'computer-tools.js': /to \$\{BRAND\.productName\} in System Settings/,
  'tools.js': /past \$\{BRAND\.productName\} sessions/,
  'index.js': /This \$\{BRAND\.productName\} server requires/,
  'voice-gemini.js': /Hand a request to \$\{BRAND\.productName\}/
}
for (const [name, pattern] of Object.entries(requiredBrandedSurfaces)) {
  assert.match(sourceByModule.get(name), pattern, `${name} keeps its visible surface dynamically branded`)
}

const prompt = liveInstructions({ title: 'Branding regression', model: 'test-model', host: 'test-host' })
assert.match(prompt, /\bAllegretto\b/, 'voice prompt contains Allegretto')
assert.doesNotMatch(prompt, /\bRadiant\b/, 'voice prompt contains no Radiant copy')

const sessionBody = liveSessionBody({ session: { title: 'Branding regression', model: 'test-model', messages: [] }, settings: { voice: { voice: 'marin' } }, host: 'test-host', sdp: 'v=0' })
assert.match(sessionBody.session.instructions, /\bAllegretto\b/, 'live-session prompt contains Allegretto')
assert.doesNotMatch(sessionBody.session.instructions, /\bRadiant\b/, 'live-session prompt contains no Radiant copy')

const geminiFrame = geminiSetupFrame({ session: { title: 'Branding regression', model: 'test-model', messages: [] }, settings: { voice: { geminiVoice: 'Kore', geminiModel: 'gemini-3.8-live' } }, host: 'test-host' })
const geminiPrompt = geminiFrame.setup.systemInstruction.parts[0].text
assert.match(geminiPrompt, /\bAllegretto\b/, 'Gemini prompt contains Allegretto')
assert.doesNotMatch(geminiPrompt, /\bRadiant\b/, 'Gemini prompt contains no Radiant copy')
assert.match(geminiFrame.setup.tools[0].functionDeclarations[0].description, /\bAllegretto\b/, 'Gemini tool description contains Allegretto')

console.log(`Allegretto runtime branding checks passed (${assignedModules.length} server modules, no network calls)`)

