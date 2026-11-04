// www/js/features/form-teacher/register-student.render.js - REDESIGNED
// Dedicated Register Student page for Form Teachers
// Works with existing handleRegisterStudent + storage
// NOTE: All logic, IDs, handlers and window exports are unchanged. Only markup/styling redesigned.

// Display-only helpers (do not alter stored data)
function _regEsc(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function _regInitials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function renderRegisterStudentPage(state) {
    const userName = state.user?.name || 'Form Teacher';
    const assignments = state.myAssignments || [];
    const active = state.activeAssignment;
    const students = state.myStudents || [];
    const academicYear = state.currentAcademicYear?.year_id || active?.academic_year || SCHOOL_CONFIG.academicYear;

    if (assignments.length === 0) {
        return `
        <div class="min-h-screen bg-slate-50 p-4 md:p-6">
            <div class="max-w-xl mx-auto pt-6">
                <button onclick="setPage('teacher')" class="mb-5 inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Dashboard
                </button>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
                    <div class="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 mx-auto mb-5 flex items-center justify-center">
                        <i data-lucide="clock" class="w-9 h-9 text-amber-500"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-slate-800 mb-2">No Class Assigned</h2>
                    <p class="text-slate-500 text-sm leading-relaxed">Contact the Exam Office to assign you to a class:</p>
                    <p class="mt-2 inline-block bg-slate-100 text-slate-800 font-semibold text-sm px-4 py-2 rounded-lg">${_regEsc(state.user?.phone_number || '')}</p>
                </div>
            </div>
        </div>`;
    }

    // Tabs if multiple classes
    const tabsHtml = assignments.length > 1 ? `
        <div class="no-print mb-5 overflow-x-auto">
            <div class="inline-flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                ${assignments.map(a => `
                    <button onclick="switchFormTeacherAssignment('${a.assignment_id}')"
                        class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all
                        ${active?.assignment_id === a.assignment_id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}">
                        <i data-lucide="users" class="w-4 h-4"></i>
                        ${a.class_name} ${a.arm}
                        <span class="text-[10px] bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-full">${a.academic_year}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    ` : '';

    const classLabel = active ? `${active.class_name} ${active.arm}` : 'My Class';
    const nextSerial = students.length + 1;
    const nextCodePreview = `${SCHOOL_CONFIG.schoolCode}/${active?.class_code || 'SS1'}/${String(nextSerial).padStart(3, '0')}`;

    const deptOptions = (state.departments || []).map(d => `<option value="${d.department_id}">${d.name}</option>`).join('');

    return `
    <style>
        @media print {
            .no-print { display: none !important; }
            .print-area { box-shadow: none !important; border: none !important; }
            .print-scroll { max-height: none !important; overflow: visible !important; }
            .print-hide-col { display: none !important; }
        }
        .reg-row .reg-actions { opacity: .55; transition: opacity .15s; }
        .reg-row:hover .reg-actions { opacity: 1; }
        .student-registration-hero {
            position: relative;
            overflow: hidden;
            color: #fff;
            background: linear-gradient(135deg, #0d9488 0%, #0f766e 52%, #065f46 100%);
            border-radius: 1rem;
            box-shadow: 0 10px 24px rgba(15, 118, 110, .2);
        }
        .student-registration-hero .registration-muted {
            color: #ccfbf1;
        }
        .student-registration-hero .registration-panel {
            background: rgba(255, 255, 255, .12);
            border: 1px solid rgba(255, 255, 255, .18);
        }
    </style>

    <div class="min-h-screen bg-slate-50">
        <div class="max-w-6xl mx-auto p-4 md:p-6">

            <button onclick="setPage('teacher')" class="no-print mb-4 inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Teacher Dashboard
            </button>

            <!-- HERO -->
            <div class="no-print student-registration-hero p-5 md:p-7 mb-5">
                <div class="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
                <div class="absolute -left-8 -bottom-12 w-40 h-40 bg-emerald-300/10 rounded-full blur-2xl"></div>

                <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center ring-1 ring-white/20">
                            <i data-lucide="user-plus" class="w-7 h-7"></i>
                        </div>
                        <div>
                            <p class="registration-muted text-xs font-semibold uppercase tracking-wider">Student Registration</p>
                            <h1 class="text-xl md:text-2xl font-bold leading-tight">${classLabel}</h1>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button id="sync-students-btn" onclick="handleSyncStudentsToExamOffice()"
                            class="px-4 py-2.5 bg-white/15 hover:bg-white/25 ring-1 ring-white/20 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i> Sync with Exam Office
                        </button>
                        <button onclick="document.getElementById('bulkImportSection').classList.toggle('hidden')"
                            class="px-4 py-2.5 bg-white/15 hover:bg-white/25 ring-1 ring-white/20 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors">
                            <i data-lucide="upload" class="w-4 h-4"></i> Bulk Import
                        </button>
                    </div>
                </div>

                <div class="relative grid grid-cols-3 gap-3 mt-6">
                    <div class="registration-panel rounded-xl px-3 py-3">
                        <p class="registration-muted text-[10px] uppercase tracking-wider font-semibold">Students</p>
                        <p class="text-xl md:text-2xl font-bold mt-0.5">${students.length}</p>
                    </div>
                    <div class="registration-panel rounded-xl px-3 py-3">
                        <p class="registration-muted text-[10px] uppercase tracking-wider font-semibold">Academic Year</p>
                        <p class="text-base md:text-xl font-bold mt-0.5 truncate">${academicYear}</p>
                    </div>
                    <div class="registration-panel rounded-xl px-3 py-3">
                        <p class="registration-muted text-[10px] uppercase tracking-wider font-semibold">Next Code</p>
                        <p class="text-xs md:text-sm font-mono font-bold mt-1.5 truncate"><code>${nextCodePreview}</code></p>
                    </div>
                </div>
            </div>

            ${tabsHtml}

            <div class="grid lg:grid-cols-3 gap-5 items-start">
                <!-- LEFT: Register Form -->
                <div class="no-print lg:col-span-1 space-y-5 lg:sticky lg:top-4">

                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div class="flex items-center gap-3 mb-5">
                            <span class="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center ring-1 ring-teal-100">
                                <i data-lucide="user-plus" class="w-5 h-5"></i>
                            </span>
                            <div>
                                <h3 class="font-bold text-slate-800 leading-tight">Register Single Student</h3>
                                <p class="text-xs text-slate-500">Add one student to ${classLabel}</p>
                            </div>
                        </div>

                        <form onsubmit="handleRegisterStudent(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Full Name <span class="text-red-500">*</span></label>
                                <input id="reg-student-name" type="text" placeholder="e.g. John Doe"
                                    class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm transition"
                                    required />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-slate-700 mb-1.5">Department <span class="text-slate-400 font-normal">(optional)</span></label>
                                <select id="reg-student-dept" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm transition">
                                    <option value="">Select Department (optional)</option>
                                    ${deptOptions}
                                </select>
                            </div>

                            <div class="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-3.5">
                                <div class="flex items-center gap-2 text-xs font-medium text-teal-800">
                                    <i data-lucide="sparkles" class="w-4 h-4"></i>
                                    <span>Exam code auto-generated</span>
                                </div>
                                <code class="block mt-2 font-mono text-sm bg-white px-3 py-2.5 rounded-lg border border-teal-100 font-bold text-teal-700 text-center tracking-wide">${nextCodePreview}</code>
                            </div>

                            <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 active:scale-[.99] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm transition-all">
                                <i data-lucide="plus-circle" class="w-5 h-5"></i>
                                Register &amp; Generate Code
                            </button>
                        </form>
                        <p class="text-[11px] text-slate-400 mt-3 text-center leading-relaxed">Code format: ${SCHOOL_CONFIG.schoolCode}/CLASS/001<br>Never reused, even if student removed</p>
                    </div>

                    <!-- Bulk Import Section -->
                    <div id="bulkImportSection" class="hidden bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                        <div class="flex items-center gap-3 mb-4">
                            <span class="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center ring-1 ring-blue-100">
                                <i data-lucide="file-spreadsheet" class="w-5 h-5"></i>
                            </span>
                            <div>
                                <h3 class="font-bold text-slate-800 leading-tight">Bulk Import CSV</h3>
                                <p class="text-xs text-slate-500">Add many students at once</p>
                            </div>
                        </div>

                        <p class="text-xs text-slate-600 mb-4 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">CSV format: <code class="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-mono">name</code> column only. One name per row.</p>

                        <div class="space-y-3">
                            <div class="flex items-center gap-2 text-xs font-semibold text-slate-700">
                                <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">1</span> Choose file
                            </div>
                            <input type="file" id="bulkStudentFile" accept=".csv"
                                class="w-full text-sm text-slate-600 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl p-3 bg-slate-50 cursor-pointer transition file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                                onchange="handleBulkStudentPreview(event)" />

                            <div id="bulkPreview" class="text-xs text-slate-600 max-h-32 overflow-y-auto bg-blue-50/50 border border-blue-100 rounded-lg p-3 hidden"></div>

                            <div class="flex items-center gap-2 text-xs font-semibold text-slate-700 pt-1">
                                <span class="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center">2</span> Import
                            </div>
                            <button onclick="handleBulkStudentImport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                                <i data-lucide="check-circle-2" class="w-4 h-4"></i> Import All
                            </button>
                            <button onclick="downloadStudentTemplate()" class="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-2 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-colors">
                                <i data-lucide="download" class="w-3.5 h-3.5"></i> Download Template
                            </button>
                        </div>
                    </div>

                    <!-- Search -->
                    <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                        <div class="relative">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400"></i>
                            <input id="studentSearchInput" type="text" placeholder="Search by name or code..."
                                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm transition"
                                onkeyup="filterStudentList()" />
                        </div>
                        <div class="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span id="studentCountDisplay" class="font-medium">${students.length} students</span>
                            <span class="flex items-center gap-1.5"><span class="w-2 h-2 bg-green-500 rounded-full"></span> Active</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: Student List -->
                <div class="lg:col-span-2">
                    <div class="print-area bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div class="p-4 md:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 class="font-bold text-slate-800 flex items-center gap-2">
                                <span class="w-9 h-9 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center ring-1 ring-teal-100">
                                    <i data-lucide="users" class="w-5 h-5"></i>
                                </span>
                                <span>
                                    <span class="block leading-tight">Students in ${classLabel}</span>
                                    <span class="block text-xs font-normal text-slate-500">${academicYear}</span>
                                </span>
                            </h3>
                            <div class="no-print flex items-center gap-2">
                                <button onclick="exportStudentList()" class="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV
                                </button>
                                <button onclick="printStudentList()" class="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors">
                                    <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print
                                </button>
                            </div>
                        </div>

                        <div class="print-scroll overflow-x-auto max-h-[640px] overflow-y-auto">
                            <table class="w-full">
                                <thead class="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                    <tr class="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        <th class="text-left px-4 py-3 w-12">#</th>
                                        <th class="text-left px-4 py-3">Student</th>
                                        <th class="text-left px-4 py-3">Exam Code</th>
                                        <th class="text-left px-4 py-3">Dept</th>
                                        <th class="text-center px-4 py-3">Status</th>
                                        <th class="print-hide-col text-right px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="studentTableBody" class="divide-y divide-slate-100">
                                    ${students.length === 0 ? `
                                        <tr><td colspan="6" class="px-4 py-20 text-center">
                                            <div class="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">📭</div>
                                            <p class="font-semibold text-slate-700">No students yet</p>
                                            <p class="text-sm text-slate-500 mt-1">Register first student → Exam code auto-generated</p>
                                        </td></tr>
                                    ` : students.map((s, idx) => `
                                        <tr class="reg-row hover:bg-slate-50/80 student-row transition-colors" data-name="${(s.name||'').toLowerCase()}" data-code="${(s.exam_code||'').toLowerCase()}">
                                            <td class="px-4 py-3 text-xs text-slate-400 font-medium">${idx+1}</td>
                                            <td class="px-4 py-3">
                                                <div class="flex items-center gap-3">
                                                    <span class="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white text-xs font-bold flex items-center justify-center shrink-0">${_regInitials(s.name)}</span>
                                                    <span class="font-semibold text-slate-900 text-sm">${s.name}</span>
                                                </div>
                                            </td>
                                            <td class="px-4 py-3"><code class="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap">${s.exam_code}</code></td>
                                            <td class="px-4 py-3 text-sm text-slate-600">${s.department_name || '—'}</td>
                                            <td class="px-4 py-3 text-center">
                                                ${s.status === 'active' ? '<span class="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-semibold">active</span>' : `<span class="px-2.5 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-medium">${s.status}</span>`}
                                            </td>
                                            <td class="print-hide-col px-4 py-3 text-right">
                                                <div class="reg-actions flex items-center justify-end gap-1">
                                                    <button onclick="handleViewStudentResults('${s.student_id}')" class="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="View Results"><i data-lucide="bar-chart-2" class="w-4 h-4"></i></button>
                                                    <button onclick="copyExamCode('${s.exam_code}')" class="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors" title="Copy Code"><i data-lucide="copy" class="w-4 h-4"></i></button>
                                                    <button onclick="handleRemoveStudent('${s.student_id}')" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors" title="Remove"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>

                        <div class="bg-slate-50 px-4 md:px-5 py-3 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                            <span>Total: <strong class="text-slate-800">${students.length}</strong> • Codes never reused</span>
                            <span class="font-mono">${active?.class_code || ''} • ${academicYear}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

// Helpers for new page
function filterStudentList() {
    const q = (document.getElementById('studentSearchInput')?.value || '').toLowerCase();
    const rows = document.querySelectorAll('.student-row');
    let visible = 0;
    rows.forEach(tr => {
        const name = tr.dataset.name || '';
        const code = tr.dataset.code || '';
        const show = !q || name.includes(q) || code.includes(q);
        tr.style.display = show ? '' : 'none';
        if (show) visible++;
    });
    const display = document.getElementById('studentCountDisplay');
    if (display) display.textContent = q ? `${visible} / ${window.state?.myStudents?.length || 0} students` : `${window.state?.myStudents?.length || 0} students`;
}

function copyExamCode(code) {
    if (!navigator.clipboard?.writeText) {
        if (window.showAlert) showAlert('Copy is not available on this device', 'error');
        return;
    }
    navigator.clipboard.writeText(code).then(() => {
        if (window.showAlert) showAlert(`Copied: ${code}`, 'success', 2000);
    }).catch((err) => {
        console.error('copyExamCode error:', err);
        if (window.showAlert) showAlert('Unable to copy exam code', 'error');
    });
}

function exportStudentList() {
    const students = window.state?.myStudents || [];
    if (!students.length) { if (window.showAlert) showAlert('No students to export', 'info'); return; }
    const headers = ['exam_code', 'name', 'class', 'arm', 'department', 'status'];
    const csvValue = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = students.map(s => [
        s.exam_code,
        s.name,
        s.class_code,
        s.arm,
        s.department_name || '',
        s.status
    ].map(csvValue));
    const csv = [headers.join(','), ...rows.map(r=>r.join(','))].join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students_${window.state?.activeAssignment?.class_code || 'class'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

function printStudentList() {
    window.print();
}

function downloadStudentTemplate() {
    const csv = 'name\nJohn Doe\nJane Smith\nExample Student';
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_template.csv';
    a.click();
    URL.revokeObjectURL(url);
}

let bulkStudentsPreview = [];

function handleBulkStudentPreview(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const lines = e.target.result.split('\n').map(l=>l.trim()).filter(Boolean);
        const header = lines[0].toLowerCase();
        const startIdx = header.includes('name') ? 1 : 0;
        bulkStudentsPreview = lines.slice(startIdx).map(l => l.split(',')[0].replace(/"/g,'').trim()).filter(Boolean);
        const preview = document.getElementById('bulkPreview');
        if (preview) {
            preview.classList.remove('hidden');
            preview.innerHTML = `<strong>Found ${bulkStudentsPreview.length} students:</strong><br>${bulkStudentsPreview.slice(0,10).join('<br>')}${bulkStudentsPreview.length>10 ? `<br>... and ${bulkStudentsPreview.length-10} more` : ''}`;
        }
    };
    reader.readAsText(file);
}

async function handleBulkStudentImport() {
    if (!bulkStudentsPreview.length) {
        if (window.showAlert) showAlert('No students to import - select CSV first', 'error');
        return;
    }
    if (!confirm(`Import ${bulkStudentsPreview.length} students? Codes will be auto-generated.`)) return;

    let imported = 0;
    let failed = 0;
    for (const name of bulkStudentsPreview) {
        try {
            const a = window.state?.activeAssignment;
            const student = await generateStudentRecord({
                name,
                classId: a.class_id,
                className: a.class_name,
                classCode: a.class_code,
                arm: a.arm,
                departmentId: null,
                departmentName: null,
                academicYear: a.academic_year,
                registeredBy: window.state?.user?.phone_number || null,
            });
            const result = await saveStudentToCentralOrQueue(student, a);
            if (result.source !== 'central') {
                await saveStudentToDB(student);
            }
            imported++;
        } catch (err) {
            console.error('Bulk import error', err);
            failed++;
        }
    }

    if (window.showAlert) showAlert(`✅ Imported ${imported} students${failed?` • ${failed} failed`:''}`, 'success', 4000);
    bulkStudentsPreview = [];
    const fileEl = document.getElementById('bulkStudentFile');
    if (fileEl) fileEl.value = '';
    const preview = document.getElementById('bulkPreview');
    if (preview) preview.classList.add('hidden');

    await loadFormTeacherStudents();
    if (window.render) render();
}

function switchFormTeacherAssignment(assignmentId) {
    const assignments = window.state?.myAssignments || [];
    const found = assignments.find(a => a.assignment_id === assignmentId);
    if (found) {
        window.state.activeAssignment = found;
        loadFormTeacherStudents().then(() => { if (window.render) render(); });
    }
}

window.renderRegisterStudentPage = renderRegisterStudentPage;
window.filterStudentList = filterStudentList;
window.copyExamCode = copyExamCode;
window.exportStudentList = exportStudentList;
window.printStudentList = printStudentList;
window.downloadStudentTemplate = downloadStudentTemplate;
window.handleBulkStudentPreview = handleBulkStudentPreview;
window.handleBulkStudentImport = handleBulkStudentImport;
window.switchFormTeacherAssignment = switchFormTeacherAssignment;

console.log('✅ register-student.render.js loaded - Register Student page');