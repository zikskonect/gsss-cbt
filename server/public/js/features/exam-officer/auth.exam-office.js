// auth.exam-office.js - FIXED - Saves to Central DB (cbt_platform.users) + local fallback
async function handleExamOfficeRegistration(event) {
    event.preventDefault();
    const schoolName = document.getElementById('exam-office-school-name').value.trim();
    const adminName  = document.getElementById('exam-office-admin-name').value.trim();
    const phone      = document.getElementById('exam-office-phone').value.trim();
    const email      = document.getElementById('exam-office-email').value.trim();
    const password   = document.getElementById('exam-office-password').value;
    if (!schoolName || !adminName || !phone || !email || !password) {
        showAlert('Please fill all fields', 'error'); return;
    }
    const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
    try {
        try {
            const res = await fetch(`${apiBase}/auth/register`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: adminName, phone_number: phone, email: email, school_name: schoolName, password: password, role: 'exam_office' })
            });
            const data = await res.json();
            if (data.ok || res.ok) {
                try {
                    const hashedPassword = await hashPassword(password);
                    await saveUserToDB({ name: adminName, phone_number: phone, email: email, school_name: schoolName, password: hashedPassword, role: 'exam_office', created_at: new Date().toISOString() });
                } catch (e) {}
                showAlert(`Registration successful! Phone ${phone} saved to central DB.`, 'success');
                setPage('exam-office-login'); return;
            } else { throw new Error(data.error?.message || data.message || 'Registration failed'); }
        } catch (apiErr) {
            const existing = await getUserByPhone(phone);
            if (existing) { showAlert('Phone already registered locally.', 'error'); return; }
            const hashedPassword = await hashPassword(password);
            await saveUserToDB({ name: adminName, phone_number: phone, email: email, school_name: schoolName, password: hashedPassword, role: 'exam_office', created_at: new Date().toISOString() });
            if (window.LanSync) {
                await LanSync.enqueue('user.register', {
                    name: adminName,
                    phone_number: phone,
                    email,
                    school_name: schoolName,
                    password,
                    role: 'exam_office',
                });
            }
            showAlert('Saved to local DB (offline). Will sync when online. Phone: ' + phone, 'warning');
            setPage('exam-office-login');
        }
    } catch (err) {
        console.error('Registration error:', err);
        showAlert('Registration failed: ' + (err.message || 'Please try again.'), 'error');
    }
}
async function handleExamOfficeLogin(event) {
    event.preventDefault();
    const phoneInput = document.getElementById('exam-office-login-phone');
    const passwordInput = document.getElementById('exam-office-login-password');
    if (!phoneInput || !passwordInput) return;
    const phone = phoneInput.value.trim();
    const password = passwordInput.value;
    if (!phone || !password) { showAlert('Please enter phone and password', 'error'); return; }
    try {
        try {
            const response = await LanApi.post('/auth/login', {
                phone_number: phone,
                password,
                device_id: localStorage.getItem('cbt_device_id') || null
            });
            if (response.ok && response.data) {
                const token = response.data.token;
                const user = response.data.user || response.data;
                if (!token) throw new Error('Central login returned no session token');
                LanApi.setToken(token);
                clearSessionState(); state.user = user; state.isExamOffice = true; state.isAuthenticated = true;
                try { await saveUserToDB({ ...user, password: await hashPassword(password) }); } catch(e){}
                await loadExams(); await loadResults();
                showAlert('Login successful! (Central DB)', 'success');
                setTimeout(() => setPage('exam-office-dashboard'), 400); return;
            } else { throw new Error(response.error?.message || 'Login failed'); }
        } catch (apiErr) {
            if (window.LanApi) window.LanApi.setToken(null);
            const user = await getUserByPhone(phone);
            if (!user) { showAlert('No account found. Central error: ' + apiErr.message, 'error'); return; }
            if (user.role !== 'exam_office') { showAlert('Not exam office account.', 'error'); return; }
            const hashedInput = await hashPassword(password);
            if (hashedInput !== user.password) { showAlert('Incorrect password.', 'error'); return; }

            if (window.LanApi && window.LAN_CONFIG?.enabled && navigator.onLine) {
                try {
                    const provision = await LanApi.post('/auth/register', {
                        name: user.name,
                        phone_number: phone,
                        email: user.email,
                        school_name: user.school_name,
                        password,
                        role: 'exam_office',
                    });
                    if (!provision.ok &&
                        provision.error?.code !== 'duplicate_phone' &&
                        provision.error?.code !== 'validation_error') {
                        throw new Error(provision.error?.message || 'Central account provisioning failed');
                    }

                    if (!user.email || !user.school_name) {
                        throw new Error('Central Exam Office login needs the account email and school name');
                    }

                    const centralLogin = await LanApi.post('/auth/login', {
                        phone_number: phone,
                        password,
                        device_id: localStorage.getItem('cbt_device_id') || null,
                    });
                    if (centralLogin.ok && centralLogin.data?.token) {
                        LanApi.setToken(centralLogin.data.token);
                        clearSessionState();
                        state.user = centralLogin.data.user || user;
                        state.isExamOffice = true;
                        state.isAuthenticated = true;
                        await loadExams();
                        await loadResults();
                        showAlert('Local account synced. Login successful! (Central DB)', 'success');
                        setTimeout(() => setPage('exam-office-dashboard'), 400);
                        return;
                    }
                    throw new Error(centralLogin.error?.message || 'Central login did not return a valid token');
                } catch (syncError) {
                    console.warn('Could not provision local Exam Office centrally:', syncError);
                    showAlert('Central login failed: ' + syncError.message, 'error', 7000);
                    return;
                }
            }

            clearSessionState(); state.user = user; state.isExamOffice = true; state.isAuthenticated = true;
            await loadExams(); await loadResults();
            showAlert('Login successful! (Local DB). Central actions require a central login.', 'warning');
            setTimeout(() => setPage('exam-office-dashboard'), 400);
        }
    } catch (err) {
        console.error('Login error:', err); showAlert('Login failed: ' + err.message, 'error');
    }
}
window.handleExamOfficeRegistration = handleExamOfficeRegistration;
window.handleExamOfficeLogin = handleExamOfficeLogin;
console.log('✅ auth.exam-office.js FIXED - Central DB');
