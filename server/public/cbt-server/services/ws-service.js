const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
let proc=null;
function getRuntimeDir() {
    const devPath = path.join(__dirname, '..', 'runtime');
    return fs.existsSync(devPath) ? devPath : path.join(process.resourcesPath, 'runtime');
}
function start(onLog) {
    return new Promise((resolve, reject)=>{
        const runtime = getRuntimeDir();
        const phpBin = path.join(runtime, 'php', process.platform==='win32' ? 'php.exe' : 'bin/php');
        const wsScript = path.join(runtime, 'webroot', 'ws-server.php');
        if (!fs.existsSync(wsScript)) { onLog('ws-server.php not found - WebSocket disabled, but API will still work','warn'); return resolve(); }
        proc = spawn(phpBin, [wsScript], { stdio:['ignore','pipe','pipe'] });
        proc.stdout.on('data', d=>onLog(d.toString()));
        proc.stderr.on('data', d=>onLog(d.toString()));
        setTimeout(()=>resolve(),1500);
    });
}
function stop() {
    return new Promise((resolve)=>{
        if(!proc) return resolve();
        try { if(process.platform==='win32') spawn('taskkill',['/pid',proc.pid,'/f','/t']); else proc.kill('SIGTERM'); } catch(e){}
        proc=null; setTimeout(resolve,500);
    });
}
module.exports = { start, stop };