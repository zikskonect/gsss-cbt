// www/js/lan/lan.status.js - FIXED for one-click server
// ═══════════════════════════════════════════════════════════════
//  Live connection indicator. Fixes "Checking connection..." bug
//  by updating BOTH the pill AND the School Setup header badge
// ═══════════════════════════════════════════════════════════════

const LanStatus = {
    _socketState: 'unknown',      // 'connected' | 'disconnected' | 'error' | 'unknown'
    _deviceStatus: 'unknown',     // 'approved' | 'pending' | 'blocked' | 'unreachable' | 'unknown'
    _queueSize: 0,
    _el: null,
    _visible: true,

    init() {
        if (!window.LAN_CONFIG || !LAN_CONFIG.features.showStatusIndicator) return;
        this._ensureElement();
        this._render();
        this._fixSchoolSetupBadge(); // FIX the header badge

        // React to socket events
        if (window.LanSocket) {
            LanSocket.on('connection.open',  () => this.setSocketStatus('connected'));
            LanSocket.on('connection.close', () => this.setSocketStatus('disconnected'));
        }

        // Check immediately
        this._checkApiHealth();

        // Refresh queue size every 10s
        setInterval(async () => {
            if (window.LanSync) {
                try {
                    const n = await LanSync.count();
                    this.setQueueStatus(n);
                } catch (_) { /* ignore */ }
            }
        }, 10000);

        // Re-check health every 15s + device status every 30s
        setInterval(() => this._checkApiHealth(), 15000);
        setInterval(() => this._refreshDeviceStatus(), 30000);
    },

    async _checkApiHealth() {
        try {
            const base = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            
            const res = await fetch(`${base}/health`, { signal: controller.signal });
            clearTimeout(timeout);
            
            if (res.ok) {
                this.setSocketStatus('connected');
                this.setDeviceStatus('approved');
                return true;
            } else {
                this.setSocketStatus('error');
            }
        } catch (e) {
            // If apiBase fails, try direct hostname
            try {
                const fallback = `http://${window.location.hostname}:8000/api/health`;
                const r = await fetch(fallback, { method: 'GET' });
                if (r.ok) {
                    this.setSocketStatus('connected');
                    this.setDeviceStatus('approved');
                    return true;
                }
            } catch (_) {}
            this.setSocketStatus('disconnected');
        }
        return false;
    },

    setSocketStatus(status) {
        if (this._socketState === status) return;
        this._socketState = status;
        this._render();
        this._fixSchoolSetupBadge();
    },

    setDeviceStatus(status) {
        if (this._deviceStatus === status) return;
        this._deviceStatus = status;
        this._render();
        this._fixSchoolSetupBadge();
    },

    setQueueStatus(count) {
        if (this._queueSize === count) return;
        this._queueSize = count;
        this._render();
    },

    async _refreshDeviceStatus() {
        if (!window.LAN_CONFIG?.enabled) return;
        const id = localStorage.getItem('cbt_device_id');
        if (!id || !window.LanDevice) return;
        try {
            const r = await LanDevice.register();
            if (!r.ok) this.setDeviceStatus('unreachable');
        } catch (_) {
            this.setDeviceStatus('unreachable');
        }
    },

    // FIX: Update the "Checking connection..." badge in School Setup header
    _fixSchoolSetupBadge() {
        // Find ALL elements containing "Checking connection"
        const badges = Array.from(document.querySelectorAll('*')).filter(el => {
            return el.childNodes.length === 1 && 
                   el.textContent?.trim() === 'Checking connection...' &&
                   el.children.length === 0;
        });
        
        // Also find by class/position - top-right header
        const headerBadge = document.querySelector('header [class*="check"], .top-right [class*="badge"], [class*="connection"]');
        
        const allTargets = [...badges];
        if (headerBadge) allTargets.push(headerBadge);

        // Also scan for any div/button in header with that text
        document.querySelectorAll('div, span, button').forEach(el => {
            if (el.textContent?.includes('Checking connection...') && el.textContent.trim().length < 30) {
                allTargets.push(el);
            }
        });

        allTargets.forEach(el => {
            if (!el || el.dataset.fixed) return;
            const { color, label } = this._computeOverall();
            
            if (color === 'green') {
                el.textContent = `🟢 Connected - ${window.location.hostname}:8000`;
                el.style.background = '#10b981';
                el.style.color = 'white';
                el.style.padding = '6px 12px';
                el.style.borderRadius = '20px';
                el.style.fontSize = '12px';
                el.dataset.fixed = 'true';
            } else if (color === 'red') {
                el.textContent = `🔴 Offline - Local DB`;
                el.style.background = '#ef4444';
                el.style.color = 'white';
                el.dataset.fixed = 'true';
            }
        });
    },

    _ensureElement() {
        if (this._el && document.body.contains(this._el)) return;
        const stale = document.getElementById('lan-status-pill');
        if (stale) stale.remove();
        const el = document.createElement('div');
        el.id = 'lan-status-pill';
        el.className = 'lan-status-pill';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;padding:8px 14px;border-radius:20px;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
        el.onclick = () => this.toggleDetails();
        document.body.appendChild(el);
        this._el = el;
    },

    _computeOverall() {
        if (!window.LAN_CONFIG?.enabled) return { color: 'grey', label: 'Offline mode', tooltip: 'LAN disabled — working offline' };
        if (this._socketState !== 'connected') {
            return { color: 'red', label: 'Disconnected', tooltip: 'Cannot reach exam server' };
        }
        switch (this._deviceStatus) {
            case 'approved': return { color: 'green', label: 'Connected', tooltip: 'Connected to exam server' };
            case 'pending': return { color: 'amber', label: 'Pending approval', tooltip: 'Waiting for approval' };
            case 'blocked': return { color: 'red', label: 'Blocked', tooltip: 'Blocked by exam office' };
            case 'unreachable': return { color: 'red', label: 'Server unreachable', tooltip: 'Cannot reach server' };
            default: return { color: 'green', label: 'Connected', tooltip: 'Connected' };
        }
    },

    _render() {
        if (!this._el) return;
        const { color, label, tooltip } = this._computeOverall();
        const queueBadge = this._queueSize > 0 ? `<span style="background:#ef4444;color:white;border-radius:10px;padding:2px 6px;margin-left:6px">${this._queueSize}</span>` : '';
        const bg = color === 'green' ? '#10b981' : color === 'red' ? '#ef4444' : color === 'amber' ? '#f59e0b' : '#64748b';
        this._el.style.background = bg;
        this._el.style.color = 'white';
        this._el.title = tooltip;
        this._el.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:white;margin-right:6px"></span>${label}${queueBadge}`;
        if (this._detailsOpen) this._renderDetails();
    },

    _detailsOpen: false,
    toggleDetails() {
        this._detailsOpen = !this._detailsOpen;
        let panel = document.getElementById('lan-status-details');
        if (!this._detailsOpen) { if (panel) panel.remove(); return; }
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'lan-status-details';
            panel.style.cssText = 'position:fixed;bottom:70px;right:20px;z-index:9999;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:16px;min-width:280px;box-shadow:0 8px 24px rgba(0,0,0,0.4);color:#e2e8f0;font-size:12px';
            document.body.appendChild(panel);
        }
        this._renderDetails();
        setTimeout(() => {
            const handler = (e) => {
                if (!panel.contains(e.target) && e.target !== this._el && !this._el.contains(e.target)) {
                    panel.remove(); this._detailsOpen = false; document.removeEventListener('click', handler);
                }
            };
            document.addEventListener('click', handler);
        }, 50);
    },

    _renderDetails() {
        const panel = document.getElementById('lan-status-details');
        if (!panel) return;
        const deviceId = localStorage.getItem('cbt_device_id') || '—';
        const { color, label } = this._computeOverall();
        panel.innerHTML = `
            <div style="display:flex;justify-content:space-between;margin-bottom:12px"><strong>Connection status</strong><span style="cursor:pointer" onclick="LanStatus.toggleDetails()">✕</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #334155"><span>Server</span><strong style="color:${color==='green'?'#10b981':'#ef4444'}">${label}</strong></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #334155"><span>API</span><code style="font-size:10px">${window.LAN_CONFIG?.apiBase || '—'}</code></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #334155"><span>WS</span><code style="font-size:10px">${window.LAN_CONFIG?.wsUrl || '—'}</code></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #334155"><span>Device</span><code style="font-size:10px">${deviceId.substring(0,16)}...</code></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0"><span>Queue</span><strong>${this._queueSize} items</strong></div>
            <button style="width:100%;margin-top:10px;padding:8px;background:#3b82f6;color:white;border:none;border-radius:8px;cursor:pointer" onclick="LanStatus.forceSync()">Force sync now</button>
        `;
    },

    async forceSync() {
        if (window.LanSync) {
            await LanSync.flush();
            if (window.showAlert) showAlert('Sync attempted', 'info', 3000);
            this._renderDetails();
        }
    },
};

window.LanStatus = LanStatus;

// Auto-init after LAN_CONFIG loads
if (window.LAN_CONFIG) {
    LanStatus.init();
} else {
    window.addEventListener('load', () => {
        if (window.LAN_CONFIG) LanStatus.init();
    });
}

console.log('✅ lan.status.js FIXED loaded');