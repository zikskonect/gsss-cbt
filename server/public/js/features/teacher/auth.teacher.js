// auth.teacher.js - FIXED for unified teacher system + dual DB (central + IndexedDB)
// ═══════════════════════════════════════════════════════════════════════════

const TEACHERS_DB_NAME = 'ZiksKonectDB';
const TEACHERS_STORE = 'teachers';
const TEACHERS_DB_VERSION = 2;

// ---------- IndexedDB Helpers ----------
function openTeachersDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TEACHERS_DB_NAME, TEACHERS_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(TEACHERS_STORE)) {
        const store = db.createObjectStore(TEACHERS_STORE, { keyPath: 'phone_number' });
        store.createIndex('role', 'role', { unique: false });
        store.createIndex('name', 'name', { unique: false });
      }
      // Ensure other stores exist (if you have them)
      if (!db.objectStoreNames.contains('form_teacher_assignments')) {
        db.createObjectStore('form_teacher_assignments', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveTeacherToLocalDB(teacher) {
  const db = await openTeachersDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEACHERS_STORE, 'readwrite');
    tx.objectStore(TEACHERS_STORE).put({
      name: teacher.name,
      phone_number: teacher.phone_number,
      phone: teacher.phone_number, // alias for legacy code
      role: teacher.role, // 'teacher' | 'form_teacher'
      password: teacher.password || '', // hashed or plain for offline - will check
      created_at: new Date().toISOString(),
      synced: true
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function getTeacherFromLocalDB(phone) {
  const db = await openTeachersDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEACHERS_STORE, 'readonly');
    const req = tx.objectStore(TEACHERS_STORE).get(phone);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllTeachersLocal() {
  const db = await openTeachersDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEACHERS_STORE, 'readonly');
    const req = tx.objectStore(TEACHERS_STORE).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Registration ----------
async function handleTeacherRegistration(event) {
    event.preventDefault();

    const nameEl = document.getElementById('register-name');
    const phoneEl = document.getElementById('register-phone');
    const roleEl = document.getElementById('register-role');
    const passEl = document.getElementById('register-password');

    const name     = nameEl?.value.trim();
    const phone    = phoneEl?.value.trim();
    const role     = roleEl?.value || 'teacher'; // teacher | form_teacher
    const password = passEl?.value;

    if (!name || !phone || !password) {
        showAlert('Please fill all fields', 'error');
        return;
    }

    if (phone.length < 7) {
        showAlert('Phone number too short', 'error');
        return;
    }

    // UI lock
    const btn = event.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Registering...'; }

    try {
        // 1. Prepare payload - FIX: send BOTH phone_number AND actor_phone to avoid SQL error
        // Backend might expect actor_phone, we send both aliases
        const payload = {
            role: role, // important: 'teacher' or 'form_teacher'
            name: name,
            phone_number: phone,
            phone: phone,
            actor_phone: phone, // <-- FIX for your SQLSTATE error
            password: password,
        };

        console.log('📤 Registering teacher:', { ...payload, password: '***' });

        // 2. Central DB via LanIntegration (online)
        let centralRes = null;
        if (typeof LanIntegration !== 'undefined' && LanIntegration.registerUser) {
            try {
                centralRes = await LanIntegration.registerUser(payload);
            } catch (e) {
                console.warn('Central registration error (will try offline fallback):', e);
                centralRes = { ok: false, error: e };
            }
        } else if (typeof LanApi !== 'undefined') {
            // Fallback if you use LanApi directly
            try {
                centralRes = await LanApi.post('/teachers/register', payload);
            } catch (e) {
                centralRes = { ok: false, error: e };
            }
        }

        // If central returns ok:false due to actor_phone error, we still continue to local
        // But show proper message
        if (centralRes && !centralRes.ok) {
            const msg = centralRes.error?.message || centralRes.message || '';
            // If it's the specific SQL error, tell user but still save locally
            if (msg.includes('actor_phone') || msg.includes('Column not found')) {
                console.error('BACKEND SCHEMA MISMATCH:', msg);
                // We will fix locally and still proceed
                showAlert('Central DB schema mismatch - saved locally. Please fix backend column (see notes).', 'warning');
            } else if (msg.includes('already') || msg.includes('exists') || msg.includes('Duplicate')) {
                showAlert('This phone number is already registered', 'error');
                if (btn) { btn.disabled = false; btn.textContent = 'Register'; }
                return;
            }
        }

        // 3. Local IndexedDB (always)
        await saveTeacherToLocalDB({
            name,
            phone_number: phone,
            role,
            password // NOTE: in production, store hash. For offline demo, plain is ok
        });

        if (centralRes && !centralRes.ok && centralRes._offline && window.LanSync) {
            await LanSync.enqueue('user.register', {
                name,
                phone_number: phone,
                role,
                password,
            });
        }

        console.log('✅ Saved to IndexedDB');

        showAlert('Registration successful! You can now log in.', 'success');
        setTimeout(() => setPage('teacher-login'), 800);

    } catch (err) {
        console.error('Registration failed:', err);
        showAlert(err.message || 'Registration failed', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Register'; }
    }
}

// ---------- Login (Unified) ----------
async function handleTeacherLogin(event) {
    event.preventDefault();

    const phone    = document.getElementById('teacher-phone')?.value.trim();
    const password = document.getElementById('teacher-password')?.value;

    if (!phone || !password) {
        showAlert('Please enter phone and password', 'error');
        return;
    }

    try {
        let user = null;
        let res = null;

        // 1. Try central first
        if (navigator.onLine && typeof LanIntegration !== 'undefined' && LanIntegration.loginUser) {
            res = await LanIntegration.loginUser({
                role: 'teacher', // server will check actual role
                phone_number: phone,
                phone: phone,
                actor_phone: phone,
                password,
            });
            if (res?.ok) user = res.data.user || res.data;
        }

        // 2. Fallback to IndexedDB offline
        if (!user) {
            const local = await getTeacherFromLocalDB(phone);
            if (local && local.password === password) {
                user = {
                    name: local.name,
                    phone_number: local.phone_number,
                    role: local.role
                };
                console.log('✅ Offline login via IndexedDB');
            }
        }

        if (!user) {
            showAlert(res?.error?.message || 'Invalid phone or password', 'error');
            return;
        }

        // 3. Set session state
        clearSessionState();
        state.user = {
            name:         user.name,
            phone_number: user.phone_number || user.phone || phone,
            role:         user.role, // teacher or form_teacher
        };
        
        // Flags for unified interface
        if (user.role === 'form_teacher') {
            state.isFormTeacher = true;
            state.isTeacher = true; // BOTH true for form teacher, so they get teacher features + extras
        } else {
            state.isTeacher = true;
            state.isFormTeacher = false;
        }
        state.isAuthenticated = true;

        if (window.LanDevice) LanDevice.reportRole(user.role);

        // 4. Load data based on role
        if (state.isFormTeacher || state.isTeacher) {
            let assignments = [];
            if (LAN_CONFIG?.enabled && navigator.onLine) {
                try {
                    const assignRes = await LanApi.get('/assignments?phone=' + encodeURIComponent(state.user.phone_number));
                    if (assignRes.ok && assignRes.data?.assignments) {
                        assignments = assignRes.data.assignments;
                        for (const a of assignments) {
                            try { await saveFormTeacherAssignmentToDB(a); } catch (_) {}
                        }
                    }
                } catch (e) { console.warn(e); }
            }
            if (assignments.length === 0 && typeof loadFormTeacherAssignmentsByPhone === 'function') {
                assignments = await loadFormTeacherAssignmentsByPhone(state.user.phone_number);
            }

            state.myAssignments = assignments || [];
            if (state.myAssignments.length > 0) {
                state.isFormTeacher = true;
            }
            state.activeAssignment = state.myAssignments[0] || null;

            if (state.activeAssignment) {
                if (LAN_CONFIG?.enabled && navigator.onLine && typeof LanHarvest !== 'undefined') {
                    await LanHarvest.syncStudentsDown(state.activeAssignment.class_code, state.activeAssignment.academic_year);
                }
                if (typeof loadFormTeacherStudents === 'function') await loadFormTeacherStudents();
            }
        }
        
        // Always load exams for both roles (unified interface)
        if (typeof loadExams === 'function') await loadExams();
        if (typeof loadResults === 'function') await loadResults();

        showAlert('Login successful!', 'success');
        
        setTimeout(() => setPage('teacher'), 400);

    } catch (e) {
        console.error(e);
        showAlert('Login failed: ' + e.message, 'error');
    }
}

window.handleTeacherRegistration = handleTeacherRegistration;
window.handleTeacherLogin        = handleTeacherLogin;
window.saveTeacherToLocalDB = saveTeacherToLocalDB;
window.getTeacherFromLocalDB = getTeacherFromLocalDB;
window.getAllTeachersLocal = getAllTeachersLocal;

console.log('✅ FIXED auth.teacher.js loaded - unified login + dual DB');
