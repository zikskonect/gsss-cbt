// www/js/core/router.js (v2)
// ═══════════════════════════════════════════════════════════
//  Routing + top-level data loaders + render dispatcher.
// ═══════════════════════════════════════════════════════════

// ─── Data loaders ─────────────────────────────────────────

async function loadExams() {
    try {
        let exams = [];
        if (state.isAuthenticated && state.isTeacher && state.user?.phone_number) {
            exams = await loadExamsByCreator(state.user.phone_number);
        } else {
            exams = await loadAllExamsFromDB();
        }
        state.availableExams = exams || [];
        console.log('✅ Exams loaded:', state.availableExams.length);
    } catch (err) {
        console.error('Error loading exams:', err);
        state.availableExams = [];
        showAlert('Failed to load exams from database.', 'error');
    }
}

async function loadResults() {
    try {
        let results = await loadResultsFromDB();

        if (state.isTeacher && state.user?.phone_number && !state.isExamOffice) {
            const myExamIds = new Set(state.availableExams.map(e => e.exam_id));
            results = results.filter(r => myExamIds.has(r.exam_id));
        }

        state.allResults = results || [];
        console.log('✅ Results loaded:', state.allResults.length);
    } catch (err) {
        console.error('Error loading results:', err);
        state.allResults = [];
    }
}

async function loadAdminSetupData() {
    try {
        state.classes                = await loadAllClassesFromDB();
        state.arms                   = await loadAllArmsFromDB();
        state.departments            = await loadAllDepartmentsFromDB();
        state.formTeacherAssignments = await loadAllFormTeacherAssignmentsFromDB();
        state.academicYears          = await loadAllAcademicYearsFromDB();
        state.currentAcademicYear    = await getCurrentAcademicYearFromDB();
        state.devices                = await loadAllDevicesFromDB();
        // NEW - for question limit feature & users table
        if (window.AdminExamSettings) {
            state.examSettings = await AdminExamSettings.loadSettings();
        }
        if (window.AdminUsersRender) {
            // Users loaded on demand in panel, not here
        }
    } catch (err) {
        console.error('loadAdminSetupData error:', err);
    }
}

// ─── Dependency check ────────────────────────────────────

function checkDependencies() {
    const required = ['initDB', 'renderHomePage', 'setPage'];
    const missing = required.filter(func => typeof window[func] === 'undefined');
    if (missing.length > 0) {
        console.error('❌ Missing dependencies:', missing);
        return false;
    }
    return true;
}

// ─── Render dispatcher ───────────────────────────────────

function render() {
    const app = document.getElementById('app');
    if (!app) return;

    console.log('Rendering page:', state.currentPage);
    let pageContent = '';

    switch (state.currentPage) {
        // ── Home ───────────────────────────────────────
        case 'home':
            pageContent = renderHomePage();
            break;

        // ── Teacher ────────────────────────────────────
        case 'teacher-login':
            pageContent = renderTeacherLoginPage(state);
            break;
        case 'teacher-register':
            pageContent = renderTeacherRegistrationPage(state);
            break;
        case 'teacher':
            if (!state.isTeacher && !state.isExamOffice) { setPage('teacher-login'); return; }
            pageContent = renderTeacherDashboard(state);
            break;
        case 'register-student':
            if (!state.isFormTeacher && !['form_teacher', 'form-teacher'].includes(state.user?.role)) {
                setPage('teacher-login');
                return;
            }
            pageContent = renderRegisterStudentPage(state);
            break;
        case 'create-exam':
            if (!state.isTeacher && !state.isExamOffice) { setPage('home'); return; }
            pageContent = renderCreateExamPage(state);
            break;

        // ── Exam Office ────────────────────────────────
        case 'exam-office-login':
            pageContent = renderExamOfficeLoginPage(state);
            break;
        case 'exam-office-register':
            pageContent = renderExamOfficeRegisterPage(state);
            break;
        case 'exam-office-dashboard':
            if (!state.isExamOffice) { setPage('exam-office-login'); return; }
            pageContent = renderExamOfficeDashboard(state);
            break;
        case 'exam-office-schedule':
            if (!state.isExamOffice) { setPage('exam-office-login'); return; }
            pageContent = renderExamOfficeSchedulePage(state);
            break;
        case 'exam-office-results':
            if (!state.isExamOffice) { setPage('exam-office-login'); return; }
            pageContent = renderExamOfficeResultsPage(state);
            break;
        case 'exam-office-upload':
            if (!state.isExamOffice) { setPage('exam-office-login'); return; }
            pageContent = renderExamOfficeUploadPage(state);
            break;

        // ── Admin setup (NEW) ──────────────────────────
        case 'admin-setup':
            if (!state.isExamOffice) { setPage('exam-office-login'); return; }
            pageContent = renderAdminSettingsPage(state); // 👈 Changed from renderAdminSetupPage
            break;

        // ── Form teacher (NEW) ─────────────────────────
        case 'form-teacher-login':
            pageContent = renderFormTeacherLoginPage(state);
            break;
        case 'form-teacher-register':
            pageContent = renderFormTeacherRegisterPage(state);
            break;
        case 'form-teacher-dashboard':
            if (!state.isFormTeacher) { setPage('form-teacher-login'); return; }
            pageContent = renderFormTeacherDashboard(state);
            break;

        // ── Student (NEW — code-based login replaces student-info) ──
        case 'student-login':
            pageContent = renderStudentLoginPage(state);
            break;
        case 'student-exam-list':
            if (!state.isStudent) { setPage('student-login'); return; }
            pageContent = renderStudentExamList(state);
            break;
        case 'exam':
            if (!state.isStudent) { setPage('student-login'); return; }
            pageContent = renderExamInterface(state);
            break;

        // ── View results ───────────────────────────────
        case 'view-results':
            if (!state.isTeacher && !state.isExamOffice) { setPage('home'); return; }
            pageContent = state.isExamOffice
                ? renderExamOfficeResultsPage(state)
                : renderTeacherResultsPage(state);
            break;

        // ── Legacy student-info page → redirect to student-login ──
        case 'student-info':
            state.currentPage = 'student-login';
            pageContent = renderStudentLoginPage(state);
            break;

        default:
            pageContent = renderHomePage();
    }

    app.innerHTML = pageContent;

    // Modal overlays
    if (state.showResultModal && state.lastResult) {
        if (typeof renderStudentResultModal === 'function') {
            app.innerHTML += renderStudentResultModal(state.lastResult);
        }
    }
    if (state.showFilterModal && state.isTeacher && typeof renderFilterModal === 'function') {
        app.innerHTML += renderFilterModal(state);
    }
    if (state.showAlert) {
        renderAlert();
    }

    if (window.lucide) window.lucide.createIcons();

    // Reset sidebars after render (from sidebar.js)
    if (typeof window.resetSidebarsAfterRender === 'function') {
        window.resetSidebarsAfterRender();
        setTimeout(window.resetSidebarsAfterRender, 50);
    }
}

