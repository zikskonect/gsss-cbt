const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const PORT = 3307; // Use 3307 to avoid conflict with Laragon/WAMP on 3306
let proc = null;
function getRuntimeDir() {
    const devPath = path.join(__dirname, '..', 'runtime');
    return fs.existsSync(devPath) ? devPath : path.join(process.resourcesPath, 'runtime');
}
function start(onLog) {
    return new Promise((resolve, reject)=>{
        const runtime = getRuntimeDir();
        const mariaBin = path.join(runtime, 'mariadb', 'bin', process.platform==='win32' ? 'mysqld.exe' : 'mariadbd');
        const dataDir = path.join(runtime, 'mariadb', 'data');
        if (!fs.existsSync(mariaBin)) return reject(new Error(`MariaDB not found at ${mariaBin}. Please extract portable MariaDB to runtime/mariadb`));
        if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir,{recursive:true}); }
        const myIni = path.join(runtime, 'mariadb', 'my.ini');
        if (!fs.existsSync(myIni)) {
            fs.writeFileSync(myIni, `[mysqld]\nport=${PORT}\ndatadir=${dataDir.replace(/\\/g,'/')}\nbind-address=127.0.0.1\n`);
        }
        proc = spawn(mariaBin, [`--defaults-file=${myIni}`, `--datadir=${dataDir}`, `--port=${PORT}`, '--bind-address=127.0.0.1'], { stdio:['ignore','pipe','pipe'] });
        proc.stdout.on('data', d=>onLog(d.toString()));
        proc.stderr.on('data', d=>{ const t=d.toString(); onLog(t); if(t.toLowerCase().includes('ready for connections')){} });
        setTimeout(()=>resolve(), 3500);
    });
}
function stop() {
    return new Promise((resolve)=>{
        if(!proc) return resolve();
        try { if(process.platform==='win32') spawn('taskkill',['/pid',proc.pid,'/f','/t']); else proc.kill('SIGTERM'); } catch(e){}
        proc=null; setTimeout(resolve,1500);
    });
}
module.exports = { start, stop, PORT };