const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    kill: () => ipcRenderer.send('kill'),
    sendMessage: (_event, data) => ipcRenderer.send(_event, data),
    onMessage: (callback) => {
        ipcRenderer.on('asynchronous-reply', (_event, data) => {
            callback(data.event, data.value);
        })
    }
});