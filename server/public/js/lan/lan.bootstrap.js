// www/js/lan/lan.bootstrap.js
// ═══════════════════════════════════════════════════════════
//  One-shot LAN boot. Called from main.js after initDB()
//  and seedDefaultsIfEmpty() succeed.
// ═══════════════════════════════════════════════════════════

const LanBootstrap = {
    _booted: false,

    async boot() {
        if (this._booted) return;
        this._booted = true;

        if (!LAN_CONFIG.enabled) {
            console.log('ℹ️ LAN disabled — running in pure-offline mode');
            if (window.LanStatus) LanStatus.setDeviceStatus('unreachable');
            return;
        }

        console.log('🚀 LAN bootstrap starting…');

        // 1. Attach device ID to the API client
        const deviceId = localStorage.getItem('cbt_device_id');
        LanApi.setDeviceId(deviceId);

        // 2. Load any saved auth token
        LanApi.loadToken();

        // 3. Register this device with the server (or update last_seen)
        if (LAN_CONFIG.features.autoRegisterDevice) {
            try {
                await LanDevice.register();
            } catch (err) {
                console.warn('Device registration failed during boot:', err);
            }
        }

        // 4. Check REST API reachability using configured base
        fetch(LAN_CONFIG.apiBase + '/health')
            .then(r => r.json())
            .then(d => console.log('✅ REST API reachable:', d))
            .catch(e => console.error('❌ REST API unreachable:', e.message || e));

        try {
            LanSocket.connect();
        } catch (err) {
            console.warn('Socket connect failed during boot:', err);
        }

        // 5. Start background sync flusher
        if (LAN_CONFIG.features.autoPushResults) {
            try {
                LanSync.start();
            } catch (err) {
                console.warn('Sync start failed during boot:', err);
            }
        }

        // 6. Show the status indicator
        if (window.LanStatus) {
            LanStatus.init();
            // Seed initial states
            LanStatus.setSocketStatus(LanSocket.isConnected() ? 'connected' : 'disconnected');
            if (LanDevice._current) LanStatus.setDeviceStatus(LanDevice._current.status);
            try {
                const n = await LanSync.count();
                LanStatus.setQueueStatus(n);
            } catch (_) { /* ignore */ }
        }

        // 7. Wire socket events to state changes
        this._wireSocketHandlers();

        console.log('✅ LAN bootstrap complete');
    },

    _wireSocketHandlers() {
        // When the server tells us exams have been pushed, pull them down
        LanSocket.on('exams.pushed', async (msg) => {
            console.log('📥 Server pushed exams:', msg.exam_ids);
            try {
                const res = await LanApi.get('/exams?pushed=1');
                if (res.ok && res.data?.exams) {
                    await this._cachePushedExams(res.data.exams);
                    showAlert(`📥 ${res.data.exams.length} exam(s) received from server`, 'info', 4000);
                }
            } catch (err) {
                console.warn('Exam pull failed:', err);
            }
        });

        // Live updates on results (for admin dashboards)
        LanSocket.on('result.submitted', (msg) => {
            console.log('📥 Live result:', msg.exam_code, msg.score + '/' + msg.total);
            // Admin dashboards re-render
            if (state?.isExamOffice && state?.currentPage === 'exam-office-results') {
                loadResults().then(() => render());
            }
        });

        // Presence updates (used on the admin device page)
        LanSocket.on('device.online', (msg) => {
            console.log('🟢 Device online:', msg.device_id);
        });
        LanSocket.on('device.offline', (msg) => {
            console.log('🔴 Device offline:', msg.device_id);
        });
    },

    async _cachePushedExams(exams) {
        // If server already sent full exams, just cache them directly
        for (const e of exams) {
            try {
                // Check if exam already has questions (full payload) or just IDs
                if (e.questions && e.questions.length > 0) {
                    const existing = state.availableExams.find(x => x.exam_id === e.exam_id);
                    if (!existing) {
                        await saveExamToDB({
                            exam_id: e.exam_id,
                            subject: e.subject || e.exam_subject,
                            class: e.class_name || e.class,
                            duration: e.duration,
                            assessmentType: e.assessment_type || e.assessmentType || 'EXAM',
                            scheduledDate: e.scheduled_date || e.scheduledDate,
                            questions: e.questions || [],
                            created_by: 'server',
                            created_date: new Date().toISOString().split('T')[0],
                        });
                    }
                } else {
                    // Fallback: fetch full exam if only ID provided
                    const detail = await LanApi.get('/exams/' + encodeURIComponent(e.exam_id || e));
                    if (!detail.ok) continue;
                    const fullExam = detail.data.exam || detail.data;
                    if (!fullExam) continue;
                    const existing = state.availableExams.find(x => x.exam_id === fullExam.exam_id);
                    if (!existing) {
                        await saveExamToDB({
                            exam_id: fullExam.exam_id,
                            subject: fullExam.subject,
                            class: fullExam.class_name || fullExam.class,
                            duration: fullExam.duration,
                            assessmentType: fullExam.assessment_type,
                            scheduledDate: fullExam.scheduled_date,
                            questions: fullExam.questions || [],
                            created_by: 'server',
                            created_date: new Date().toISOString().split('T')[0],
                        });
                    }
                }
            } catch (err) {
                console.warn('Failed to cache pushed exam:', e.exam_id || e, err);
            }
        }
        if (typeof loadExams === 'function') await loadExams();
    },
};

window.LanBootstrap = LanBootstrap;
console.log('✅ lan.bootstrap.js loaded');