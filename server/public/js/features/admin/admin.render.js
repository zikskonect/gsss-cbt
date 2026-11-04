// www/js/features/admin/admin.render.js
// ═══════════════════════════════════════════════════════════
//  Admin setup page — tabbed UI for classes, arms,
//  departments, form teacher assignments, academic year,
//  and device registry.
// ═══════════════════════════════════════════════════════════


// ─── Tab switch ────────────────────────────────────────────
async function switchAdminTab(tabId) {
    state.adminTab = tabId;

    // Ensure required data is loaded
    if (tabId === 'classes'     && (!state.classes || state.classes.length === 0))                     state.classes = await loadAllClassesFromDB();
    if (tabId === 'arms'        && (!state.arms || state.arms.length === 0))                           state.arms = await loadAllArmsFromDB();
    if (tabId === 'departments' && (!state.departments || state.departments.length === 0))             state.departments = await loadAllDepartmentsFromDB();
    
    // 👇 FIXED: Fetch form teachers from server + local fallback
    if (tabId === 'assignments') {
        if (!state.formTeacherAssignments || state.formTeacherAssignments.length === 0) {
            state.formTeacherAssignments = await loadAllFormTeacherAssignmentsFromDB();
        }
        // Try server first
        try {
            if (window.LanIntegration && LAN_CONFIG.enabled && LanApi.loadToken()) {
                const res = await LanIntegration.getFormTeachers();
                if (res.ok && res.data && (res.data.teachers || res.data.users)) {
                    state.formTeachers = res.data.teachers || res.data.users || [];
                } else {
                    throw new Error('Server returned no teachers');
                }
            } else {
                throw new Error('No token, using local');
            }
        } catch (e) {
            console.warn('Loading form teachers from local DB (offline):', e.message);
            // Fallback: Load from IndexedDB users store where role = form_teacher
            try {
                const db = await initDB();
                const tx = db.transaction(['users'], 'readonly');
                const store = tx.objectStore('users');
                const allUsers = await new Promise((resolve, reject) => {
                    const req = store.getAll();
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => reject(req.error);
                });
                // Filter for form_teacher role
                state.formTeachers = allUsers.filter(u => u.role === 'form_teacher' || u.role === 'teacher');
                console.log('✅ Loaded', state.formTeachers.length, 'teachers from local DB');
            } catch (localErr) {
                console.error('Local teacher load failed:', localErr);
                state.formTeachers = [];
            }
        }
    }
    
    if (tabId === 'year'        && (!state.academicYears || state.academicYears.length === 0))         { state.academicYears = await loadAllAcademicYearsFromDB(); state.currentAcademicYear = await getCurrentAcademicYearFromDB(); }
    if (tabId === 'devices') { await refreshAdminDevices(); return; }

    render();
}

// ─── PANELS ────────────────────────────────────────────────

