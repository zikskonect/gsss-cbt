
// lan.integration.js - FIXED with offline fallback
const LanIntegration = {
    async loginUser({ role, phone_number, password }) {
        const deviceId = localStorage.getItem('cbt_device_id');
        const payload = { role, phone_number, password, device_id: deviceId };

        if (LAN_CONFIG.enabled && navigator.onLine) {
            try {
                const res = await LanApi.post('/auth/login', payload);
                if (res.ok) {
                    LanApi.setToken(res.data.token);
                    try {
                        await saveUserToDB({
                            phone_number: res.data.user.phone_number,
                            name: res.data.user.name,
                            role: res.data.user.role,
                            email: res.data.user.email,
                            school_name: res.data.user.school_name,
                            password: await hashPassword(password),
                        });
                    } catch (e) {}
                    return { ok: true, source: 'server', data: res.data };
                }
                if (res.status >= 400 && res.status < 500) return res;
            } catch(e) {
                console.warn('Server login failed, trying offline:', e.message);
            }
        }

        // Offline fallback - try any role if teacher role fails (form_teacher vs teacher)
        let user = await getUserByPhone(phone_number);
        if (user) {
            // Allow login even if role is form_teacher but we tried teacher
            const hash = await hashPassword(password);
            if (hash === user.password) {
                return {
                    ok: true, source: 'offline',
                    data: { token: 'offline', role: user.role, user }
                };
            }
        }
        return { ok: false, error: { message: 'Login failed - check phone number and password' } };
    },

    async registerUser({ role, name, phone_number, password, email, school_name }) {
        const payload = { role, name, phone_number, password };
        if (email) payload.email = email;
        if (school_name) payload.school_name = school_name;
        
        if (LAN_CONFIG.enabled && navigator.onLine) {
            try {
                const res = await LanApi.post('/auth/register', payload);
                if (res.ok) {
                    // Also save locally for offline login
                    try {
                        await saveUserToDB({
                            phone_number,
                            name,
                            role,
                            email,
                            school_name,
                            password: await hashPassword(password),
                            created_at: new Date().toISOString(),
                        });
                    } catch(e) {}
                    return res;
                }
                if (res.error?.code === 'network' || res.error?.code === 'timeout') {
                    return { ...res, _offline: true };
                }
                return res;
            } catch(e) {
                console.warn('Server register unreachable:', e.message);
                return { ok: false, error: { message: 'Server unreachable, trying offline...' }, _offline: true };
            }
        }
        // If LAN disabled, let caller handle offline save
        return { ok: false, error: { message: 'LAN disabled, using offline mode' }, _offline: true };
    },

    async lookupStudent(examCode) {
        if (LAN_CONFIG.enabled && navigator.onLine) {
            try {
                const res = await LanApi.get('/students/lookup?code=' + encodeURIComponent(examCode));
                if (res.ok && res.data.student) {
                    try {
                        await saveStudentToDB({
                            student_id: res.data.student.student_id,
                            exam_code: res.data.student.exam_code,
                            name: res.data.student.name,
                            class_name: res.data.student.class_name,
                            class_code: res.data.student.class_code,
                            arm: res.data.student.arm,
                            status: res.data.student.status,
                        });
                    } catch (e) {}
                    return { ok: true, source: 'server', student: res.data.student };
                }
                if (res.status === 404) return { ok: false, error: { message: 'Student not found' } };
            } catch(e) {}
        }
        try {
            const student = await getStudentByExamCode(examCode);
            if (student && student.status === 'active') {
                return { ok: true, source: 'offline', student };
            }
        } catch(e) {}
        return { ok: false, error: { message: 'Student not found' } };
    },

    /**
     * Return only this student's pushed exams scheduled for the server's
     * current date. The server owns the date check to avoid client clock drift.
     */
    async getStudentExams(examCode) {
        if (!LAN_CONFIG.enabled || !navigator.onLine) {
            return { ok: false, error: { code: 'offline', message: 'Offline' } };
        }

        try {
            return await LanApi.get(
                '/exams/for-device?exam_code=' + encodeURIComponent(examCode)
            );
        } catch (e) {
            return { ok: false, error: { code: 'network', message: e.message } };
        }
    },

    async submitResult(result) {
        result.device_id = localStorage.getItem('cbt_device_id') || null;
        if (LAN_CONFIG.enabled && navigator.onLine) {
            try {
                const res = await LanApi.post('/results', result);
                if (res.ok) {
                    try { await saveResultToDB(result); } catch (e) {}
                    return { ok: true, source: 'server' };
                }
                if (res.error?.code === 'exam_already_taken') return res;
            } catch(e) {}
        }
        try {
            await saveResultToDB(result);
            await LanSync.enqueue('result.submit', result);
        } catch (e) {
            console.error('Failed to queue result:', e);
            return { ok: false, error: { code: 'result_save_failed', message: e.message } };
        }
        return { ok: true, source: 'queued' };
    },

    async getFormTeachers() {
        if (!LAN_CONFIG.enabled) return { ok: false, error: { message: 'LAN disabled' } };
        try {
            return await LanApi.get('/users/form-teachers');
        } catch(e) {
            return { ok: false, error: { message: e.message } };
        }
    },
};

window.LanIntegration = LanIntegration;
console.log('✅ lan.integration.js FIXED loaded');