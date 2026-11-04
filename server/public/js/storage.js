// storage.js - IndexedDB layer
// ═══════════════════════════════════════════════════════════
//  New in v12:
//    - students store               (with indexes: exam_code, class_code+year, academic_year)
//    - classes store
//    - arms store
//    - departments store
//    - form_teacher_assignments store
//    - academic_years store
//    - device_registry store         (reserved for Phase 3)
// ═══════════════════════════════════════════════════════════

const DB_NAME = window.APP_CONFIG.dbName;
const DB_VERSION = window.APP_CONFIG.dbVersion;

// ─────────────────────────────────────────────
// DB INIT
// ─────────────────────────────────────────────

function initDB() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Opening IndexedDB...');

        if (!window.indexedDB) {
            reject(new Error("IndexedDB is not supported"));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('❌ IndexedDB error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('✅ IndexedDB opened successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            console.log('🔄 IndexedDB upgrade needed');
            const db = event.target.result;

            // ─── Existing stores ───────────────────────
            if (!db.objectStoreNames.contains('exams')) {
                const examsStore = db.createObjectStore('exams', { keyPath: 'exam_id' });
                examsStore.createIndex('created_by', 'created_by', { unique: false });
            }

            if (!db.objectStoreNames.contains('results')) {
                const resultsStore = db.createObjectStore('results', { keyPath: 'result_id' });
                resultsStore.createIndex('exam_id', 'exam_id', { unique: false });
                resultsStore.createIndex('student_class', 'student_class', { unique: false });
                resultsStore.createIndex('exam_code', 'exam_code', { unique: false }); // NEW
            }

            if (!db.objectStoreNames.contains('users')) {
                const usersStore = db.createObjectStore('users', { keyPath: 'phone_number' });
                usersStore.createIndex('role', 'role', { unique: false });
            }

            if (!db.objectStoreNames.contains('exam_archives')) {
                const archivesStore = db.createObjectStore('exam_archives', { keyPath: 'archive_id' });
                archivesStore.createIndex('exported_at', 'exported_at', { unique: false });
            }

            // ─── NEW v12 stores ────────────────────────

            // Students — the core of the new system
            if (!db.objectStoreNames.contains('students')) {
                const studentsStore = db.createObjectStore('students', { keyPath: 'student_id' });
                studentsStore.createIndex('exam_code',        'exam_code',        { unique: true });  // must be unique
                studentsStore.createIndex('class_code',       'class_code',       { unique: false });
                studentsStore.createIndex('academic_year',    'academic_year',    { unique: false });
                studentsStore.createIndex('class_year',       ['class_code', 'academic_year'], { unique: false });
                studentsStore.createIndex('registered_by',    'registered_by',    { unique: false });
                studentsStore.createIndex('status',           'status',           { unique: false });
            }

            // Classes (admin-defined)
            if (!db.objectStoreNames.contains('classes')) {
                const classesStore = db.createObjectStore('classes', { keyPath: 'class_id' });
                classesStore.createIndex('code',  'code',  { unique: true });
                classesStore.createIndex('level', 'level', { unique: false });
            }

            // Arms (admin-defined)
            if (!db.objectStoreNames.contains('arms')) {
                db.createObjectStore('arms', { keyPath: 'arm_id' });
            }

            // Departments (admin-defined)
            if (!db.objectStoreNames.contains('departments')) {
                db.createObjectStore('departments', { keyPath: 'department_id' });
            }

            // Form Teacher Assignments (admin-created)
            if (!db.objectStoreNames.contains('form_teacher_assignments')) {
                const ftaStore = db.createObjectStore('form_teacher_assignments', { keyPath: 'assignment_id' });
                ftaStore.createIndex('teacher_phone',  'teacher_phone',   { unique: false });
                ftaStore.createIndex('class_year_arm', ['class_code', 'academic_year', 'arm'], { unique: true });
            }

            // Academic Years
            if (!db.objectStoreNames.contains('academic_years')) {
                const ayStore = db.createObjectStore('academic_years', { keyPath: 'year_id' });
                ayStore.createIndex('is_current', 'is_current', { unique: false });
            }

            // Device Registry (Phase 3 — schema ready now)
            if (!db.objectStoreNames.contains('device_registry')) {
                const drStore = db.createObjectStore('device_registry', { keyPath: 'device_id' });
                drStore.createIndex('status',   'status',   { unique: false });
                drStore.createIndex('platform', 'platform', { unique: false });
            }

            // Sync queue — client-side outbox for server pushes
            if (!db.objectStoreNames.contains('sync_queue')) {
                const sqStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
                sqStore.createIndex('kind',       'kind',       { unique: false });
                sqStore.createIndex('created_at', 'created_at', { unique: false });
            }

            console.log(`✅ Database schema updated to v${DB_VERSION}`);
        };

        request.onblocked = () => {
            console.error('❌ IndexedDB blocked');
            reject(new Error('Database operation blocked'));
        };
    });
}

