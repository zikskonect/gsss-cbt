// auth.shared.js - Shared auth helpers, logout, guards
// ═══════════════════════════════════════════════════════════
//  Used by all role-specific auth files.
//  Owns: logout(), session checks, role guards.
// ═══════════════════════════════════════════════════════════

/**
 * Reset every session-related field in state. Called by logout()
 * and by any role-specific login before setting new session data.
 */
function clearSessionState() {
    state.isAuthenticated = false;
    state.isTeacher = false;
    state.isExamOffice = false;
    state.isFormTeacher = false;
    state.isStudent = false;

    state.user = null;
    state.studentSession = null;

    // Exam-in-progress state
    state.selectedExam = null;
    state.shuffledExam = null;
    state.studentAnswers = {};
    state.currentQuestionIndex = 0;
    state.timeRemaining = 0;
    state.examStarted = false;
    state.examSubmitted = false;
    state.formSubmitted = false;

    // Editing state
    state.editingExamId = null;
    state.editingQuestionId = null;
    state.currentExamData = null;

    // Form teacher state
    state.myAssignments = [];
    state.activeAssignment = null;
    state.myStudents = [];

    // Student info (name/class/arms) — but keep exam_code if student
    state.studentInfo = { name: '', class: '', arms: '', exam_code: '' };

    // Modals
    state.showResultModal = false;
    state.lastResult = null;
    state.showFilterModal = false;
    state.recentUploads = [];

    // Kill any running exam timer
    if (state.examTimer) {
        clearInterval(state.examTimer);
        state.examTimer = null;
    }
}

/**
 * Role guards. Each returns true if the current session has the role.
 */
function isTeacherSession()     { return !!state.isTeacher && !!state.user; }
function isExamOfficeSession()  { return !!state.isExamOffice && !!state.user; }
function isFormTeacherSession() { return !!state.isFormTeacher && !!state.user; }
function isStudentSession()     { return !!state.isStudent && !!state.studentSession; }

/**
 * Return the role string for the current session, or null.
 */
function getCurrentRole() {
    if (state.isExamOffice) return 'exam_office';
    if (state.isTeacher)    return 'teacher';
    if (state.isFormTeacher) return 'form_teacher';
    if (state.isStudent)    return 'student';
    return null;
}

function togglePasswordVisibility(inputId, button) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const visible = input.type === 'text';
    input.type = visible ? 'password' : 'text';
    if (button) {
        button.innerHTML = `<i data-lucide="${visible ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
        button.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
        button.setAttribute('aria-pressed', visible ? 'false' : 'true');
        if (window.lucide) lucide.createIcons();
    }
}

/**
 * Logout — clears state, closes sidebars, returns home.
 * Confirmation is handled by the wrapper in main.js.
 */
function logout() {
    console.log('🔴 [LOGOUT] Clearing all state...');

    clearSessionState();
    if (window.LanApi) window.LanApi.setToken(null);

    // Close any open sidebar
    const tSidebar = document.getElementById('teacherSidebar');
    const tOverlay = document.getElementById('sidebarOverlay');
    if (tSidebar) tSidebar.classList.add('sidebar-hidden');
    if (tOverlay) tOverlay.classList.remove('active');

    const eoSidebar = document.getElementById('examOfficeSidebar');
    const eoOverlay = document.getElementById('examOfficeSidebarOverlay');
    if (eoSidebar) eoSidebar.classList.add('sidebar-hidden');
    if (eoOverlay) eoOverlay.classList.remove('active');

    const ftSidebar = document.getElementById('formTeacherSidebar');
    const ftOverlay = document.getElementById('formTeacherSidebarOverlay');
    if (ftSidebar) ftSidebar.classList.add('sidebar-hidden');
    if (ftOverlay) ftOverlay.classList.remove('active');

    // Return home and reload public exams
    state.currentPage = 'home';
    loadExams()
        .then(() => render())
        .catch(() => render());
}

// Export
window.clearSessionState       = clearSessionState;
window.isTeacherSession        = isTeacherSession;
window.isExamOfficeSession     = isExamOfficeSession;
window.isFormTeacherSession    = isFormTeacherSession;
window.isStudentSession        = isStudentSession;
window.getCurrentRole          = getCurrentRole;
window.togglePasswordVisibility = togglePasswordVisibility;
window.logout                  = logout;

console.log('✅ auth.shared.js loaded');