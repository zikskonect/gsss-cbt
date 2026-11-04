const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const PhpService = require('./services/php-service');
const MariadbService = require('./services/mariadb-service');
const WsService = require('./services/ws-service');
const NetworkHelper = require('./services/network');
const Provisioner = require('./services/provisioner');

const state = { running: false, startedAt: null, logs: [] };
let mainWindow = null;

function pushLog(source, level, text) {
    const entry = { ts: new Date().toISOString(), source, level, text: String(text).trimEnd() };
    state.logs.push(entry);
    if (state.logs.length > 600) state.logs.shift();
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('server:log', entry);
    console.log(`[${source}] ${text}`);
}
function broadcastStatus() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.webContents.send('server:status', {
        running: state.running,
        startedAt: state.startedAt,
        uptime: state.startedAt ? Date.now() - state.startedAt : 0,
        network: NetworkHelper.getCurrentNetwork(),
    });
}
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 980, height: 780, minWidth: 860, minHeight: 700,
        title: 'GSS Gwags CBT - One Click Server',
        backgroundColor: '#0f172a',
        autoHideMenuBar: true,
        icon: path.join(__dirname, 'renderer', 'icon.png'),
        webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
    });
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    mainWindow.on('closed', () => mainWindow = null);
}
app.whenReady().then(async () => {
    pushLog('system', 'info', 'CBT Server ready - Click START to run');
    try {
        await Provisioner.ensureRuntime((m)=>pushLog('setup', 'info', m));
    } catch(e) {
        pushLog('setup', 'warn', 'Setup check: '+e.message);
    }
    createWindow();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

ipcMain.handle('server:getStatus', async () => ({
    running: state.running,
    startedAt: state.startedAt,
    uptime: state.startedAt ? Date.now() - state.startedAt : 0,
    network: NetworkHelper.getCurrentNetwork(),
    logs: state.logs.slice(-120),
}));
ipcMain.handle('server:getQr', async (_e, text) => {
    return await NetworkHelper.generateQrDataUrl(text);
});
ipcMain.handle('server:start', async () => {
    if (state.running) return { ok: false, error: 'Already running' };
    pushLog('system', 'info', '▶ Starting services... One click - please wait');
    try {
        // Ensure config.php has correct port and IP
        await Provisioner.ensureConfigFile((m)=>pushLog('config','info',m));

        pushLog('system', 'info', '1/3 Starting Database (MariaDB port 3307)...');
        await MariadbService.start((t,l)=>pushLog('mariadb', l||'info', t));

        pushLog('system', 'info', '2/3 Starting WebSocket (port 8081)...');
        await WsService.start((t,l)=>pushLog('ws', l||'info', t));

        pushLog('system', 'info', '3/3 Starting Web App (port 8000)...');
        await PhpService.start((t,l)=>pushLog('php', l||'info', t));

        state.running = true;
        state.startedAt = Date.now();
        const net = NetworkHelper.getCurrentNetwork();
        pushLog('system', 'success', `✅ SERVER RUNNING - Open: ${net.url}`);
        pushLog('system', 'success', `Students should open: ${net.url} on their phones`);
        broadcastStatus();
        return { ok: true, network: net };
    } catch (err) {
        pushLog('system', 'error', 'Start failed: ' + err.message);
        await stopAll();
        return { ok: false, error: err.message };
    }
});
ipcMain.handle('server:stop', async () => {
    if (!state.running) return { ok: false, error: 'Not running' };
    pushLog('system', 'warn', '■ Stopping...');
    await stopAll();
    state.running = false; state.startedAt = null;
    pushLog('system', 'info', 'Server stopped');
    broadcastStatus();
    return { ok: true };
});
ipcMain.handle('server:openInBrowser', () => {
    const ip = NetworkHelper.getPrimaryLanIp();
    shell.openExternal(`http://${ip}:8000`);
    return { ok: true };
});
ipcMain.handle('server:backup', async () => {
    try {
        const result = await Provisioner.backupDatabase();
        pushLog('system', 'success', 'Backup: '+result.path);
        shell.showItemInFolder(result.path);
        return { ok: true, path: result.path };
    } catch (err) {
        pushLog('system', 'error', 'Backup failed: '+err.message);
        return { ok: false, error: err.message };
    }
});
async function stopAll() {
    try { await PhpService.stop(); } catch(e){ pushLog('system','warn','PHP stop: '+e.message); }
    try { await WsService.stop(); } catch(e){ pushLog('system','warn','WS stop: '+e.message); }
    try { await MariadbService.stop(); } catch(e){ pushLog('system','warn','MariaDB stop: '+e.message); }
}