// ═══════════════════════════════════════════════════════════
//  EXAMS (unchanged — preserved from v11)
// ═══════════════════════════════════════════════════════════

async function saveExamToDB(exam) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exams'], 'readwrite');
        const store = transaction.objectStore('exams');
        const request = store.put(exam);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllExamsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exams'], 'readonly');
        const store = transaction.objectStore('exams');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function loadExamsByCreator(creatorPhone) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exams'], 'readonly');
        const store = transaction.objectStore('exams');
        const index = store.index('created_by');
        const request = index.getAll(creatorPhone);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function deleteExamFromDB(examId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exams'], 'readwrite');
        const store = transaction.objectStore('exams');
        const request = store.delete(examId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function deleteAllExamsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exams'], 'readwrite');
        const store = transaction.objectStore('exams');
        const request = store.clear();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  RESULTS (unchanged)
// ═══════════════════════════════════════════════════════════

async function saveResultToDB(result) {
    console.log('💾 saveResultToDB called with:', {
        result_id: result.result_id,
        exam_id: result.exam_id,
        student_name: result.student_name,
        exam_code: result.exam_code || '(none)',
        score: result.score,
        total: result.total
    });

    try {
        validateResultStructure(result);
        const db = await initDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['results'], 'readwrite');

            transaction.onerror = (event) => reject(new Error('Transaction failed: ' + event.target.error?.message));
            transaction.onabort = (event) => reject(new Error('Transaction aborted: ' + event.target.error?.message));

            const store = transaction.objectStore('results');
            const request = store.put(result);

            request.onerror = (event) => reject(new Error('Failed to save result: ' + event.target.error?.message));
            request.onsuccess = () => {
                console.log('✅ Result saved successfully with key:', request.result);
                resolve(request.result);
            };
        });
    } catch (error) {
        console.error('❌ Error in saveResultToDB:', error);
        throw new Error('Database error: ' + error.message);
    }
}

async function loadResultsFromDB() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['results'], 'readonly');
            const store = transaction.objectStore('results');
            const request = store.getAll();
            request.onerror = (event) => reject(event.target.error);
            request.onsuccess = () => resolve(request.result || []);
        });
    } catch (error) {
        console.error('❌ Error in loadResultsFromDB:', error);
        return [];
    }
}

function validateResultStructure(result) {
    const required = ['result_id', 'exam_id', 'student_name', 'score', 'total', 'percentage'];
    const missing = required.filter(field => result[field] === undefined || result[field] === null);
    if (missing.length > 0) throw new Error(`Missing required fields: ${missing.join(', ')}`);
    if (!result.answers || typeof result.answers !== 'object') throw new Error('Invalid answers object');
    if (!result.exam_details || typeof result.exam_details !== 'object') throw new Error('Invalid exam_details object');
    return true;
}

// ═══════════════════════════════════════════════════════════
//  USERS (unchanged)
// ═══════════════════════════════════════════════════════════

async function saveUserToDB(user) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.put(user);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getUserByPhone(phone) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.get(phone);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function getAllTeachersFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const all = request.result || [];
            // Return both teacher and form_teacher
            const teachers = all.filter(u => u.role === 'teacher' || u.role === 'form_teacher');
            resolve(teachers);
        };
    });
}

async function getFormTeachersFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('role');
        const request = index.getAll('form_teacher');
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}


async function deleteUserFromDB(phone) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readwrite');
        const store = transaction.objectStore('users');
        const request = store.delete(phone);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// Password hashing (SHA-256) - FIXED for http://192.168.x.x LAN
