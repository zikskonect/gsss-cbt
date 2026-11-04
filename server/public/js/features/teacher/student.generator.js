// www/js/features/teacher/student.generator.js - MISSING FUNCTION - Creates student record + exam code
// This file provides generateStudentRecord() that handleRegisterStudent() calls

/**
 * Generate student record with auto exam code
 * Exam code format: GSS/SS1/001, GSS/SS1A/002 etc
 * Serial never reused
 */
async function generateStudentRecord({ name, classId, className, classCode, arm, departmentId, departmentName, academicYear, registeredBy }) {
    if (!name || !classCode || !academicYear) {
        throw new Error('Missing required fields for student record');
    }

    // The server allocates the authoritative serial. This is only a preview
    // for offline/local mode, so include all years because exam codes are
    // globally unique and must never be reused.
    let existing = [];
    try {
        if (window.loadAllStudentsFromDB) {
            const all = await loadAllStudentsFromDB() || [];
            existing = all.filter(s => s.class_code === classCode);
        } else if (window.loadStudentsByClassAndYear) {
            existing = await loadStudentsByClassAndYear(classCode, academicYear) || [];
        }
    } catch (e) {
        console.warn('Could not load existing students, starting from 1', e);
        existing = [];
    }

    const schoolCode = window.SCHOOL_CONFIG?.schoolCode || 'GSS';
    const existingCodes = new Set(
        existing
            .map(student => normaliseExamCode(student.exam_code || ''))
            .filter(Boolean)
    );
    const serials = existing
        .map(student => parseInt((student.exam_code || '').split('/').pop(), 10))
        .filter(Number.isInteger);
    let nextSerial = serials.length ? Math.max(...serials) + 1 : 1;
    let examCode = `${schoolCode}/${classCode}/${String(nextSerial).padStart(3, '0')}`;
    while (existingCodes.has(normaliseExamCode(examCode))) {
        nextSerial += 1;
        examCode = `${schoolCode}/${classCode}/${String(nextSerial).padStart(3, '0')}`;
    }

    const normalisedCode = window.normaliseExamCode ? normaliseExamCode(examCode) : examCode.toUpperCase().replace(/\s+/g, '');

    const now = new Date().toISOString();

    const student = {
        student_id: `stu_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: name.trim(),
        exam_code: normalisedCode,
        class_id: classId || classCode,
        class_name: className || classCode,
        class_code: classCode,
        arm: arm || '',
        department_id: departmentId || null,
        department_name: departmentName || null,
        academic_year: academicYear,
        registered_by: registeredBy || null,
        registered_at: now,
        status: 'active',
        // Extra fields for future
        created_at: now,
        updated_at: now
    };

    console.log(`✅ Generated student: ${student.name} → ${student.exam_code}`);
    return student;
}

/**
 * Load form teacher students for active assignment
 */
async function loadFormTeacherStudents() {
    try {
        const active = window.state?.activeAssignment;
        if (!active) {
            console.warn('No active assignment for loading students');
            window.state.myStudents = [];
            return [];
        }

        let students = [];
        if (window.loadStudentsByClassAndYear) {
            students = await loadStudentsByClassAndYear(active.class_code, active.academic_year) || [];
            students = students.filter(student => student.arm === active.arm);
        }

        // Sort by exam code
        students.sort((a, b) => {
            const aNum = parseInt((a.exam_code || '').split('/').pop() || '0');
            const bNum = parseInt((b.exam_code || '').split('/').pop() || '0');
            return aNum - bNum;
        });

        window.state.myStudents = students;
        console.log(`✅ Loaded ${students.length} students for ${active.class_code}`);
        return students;
    } catch (e) {
        console.error('loadFormTeacherStudents error:', e);
        window.state.myStudents = [];
        return [];
    }
}

function studentCentralPayload(student, active) {
    return {
        name: student.name,
        class_code: active.class_code,
        arm: active.arm,
        academic_year: active.academic_year,
        department_id: student.department_id || null,
        department_name: student.department_name || null,
    };
}

async function saveStudentToCentralOrQueue(student, active) {
    const payload = studentCentralPayload(student, active);
    if (window.LanApi && window.LAN_CONFIG?.enabled && navigator.onLine) {
        if (window.LanSync?.list && window.LanSync?.remove) {
            const queued = await LanSync.list();
            for (const entry of queued) {
                if (entry.kind === 'student.create' &&
                    entry.payload?.local_student_id === student.student_id) {
                    await LanSync.remove(entry.id);
                }
            }
        }
        const response = await LanApi.post('/students', payload);
        if (response.ok && response.data?.student) {
            await deleteStudentFromDB(student.student_id);
            let syncedStudent = response.data.student;
            if (student.status && student.status !== 'active') {
                const statusResponse = await LanApi.patch(
                    '/students/' + encodeURIComponent(syncedStudent.student_id),
                    { status: student.status }
                );
                if (!statusResponse.ok || !statusResponse.data?.student) {
                    throw new Error(statusResponse.error?.message || `Could not sync ${student.name} status`);
                }
                syncedStudent = statusResponse.data.student;
            }
            await saveStudentToDB(syncedStudent);
            return { source: 'central', student: syncedStudent };
        }
        if (!['network', 'timeout'].includes(response.error?.code)) {
            throw new Error(response.error?.message || `Could not sync ${student.name}`);
        }
    }

    if (!window.LanSync) {
        return { source: 'local', student };
    }

    const queuedCreates = await LanSync.list();
    if (!queuedCreates.some(entry =>
        entry.kind === 'student.create' &&
        entry.payload?.local_student_id === student.student_id
    )) {
        await LanSync.enqueue('student.create', {
            ...payload,
            local_student_id: student.student_id,
            status: student.status || 'active',
        });
    }
    return { source: 'queued', student };
}

async function updateStudentOnCentralOrQueue(student, updates) {
    if (!student.student_id || !student.serial) {
        return { source: 'local', student };
    }

    if (window.LanApi && window.LAN_CONFIG?.enabled && navigator.onLine) {
        const response = await LanApi.patch(
            '/students/' + encodeURIComponent(student.student_id),
            updates
        );
        if (response.ok && response.data?.student) {
            await saveStudentToDB(response.data.student);
            return { source: 'central', student: response.data.student };
        }
        if (!['network', 'timeout'].includes(response.error?.code)) {
            throw new Error(response.error?.message || `Could not update ${student.name}`);
        }
    }

    if (window.LanSync) {
        const queuedUpdates = await LanSync.list();
        const duplicate = queuedUpdates.some(entry =>
            entry.kind === 'student.update' &&
            entry.payload?.student_id === student.student_id &&
            JSON.stringify(entry.payload?.updates || {}) === JSON.stringify(updates)
        );
        if (!duplicate) {
            await LanSync.enqueue('student.update', {
                student_id: student.student_id,
                updates,
            });
        }
        return { source: 'queued', student };
    }
    return { source: 'local', student };
}

/**
 * Push locally registered students to the central server and refresh this class.
 * The server remains authoritative for IDs and exam codes.
 */
async function syncStudentsToExamOffice() {
    const active = window.state?.activeAssignment;
    if (!active) throw new Error('No active class selected');
    if (!window.LanApi || !window.LAN_CONFIG?.enabled) {
        throw new Error('Central server sync is unavailable');
    }

    const localStudents = (await loadStudentsByClassAndYear(active.class_code, active.academic_year))
        .filter(student => student.arm === active.arm);
    const serverResponse = await LanApi.get(
        '/students?class_code=' + encodeURIComponent(active.class_code) +
        '&year=' + encodeURIComponent(active.academic_year)
    );
    if (!serverResponse.ok) {
        throw new Error(serverResponse.error?.message || 'Could not reach Exam Office');
    }

    const serverStudents = serverResponse.data?.students || [];
    const knownIds = new Set(serverStudents.map(student => student.student_id));
    const knownCodes = new Set(serverStudents.map(student => student.exam_code));
    const pending = localStudents.filter(student =>
        !knownIds.has(student.student_id) && !knownCodes.has(student.exam_code)
    );

    let uploaded = 0;
    for (const student of pending) {
        const result = await saveStudentToCentralOrQueue(student, active);
        if (result.source === 'central') {
            knownIds.add(result.student.student_id);
            knownCodes.add(result.student.exam_code);
            uploaded++;
        }
    }

    for (const student of localStudents) {
        const central = serverStudents.find(item =>
            item.student_id === student.student_id || item.exam_code === student.exam_code
        );
        if (!central) continue;
        if (central.student_id !== student.student_id) {
            await deleteStudentFromDB(student.student_id);
            await saveStudentToDB(central);
            continue;
        }
        if (central.status === student.status) continue;

        const result = await updateStudentOnCentralOrQueue(student, {
            status: student.status,
        });
        if (result.source === 'central') uploaded++;
    }

    const refreshed = await LanHarvest.syncStudentsDown(active.class_code, active.academic_year);
    if (!refreshed?.ok) {
        throw new Error(refreshed?.error?.message || 'Students uploaded but refresh failed');
    }

    await loadFormTeacherStudents();
    return { uploaded, total: refreshed.total || serverStudents.length + uploaded };
}

window.generateStudentRecord = generateStudentRecord;
window.loadFormTeacherStudents = loadFormTeacherStudents;
window.saveStudentToCentralOrQueue = saveStudentToCentralOrQueue;
window.updateStudentOnCentralOrQueue = updateStudentOnCentralOrQueue;
window.syncStudentsToExamOffice = syncStudentsToExamOffice;

console.log('✅ student.generator.js loaded - student registration and Exam Office sync');
