// www/js/features/form-teacher/form-teacher.actions.js
// ═══════════════════════════════════════════════════════════
//  Form teacher — register / remove / list students.
//  Owns: exam-code generation, student status changes,
//        viewing student results (read-only).
// ═══════════════════════════════════════════════════════════

/**
 * Register a new student in the currently active assignment.
 * Generates an exam code automatically.
 * @param {object} opts { name, department_id, department_name }
 */
async function handleRegisterStudent(event) {
    event.preventDefault();

    if (!state.activeAssignment) {
        showAlert('No active class selected', 'error');
        return;
    }

    const name              = document.getElementById('reg-student-name')?.value.trim() || '';
    const departmentId      = document.getElementById('reg-student-dept')?.value || '';
    const departmentName    = document.getElementById('reg-student-dept')?.selectedOptions[0]?.text || null;

    if (!name) {
        showAlert('Please enter the student name', 'error');
        return;
    }

    const a = state.activeAssignment;

    try {
        // Generate the student record (which fetches the next serial)
        const student = await generateStudentRecord({
            name,
            classId:       a.class_id,
            className:     a.class_name,
            classCode:     a.class_code,
            arm:           a.arm,
            departmentId:  departmentId || null,
            departmentName: departmentName || null,
            academicYear:  a.academic_year,
            registeredBy:  state.user?.phone_number || null,
        });

        const centralResult = await saveStudentToCentralOrQueue(student, a);
        // The central server assigns the authoritative exam code. Only save
        // the locally generated record when central sync is unavailable or
        // queued, so IndexedDB cannot reject a stale guessed code.
        if (centralResult.source !== 'central') {
            await saveStudentToDB(student);
        }

        showAlert(
            centralResult.source === 'central'
                ? `✅ ${student.name} registered and synced\nExam Code: ${centralResult.student.exam_code}`
                : `✅ ${student.name} registered locally\nExam Code: ${student.exam_code}\nSync queued for Exam Office`,
            'success',
            6000
        );

        // Clear form
        const nameEl = document.getElementById('reg-student-name');
        if (nameEl) nameEl.value = '';
        const deptEl = document.getElementById('reg-student-dept');
        if (deptEl) deptEl.selectedIndex = 0;

        // Reload list and re-render
        await loadFormTeacherStudents();
        render();
    } catch (err) {
        console.error('handleRegisterStudent error:', err);
        showAlert('Failed to register student: ' + err.message, 'error', 6000);
    }
}

async function handleSyncStudentsToExamOffice() {
    const button = document.getElementById('sync-students-btn');
    if (button) {
        button.disabled = true;
        button.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Syncing...';
        if (window.lucide) lucide.createIcons();
    }

    try {
        const result = await syncStudentsToExamOffice();
        showAlert(
            result.uploaded
                ? `✅ Synced ${result.uploaded} student${result.uploaded === 1 ? '' : 's'} with Exam Office`
                : '✅ Student list is already up to date with Exam Office',
            'success',
            5000
        );
        render();
    } catch (err) {
        console.error('handleSyncStudentsToExamOffice error:', err);
        showAlert('Sync failed: ' + err.message, 'error', 6000);
    } finally {
        const currentButton = document.getElementById('sync-students-btn');
        if (currentButton) {
            currentButton.disabled = false;
            currentButton.innerHTML = '<i data-lucide="refresh-cw" class="w-4 h-4"></i> Sync with Exam Office';
            if (window.lucide) lucide.createIcons();
        }
    }
}

/**
 * Remove a student — marks status as 'removed' and preserves the serial.
 * Exam code is NEVER reused.
 */
async function handleRemoveStudent(studentId) {
    try {
        const student = await getStudentById(studentId);
        if (!student) {
            showAlert('Student not found', 'error');
            return;
        }

        if (!confirm(
            `Remove ${student.name}?\n\n` +
            `Exam code: ${student.exam_code}\n\n` +
            `The code will NOT be reused — it stays reserved forever.`
        )) return;

        student.status = 'removed';
        student.removed_at = new Date().toISOString();
        student.removed_by = state.user?.phone_number || null;

        await saveStudentToDB(student);
        await updateStudentOnCentralOrQueue(student, { status: 'removed' });

        showAlert(`✅ ${student.name} removed`, 'success', 3000);

        await loadFormTeacherStudents();
        render();
    } catch (err) {
        console.error('handleRemoveStudent error:', err);
        showAlert('Failed to remove student: ' + err.message, 'error');
    }
}

/**
 * Mark a student as transferred (same as removed but different status label).
 * Useful for record-keeping.
 */
async function handleTransferStudent(studentId) {
    try {
        const student = await getStudentById(studentId);
        if (!student) return;

        if (!confirm(`Mark ${student.name} as transferred out?`)) return;

        student.status = 'transferred';
        student.transferred_at = new Date().toISOString();
        student.transferred_by = state.user?.phone_number || null;

        await saveStudentToDB(student);
        await updateStudentOnCentralOrQueue(student, { status: 'transferred' });

        showAlert(`✅ ${student.name} marked as transferred`, 'success', 3000);

        await loadFormTeacherStudents();
        render();
    } catch (err) {
        console.error('handleTransferStudent error:', err);
        showAlert('Failed to update student: ' + err.message, 'error');
    }
}

