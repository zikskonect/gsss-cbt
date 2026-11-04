// www/js/features/admin/admin.classes.js
// ═══════════════════════════════════════════════════════════
//  Class CRUD — admin only.
//  A "class" is one row of the class list, e.g. { name: 'SS 1', code: 'SS1', level: 'SS' }
// ═══════════════════════════════════════════════════════════

function generateClassId() {
    return `cls_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Add a new class. Fails if `code` already exists.
 * @param {object} opts { name, code, level, order }
 * @returns {Promise<{ok: boolean, cls?: object, error?: string}>}
 */
async function adminAddClass(opts) {
    try {
        const name  = (opts.name || '').trim();
        const code  = (opts.code || '').trim().toUpperCase();
        const level = (opts.level || '').trim().toUpperCase();

        if (!name) return { ok: false, error: 'Class name is required' };
        if (!code) return { ok: false, error: 'Class code is required (e.g. SS1)' };
        if (!/^[A-Z0-9]+$/.test(code)) {
            return { ok: false, error: 'Code must be letters/numbers only (e.g. SS1, JSS2)' };
        }

        const existing = await getClassByCode(code);
        if (existing) return { ok: false, error: `Class code "${code}" already exists` };

        const cls = {
            class_id: generateClassId(),
            name,
            code,
            level: level || null,
            order: typeof opts.order === 'number' ? opts.order : 999,
            created_at: new Date().toISOString(),
        };

        await saveClassToDB(cls);
        return { ok: true, cls };
    } catch (err) {
        console.error('adminAddClass error:', err);
        return { ok: false, error: err.message };
    }
}

/**
 * Update an existing class. Fails if the new code collides with a different class.
 */
async function adminUpdateClass(classId, updates) {
    try {
        const all = await loadAllClassesFromDB();
        const target = all.find(c => c.class_id === classId);
        if (!target) return { ok: false, error: 'Class not found' };

        if (updates.code) {
            const newCode = updates.code.trim().toUpperCase();
            if (!/^[A-Z0-9]+$/.test(newCode)) {
                return { ok: false, error: 'Code must be letters/numbers only' };
            }
            const collision = all.find(c => c.code === newCode && c.class_id !== classId);
            if (collision) return { ok: false, error: `Code "${newCode}" already in use` };
            target.code = newCode;
        }

        if (updates.name)  target.name  = updates.name.trim();
        if (updates.level) target.level = updates.level.trim().toUpperCase();
        if (typeof updates.order === 'number') target.order = updates.order;

        target.updated_at = new Date().toISOString();

        await saveClassToDB(target);
        return { ok: true, cls: target };
    } catch (err) {
        console.error('adminUpdateClass error:', err);
        return { ok: false, error: err.message };
    }
}

/**
 * Delete a class. Refuses if any students or form-teacher assignments reference it.
 */
async function adminDeleteClass(classId) {
    try {
        const all = await loadAllClassesFromDB();
        const target = all.find(c => c.class_id === classId);
        if (!target) return { ok: false, error: 'Class not found' };

        // Check for students in this class (any year)
        const allStudents = await loadAllStudentsFromDB();
        const hasStudents = allStudents.some(s => s.class_code === target.code && s.status === 'active');
        if (hasStudents) {
            return { ok: false, error: `Cannot delete: active students are registered in ${target.name}` };
        }

        // Check for assignments
        const assignments = await loadAllFormTeacherAssignmentsFromDB();
        const hasAssignments = assignments.some(a => a.class_code === target.code);
        if (hasAssignments) {
            return { ok: false, error: `Cannot delete: form teachers are assigned to ${target.name}` };
        }

        await deleteClassFromDB(classId);
        return { ok: true };
    } catch (err) {
        console.error('adminDeleteClass error:', err);
        return { ok: false, error: err.message };
    }
}

/**
 * Reload classes into state and re-render.
 */
async function adminRefreshClasses() {
    state.classes = await loadAllClassesFromDB();
    render();
}

// ─── UI handlers (called from onclick) ────────────────────

async function handleAddClass(event) {
    event.preventDefault();

    const name  = document.getElementById('new-class-name')?.value || '';
    const code  = document.getElementById('new-class-code')?.value || '';
    const level = document.getElementById('new-class-level')?.value || '';

    const result = await adminAddClass({ name, code, level });

    if (!result.ok) {
        showAlert(result.error, 'error');
        return;
    }

    showAlert(`✅ Class "${result.cls.name}" added`, 'success', 3000);

    // Reset the form fields
    const nameEl = document.getElementById('new-class-name');
    const codeEl = document.getElementById('new-class-code');
    if (nameEl) nameEl.value = '';
    if (codeEl) codeEl.value = '';

    await adminRefreshClasses();
}

async function handleDeleteClass(classId) {
    const all = await loadAllClassesFromDB();
    const target = all.find(c => c.class_id === classId);
    if (!target) return;

    if (!confirm(`Delete class "${target.name}" (${target.code})?\n\nThis cannot be undone.`)) return;

    const result = await adminDeleteClass(classId);

    if (!result.ok) {
        showAlert(result.error, 'error', 6000);
        return;
    }

    showAlert(`✅ Class "${target.name}" deleted`, 'success', 3000);
    await adminRefreshClasses();
}

// Exports
window.adminAddClass          = adminAddClass;
window.adminUpdateClass       = adminUpdateClass;
window.adminDeleteClass       = adminDeleteClass;
window.adminRefreshClasses    = adminRefreshClasses;
window.handleAddClass         = handleAddClass;
window.handleDeleteClass      = handleDeleteClass;

console.log('✅ admin.classes.js loaded');