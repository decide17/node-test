const { app, BrowserWindow } = require('electron');

// 리눅스 키오스크 환경 등에서 터치 이벤트를 강제로 활성화합니다.
app.commandLine.appendSwitch('touch-events', 'enabled');

// 라즈베리파이 5 (Wayland 기반 Bookworm OS) 터치 및 드래그 최적화
app.commandLine.appendSwitch('enable-features', 'UseOzonePlatform');
app.commandLine.appendSwitch('ozone-platform', 'wayland');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    fullscreen: false,
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