/**
 * View a student's results (read-only).
 * Opens a modal listing their results across all exams.
 */
async function handleViewStudentResults(studentId) {
    try {
        const student = await getStudentById(studentId);
        if (!student) {
            showAlert('Student not found', 'error');
            return;
        }

        const allResults = await loadResultsFromDB();
        const studentResults = (allResults || []).filter(r =>
            r.exam_code === student.exam_code
        );

        // Sort newest first
        studentResults.sort((a, b) =>
            new Date(b.submitted_at) - new Date(a.submitted_at)
        );

        renderStudentResultsModal(student, studentResults);
    } catch (err) {
        console.error('handleViewStudentResults error:', err);
        showAlert('Failed to load results: ' + err.message, 'error');
    }
}

/**
 * Build the read-only results modal and inject into the DOM.
 * Doesn't participate in main render() — it's a floating overlay.
 */
function renderStudentResultsModal(student, results) {
    const existing = document.getElementById('ft-student-results-modal');
    if (existing) existing.remove();

    const rows = results.length === 0
        ? `<tr><td colspan="4" class="px-4 py-12 text-center text-gray-500">No results yet for this student.</td></tr>`
        : results.map(r => {
            const total = r.total || r.exam_details?.questions?.length || 1;
            const pct   = Math.round((r.score / total) * 100);

            let grade = 'F9', cls = 'bg-red-100 text-red-700';
            if (pct >= 70)      { grade = 'A1'; cls = 'bg-green-100 text-green-700'; }
            else if (pct >= 65) { grade = 'B2'; cls = 'bg-green-100 text-green-700'; }
            else if (pct >= 60) { grade = 'B3'; cls = 'bg-yellow-100 text-yellow-700'; }
            else if (pct >= 55) { grade = 'C4'; cls = 'bg-yellow-100 text-yellow-700'; }
            else if (pct >= 50) { grade = 'C5'; cls = 'bg-yellow-100 text-yellow-700'; }
            else if (pct >= 45) { grade = 'C6'; cls = 'bg-yellow-100 text-yellow-700'; }
            else if (pct >= 40) { grade = 'D7'; cls = 'bg-red-100 text-red-700'; }
            else if (pct >= 35) { grade = 'E8'; cls = 'bg-red-100 text-red-700'; }

            return `
                <tr class="border-b hover:bg-gray-50">
                    <td class="px-4 py-3 font-medium text-gray-800">${r.exam_subject || r.exam_id}</td>
                    <td class="px-4 py-3 text-center font-bold">${r.score}/${total}</td>
                    <td class="px-4 py-3 text-center font-bold text-lg">${pct}%</td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${cls}">${grade}</span>
                    </td>
                </tr>
            `;
        }).join('');

    const modal = document.createElement('div');
    modal.id = 'ft-student-results-modal';
    modal.className = 'fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
            <div class="p-5 border-b bg-gradient-to-r from-purple-50 to-indigo-50 flex items-start justify-between gap-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">${student.name}</h3>
                    <p class="text-sm text-gray-600 mt-1">
                        <span class="font-mono bg-purple-100 text-purple-700 px-2 py-0.5 rounded">${student.exam_code}</span>
                        <span class="ml-3">${student.class_name || student.class_code} ${student.arm || ''}</span>
                    </p>
                    ${student.department_name ? `<p class="text-xs text-gray-500 mt-1">Department: ${student.department_name}</p>` : ''}
                </div>
                <button onclick="closeStudentResultsModal()" class="text-gray-400 hover:text-gray-700 p-1 rounded">
                    <i data-lucide="x" class="w-6 h-6"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto">
                <table class="w-full">
                    <thead class="bg-gray-50 border-b-2 border-gray-200 sticky top-0">
                        <tr>
                            <th class="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Subject / Exam</th>
                            <th class="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Score</th>
                            <th class="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">%</th>
                            <th class="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase">Grade</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="p-4 border-t bg-gray-50 text-right">
                <p class="text-xs text-gray-500 mr-4 inline">Read-only view. Contact the exam office for corrections.</p>
                <button onclick="closeStudentResultsModal()" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-semibold">Close</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
}

function closeStudentResultsModal() {
    const modal = document.getElementById('ft-student-results-modal');
    if (modal) modal.remove();
}

// Exports
window.handleRegisterStudent       = handleRegisterStudent;
window.handleSyncStudentsToExamOffice = handleSyncStudentsToExamOffice;
window.handleRemoveStudent         = handleRemoveStudent;
window.handleTransferStudent       = handleTransferStudent;
window.handleViewStudentResults    = handleViewStudentResults;
window.renderStudentResultsModal   = renderStudentResultsModal;
window.closeStudentResultsModal    = closeStudentResultsModal;

console.log('✅ form-teacher.actions.js loaded');