async function hashPassword(password) {
    try {
        if (window.isSecureContext && window.crypto && window.crypto.subtle) {
            const encoder = new TextEncoder();
            const data = encoder.encode(password);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        throw new Error('Not secure context');
    } catch (e) {
        console.warn('Using fallback hash for LAN HTTP');
        let h = 0;
        for (let i = 0; i < password.length; i++) {
            const ch = password.charCodeAt(i);
            h = ((h << 5) - h) + ch;
            h = h & h;
        }
        let hex = Math.abs(h).toString(16).padStart(8,'0');
        let out = '';
        while (out.length < 64) {
            out += hex;
            hex = Math.abs(h * 31 + out.length).toString(16);
        }
        return out.substring(0, 64);
    }
}

function getDeviceId() {
    let id = localStorage.getItem('cbt_device_id');
    if (!id) {
        id = 'cbt_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);
        localStorage.setItem('cbt_device_id', id);
    }
    return id;
}

function normaliseExamCode(code) {
    if (!code) return null;
    return code.trim().toUpperCase().replace(/\s+/g, '');
}

async function ensureLocalDeviceRegistered() {
    try {
        const deviceId = getDeviceId();
        const existing = await getLocalDeviceFromDB();
        if (existing) {
            console.log('Local device already registered:', deviceId);
            return existing;
        }
        const device = {
            device_id: deviceId,
            platform: navigator.platform || 'browser',
            user_agent: navigator.userAgent,
            role_claimed: null,
            status: 'pending',
            created_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
        };
        await saveDeviceToDB(device);
        console.log('Local device registered:', deviceId);
        if (window.LanDevice && window.LanDevice.register) {
            try { await window.LanDevice.register(); } catch(e) { console.warn('LAN register failed offline:', e.message); }
        }
        return device;
    } catch (e) {
        console.error('ensureLocalDeviceRegistered error:', e);
        return null;
    }
}


// ═══════════════════════════════════════════════════════════
//  ARCHIVES (unchanged)
// ═══════════════════════════════════════════════════════════

async function saveArchiveToDB(archive) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exam_archives'], 'readwrite');
        const store = transaction.objectStore('exam_archives');
        const request = store.put(archive);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllArchivesFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exam_archives'], 'readonly');
        const store = transaction.objectStore('exam_archives');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function getArchiveById(archiveId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exam_archives'], 'readonly');
        const store = transaction.objectStore('exam_archives');
        const request = store.get(archiveId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function deleteArchiveFromDB(archiveId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['exam_archives'], 'readwrite');
        const store = transaction.objectStore('exam_archives');
        const request = store.delete(archiveId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  STUDENTS  (NEW v12)
// ═══════════════════════════════════════════════════════════

async function saveStudentToDB(student) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        const request = store.put(student);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getStudentByExamCode(examCode) {
    if (!examCode) return null;
    const normalised = normaliseExamCode(examCode);
    if (!normalised) return null;

    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const index = store.index('exam_code');
        const request = index.get(normalised);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function getStudentById(studentId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const request = store.get(studentId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function loadStudentsByClassAndYear(classCode, academicYear) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const index = store.index('class_year');
        const request = index.getAll([classCode, academicYear]);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function loadStudentsByYear(academicYear) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const index = store.index('academic_year');
        const request = index.getAll(academicYear);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function loadStudentsByRegistrar(teacherPhone) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const index = store.index('registered_by');
        const request = index.getAll(teacherPhone);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function loadAllStudentsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readonly');
        const store = transaction.objectStore('students');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function deleteStudentFromDB(studentId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['students'], 'readwrite');
        const store = transaction.objectStore('students');
        const request = store.delete(studentId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  CLASSES  (NEW v12)
// ═══════════════════════════════════════════════════════════

async function saveClassToDB(cls) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['classes'], 'readwrite');
        const store = transaction.objectStore('classes');
        const request = store.put(cls);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllClassesFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['classes'], 'readonly');
        const store = transaction.objectStore('classes');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const list = request.result || [];
            list.sort((a, b) => (a.order || 0) - (b.order || 0));
            resolve(list);
        };
    });
}

async function getClassByCode(code) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['classes'], 'readonly');
        const store = transaction.objectStore('classes');
        const index = store.index('code');
        const request = index.get(code);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

async function deleteClassFromDB(classId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['classes'], 'readwrite');
        const store = transaction.objectStore('classes');
        const request = store.delete(classId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  ARMS  (NEW v12)
// ═══════════════════════════════════════════════════════════

async function saveArmToDB(arm) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['arms'], 'readwrite');
        const store = transaction.objectStore('arms');
        const request = store.put(arm);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllArmsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['arms'], 'readonly');
        const store = transaction.objectStore('arms');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const list = request.result || [];
            list.sort((a, b) => (a.order || 0) - (b.order || 0));
            resolve(list);
        };
    });
}

