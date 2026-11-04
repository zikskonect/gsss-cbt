// www/js/features/form-teacher/register-student.render.js - NEW PAGE
// Dedicated Register Student page for Form Teachers
// Works with existing handleRegisterStudent + storage

function renderRegisterStudentPage(state) {
    const userName = state.user?.name || 'Form Teacher';
    const assignments = state.myAssignments || [];
    const active = state.activeAssignment;
    const students = state.myStudents || [];
    const academicYear = state.currentAcademicYear?.year_id || active?.academic_year || SCHOOL_CONFIG.academicYear;

    if (assignments.length === 0) {
        return `
        <div class="min-h-screen bg-gray-50 p-4 md:p-6">
            <div class="max-w-3xl mx-auto">
                <button onclick="setPage('teacher')" class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Dashboard
                </button>
                <div class="bg-white rounded-xl shadow-lg p-8 text-center">
                    <div class="w-20 h-20 rounded-full bg-amber-100 mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="clock" class="w-10 h-10 text-amber-600"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-2">No Class Assigned</h2>
                    <p class="text-gray-600">Contact Exam Office to assign you to a class: <strong>${state.user?.phone_number || ''}</strong></p>
                </div>
            </div>
        </div>`;
    }

    // Tabs if multiple classes
    const tabsHtml = assignments.length > 1 ? `
        <div class="bg-white border-b border-gray-200 px-4 md:px-6 overflow-x-auto mb-5">
            <div class="flex gap-1">
                ${assignments.map(a => `
                    <button onclick="switchFormTeacherAssignment('${a.assignment_id}')"
                        class="flex items-center gap-2 px-4 py-3 border-b-2 font-semibold whitespace-nowrap transition-colors
                        ${active?.assignment_id === a.assignment_id ? 'border-teal-600 text-teal-700 bg-teal-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
                        <i data-lucide="users" class="w-4 h-4"></i>
                        ${a.class_name} ${a.arm}
                        <span class="text-xs bg-gray-100 px-2 py-0.5 rounded-full">${a.academic_year}</span>
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
    <div class="min-h-screen bg-gray-50">
        <div class="max-w-6xl mx-auto p-4 md:p-6">
            <button onclick="setPage('teacher')" class="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm font-medium">
                <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Teacher Dashboard
            </button>

            <div class="bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl shadow-lg p-5 md:p-6 text-white mb-5">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                            <i data-lucide="user-plus" class="w-7 h-7"></i>
                        </div>
                        <div>
                            <h1 class="text-xl md:text-2xl font-bold">Register Students - ${classLabel}</h1>
                            <p class="text-teal-100 text-sm mt-1">${academicYear} • ${students.length} students • Next Code: <code class="bg-white/20 px-2 py-1 rounded font-mono">${nextCodePreview}</code></p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button id="sync-students-btn" onclick="handleSyncStudentsToExamOffice()" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold flex items-center gap-2">
                            <i data-lucide="refresh-cw" class="w-4 h-4"></i> Sync with Exam Office
                        </button>
                        <button onclick="document.getElementById('bulkImportSection').classList.toggle('hidden')" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold flex items-center gap-2">
                            <i data-lucide="upload" class="w-4 h-4"></i> Bulk Import
                        </button>
                    </div>
                </div>
            </div>

            ${tabsHtml}

            <div class="grid lg:grid-cols-3 gap-5">
                <!-- LEFT: Register Form -->
                <div class="lg:col-span-1 space-y-5">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <span class="w-8 h-8 bg-teal-100 text-teal-700 rounded-lg flex items-center justify-center">👤</span>
                            Register Single Student
                        </h3>
                        <form onsubmit="handleRegisterStudent(event)" class="space-y-4">
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Full Name *</label>
                                <input id="reg-student-name" type="text" placeholder="e.g. John Doe"
                                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none text-sm"
                                    required />
                            </div>
                            <div>
                                <label class="block text-xs font-semibold text-gray-700 mb-1.5">Department (optional)</label>
                                <select id="reg-student-dept" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm bg-white">
                                    <option value="">Select Department (optional)</option>
                                    ${deptOptions}
                                </select>
                            </div>
                            <div class="bg-teal-50 border border-teal-200 rounded-lg p-3">
                                <div class="flex items-center gap-2 text-xs text-teal-800">
                                    <i data-lucide="info" class="w-4 h-4"></i>
                                    <span>Exam code auto-generated:</span>
                                </div>
                                <code class="block mt-2 font-mono text-sm bg-white px-3 py-2 rounded border font-bold text-teal-700">${nextCodePreview}</code>
                            </div>
                            <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors">
                                <i data-lucide="plus-circle" class="w-5 h-5"></i>
                                Register & Generate Code
                            </button>
                        </form>
                        <p class="text-xs text-gray-500 mt-3 text-center">Code format: ${SCHOOL_CONFIG.schoolCode}/CLASS/001<br>Never reused, even if student removed</p>
                    </div>

                    <!-- Bulk Import Section -->
                    <div id="bulkImportSection" class="hidden bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                        <h3 class="font-bold text-gray-800 flex items-center gap-2 mb-3">
                            <span class="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">📄</span>
                            Bulk Import CSV
                        </h3>
                        <p class="text-xs text-gray-600 mb-3">CSV format: <code class="bg-gray-100 px-1 py-0.5 rounded">name</code> column only. One name per row.</p>
                        <input type="file" id="bulkStudentFile" accept=".csv" class="w-full text-sm border border-gray-300 rounded-lg p-2 mb-3" onchange="handleBulkStudentPreview(event)" />
                        <div id="bulkPreview" class="text-xs text-gray-600 max-h-32 overflow-y-auto mb-3 hidden"></div>
                        <button onclick="handleBulkStudentImport()" class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold text-sm">Import All</button>
                        <button onclick="downloadStudentTemplate()" class="w-full mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg text-xs font-medium">Download Template</button>
                    </div>

                    <!-- Search -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div class="relative">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-3.5 text-gray-400"></i>
                            <input id="studentSearchInput" type="text" placeholder="Search students..." 
                                class="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none text-sm"
                                onkeyup="filterStudentList()" />
                        </div>
                        <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
                            <span id="studentCountDisplay">${students.length} students</span>
                            <span class="flex items-center gap-1"><span class="w-2 h-2 bg-green-500 rounded-full"></span> Active</span>
                        </div>
                    </div>
                </div>

                <!-- RIGHT: Student List -->
                <div class="lg:col-span-2">
                    <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div class="p-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 class="font-bold text-gray-800 flex items-center gap-2">
                                <i data-lucide="users" class="w-5 h-5 text-teal-600"></i>
                                Students in ${classLabel} • ${academicYear}
                            </h3>
                            <div class="flex items-center gap-2">
                                <button onclick="exportStudentList()" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium flex items-center gap-1">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i> Export CSV
                                </button>
                                <button onclick="printStudentList()" class="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium flex items-center gap-1">
                                    <i data-lucide="printer" class="w-3.5 h-3.5"></i> Print
                                </button>
                            </div>
                        </div>
                        <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table class="w-full">
                                <thead class="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                                    <tr class="text-xs font-bold text-gray-600 uppercase">
                                        <th class="text-left px-4 py-3">#</th>
                                        <th class="text-left px-4 py-3">Exam Code</th>
                                        <th class="text-left px-4 py-3">Name</th>
                                        <th class="text-left px-4 py-3">Dept</th>
                                        <th class="text-center px-4 py-3">Status</th>
                                        <th class="text-right px-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="studentTableBody" class="divide-y divide-gray-100">
                                    ${students.length === 0 ? `
                                        <tr><td colspan="6" class="px-4 py-16 text-center">
                                            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">📭</div>
                                            <p class="font-semibold text-gray-700">No students yet</p>
                                            <p class="text-sm text-gray-500 mt-1">Register first student → Exam code auto-generated</p>
                                        </td></tr>
                                    ` : students.map((s, idx) => `
                                        <tr class="hover:bg-gray-50 student-row" data-name="${(s.name||'').toLowerCase()}" data-code="${(s.exam_code||'').toLowerCase()}">
                                            <td class="px-4 py-3 text-sm text-gray-500">${idx+1}</td>
                                            <td class="px-4 py-3"><code class="bg-teal-50 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-full text-xs font-mono font-bold">${s.exam_code}</code></td>
                                            <td class="px-4 py-3 font-medium text-gray-900 text-sm">${s.name}</td>
                                            <td class="px-4 py-3 text-sm text-gray-600">${s.department_name || '—'}</td>
                                            <td class="px-4 py-3 text-center">
                                                ${s.status === 'active' ? '<span class="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded-full text-xs font-semibold">active</span>' : `<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">${s.status}</span>`}
                                            </td>
                                            <td class="px-4 py-3 text-right">
                                                <div class="flex items-center justify-end gap-1">
                                                    <button onclick="handleViewStudentResults('${s.student_id}')" class="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg" title="View Results"><i data-lucide="bar-chart-2" class="w-4 h-4"></i></button>
                                                    <button onclick="copyExamCode('${s.exam_code}')" class="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg" title="Copy Code"><i data-lucide="copy" class="w-4 h-4"></i></button>
                                                    <button onclick="handleRemoveStudent('${s.student_id}')" class="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg" title="Remove"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                                </div>
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        <div class="bg-gray-50 px-4 py-3 border-t text-xs text-gray-500 flex items-center justify-between">
                            <span>Total: <strong class="text-gray-800">${students.length}</strong> • Codes never reused</span>
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
            await saveStudentToDB(student);
            await saveStudentToCentralOrQueue(student, a);
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
