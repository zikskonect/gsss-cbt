// student-id.js - Exam Code Generation & Parsing
// ═══════════════════════════════════════════════════════════
//  Exam code format:  {SCHOOL_CODE}/{CLASS_CODE}/{SERIAL}
//  Example:           GSS/SS1/002
//
//  Serial rules:
//    - Sequential per class, per academic year
//    - Zero-padded to 3 digits (002, 015, 104)
//    - Never reused once assigned
//    - New number every academic year (student gets a fresh code)
// ═══════════════════════════════════════════════════════════

const STUDENT_ID = {
    PAD: 3,                    // 002, 099, 100, 999, 1000...
    SEPARATOR: '/',
};

/**
 * Build an exam code from parts.
 * @param {string} schoolCode  e.g. 'GSS'
 * @param {string} classCode   e.g. 'SS1'
 * @param {number} serial      e.g. 2
 * @returns {string}           e.g. 'GSS/SS1/002'
 */
function buildExamCode(schoolCode, classCode, serial) {
    if (!schoolCode || !classCode || !serial) return null;
    const padded = String(serial).padStart(STUDENT_ID.PAD, '0');
    return `${schoolCode}${STUDENT_ID.SEPARATOR}${classCode}${STUDENT_ID.SEPARATOR}${padded}`;
}

/**
 * Parse an exam code back into parts.
 * @param {string} code  e.g. 'GSS/SS1/002'
 * @returns {object|null} { schoolCode, classCode, serial, raw }
 */
function parseExamCode(code) {
    if (!code || typeof code !== 'string') return null;
    const parts = code.trim().split(STUDENT_ID.SEPARATOR);
    if (parts.length !== 3) return null;
    const [schoolCode, classCode, serialStr] = parts;
    const serial = parseInt(serialStr, 10);
    if (isNaN(serial)) return null;
    return { schoolCode, classCode, serial, raw: code.trim() };
}

/**
 * Normalise user-entered code (case-insensitive, tolerant of spaces).
 * 'gss / ss1 / 2'  →  'GSS/SS1/002'
 */
function normaliseExamCode(input) {
    if (!input) return null;
    const cleaned = input.toString().trim().toUpperCase().replace(/\s+/g, '');
    const parsed = parseExamCode(cleaned);
    if (!parsed) return null;
    return buildExamCode(parsed.schoolCode, parsed.classCode, parsed.serial);
}

/**
 * Get the next serial for a given class + academic year.
 * Reads from IndexedDB via loadStudentsByClassAndYear().
 * @returns {Promise<number>}  e.g. 3
 */
async function getNextSerial(classCode, academicYear) {
    try {
        const students = await loadStudentsByClassAndYear(classCode, academicYear);
        if (!students || students.length === 0) return 1;

        // Serial never reused — find max, add 1
        let maxSerial = 0;
        for (const s of students) {
            if (typeof s.serial === 'number' && s.serial > maxSerial) {
                maxSerial = s.serial;
            }
        }
        return maxSerial + 1;
    } catch (err) {
        console.error('getNextSerial error:', err);
        return 1;
    }
}

/**
 * Generate a full student record (without student_id / registered_by — caller fills those).
 * @param {object} opts  { name, classId, className, classCode, arm, departmentId, departmentName, academicYear, registeredBy }
 * @returns {Promise<object>}  A student object ready to save
 */
async function generateStudentRecord(opts) {
    const {
        name,
        classId,
        className,
        classCode,
        arm,
        departmentId,
        departmentName,
        academicYear,
        registeredBy,
    } = opts;

    if (!name || !classCode || !academicYear) {
        throw new Error('Missing required fields for student record');
    }

    const serial = await getNextSerial(classCode, academicYear);
    const examCode = buildExamCode(SCHOOL_CONFIG.schoolCode, classCode, serial);

    return {
        student_id:        `stu_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        exam_code:         examCode,
        name:              name.trim(),
        class_id:          classId || null,
        class_name:        className || null,
        class_code:        classCode,
        arm:               arm || null,
        department_id:     departmentId || null,
        department_name:   departmentName || null,
        academic_year:     academicYear,
        serial:            serial,
        registered_by:     registeredBy || null,
        registered_at:     new Date().toISOString(),
        status:            'active',   // active | removed | transferred
    };
}

/**
 * Yearly rollover: mark all active students of a given year as archived,
 * and return a summary. Does NOT auto-create new students — admin/form teacher
 * re-registers them, so they get fresh codes.
 * @param {string} oldYear
 * @returns {Promise<{ archived: number }>}
 */
async function archiveAcademicYear(oldYear) {
    const students = await loadStudentsByYear(oldYear);
    let archived = 0;
    for (const s of students) {
        if (s.status === 'active') {
            s.status = 'archived';
            s.archived_at = new Date().toISOString();
            await saveStudentToDB(s);
            archived++;
        }
    }
    return { archived };
}

// Export
window.buildExamCode         = buildExamCode;
window.parseExamCode         = parseExamCode;
window.normaliseExamCode     = normaliseExamCode;
window.getNextSerial         = getNextSerial;
window.generateStudentRecord = generateStudentRecord;
window.archiveAcademicYear   = archiveAcademicYear;
window.STUDENT_ID            = STUDENT_ID;

console.log('✅ student-id.js loaded');