// www/js/lan/lan.sync.js
// ═══════════════════════════════════════════════════════════
//  Offline sync queue. Pushes local changes to the server
//  whenever the network is reachable.
//
//  Queue lives in IndexedDB (a new store "sync_queue").
//  Each entry: { id, kind, payload, attempts, created_at }
//  Kinds: 'result.submit', 'student.create', 'student.update', 'device.heartbeat'
// ═══════════════════════════════════════════════════════════

const LanSync = {
    _flusherTimer: null,

    // ─── Queue API ──────────────────────────────────────

    async _db() {
        // Reuse the main DB connection
        return await initDB();
    },

    async enqueue(kind, payload) {
        const db = await this._db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['sync_queue'], 'readwrite');
            const store = tx.objectStore('sync_queue');

            // Guard against runaway growth
            const countReq = store.count();
            countReq.onsuccess = () => {
                if (countReq.result >= LAN_CONFIG.sync.maxQueueSize) {
                    console.error('❌ Sync queue full — dropping oldest');
                    // Drop the oldest
                    const cursorReq = store.openCursor();
                    cursorReq.onsuccess = (e) => {
                        const cursor = e.target.result;
                        if (cursor) cursor.delete();
                    };
                }

                const entry = {
                    id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    kind,
                    payload,
                    attempts: 0,
                    created_at: new Date().toISOString(),
                };
                const req = store.put(entry);
                req.onsuccess = () => resolve(entry);
                req.onerror = () => reject(req.error);
            };
            countReq.onerror = () => reject(countReq.error);
        });
    },

    async list() {
        const db = await this._db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['sync_queue'], 'readonly');
            const store = tx.objectStore('sync_queue');
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    },

    async remove(id) {
        const db = await this._db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['sync_queue'], 'readwrite');
            const store = tx.objectStore('sync_queue');
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
        });
    },

    async count() {
        const db = await this._db();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(['sync_queue'], 'readonly');
            const store = tx.objectStore('sync_queue');
            const req = store.count();
            req.onsuccess = () => resolve(req.result || 0);
            req.onerror = () => reject(req.error);
        });
    },

    // ─── Background flusher ─────────────────────────────

    start() {
        if (this._flusherTimer) return;
        this._flusherTimer = setInterval(() => this.flush(), LAN_CONFIG.sync.flushIntervalMs);
        // Immediate first attempt
        setTimeout(() => this.flush(), 5000);
        console.log('✅ Sync flusher started (every', LAN_CONFIG.sync.flushIntervalMs, 'ms)');
    },

    stop() {
        if (this._flusherTimer) {
            clearInterval(this._flusherTimer);
            this._flusherTimer = null;
        }
    },

    /**
     * Attempt to push all queued entries.
     * Processes oldest first; stops on first network error.
     */
    async flush() {
        if (!LAN_CONFIG.enabled) return;

        let entries;
        try {
            entries = await this.list();
        } catch (err) {
            console.error('Sync list failed:', err);
            return;
        }

        if (entries.length === 0) return;

        // Sort oldest first
        entries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        let pushed = 0, failed = 0;

        for (const entry of entries) {
            const result = await this._dispatch(entry);
            if (result.ok) {
                await this.remove(entry.id);
                pushed++;
                this._notifyQueueSize();
            } else {
                failed++;
                // If it's a network error, stop — server is down
                if (result.error?.code === 'network' || result.error?.code === 'timeout') {
                    console.warn('⚠️ Sync paused (server unreachable). Will retry.');
                    break;
                }
                // If it's a validation/permanent error, drop the entry to avoid infinite loop
                if (result.status >= 400 && result.status < 500 && result.status !== 408 && result.status !== 429) {
                    console.warn('⚠️ Dropping permanently-failed entry:', entry.id, result.error);
                    await this.remove(entry.id);
                } else {
                    // Bump attempts, keep for retry
                    entry.attempts = (entry.attempts || 0) + 1;
                    const db = await this._db();
                    const tx = db.transaction(['sync_queue'], 'readwrite');
                    tx.objectStore('sync_queue').put(entry);
                }
            }
        }

        if (pushed > 0) {
            console.log(`📤 Sync flushed ${pushed} item(s); ${failed} pending`);
            if (window.LanStatus) LanStatus.setQueueStatus(await this.count());
        }
    },

    async _dispatch(entry) {
        switch (entry.kind) {
            case 'result.submit':
                return await LanApi.post('/results', entry.payload);

            case 'student.create':
                {
                    const payload = { ...entry.payload };
                    delete payload.local_student_id;
                    const requestedStatus = payload.status || 'active';
                    delete payload.status;
                    const response = await LanApi.post('/students', payload);
                    if (response.ok && response.data?.student && entry.payload.local_student_id) {
                        try {
                            let syncedStudent = response.data.student;
                            if (requestedStatus !== 'active') {
                                const statusResponse = await LanApi.patch(
                                    '/students/' + encodeURIComponent(syncedStudent.student_id),
                                    { status: requestedStatus }
                                );
                                if (!statusResponse.ok || !statusResponse.data?.student) {
                                    return statusResponse;
                                }
                                syncedStudent = statusResponse.data.student;
                            }
                            await deleteStudentFromDB(entry.payload.local_student_id);
                            await saveStudentToDB(syncedStudent);
                        } catch (error) {
                            console.error('Failed to reconcile queued student:', error);
                        }
                    }
                    return response;
                }

            case 'student.update':
                return await LanApi.patch('/students/' + entry.payload.student_id, entry.payload.updates);

            case 'user.register':
                return await LanApi.post('/auth/register', entry.payload);

            case 'device.heartbeat':
                return await LanApi.post('/devices/heartbeat', entry.payload);

            default:
                console.warn('Unknown sync kind:', entry.kind);
                return { ok: false, error: { code: 'unknown_kind', message: 'Unknown kind' } };
        }
    },

    _notifyQueueSize() {
        this.count().then(n => {
            if (window.LanStatus) LanStatus.setQueueStatus(n);
        }).catch(() => {});
    },
};

window.LanSync = LanSync;
console.log('✅ lan.sync.js loaded');