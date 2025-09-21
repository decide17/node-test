const { app, BrowserWindow } = require('electron');

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    fullscreen: false,
    autoHideMenuBar:true,
    webPreferences: {
      nodeIntegration: true, // to allow require
      contextIsolation: false, // allow use with Electron 12
    }
  })

  win.loadFile('index.html');

  // for debugging
  win.openDevTools();

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
