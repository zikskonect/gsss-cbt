// www/js/lan/lan.socket.js
// ═══════════════════════════════════════════════════════════
//  WebSocket client with auto-reconnect + heartbeat.
//  Emits events that other modules subscribe to.
// ═══════════════════════════════════════════════════════════

const LanSocket = {
    _ws: null,
    _listeners: {},          // event name → [callbacks]
    _reconnectDelay: 0,
    _pingTimer: null,
    _pongTimer: null,
    _connectTimer: null,
    _intentionalClose: false,

    // ─── Public API ─────────────────────────────────────

    connect() {
        if (!LAN_CONFIG.enabled) return;
        if (this._ws && (this._ws.readyState === WebSocket.OPEN || this._ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this._intentionalClose = false;
        const url = LAN_CONFIG.wsUrl;
        console.log('🔌 Connecting to WS:', url);

        try {
            this._ws = new WebSocket(url);
        } catch (err) {
            console.error('❌ WS construction failed:', err);
            this._scheduleReconnect();
            return;
        }

        this._connectTimer = setTimeout(() => {
            if (this._ws && this._ws.readyState === WebSocket.CONNECTING) {
                console.error('❌ WS connection timed out:', url);
                try { this._ws.close(); } catch (_) {}
            }
        }, 5000);

        this._ws.onopen  = () => this._onOpen();
        this._ws.onmessage = (e) => this._onMessage(e);
        this._ws.onclose = (e) => this._onClose(e);
        this._ws.onerror = (e) => this._onError(e);
    },

    disconnect() {
        this._intentionalClose = true;
        this._clearTimers();
        if (this._ws) {
            try { this._ws.close(); } catch (_) {}
            this._ws = null;
        }
    },

    send(payload) {
        if (!this._ws || this._ws.readyState !== WebSocket.OPEN) {
            return false;
        }
        try {
            this._ws.send(JSON.stringify(payload));
            return true;
        } catch (err) {
            console.warn('WS send failed:', err);
            return false;
        }
    },

    isConnected() {
        return this._ws && this._ws.readyState === WebSocket.OPEN;
    },

    /**
     * Subscribe to a WS event type. Returns an unsubscribe function.
     */
    on(eventType, callback) {
        if (!this._listeners[eventType]) this._listeners[eventType] = [];
        this._listeners[eventType].push(callback);
        return () => {
            this._listeners[eventType] = (this._listeners[eventType] || [])
                .filter(cb => cb !== callback);
        };
    },

    // ─── Internals ──────────────────────────────────────

    _onOpen() {
        this._clearConnectTimer();
        console.log('✅ WS connected');
        this._reconnectDelay = 0;

        // Identify ourselves
        const deviceId = localStorage.getItem('cbt_device_id');
        const role = this._currentRole();

        this.send({
            type: 'hello',
            device_id: deviceId,
            role,
            platform: typeof detectPlatform === 'function' ? detectPlatform() : 'unknown',
        });

        // Start application-level ping/pong
        this._startPing();

        // Notify subscribers
        this._emit('connection.open', { at: Date.now() });

        // Update status widget
        if (window.LanStatus) LanStatus.setSocketStatus('connected');
    },

    _onMessage(event) {
        let msg;
        try { msg = JSON.parse(event.data); } catch (_) { return; }
        if (!msg || !msg.type) return;

        // Handle ping/pong internally
        if (msg.type === 'pong') {
            this._clearPongTimer();
            if (window.LanStatus) LanStatus.setSocketStatus('connected');
            return;
        }
        if (msg.type === 'server.heartbeat') {
            if (window.LanStatus) LanStatus.setSocketStatus('connected');
        }

        // Fan out to listeners
        this._emit(msg.type, msg);
        this._emit('*', msg);
    },

    _onClose(event) {
        this._clearConnectTimer();
        this._clearTimers();
        if (window.LanStatus) LanStatus.setSocketStatus('disconnected');
        this._emit('connection.close', { code: event.code, at: Date.now() });

        if (!this._intentionalClose) {
            console.warn('⚠️ WS closed (code:', event.code, ') — reconnecting in', this._reconnectDelay, 'ms');
            this._scheduleReconnect();
        }
    },

    _onError(event) {
        console.error('❌ WS error details:', event);
        if (window.LanStatus) LanStatus.setSocketStatus('error');
    },

    _scheduleReconnect() {
        this._clearTimers();

        // Exponential backoff: 3s → 6s → 12s → 24s → 30s (capped)
        if (this._reconnectDelay === 0) {
            this._reconnectDelay = LAN_CONFIG.socket.reconnectDelayMs;
        } else {
            this._reconnectDelay = Math.min(
                this._reconnectDelay * 2,
                LAN_CONFIG.socket.maxReconnectDelayMs
            );
        }

        setTimeout(() => this.connect(), this._reconnectDelay);
    },

    _startPing() {
        this._clearPingTimer();
        this._pingTimer = setInterval(() => {
            if (!this.isConnected()) return;
            const ok = this.send({ type: 'ping', t: Date.now() });
            if (ok) {
                this._clearPongTimer();
                this._pongTimer = setTimeout(() => {
                    console.warn('⚠️ WS pong timeout — forcing reconnect');
                    try { this._ws.close(); } catch (_) {}
                }, LAN_CONFIG.socket.pongTimeoutMs);
            }
        }, LAN_CONFIG.socket.pingIntervalMs);
    },

    _clearPingTimer() {
        if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; }
    },

    _clearPongTimer() {
        if (this._pongTimer) { clearTimeout(this._pongTimer); this._pongTimer = null; }
    },

    _clearTimers() {
        this._clearPingTimer();
        this._clearPongTimer();
        this._clearConnectTimer();
    },

    _clearConnectTimer() {
        if (this._connectTimer) {
            clearTimeout(this._connectTimer);
            this._connectTimer = null;
        }
    },

    _emit(type, payload) {
        const cbs = this._listeners[type] || [];
        cbs.forEach(cb => {
            try { cb(payload); } catch (err) { console.error('WS listener error:', err); }
        });
    },

    _currentRole() {
        if (state?.isExamOffice) return 'exam_office';
        if (state?.isTeacher) return 'teacher';
        if (state?.isFormTeacher) return 'form_teacher';
        if (state?.isStudent) return 'student';
        return null;
    },
};

window.LanSocket = LanSocket;
console.log('✅ lan.socket.js loaded');