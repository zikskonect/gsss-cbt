// www/js/features/admin/admin.departments.js
// ═══════════════════════════════════════════════════════════
//  Department CRUD — admin only.
//  Departments are free-form names: Science, Arts, Business, Trade, etc.
// ═══════════════════════════════════════════════════════════

function generateDepartmentId() {
    return `dept_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

async function adminAddDepartment(opts) {
    try {
        const name = (opts.name || '').trim();
        if (!name) return { ok: false, error: 'Department name is required' };
        if (name.length > 40) return { ok: false, error: 'Name too long (max 40)' };

        const all = await loadAllDepartmentsFromDB();
        const collision = all.find(d => d.name.toLowerCase() === name.toLowerCase());
        if (collision) return { ok: false, error: `Department "${name}" already exists` };

        const dept = {
            department_id: generateDepartmentId(),
            name,
            order: typeof opts.order === 'number' ? opts.order : 999,
            created_at: new Date().toISOString(),
        };

        await saveDepartmentToDB(dept);
        return { ok: true, dept };
    } catch (err) {
        console.error('adminAddDepartment error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminDeleteDepartment(departmentId) {
    try {
        const all = await loadAllDepartmentsFromDB();
        const target = all.find(d => d.department_id === departmentId);
        if (!target) return { ok: false, error: 'Department not found' };

        const allStudents = await loadAllStudentsFromDB();
        const inUse = allStudents.some(s => s.department_id === departmentId && s.status === 'active');
        if (inUse) {
            return { ok: false, error: `Cannot delete: active students belong to "${target.name}"` };
        }

        await deleteDepartmentFromDB(departmentId);
        return { ok: true };
    } catch (err) {
        console.error('adminDeleteDepartment error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminRefreshDepartments() {
    state.departments = await loadAllDepartmentsFromDB();
    render();
}

// ─── UI handlers ───────────────────────────────────────────

async function handleAddDepartment(event) {
    event.preventDefault();

    const name = document.getElementById('new-department-name')?.value || '';
    const result = await adminAddDepartment({ name });

    if (!result.ok) {
        showAlert(result.error, 'error');
        return;
    }

    showAlert(`✅ Department "${result.dept.name}" added`, 'success', 3000);
    const el = document.getElementById('new-department-name');
    if (el) el.value = '';

    await adminRefreshDepartments();
}

async function handleDeleteDepartment(departmentId) {
    const all = await loadAllDepartmentsFromDB();
    const target = all.find(d => d.department_id === departmentId);
    if (!target) return;

    if (!confirm(`Delete department "${target.name}"?\n\nThis cannot be undone.`)) return;

    const result = await adminDeleteDepartment(departmentId);
    if (!result.ok) {
        showAlert(result.error, 'error', 6000);
        return;
    }

    showAlert(`✅ Department "${target.name}" deleted`, 'success', 3000);
    await adminRefreshDepartments();
}

// Exports
window.adminAddDepartment       = adminAddDepartment;
window.adminDeleteDepartment    = adminDeleteDepartment;
window.adminRefreshDepartments  = adminRefreshDepartments;
window.handleAddDepartment      = handleAddDepartment;
window.handleDeleteDepartment   = handleDeleteDepartment;

console.log('✅ admin.departments.js loaded');