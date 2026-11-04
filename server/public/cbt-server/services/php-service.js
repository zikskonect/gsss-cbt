const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const PORT = 8000;
let proc = null;

function getRuntimeDir() {
    const devPath = path.join(__dirname, '..', 'runtime');
    return fs.existsSync(devPath) ? devPath : path.join(process.resourcesPath, 'runtime');
}

function getWebRoot() {
    const runtime = getRuntimeDir();
    
    // Priority 1: For development - use ORIGINAL server/public (no copy needed!)
    // Structure: cbt-server is inside server/public/cbt-server, so original public is ../../
    const originalPublic = path.join(__dirname, '..', '..'); // C:\gss-gwags-cbt\server\public
    const originalPublicIndex = path.join(originalPublic, 'index.php');
    
    if (fs.existsSync(originalPublicIndex)) {
        console.log(`Using ORIGINAL public folder: ${originalPublic}`);
        return originalPublic;
    }
    
    // Priority 2: For built exe - use runtime/webroot (copied during build)
    const builtWebRoot = path.join(runtime, 'webroot');
    if (fs.existsSync(path.join(builtWebRoot, 'index.php'))) {
        console.log(`Using BUILT webroot: ${builtWebRoot}`);
        return builtWebRoot;
    }
    
    // Priority 3: Fallback - runtime/webroot without check
    return builtWebRoot;
}

function start(onLog) {
    return new Promise((resolve, reject) => {
        const runtime = getRuntimeDir();
        const phpBin = path.join(runtime, 'php', process.platform==='win32' ? 'php.exe' : 'bin/php');
        const webRoot = getWebRoot();
        const routerFile = path.join(webRoot, 'index.php');
        
        if (!fs.existsSync(phpBin)) {
            return reject(new Error(`PHP not found at ${phpBin}. Extract php-8.2.35-nts zip to runtime/php/`));
        }
        if (!fs.existsSync(webRoot)) {
            return reject(new Error(`webroot not found at ${webRoot}`));
        }
        if (!fs.existsSync(routerFile)) {
            return reject(new Error(`index.php not found at ${routerFile}. Ensure server/public/index.php exists`));
        }
        
        onLog(`Starting PHP from ${webRoot} with router ${routerFile}`);
        
        // Use index.php as router - fixes /api/health and all routes
        proc = spawn(phpBin, ['-S', `0.0.0.0:${PORT}`, '-t', webRoot, routerFile], { 
            stdio:['ignore','pipe','pipe'],
            cwd: webRoot
        });
        
        let started=false;
        proc.stdout.on('data', d=>{ 
            const t=d.toString(); onLog(t); 
            if(!started && (t.includes('Development Server') || t.includes('started') || t.includes('Listening'))){ 
                started=true; setTimeout(resolve,1000);
            } 
        });
        proc.stderr.on('data', d=>{ 
            const t=d.toString(); onLog(t); 
            if(!started && (t.includes('Development Server')||t.includes('Listening on')||t.includes('started'))){ 
                started=true; setTimeout(resolve,1000);
            } 
        });
        proc.on('error', (err) => {
            onLog(`PHP spawn error: ${err.message}`);
            reject(err);
        });
        
        setTimeout(()=>{ if(!started) resolve(); }, 3000);
    });
}

function stop() {
    return new Promise((resolve)=>{
        if(!proc) return resolve();
        try { 
            if(process.platform==='win32') spawn('taskkill',['/pid',proc.pid,'/f','/t']); 
            else proc.kill('SIGTERM'); 
        } catch(e){}
        proc=null; 
        setTimeout(resolve,600);
    });
}

module.exports = { start, stop, getWebRoot };
