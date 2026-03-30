const { app, BrowserWindow } = require('electron');

// 리눅스(라즈베리파이 등)에서만 터치 이벤트를 강제 활성화 (안전하게 설정)
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('touch-events', 'enabled');
}

function createWindow() {
  const win = new BrowserWindow({
    width: 780,
    height: 600,
    fullscreen: process.platform === 'linux',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true, // to allow require
      contextIsolation: false, // allow use with Electron 12
    }
  })

  win.loadFile('index.html');

  // for debugging
  if (!app.isPackaged) {
    win.openDevTools();
  }

}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  })
})

app.on('window-all-closed', () => {
  app.quit();
})
