const { notarize } = require('@electron/notarize')
const { execSync } = require('child_process')

// Notarize + staple the app DURING the build (afterSign), before electron-builder
// makes the dmg/zip and the latest-mac.yml auto-update metadata — so the update
// artifacts hash the final notarized app. Credentials come from a notarytool
// keychain profile (never in the repo).
//
// ⚠️ DO NOT HARDCODE THE PROFILE NAME. This asked for a profile called
// "allegretto"; when that keychain item went missing the build died at the very
// last step with "No Keychain password item found for profile: allegretto", after
// a full compile and codesign. The name is machine state, not a project
// constant — resolve it, and say which one is being used.
function resolveProfile () {
  if (process.env.ALLEGRETTO_NOTARY_PROFILE) return process.env.ALLEGRETTO_NOTARY_PROFILE
  const PREFIX = 'com.apple.gke.notary.tool.saved-creds.'
  let saved = []
  try {
    const dump = execSync('security dump-keychain 2>/dev/null', { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    saved = [...new Set([...dump.matchAll(new RegExp(PREFIX.replace(/\./g, '\\.') + '([A-Za-z0-9._-]+)', 'g'))].map(m => m[1]))]
  } catch {}
  if (saved.includes('allegretto')) return 'allegretto'
  const candidates = saved.filter(profile => profile !== 'radiant')
  if (candidates.length === 1) {
    console.log(`[notarize] no "allegretto" profile; using the only saved profile: ${candidates[0]}`)
    return candidates[0]
  }
  if (candidates.length > 1) {
    throw new Error(`No "allegretto" notarytool profile. Found: ${candidates.join(', ')}. ` +
      'Set ALLEGRETTO_NOTARY_PROFILE=<name>, or create one with: xcrun notarytool store-credentials allegretto')
  }
  if (saved.length > 0) {
    throw new Error(`No "allegretto" notarytool profile. Found: ${saved.join(', ')}. ` +
      'Set ALLEGRETTO_NOTARY_PROFILE=<name>, or create one with: xcrun notarytool store-credentials allegretto')
  }
  throw new Error('No notarytool keychain profiles found. Create one with: xcrun notarytool store-credentials allegretto')
}

exports.default = async function afterSign (context) {
  if (context.electronPlatformName !== 'darwin') return
  if (process.env.SKIP_NOTARIZE === '1') { console.log('[notarize] skipped'); return }
  const appName = context.packager.appInfo.productFilename
  const appPath = `${context.appOutDir}/${appName}.app`
  const keychainProfile = resolveProfile()
  console.log(`[notarize] submitting ${appPath} (profile: ${keychainProfile})`)
  await notarize({ tool: 'notarytool', appPath, keychainProfile })
  console.log('[notarize] stapling')
  execSync(`xcrun stapler staple "${appPath}"`, { stdio: 'inherit' })
  console.log('[notarize] done')
}
