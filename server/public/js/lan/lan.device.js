// www/js/lan/lan.device.js
// ═══════════════════════════════════════════════════════════
//  Device identity + registration with the server.
//  Extends admin.devices.js (which handles IndexedDB local
//  storage). This file syncs the local device to the server.
// ═══════════════════════════════════════════════════════════

const LanDevice = {
    _current: null,          // { device_id, status, platform, role_claimed, ... }
    _registrationAttempted: false,

    /**
     * Local device_id (from localStorage). Should already exist
     * because admin.devices.js generates it during boot.
     */
    getLocalDeviceId() {
        return localStorage.getItem('cbt_device_id') || null;
    },

    /**
     * Register (or re-register) this device with the server.
     * Safe to call repeatedly — server dedupes by device_id.
     */
    async register() {
    if (!LAN_CONFIG.enabled) {
        console.log('⚠️ LAN disabled — skipping device registration');
        return { ok: false, error: { message: 'LAN disabled' } };
    }

    const deviceId = this.getLocalDeviceId();
    if (!deviceId) {
        console.error('❌ No local device_id — admin.devices.js did not run?');
        return { ok: false, error: { message: 'No local device_id' } };
    }

    const platform = typeof detectPlatform === 'function' ? detectPlatform() : 'unknown';
    let fingerprint = null;
    try {
        fingerprint = typeof computeFingerprint === 'function' ? await computeFingerprint() : null;
    } catch (_) { /* ignore */ }

    // 👇 NEW: Pull the label from local storage, or default to the platform
    let label = localStorage.getItem('cbt_device_label');
    if (!label) {
        label = `${platform.toUpperCase()} Device`;
    }

    const payload = {
        device_id: deviceId,
        fingerprint,
        hostname: (typeof navigator !== 'undefined' && navigator.platform) || 'unknown',
        platform,
        role_claimed: this.guessRole(),
        label: label // 👈 Send the label to the server
    };

    const res = await LanApi.post('/devices/register', payload);
    this._registrationAttempted = true;

    if (res.ok) {
        this._current = res.data.device;
        console.log('✅ Device registered with server:', res.data.device.status);
        if (window.LanStatus) LanStatus.setDeviceStatus(this._current.status);
        return res;
    }

    console.warn('⚠️ Device registration failed:', res.error);
    if (window.LanStatus) LanStatus.setDeviceStatus('unreachable');
    return res;
},
    /**
     * Send a heartbeat so the server knows we're still alive.
     * Called every ~30s by LanSocket's tick, or on demand.
     */
    async heartbeat() {
        const deviceId = this.getLocalDeviceId();
        if (!deviceId) return;
        await LanApi.post('/devices/heartbeat', { device_id: deviceId });
    },

    /**
     * Guess this device's role from current state (used at registration time).
     */
    guessRole() {
        if (typeof state !== 'undefined' && state?.isExamOffice) return 'exam_office';
        if (typeof state !== 'undefined' && state?.isTeacher) return 'teacher';
        if (typeof state !== 'undefined' && state?.isFormTeacher) return 'form_teacher';
        if (typeof state !== 'undefined' && state?.isStudent) return 'student';
        return null;
    },

    /**
     * Update the role on the server after a user logs in.
     */
    async reportRole(role) {
        const deviceId = this.getLocalDeviceId();
        if (!deviceId || !LAN_CONFIG.enabled) return;
        // Re-register with role_claimed — server updates in place
        await LanApi.post('/devices/register', {
            device_id: deviceId,
            platform: typeof detectPlatform === 'function' ? detectPlatform() : 'unknown',
            role_claimed: role,
        });
        if (this._current) this._current.role_claimed = role;
    },

    /**
     * Returns the current device record (after register).
     */
    getCurrent() {
        return this._current;
    },

    /**
     * Is this device approved by an admin?
     */
    isApproved() {
        return this._current?.status === 'approved';
    },
};

window.LanDevice = LanDevice;
console.log('✅ lan.device.js loaded');