async function deleteArmFromDB(armId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['arms'], 'readwrite');
        const store = transaction.objectStore('arms');
        const request = store.delete(armId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  DEPARTMENTS  (NEW v12)
// ═══════════════════════════════════════════════════════════

async function saveDepartmentToDB(dept) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['departments'], 'readwrite');
        const store = transaction.objectStore('departments');
        const request = store.put(dept);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllDepartmentsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['departments'], 'readonly');
        const store = transaction.objectStore('departments');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const list = request.result || [];
            list.sort((a, b) => (a.order || 0) - (b.order || 0));
            resolve(list);
        };
    });
}

async function deleteDepartmentFromDB(departmentId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['departments'], 'readwrite');
        const store = transaction.objectStore('departments');
        const request = store.delete(departmentId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  FORM TEACHER ASSIGNMENTS  (NEW v12)
// ═══════════════════════════════════════════════════════════

async function saveFormTeacherAssignmentToDB(assignment) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['form_teacher_assignments'], 'readwrite');
        const store = transaction.objectStore('form_teacher_assignments');
        const request = store.put(assignment);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllFormTeacherAssignmentsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['form_teacher_assignments'], 'readonly');
        const store = transaction.objectStore('form_teacher_assignments');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function loadFormTeacherAssignmentsByPhone(teacherPhone) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['form_teacher_assignments'], 'readonly');
        const store = transaction.objectStore('form_teacher_assignments');
        const index = store.index('teacher_phone');
        const request = index.getAll(teacherPhone);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function deleteFormTeacherAssignmentFromDB(assignmentId) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['form_teacher_assignments'], 'readwrite');
        const store = transaction.objectStore('form_teacher_assignments');
        const request = store.delete(assignmentId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

// ═══════════════════════════════════════════════════════════
//  ACADEMIC YEARS  (NEW v12)
// ═══════════════════════════════════════════════════════════

async function saveAcademicYearToDB(ay) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['academic_years'], 'readwrite');
        const store = transaction.objectStore('academic_years');
        const request = store.put(ay);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllAcademicYearsFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['academic_years'], 'readonly');
        const store = transaction.objectStore('academic_years');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function getCurrentAcademicYearFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['academic_years'], 'readonly');
        const store = transaction.objectStore('academic_years');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result.find(year => year.is_current) || null);
    });
}

async function setCurrentAcademicYearInDB(yearId) {
    // Clear is_current from all, then set on the target
    const all = await loadAllAcademicYearsFromDB();
    for (const y of all) {
        y.is_current = (y.year_id === yearId);
        await saveAcademicYearToDB(y);
    }
    return true;
}

// ═══════════════════════════════════════════════════════════
//  DEVICE REGISTRY  (NEW v12 — reserved for Phase 3)
// ═══════════════════════════════════════════════════════════

async function saveDeviceToDB(device) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['device_registry'], 'readwrite');
        const store = transaction.objectStore('device_registry');
        const request = store.put(device);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function loadAllDevicesFromDB() {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['device_registry'], 'readonly');
        const store = transaction.objectStore('device_registry');
        const request = store.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function getLocalDeviceFromDB() {
    const deviceId = localStorage.getItem('cbt_device_id');
    if (!deviceId) return null;
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['device_registry'], 'readonly');
        const store = transaction.objectStore('device_registry');
        const request = store.get(deviceId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || null);
    });
}

// ═══════════════════════════════════════════════════════════
//  SEEDING (called once on first run)
// ═══════════════════════════════════════════════════════════

