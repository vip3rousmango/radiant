function menuTemplate ({ checkNow, updatesEnabled, productName = 'Radiant', releaseLabel = 'Radiant on GitHub', releaseUrl = 'https://github.com/templetongroup/radiant' }) {
  const isMac = process.platform === 'darwin'
  const updateItem = updatesEnabled ? [{ label: 'Check for Updates…', click: () => checkNow(false) }] : []
  return [
    ...(isMac ? [{
      label: productName,
      submenu: [
        { role: 'about' },
        ...updateItem,
        { type: 'separator' },
        { role: 'services' }, { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' }, { role: 'quit' }
      ]
    }] : []),
    { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
    {
      label: 'Help',
      submenu: [
        ...updateItem,
        { label: releaseLabel, click: () => require('electron').shell.openExternal(releaseUrl) }
      ]
    }
  ]
}

module.exports = { menuTemplate }
