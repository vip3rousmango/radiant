function menuTemplate ({ checkNow, updatesEnabled, productName = 'Allegretto', releaseLabel = 'Allegretto website', releaseUrl = 'https://allegretto.netlify.app/' }) {
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
