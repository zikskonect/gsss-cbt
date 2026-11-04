
// admin.devices.js + admin-settings.js MERGED & FIXED - Device approval works offline + online
function generateDeviceId() {
    return 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8);
}

function updateAdminConnectionBadge() {
    const badge = document.getElementById('admin-connection-badge');
    if (!badge) return;
    const lanStatus = window.LanStatus;
    if (!lanStatus) {
        badge.textContent = 'LAN status unavailable';
        badge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600';
        return;
    }
    const status = typeof lanStatus._computeOverall === 'function'
        ? lanStatus._computeOverall()
        : { label: lanStatus._socketState || 'Unknown', color: 'grey' };
    const colorClasses = {
        green: 'bg-green-100 text-green-700',
        amber: 'bg-yellow-100 text-yellow-700',
        red: 'bg-red-100 text-red-700',
        grey: 'bg-gray-100 text-gray-600',
    };
    badge.textContent = status.label;
    badge.className = `px-3 py-1 rounded-full text-xs font-semibold ${colorClasses[status.color] || colorClasses.grey}`;
}
window.updateAdminConnectionBadge = updateAdminConnectionBadge;

async function ensureLocalDeviceRegistered() {
    try {
        let deviceId = localStorage.getItem('cbt_device_id');
        if (!deviceId) {
            deviceId = generateDeviceId();
            localStorage.setItem('cbt_device_id', deviceId);
        }
        const existing = await getLocalDeviceFromDB();
        if (existing) return existing;
        const platform = typeof detectPlatform === 'function' ? detectPlatform() : 'web';
        const device = {
            device_id: deviceId,
            fingerprint: typeof computeFingerprint === 'function' ? await computeFingerprint() : 'fp_unknown',
            hostname: navigator.platform || 'unknown',
            ip_address: null,
            platform,
            role_claimed: null,
            status: 'pending',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
        };
        await saveDeviceToDB(device);
        return device;
    } catch (err) {
        console.error(err);
        return null;
    }
}

function detectPlatform() {
    if (window.electronAPI) return 'electron';
    if (window.Capacitor?.isNativePlatform?.()) return 'capacitor';
    return 'web';
}

async function computeFingerprint() {
    try {
        const parts = [navigator.userAgent, navigator.language, screen.width+'x'+screen.height, new Date().getTimezoneOffset()];
        const raw = parts.join('|');
        let h=0; for(let i=0;i<raw.length;i++){ h=((h<<5)-h)+raw.charCodeAt(i); h|=0; }
        return 'h'+Math.abs(h).toString(16);
    } catch { return 'fp_unknown'; }
}

async function touchLocalDevice() {
    try {
        const device = await getLocalDeviceFromDB();
        if (!device) return;
        device.last_seen = new Date().toISOString();
        await saveDeviceToDB(device);
    } catch {}
}
async function setLocalDeviceRole(role) {
    try {
        const device = await getLocalDeviceFromDB();
        if (!device) return;
        device.role_claimed = role;
        device.last_seen = new Date().toISOString();
        await saveDeviceToDB(device);
    } catch {}
}

// ─── THE KEY FIX: Refresh + Approve that works offline ───
async function adminRefreshDevices() {
    try {
        // Try server first if token exists
        if (window.LanApi && window.LAN_CONFIG?.enabled && LanApi.loadToken()) {
            try {
                const res = await LanApi.get('/devices');
                if (res.ok && res.data) {
                    const devices = res.data.devices || res.data || [];
                    state.devices = devices;
                    state.liveDevices = devices;
                    // Sync to local DB
                    for (const d of devices) { try { await saveDeviceToDB(d); } catch(_){} }
                    render();
                    return;
                }
            } catch(e) { console.warn('Server devices fetch failed, falling back to local:', e.message); }
        }
        // Fallback to local IndexedDB - ALWAYS works
        const localDevices = await loadAllDevicesFromDB();
        state.devices = localDevices;
        state.liveDevices = localDevices;
    } catch (e) {
        state.devices = await loadAllDevicesFromDB();
        state.liveDevices = state.devices;
    }
    render();
}

async function refreshAdminDevices() {
    return adminRefreshDevices();
}

async function adminApproveDevice(deviceId) {
    if (!deviceId) return;
    console.log('Approving device:', deviceId);
    
    // First: ALWAYS approve locally in IndexedDB (works even without token)
    try {
        const db = await initDB();
        const tx = db.transaction(['device_registry'], 'readwrite');
        const store = tx.objectStore('device_registry');
        const getReq = store.get(deviceId);
        
        await new Promise((resolve, reject) => {
            getReq.onsuccess = () => {
                const d = getReq.result;
                if (d) {
                    d.status = 'approved';
                    d.last_seen = new Date().toISOString();
                    store.put(d);
                    console.log('✅ Approved locally:', deviceId);
                }
                resolve();
            };
            getReq.onerror = () => resolve();
        });
        
        showAlert('✅ Device approved - ready for exams!', 'success', 2500);
        setTimeout(() => adminRefreshDevices(), 300);
    } catch (e) {
        console.error('Local approve error:', e);
    }
    
    // Second: Try server if token exists (best effort)
    if (window.LanApi && window.LAN_CONFIG?.enabled && LanApi.loadToken()) {
        try {
            const res = await LanApi.post('/devices/' + encodeURIComponent(deviceId) + '/approve', {});
            if (res.ok) {
                console.log('✅ Also approved on server');
            } else {
                console.warn('Server approve failed (but local already approved):', res.error);
            }
        } catch (e) {
            console.warn('Server approve unreachable (local approve still works):', e.message);
        }
    } else {
        console.log('No server token - local approval only (this is normal for offline mode)');
    }
}

async function adminBlockDevice(deviceId) {
    if (!deviceId) return;
    if (!confirm('Block this device? It will be disconnected and cannot take exams.')) return;
    
    // Local first
    try {
        const db = await initDB();
        const tx = db.transaction(['device_registry'], 'readwrite');
        const store = tx.objectStore('device_registry');
        const getReq = store.get(deviceId);
        await new Promise((resolve) => {
            getReq.onsuccess = () => {
                const d = getReq.result;
                if (d) { d.status = 'blocked'; store.put(d); }
                resolve();
            };
            getReq.onerror = () => resolve();
        });
        showAlert('🚫 Device blocked locally', 'info', 2000);
        setTimeout(() => adminRefreshDevices(), 300);
    } catch (e) {}
    
    // Server best effort
    if (window.LanApi && LanApi.loadToken()) {
        try {
            await LanApi.post('/devices/' + encodeURIComponent(deviceId) + '/block', {});
        } catch (e) {}
    }
}

window.ensureLocalDeviceRegistered = ensureLocalDeviceRegistered;
window.touchLocalDevice = touchLocalDevice;
window.setLocalDeviceRole = setLocalDeviceRole;
window.adminRefreshDevices = adminRefreshDevices;
window.refreshAdminDevices = refreshAdminDevices;
window.adminApproveDevice = adminApproveDevice;
window.adminBlockDevice = adminBlockDevice;
window.detectPlatform = detectPlatform;
window.computeFingerprint = computeFingerprint;

console.log('✅ admin.devices.js FINAL FIXED - offline approval works');