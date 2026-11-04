// www/js/features/admin/admin.assignments.js
// ═══════════════════════════════════════════════════════════
//  Form Teacher Assignment CRUD — admin only.
//
//  An assignment binds a (class + arm + academic year) slot
//  to a named teacher with a phone number.
//
//  The teacher does NOT need to already have a user account
//  to be assigned. When they register later, the assignment
//  is matched by phone number.
// ═══════════════════════════════════════════════════════════

function generateAssignmentId() {
    return `fta_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Assign a form teacher to a class+arm in the current academic year.
 * @param {object} opts {
 *   class_id, class_name, class_code, arm, teacher_name, teacher_phone
 * }
 */
async function adminAssignFormTeacher(opts) {
    try {
        const classCode    = (opts.class_code || '').trim().toUpperCase();
        const arm          = (opts.arm || '').trim().toUpperCase();
        const teacherName  = (opts.teacher_name || '').trim();
        const teacherPhone = (opts.teacher_phone || '').trim();

        if (!classCode) return { ok: false, error: 'Class is required' };
        if (!arm) return { ok: false, error: 'Arm is required' };
        if (!teacherName) return { ok: false, error: 'Teacher name is required' };
        if (!teacherPhone) return { ok: false, error: 'Teacher phone is required' };
        if (!/^[0-9+\-\s]{7,}$/.test(teacherPhone)) {
            return { ok: false, error: 'Phone number looks invalid' };
        }

        const currentYear = opts.academic_year
            || state.currentAcademicYear?.year_id
            || SCHOOL_CONFIG.academicYear;

        // Prevent two form teachers on the same class+arm+year
        const all = await loadAllFormTeacherAssignmentsFromDB();
        const collision = all.find(a =>
            a.class_code === classCode &&
            a.arm === arm &&
            a.academic_year === currentYear
        );
        if (collision) {
            return {
                ok: false,
                error: `Arm ${arm} of ${opts.class_name || classCode} already has a form teacher (${collision.teacher_name}). Remove them first.`
            };
        }

        const assignment = {
            assignment_id:  generateAssignmentId(),
            class_id:       opts.class_id || null,
            class_name:     opts.class_name || classCode,
            class_code:     classCode,
            arm,
            teacher_name:   teacherName,
            teacher_phone:  teacherPhone,
            academic_year:  currentYear,
            assigned_at:    new Date().toISOString(),
            assigned_by:    state.user?.phone_number || 'admin',
        };

        if (window.LanApi && window.LAN_CONFIG?.enabled && window.LanApi.loadToken()) {
            const classesResponse = await LanApi.get('/classes');
            if (!classesResponse.ok) {
                return { ok: false, error: classesResponse.error?.message || 'Could not load central classes' };
            }
            const centralClasses = classesResponse.data?.classes || [];
            if (!centralClasses.some(cls => cls.code === classCode)) {
                const classResponse = await LanApi.post('/classes', {
                    name: opts.class_name || classCode,
                    code: classCode,
                    level: opts.level || null,
                    order: opts.order || 999,
                });
                if (!classResponse.ok && classResponse.error?.code !== 'duplicate_code') {
                    return { ok: false, error: classResponse.error?.message || 'Could not sync class centrally' };
                }
            }

            const armsResponse = await LanApi.get('/arms');
            if (!armsResponse.ok) {
                return { ok: false, error: armsResponse.error?.message || 'Could not load central arms' };
            }
            const centralArms = armsResponse.data?.arms || [];
            if (!centralArms.some(item => item.label === arm)) {
                const armResponse = await LanApi.post('/arms', {
                    label: arm,
                    order: 999,
                });
                if (!armResponse.ok && armResponse.error?.code !== 'duplicate_arm') {
                    return { ok: false, error: armResponse.error?.message || 'Could not sync arm centrally' };
                }
            }

            const response = await LanApi.post('/assignments', assignment);
            if (!response.ok) {
                return { ok: false, error: response.error?.message || 'Could not save assignment centrally' };
            }
            assignment.assignment_id = response.data?.assignment?.assignment_id || assignment.assignment_id;
        }

        await saveFormTeacherAssignmentToDB(assignment);
        return { ok: true, assignment };
    } catch (err) {
        console.error('adminAssignFormTeacher error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminRemoveAssignment(assignmentId) {
    try {
        const all = await loadAllFormTeacherAssignmentsFromDB();
        const target = all.find(a => a.assignment_id === assignmentId);
        if (!target) return { ok: false, error: 'Assignment not found' };

        // Refuse if this arm has active students registered this year
        const students = await loadStudentsByClassAndYear(target.class_code, target.academic_year);
        const activeInArm = students.filter(s => s.arm === target.arm && s.status === 'active');
        if (activeInArm.length > 0) {
            return {
                ok: false,
                error: `Cannot remove: ${activeInArm.length} active student(s) are registered in ${target.class_name} ${target.arm}.`
            };
        }

        await deleteFormTeacherAssignmentFromDB(assignmentId);
        return { ok: true };
    } catch (err) {
        console.error('adminRemoveAssignment error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminRefreshAssignments() {
    state.formTeacherAssignments = await loadAllFormTeacherAssignmentsFromDB();
    render();
}

// ─── UI handlers ───────────────────────────────────────────

async function handleAddAssignment(event) {
    event.preventDefault();

    const classId = document.getElementById('assign-class')?.value || '';
    const arm = document.getElementById('assign-arm')?.value || '';
    
    // 👇 NEW: Pull data from the select element
    const teacherSelect = document.getElementById('assign-teacher');
    const teacherPhone = teacherSelect.value;
    const teacherName = teacherSelect.options[teacherSelect.selectedIndex]?.getAttribute('data-name') || '';

    if (!teacherPhone || !teacherName) {
        showAlert('Please select a valid teacher', 'error');
        return;
    }

    // Resolve the selected class so we can embed class_name + class_code
    const allClasses = await loadAllClassesFromDB();
    const chosenClass = allClasses.find(c => c.class_id === classId);
    if (!chosenClass) {
        showAlert('Please select a valid class', 'error');
        return;
    }

    const result = await adminAssignFormTeacher({
        class_id: chosenClass.class_id,
        class_name: chosenClass.name,
        class_code: chosenClass.code,
        arm,
        teacher_name: teacherName,
        teacher_phone: teacherPhone,
    });

    if (!result.ok) {
        showAlert(result.error, 'error', 6000);
        return;
    }

    showAlert(
        `✅ ${teacherName} assigned as form teacher of ${chosenClass.name} ${arm}`,
        'success',
        4000
    );

    // Clear form
    document.getElementById('assign-teacher').selectedIndex = 0;

    await adminRefreshAssignments();
}

async function handleRemoveAssignment(assignmentId) {
    const all = await loadAllFormTeacherAssignmentsFromDB();
    const target = all.find(a => a.assignment_id === assignmentId);
    if (!target) return;

    if (!confirm(
        `Remove ${target.teacher_name} from ${target.class_name} ${target.arm}?\n\nThis cannot be undone.`
    )) return;

    const result = await adminRemoveAssignment(assignmentId);
    if (!result.ok) {
        showAlert(result.error, 'error', 6000);
        return;
    }

    showAlert(`✅ Assignment removed`, 'success', 3000);
    await adminRefreshAssignments();
}

// Exports
window.adminAssignFormTeacher    = adminAssignFormTeacher;
window.adminRemoveAssignment     = adminRemoveAssignment;
window.adminRefreshAssignments   = adminRefreshAssignments;
window.handleAddAssignment       = handleAddAssignment;
window.handleRemoveAssignment    = handleRemoveAssignment;

console.log('✅ admin.assignments.js loaded');