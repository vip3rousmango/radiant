function updaterEnabledForPackage (pkg) {
  return pkg?.radiantUpdaterEnabled !== false
}

module.exports = { updaterEnabledForPackage }