// ─── Page navigation ─────────────────────────────────────

async function setPage(page) {
    // Leaving exam page — clean up
    if (state.currentPage === 'exam' && page !== 'exam') {
        if (state.examTimer) { clearInterval(state.examTimer); state.examTimer = null; }
        state.selectedExam = null;
        state.studentAnswers = {};
        state.shuffledExam = null;
        state.currentQuestionIndex = 0;
        state.timeRemaining = 0;
        state.examStarted = false;
        state.examSubmitted = false;
    }

    // ── Role guards ────────────────────────────────────
    const teacherOnly   = ['teacher', 'create-exam'];
    const examOfficeOnly = ['exam-office-dashboard', 'exam-office-schedule', 'exam-office-results', 'exam-office-upload', 'admin-setup'];
    const formTeacherOnly = ['form-teacher-dashboard', 'register-student'];
    const studentOnly = ['student-exam-list', 'exam'];

    if (teacherOnly.includes(page) && !state.isTeacher && !state.isExamOffice) {
        setPage('home'); return;
    }
    if (examOfficeOnly.includes(page) && !state.isExamOffice) {
        setPage('exam-office-login'); return;
    }
    const isFormTeacher = state.isFormTeacher
        || ['form_teacher', 'form-teacher'].includes(state.user?.role);
    if (formTeacherOnly.includes(page) && !isFormTeacher) {
        setPage('form-teacher-login'); return;
    }
    if (studentOnly.includes(page) && !state.isStudent) {
        setPage('student-login'); return;
    }

    // ── Pre-load data ──────────────────────────────────
    if (page === 'teacher') {
        await loadExams();
        if (state.isTeacher) await loadResults();
    }
    if (page === 'admin-setup') {
        await loadAdminSetupData();
    }
    if (page === 'form-teacher-dashboard' || page === 'register-student') {
        // Reload assignments + students to reflect admin changes
        state.myAssignments = await loadFormTeacherAssignmentsByPhone(state.user?.phone_number);
        if (!state.activeAssignment && state.myAssignments.length > 0) {
            state.activeAssignment = state.myAssignments[0];
        }
        // If active assignment no longer exists, reset it
        if (state.activeAssignment &&
            !state.myAssignments.find(a => a.assignment_id === state.activeAssignment.assignment_id)) {
            state.activeAssignment = state.myAssignments[0] || null;
        }
        await loadFormTeacherStudents();
        if (!state.departments || state.departments.length === 0) {
            state.departments = await loadAllDepartmentsFromDB();
        }
    }
    if (page === 'student-login') {
        // Reset student session when returning to login
        if (state.isStudent === false) {
            state.studentSession = null;
        }
    }

    // Clear editing state when leaving create-exam
    if (state.currentPage === 'create-exam' && page !== 'create-exam') {
        state.editingExamId = null;
        state.currentExamData = null;
        state.editingQuestionId = null;
    }

    console.log('📄 [SETPAGE]', page);
    state.currentPage = page;

    // Close any open sidebars before rendering
    if (typeof window.closeTeacherSidebar === 'function') window.closeTeacherSidebar();
    if (typeof window.closeExamOfficeSidebar === 'function') window.closeExamOfficeSidebar();
    if (typeof window.closeFormTeacherSidebar === 'function') window.closeFormTeacherSidebar();

    render();
}

function changeQuestionPage(page) {
    state.currentQuestionPage = page;
    render();
    setTimeout(() => {
        const list = document.getElementById('questions-list');
        if (list) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function resetQuestionPagination() {
    state.currentQuestionPage = 1;
}

// ─── Exports ─────────────────────────────────────────────

window.loadExams              = loadExams;
window.loadResults            = loadResults;
window.loadAdminSetupData     = loadAdminSetupData;
window.render                 = render;
window.setPage                = setPage;
window.checkDependencies      = checkDependencies;
window.changeQuestionPage     = changeQuestionPage;
window.resetQuestionPagination = resetQuestionPagination;

console.log('✅ router.js v2 loaded');