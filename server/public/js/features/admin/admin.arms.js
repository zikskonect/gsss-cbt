// www/js/features/admin/admin.arms.js
// ═══════════════════════════════════════════════════════════
//  Arm CRUD — admin only.
//  An "arm" is a stream within a class, e.g. 'A', 'B', 'C'.
// ═══════════════════════════════════════════════════════════

function generateArmId() {
    return `arm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

async function adminAddArm(opts) {
    try {
        const label = (opts.label || '').trim().toUpperCase();
        if (!label) return { ok: false, error: 'Arm label is required' };
        if (!/^[A-Z0-9]{1,3}$/.test(label)) {
            return { ok: false, error: 'Arm must be 1–3 letters/numbers (e.g. A, B, GOLD)' };
        }

        const all = await loadAllArmsFromDB();
        const collision = all.find(a => a.label === label);
        if (collision) return { ok: false, error: `Arm "${label}" already exists` };

        const arm = {
            arm_id: generateArmId(),
            label,
            order: typeof opts.order === 'number' ? opts.order : 999,
            created_at: new Date().toISOString(),
        };

        await saveArmToDB(arm);
        return { ok: true, arm };
    } catch (err) {
        console.error('adminAddArm error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminDeleteArm(armId) {
    try {
        const all = await loadAllArmsFromDB();
        const target = all.find(a => a.arm_id === armId);
        if (!target) return { ok: false, error: 'Arm not found' };

        // Block delete if any active student uses this arm
        const allStudents = await loadAllStudentsFromDB();
        const inUse = allStudents.some(s => s.arm === target.label && s.status === 'active');
        if (inUse) {
            return { ok: false, error: `Cannot delete: active students use arm ${target.label}` };
        }

        await deleteArmFromDB(armId);
        return { ok: true };
    } catch (err) {
        console.error('adminDeleteArm error:', err);
        return { ok: false, error: err.message };
    }
}

async function adminRefreshArms() {
    state.arms = await loadAllArmsFromDB();
    render();
}

// ─── UI handlers ───────────────────────────────────────────

async function handleAddArm(event) {
    event.preventDefault();

    const label = document.getElementById('new-arm-label')?.value || '';
    const result = await adminAddArm({ label });

    if (!result.ok) {
        showAlert(result.error, 'error');
        return;
    }

    showAlert(`✅ Arm "${result.arm.label}" added`, 'success', 3000);
    const el = document.getElementById('new-arm-label');
    if (el) el.value = '';

    await adminRefreshArms();
}

async function handleDeleteArm(armId) {
    const all = await loadAllArmsFromDB();
    const target = all.find(a => a.arm_id === armId);
    if (!target) return;

    if (!confirm(`Delete arm "${target.label}"?\n\nThis cannot be undone.`)) return;

    const result = await adminDeleteArm(armId);
    if (!result.ok) {
        showAlert(result.error, 'error', 6000);
        return;
    }

    showAlert(`✅ Arm "${target.label}" deleted`, 'success', 3000);
    await adminRefreshArms();
}

// Exports
window.adminAddArm        = adminAddArm;
window.adminDeleteArm     = adminDeleteArm;
window.adminRefreshArms   = adminRefreshArms;
window.handleAddArm       = handleAddArm;
window.handleDeleteArm    = handleDeleteArm;

console.log('✅ admin.arms.js loaded');