async function seedDefaultsIfEmpty() {
    try {
        // Classes
        const existingClasses = await loadAllClassesFromDB();
        if (existingClasses.length === 0) {
            console.log('🌱 Seeding default classes...');
            for (const c of SCHOOL_CONFIG.defaultClasses) {
                await saveClassToDB({
                    class_id: `cls_${c.code.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    name: c.name,
                    code: c.code,
                    level: c.level,
                    order: c.order,
                    created_at: new Date().toISOString(),
                });
            }
        }

        // Arms
        const existingArms = await loadAllArmsFromDB();
        if (existingArms.length === 0) {
            console.log('🌱 Seeding default arms...');
            for (const a of SCHOOL_CONFIG.defaultArms) {
                await saveArmToDB({
                    arm_id: `arm_${a.label.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    label: a.label,
                    order: a.order,
                    created_at: new Date().toISOString(),
                });
            }
        }

        // Departments
        const existingDepts = await loadAllDepartmentsFromDB();
        if (existingDepts.length === 0) {
            console.log('🌱 Seeding default departments...');
            for (const d of SCHOOL_CONFIG.defaultDepartments) {
                await saveDepartmentToDB({
                    department_id: `dept_${d.name.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    name: d.name,
                    order: d.order,
                    created_at: new Date().toISOString(),
                });
            }
        }

        // Academic Year
        const existingYears = await loadAllAcademicYearsFromDB();
        if (existingYears.length === 0) {
            console.log('🌱 Seeding current academic year...');
            await saveAcademicYearToDB({
                year_id: SCHOOL_CONFIG.academicYear,
                label: SCHOOL_CONFIG.academicYear,
                is_current: true,
                started_at: new Date().toISOString(),
                closed_at: null,
            });
        }

        console.log('✅ Seeding complete');
    } catch (err) {
        console.error('❌ Seeding error:', err);
    }
}

// ═══════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════

window.initDB                          = initDB;

// Exams
window.saveExamToDB                    = saveExamToDB;
window.loadAllExamsFromDB              = loadAllExamsFromDB;
window.loadExamsByCreator              = loadExamsByCreator;
window.deleteExamFromDB                = deleteExamFromDB;
window.deleteAllExamsFromDB            = deleteAllExamsFromDB;

// Results
window.saveResultToDB                  = saveResultToDB;
window.loadResultsFromDB               = loadResultsFromDB;
window.validateResultStructure         = validateResultStructure;

// Users
window.saveUserToDB                    = saveUserToDB;
window.getUserByPhone                  = getUserByPhone;
window.getAllTeachersFromDB            = getAllTeachersFromDB;
window.deleteUserFromDB                = deleteUserFromDB;
window.getFormTeachersFromDB           = getFormTeachersFromDB;
window.hashPassword                    = hashPassword;

// Archives
window.saveArchiveToDB                 = saveArchiveToDB;
window.loadAllArchivesFromDB           = loadAllArchivesFromDB;
window.getArchiveById                  = getArchiveById;
window.deleteArchiveFromDB             = deleteArchiveFromDB;

// Students (NEW)
window.saveStudentToDB                 = saveStudentToDB;
window.getStudentByExamCode            = getStudentByExamCode;
window.getStudentById                  = getStudentById;
window.loadStudentsByClassAndYear      = loadStudentsByClassAndYear;
window.loadStudentsByYear              = loadStudentsByYear;
window.loadStudentsByRegistrar         = loadStudentsByRegistrar;
window.loadAllStudentsFromDB           = loadAllStudentsFromDB;
window.deleteStudentFromDB             = deleteStudentFromDB;

// Classes (NEW)
window.saveClassToDB                   = saveClassToDB;
window.loadAllClassesFromDB            = loadAllClassesFromDB;
window.getClassByCode                  = getClassByCode;
window.deleteClassFromDB               = deleteClassFromDB;

// Arms (NEW)
window.saveArmToDB                     = saveArmToDB;
window.loadAllArmsFromDB               = loadAllArmsFromDB;
window.deleteArmFromDB                 = deleteArmFromDB;

// Departments (NEW)
window.saveDepartmentToDB              = saveDepartmentToDB;
window.loadAllDepartmentsFromDB        = loadAllDepartmentsFromDB;
window.deleteDepartmentFromDB          = deleteDepartmentFromDB;

// Form Teacher Assignments (NEW)
window.saveFormTeacherAssignmentToDB   = saveFormTeacherAssignmentToDB;
window.loadAllFormTeacherAssignmentsFromDB = loadAllFormTeacherAssignmentsFromDB;
window.loadFormTeacherAssignmentsByPhone   = loadFormTeacherAssignmentsByPhone;
window.deleteFormTeacherAssignmentFromDB   = deleteFormTeacherAssignmentFromDB;

// Academic Years (NEW)
window.saveAcademicYearToDB            = saveAcademicYearToDB;
window.loadAllAcademicYearsFromDB      = loadAllAcademicYearsFromDB;
window.getCurrentAcademicYearFromDB    = getCurrentAcademicYearFromDB;
window.setCurrentAcademicYearInDB      = setCurrentAcademicYearInDB;

// Device Registry (NEW — Phase 3)
window.saveDeviceToDB                  = saveDeviceToDB;
window.loadAllDevicesFromDB            = loadAllDevicesFromDB;
window.getLocalDeviceFromDB            = getLocalDeviceFromDB;

// Seeding
window.seedDefaultsIfEmpty             = seedDefaultsIfEmpty;
window.ensureLocalDeviceRegistered     = ensureLocalDeviceRegistered;
window.getDeviceId                       = getDeviceId;
window.normaliseExamCode                 = normaliseExamCode;

console.log('✅ storage.js v13 loaded');