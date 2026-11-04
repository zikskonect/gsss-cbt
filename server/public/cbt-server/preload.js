const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('serverApi', {
    start: () => ipcRenderer.invoke('server:start'),
    stop: () => ipcRenderer.invoke('server:stop'),
    getStatus: () => ipcRenderer.invoke('server:getStatus'),
    openInBrowser: () => ipcRenderer.invoke('server:openInBrowser'),
    backup: () => ipcRenderer.invoke('server:backup'),
    getQr: (text) => ipcRenderer.invoke('server:getQr', text),
    onLog: (cb) => {
        const l = (_e, entry) => cb(entry);
        ipcRenderer.on('server:log', l);
        return () => ipcRenderer.removeListener('server:log', l);
    },
    onStatus: (cb) => {
        const l = (_e, s) => cb(s);
        ipcRenderer.on('server:status', l);
        return () => ipcRenderer.removeListener('server:status', l);
    },
});