function renderAdminClassesPanel() {
    const classes = state.classes || [];

    const rows = classes.length === 0
        ? `<tr><td colspan="5" class="px-4 py-12 text-center text-gray-500">No classes yet. Add one above.</td></tr>`
        : classes.map(c => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 font-semibold text-gray-800">${c.name}</td>
                <td class="px-4 py-3 font-mono text-sm text-purple-700">${c.code}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${c.level || '—'}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${new Date(c.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="handleDeleteClass('${c.class_id}')"
                            class="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    return `
        <div class="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5 text-purple-600"></i> Add a Class
            </h3>
            <form onsubmit="handleAddClass(event)" class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input id="new-class-name" type="text" placeholder="Display name (e.g. SS 1)"
                       class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required />
                <input id="new-class-code" type="text" placeholder="Code (e.g. SS1)"
                       class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono uppercase" required />
                <input id="new-class-level" type="text" placeholder="Level (e.g. SS)"
                       class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 uppercase" />
                <button type="submit"
                        class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Class
                </button>
            </form>
            <p class="text-xs text-gray-500 mt-2">Code must be letters/numbers only — it goes into every exam code, e.g. <code>GSS/<strong>SS1</strong>/002</code>.</p>
        </div>

        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 border-b"><h3 class="font-bold text-gray-800">Registered Classes (${classes.length})</h3></div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Code</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Level</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Created</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAdminArmsPanel() {
    const arms = state.arms || [];

    const chips = arms.length === 0
        ? `<p class="text-gray-500 text-sm">No arms yet. Add one above.</p>`
        : arms.map(a => `
            <div class="inline-flex items-center gap-2 bg-purple-100 text-purple-800 px-3 py-2 rounded-lg mr-2 mb-2">
                <span class="font-bold">${a.label}</span>
                <button onclick="handleDeleteArm('${a.arm_id}')" class="text-purple-600 hover:text-red-600 transition-colors" title="Delete">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        `).join('');

    return `
        <div class="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5 text-purple-600"></i> Add an Arm
            </h3>
            <form onsubmit="handleAddArm(event)" class="flex flex-col sm:flex-row gap-3">
                <input id="new-arm-label" type="text" placeholder="e.g. A, B, GOLD" maxlength="3"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono uppercase" required />
                <button type="submit"
                        class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Arm
                </button>
            </form>
            <p class="text-xs text-gray-500 mt-2">Arms are streams within a class, e.g. SS 1 <strong>A</strong>, SS 1 <strong>B</strong>.</p>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-4 md:p-6">
            <h3 class="font-bold text-gray-800 mb-4">Registered Arms (${arms.length})</h3>
            <div>${chips}</div>
        </div>
    `;
}

function renderAdminDepartmentsPanel() {
    const depts = state.departments || [];

    const rows = depts.length === 0
        ? `<tr><td colspan="3" class="px-4 py-12 text-center text-gray-500">No departments yet.</td></tr>`
        : depts.map(d => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 font-semibold text-gray-800">${d.name}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${new Date(d.created_at).toLocaleDateString()}</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="handleDeleteDepartment('${d.department_id}')"
                            class="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    return `
        <div class="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-5 h-5 text-purple-600"></i> Add a Department
            </h3>
            <form onsubmit="handleAddDepartment(event)" class="flex flex-col sm:flex-row gap-3">
                <input id="new-department-name" type="text" placeholder="e.g. Science, Arts, Business, Trade" maxlength="40"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required />
                <button type="submit"
                        class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Department
                </button>
            </form>
        </div>

        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 border-b"><h3 class="font-bold text-gray-800">Registered Departments (${depts.length})</h3></div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Name</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Created</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAdminAssignmentsPanel() {
    const classes = state.classes || [];
    const arms = state.arms || [];
    const assignments = state.formTeacherAssignments || [];
    const teachers = state.formTeachers || []; // 👈 NEW: We load this in switchAdminTab
    const currentYear = state.currentAcademicYear?.label || SCHOOL_CONFIG.academicYear;

    const classOptions = classes.map(c => `<option value="${c.class_id}">${c.name}</option>`).join('');
    const armOptions   = arms.map(a => `<option value="${a.label}">${a.label}</option>`).join('');
    
    // Generate teacher options - FIXED to handle both server and local formats
    const teacherOptions = teachers.length === 0
        ? `<option value="">No form teachers yet - Register a teacher first</option>`
        : `<option value="">Select a teacher...</option>` + 
          teachers.map(t => {
            const phone = t.phone_number || t.phone || '';
            const name = t.name || 'Unknown';
            return `<option value="${phone}" data-name="${name}">${name} (${phone})</option>`;
          }).join('');

    const rows = assignments.length === 0
        ? `<tr><td colspan="6" class="px-4 py-12 text-center text-gray-500">No form teachers assigned yet.</td></tr>`
        : assignments.map(a => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 font-semibold text-gray-800">${a.class_name}</td>
                <td class="px-4 py-3 font-mono text-purple-700">${a.arm}</td>
                <td class="px-4 py-3 text-sm">${a.teacher_name}</td>
                <td class="px-4 py-3 text-sm text-gray-600">${a.teacher_phone}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${a.academic_year}</td>
                <td class="px-4 py-3 text-right">
                    <button onclick="handleRemoveAssignment('${a.assignment_id}')"
                            class="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Remove">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    return `
        <div class="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="user-plus" class="w-5 h-5 text-purple-600"></i> Assign a Form Teacher
            </h3>
            <form onsubmit="handleAddAssignment(event)" class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <select id="assign-class" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
                    <option value="">Class…</option>
                    ${classOptions}
                </select>
                <select id="assign-arm" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required>
                    <option value="">Arm…</option>
                    ${armOptions}
                </select>
                
                <!-- 👇 NEW: Teacher Dropdown -->
                <select id="assign-teacher" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500" required ${teachers.length === 0 ? 'disabled' : ''}>
                    ${teacherOptions}
                </select>
                
                <button type="submit" ${teachers.length === 0 ? 'disabled' : ''}
                        class="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="check" class="w-4 h-4"></i> Assign
                </button>
            </form>
            <p class="text-xs text-gray-500 mt-2">
                Academic year: <strong>${currentYear}</strong>. One form teacher per class+arm per year.
                ${teachers.length === 0 ? '<br><span class="text-red-500 font-bold mt-1 block">You must register a Form Teacher account first (Home -> Form Teacher -> Register).</span>' : ''}
            </p>
        </div>

        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 border-b"><h3 class="font-bold text-gray-800">Current Assignments (${assignments.length})</h3></div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Class</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Arm</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Teacher</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Phone</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Year</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAdminYearPanel() {
    const years = state.academicYears || [];
    const current = state.currentAcademicYear;

    const rows = years.length === 0
        ? `<tr><td colspan="4" class="px-4 py-12 text-center text-gray-500">No academic years yet.</td></tr>`
        : years.sort((a,b) => (b.year_id || '').localeCompare(a.year_id || '')).map(y => `
            <tr class="border-b hover:bg-gray-50 ${y.is_current ? 'bg-green-50' : ''}">
                <td class="px-4 py-3 font-mono font-semibold ${y.is_current ? 'text-green-700' : 'text-gray-800'}">${y.label}</td>
                <td class="px-4 py-3 text-sm">
                    ${y.is_current
                        ? `<span class="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">CURRENT</span>`
                        : `<span class="text-gray-500">closed</span>`}
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">
                    ${y.started_at ? new Date(y.started_at).toLocaleDateString() : '—'}
                </td>
                <td class="px-4 py-3 text-right">
                    ${!y.is_current
                        ? `<button onclick="handleStartAcademicYear('${y.year_id}')"
                                   class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-semibold transition-colors">
                                Start this year
                           </button>`
                        : `<span class="text-green-600 font-semibold text-sm">Active</span>`}
                </td>
            </tr>
        `).join('');

    return `
        <div class="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-lg">
            <div class="flex items-start gap-3">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="font-semibold text-amber-800">Starting a new academic year is a big action</p>
                    <p class="text-sm text-amber-700 mt-1">
                        All active students in the previous year will be <strong>archived</strong>.
                        Students are NOT auto-promoted — each form teacher must re-register their class,
                        and every student gets a new exam code.
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="calendar-plus" class="w-5 h-5 text-purple-600"></i> Add an Academic Year
            </h3>
            <form onsubmit="handleAddAcademicYear(event)" class="flex flex-col sm:flex-row gap-3">
                <input id="new-academic-year" type="text" placeholder="e.g. 2026/2027" pattern="\\d{4}[/\\-]\\d{4}"
                       class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono" required />
                <button type="submit"
                        class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i> Add Year
                </button>
            </form>
            <p class="text-xs text-gray-500 mt-2">Format: <code>YYYY/YYYY</code>. Adding a year doesn't switch to it — use "Start this year" below.</p>
        </div>

        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 class="font-bold text-gray-800">Academic Years (${years.length})</h3>
                <span class="text-sm text-gray-600">Current: <strong>${current?.label || '—'}</strong></span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Year</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Started</th>
                            <th class="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

function renderAdminDevicesPanel() {
    const devices = state.devices || [];

    const rows = devices.length === 0
        ? `<tr><td colspan="5" class="px-4 py-12 text-center text-gray-500">No devices registered yet.</td></tr>`
        : devices.map(d => `
            <tr class="border-b hover:bg-gray-50">
                <td class="px-4 py-3 font-mono text-xs text-gray-700">${d.device_id}</td>
                <td class="px-4 py-3 text-sm">${d.platform || '—'}</td>
                <td class="px-4 py-3 text-sm">${d.role_claimed || '—'}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 rounded-full text-xs font-bold
                        ${d.status === 'approved' ? 'bg-green-100 text-green-700' :
                          d.status === 'blocked'  ? 'bg-red-100 text-red-700' :
                                                    'bg-yellow-100 text-yellow-700'}">
                        ${d.status || 'pending'}
                    </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">${d.last_seen ? new Date(d.last_seen).toLocaleString() : '—'}</td>
            </tr>
        `).join('');

    return `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-start gap-3">
                <i data-lucide="info" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"></i>
                <div>
                    <p class="font-semibold text-blue-800">LAN device management (coming in Phase 3)</p>
                    <p class="text-sm text-blue-700 mt-1">
                        When the LAN server is online, every device that connects will appear here.
                        You'll approve or block devices, and see live status.
                    </p>
                </div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-lg overflow-hidden">
            <div class="px-4 py-3 bg-gray-50 border-b"><h3 class="font-bold text-gray-800">Registered Devices (${devices.length})</h3></div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Device ID</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Platform</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Role</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Last seen</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>
    `;
}

// Exports
window.switchAdminTab         = switchAdminTab;

console.log('✅ admin.render.js loaded');