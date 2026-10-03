// storage.js - Complete version with enhanced error handling

const DB_NAME = 'TestulatorDB';
const DB_VERSION = 11;

// Database initialization
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

            // Create exams store
            if (!db.objectStoreNames.contains('exams')) {
                console.log('📝 Creating exams store');
                const examsStore = db.createObjectStore('exams', { keyPath: 'exam_id' });
                examsStore.createIndex('created_by', 'created_by', { unique: false });
            }

            // Create results store
            if (!db.objectStoreNames.contains('results')) {
                console.log('📝 Creating results store');
                const resultsStore = db.createObjectStore('results', { keyPath: 'result_id' });
                resultsStore.createIndex('exam_id', 'exam_id', { unique: false });
                resultsStore.createIndex('student_class', 'student_class', { unique: false });
            }

            // Create users store
            if (!db.objectStoreNames.contains('users')) {
                console.log('📝 Creating users store');
                const usersStore = db.createObjectStore('users', { keyPath: 'phone_number' });
                usersStore.createIndex('role', 'role', { unique: false });
            }
            
            if (!db.objectStoreNames.contains('exam_archives')) {
                console.log('📝 Creating exam_archives store');
                const archivesStore = db.createObjectStore('exam_archives', { keyPath: 'archive_id' });
                archivesStore.createIndex('exported_at', 'exported_at', { unique: false });
            }
            
            console.log('✅ Database schema updated');
        };
        
        request.onblocked = () => {
            console.error('❌ IndexedDB blocked');
            reject(new Error('Database operation blocked'));
        };
    });
}

// Exam operations
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

// Results operations - ENHANCED VERSION
async function saveResultToDB(result) {
    console.log('💾 saveResultToDB called with:', {
        result_id: result.result_id,
        exam_id: result.exam_id,
        student_name: result.student_name,
        score: result.score,
        total: result.total
    });
    
    try {
        // Validate result structure first
        validateResultStructure(result);
        
        const db = await initDB();
        console.log('✅ Database connection established for saving result');
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['results'], 'readwrite');
            
            transaction.onerror = (event) => {
                console.error('❌ Transaction error:', event.target.error);
                reject(new Error('Transaction failed: ' + event.target.error?.message));
            };
            
            transaction.onabort = (event) => {
                console.error('❌ Transaction aborted:', event.target.error);
                reject(new Error('Transaction aborted: ' + event.target.error?.message));
            };
            
            transaction.oncomplete = () => {
                console.log('✅ Transaction completed successfully');
            };
            
            const store = transaction.objectStore('results');
            const request = store.put(result);

            request.onerror = (event) => {
                console.error('❌ Store.put error:', event.target.error);
                reject(new Error('Failed to save result: ' + event.target.error?.message));
            };
            
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
    console.log('📊 Loading all results from DB...');
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['results'], 'readonly');
            const store = transaction.objectStore('results');
            const request = store.getAll();

            request.onerror = (event) => {
                console.error('❌ Error loading results:', event.target.error);
                reject(event.target.error);
            };
            
            request.onsuccess = () => {
                console.log('✅ Results loaded:', request.result?.length || 0, 'results');
                resolve(request.result || []);
            };
        });
    } catch (error) {
        console.error('❌ Error in loadResultsFromDB:', error);
        return [];
    }
}

// User operations
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
        const index = store.index('role');
        const request = index.getAll('teacher');

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

// Password hashing (simple implementation)
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Validate result structure before saving
function validateResultStructure(result) {
    console.log('🔍 Validating result structure...');
    
    const required = ['result_id', 'exam_id', 'student_name', 'score', 'total', 'percentage'];
    const missing = required.filter(field => result[field] === undefined || result[field] === null);
    
    if (missing.length > 0) {
        console.error('❌ Missing required fields:', missing);
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (!result.answers || typeof result.answers !== 'object') {
        console.error('❌ Invalid answers object:', result.answers);
        throw new Error('Invalid answers object');
    }
    
    if (!result.exam_details || typeof result.exam_details !== 'object') {
        console.error('❌ Invalid exam_details object:', result.exam_details);
        throw new Error('Invalid exam_details object');
    }
    
    console.log('✅ Result structure validation passed');
    return true;
}

// ========================================
// EXAM ARCHIVE OPERATIONS
// ========================================

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

// Make functions available globally
window.initDB = initDB;
window.saveExamToDB = saveExamToDB;
window.loadAllExamsFromDB = loadAllExamsFromDB;
window.loadExamsByCreator = loadExamsByCreator;
window.deleteExamFromDB = deleteExamFromDB;
window.saveResultToDB = saveResultToDB;
window.loadResultsFromDB = loadResultsFromDB;
window.saveUserToDB = saveUserToDB;
window.getUserByPhone = getUserByPhone;
window.getAllTeachersFromDB = getAllTeachersFromDB;
window.deleteUserFromDB = deleteUserFromDB;
window.hashPassword = hashPassword;
window.validateResultStructure = validateResultStructure;
window.saveArchiveToDB = saveArchiveToDB;
window.loadAllArchivesFromDB = loadAllArchivesFromDB;
window.getArchiveById = getArchiveById;
window.deleteArchiveFromDB = deleteArchiveFromDB;
window.deleteAllExamsFromDB = deleteAllExamsFromDB;

console.log('✅ storage.js loaded - All functions exported');