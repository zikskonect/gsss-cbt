// router.js - Routing and Navigation
// Page navigation, rendering, and dependency management

// ========================================
// DATA LOADERS (Global - Must be available early)
// ========================================

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

        // If teacher, filter to only results for exams they created
        if (state.isTeacher && state.user?.phone_number && !state.isExamOffice) {
            const myExamIds = new Set(state.availableExams.map(e => e.exam_id));
            results = results.filter(r => myExamIds.has(r.exam_id));
            console.log(`🔍 Filtered to ${results.length} results for teacher's exams`);
        }

        state.allResults = results || [];
        console.log('✅ Results loaded:', state.allResults.length);
    } catch (err) {
        console.error('Error loading results:', err);
        state.allResults = [];
    }
}

// ========================================
// DEPENDENCY CHECK
// ========================================

function checkDependencies() {
    const required = ['initDB', 'renderHomePage', 'setPage'];
    const missing = required.filter(func => typeof window[func] === 'undefined');
    
    if (missing.length > 0) {
        console.error('❌ Missing dependencies:', missing);
        return false;
    }
    
    console.log('✅ All dependencies loaded');
    return true;
}

// ========================================
// RENDER FUNCTION
// ========================================

function render() {
    const app = document.getElementById('app');
    if (!app) return;
    
    console.log('Rendering page:', state.currentPage);
    let pageContent = '';

    switch (state.currentPage) {
        case 'home':
            pageContent = renderHomePage();
            break;
        case 'teacher-login':
            pageContent = renderTeacherLoginPage(state);
            break;
        case 'teacher-register':
            pageContent = renderTeacherRegistrationPage(state);
            break;
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
        case 'teacher':
            if (!state.isTeacher && !state.isExamOffice) { setPage('teacher-login'); return; }
            pageContent = renderTeacherDashboard(state);
            break;
        case 'create-exam':
            if (!state.isTeacher && !state.isExamOffice) { setPage('home'); return; }
            pageContent = renderCreateExamPage(state);
            break;
        case 'student-info':
            pageContent = renderStudentInfoForm(state);
            break;
        case 'student-exam-list':
            pageContent = renderStudentExamList(state);
            break;
        case 'exam':
            pageContent = renderExamInterface(state);
            break;
        case 'view-results':
            if (!state.isTeacher && !state.isExamOffice) { setPage('home'); return; }
            pageContent = state.isExamOffice
                ? renderExamOfficeResultsPage(state)
                : renderTeacherResultsPage(state);
            break;
        default:
            pageContent = renderHomePage();
    }

    app.innerHTML = pageContent;

    if (state.showResultModal && state.lastResult) {
        app.innerHTML += renderStudentResultModal(state.lastResult);
    }
    
    if (state.showFilterModal && state.isTeacher) { 
        app.innerHTML += renderFilterModal(state);
    }
    
    if (state.showAlert) {
        renderAlert();
    }

    if (window.lucide) { 
        window.lucide.createIcons(); 
    }

    if (state.showResultModal) {
        const existingModal = document.getElementById('result-modal');
        if (existingModal) existingModal.remove();
        app.innerHTML += renderStudentResultModal(state.lastResult);
        if (window.lucide) lucide.createIcons();
    }

    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            console.log('🔴 Close button clicked from UI');
            if (window.electronAPI && window.electronAPI.closeApp) {
                window.electronAPI.closeApp();
            } else {
                console.error('❌ electronAPI.closeApp not available');
            }
        });
    }

    // ========================================
    // 🔥 CRITICAL FIX: Reset sidebars after render
    // ========================================
    // Force the sidebars to a known state after every page render.
    // This prevents the overlay from staying stuck open after navigation.
    if (typeof window.resetSidebarsAfterRender === 'function') {
        // Run immediately
        window.resetSidebarsAfterRender();
        
        // Also run after a tick to catch any CSS transitions
        setTimeout(window.resetSidebarsAfterRender, 50);
    }
}

// ========================================
// PAGE NAVIGATION
// ========================================

async function setPage(page) {
    // Stop exam timer if leaving exam page
    if (state.currentPage === 'exam' && page !== 'exam') {
        if (state.examTimer) {
            clearInterval(state.examTimer);
            state.examTimer = null;
        }
        state.selectedExam = null;
        state.studentAnswers = {};
        state.shuffledExam = null;
        state.currentQuestionIndex = 0;
        state.timeRemaining = 0;
        state.examStarted = false;
        state.examSubmitted = false;
        
        if (page === 'student-info') {
            state.studentInfo = { name: '', class: '', arms: '' };
        }
    }

    const teacherOnlyPages = ['teacher', 'create-exam', 'view-results'];
    const examOfficeOnlyPages = ['exam-office-dashboard', 'exam-office-schedule', 'exam-office-results', 'exam-office-upload'];

    if (teacherOnlyPages.includes(page)) {
        if (!state.isTeacher && !state.isExamOffice) {
            console.warn('Unauthorized access attempt to:', page);
            setPage('home');
            return;
        }
    }

    if (examOfficeOnlyPages.includes(page)) {
        if (!state.isExamOffice) {
            console.warn('Unauthorized access attempt to:', page);
            setPage('exam-office-login');
            return;
        }
    }

    if (page === 'student-dashboard' || page === 'teacher') {
        await loadExams(); 
        if (state.isTeacher) await loadResults();
    }

    if (page === 'student-info') {
        state.studentInfo = { name: '', class: '', arms: '' };
        state.selectedExam = null;
        state.studentAnswers = {};
        state.shuffledExam = null;
        state.currentQuestionIndex = 0;
        state.timeRemaining = 0;
        state.examStarted = false;
        state.examSubmitted = false;
        state.editingExamId = null;
        state.editingQuestionId = null;
        state.currentExamData = null;
        state.showResultModal = false;
        state.showFilterModal = false;
        const resultModal = document.getElementById('result-modal');
        if (resultModal) resultModal.remove();
        console.log('📝 [SETPAGE] Reset student-info state:', state.studentInfo);
    }

    if (state.currentPage === 'create-exam' && page !== 'create-exam') {
        state.editingExamId = null;
        state.currentExamData = null;
        state.editingQuestionId = null;
        console.log('📝 [SETPAGE] Cleared edit state when leaving create-exam page');
    }

    if (page === 'create-exam' && !state.editingExamId) {
        state.currentExamData = null;
        state.editingQuestionId = null;
        console.log('📝 [SETPAGE] Cleared currentExamData for new exam');
    }

    console.log('📄 [SETPAGE] Navigating to page:', page, 'isTeacher:', state.isTeacher); 
    state.currentPage = page;
    
    // 🔥 Close any open sidebars BEFORE rendering the new page
    if (typeof window.closeTeacherSidebar === 'function') {
        window.closeTeacherSidebar();
    }
    if (typeof window.closeExamOfficeSidebar === 'function') {
        window.closeExamOfficeSidebar();
    }
    
    render();
    
    if (page === 'student-info') {
        setTimeout(() => {
            const nameInput = document.getElementById('student-name');
            const classSelect = document.getElementById('student-class');
            const armsSelect = document.getElementById('student-arms');
            
            console.log('🔧 [STUDENT-INFO] Fixing input fields...');
            
            if (nameInput) {
                nameInput.removeAttribute('readonly');
                nameInput.removeAttribute('disabled');
                nameInput.value = '';
                nameInput.focus();
                console.log('✅ [STUDENT-INFO] Name field is ready');
            }
            
            if (classSelect) {
                classSelect.removeAttribute('readonly');
                classSelect.removeAttribute('disabled');
                classSelect.value = '';
            }
            
            if (armsSelect) {
                armsSelect.removeAttribute('readonly');
                armsSelect.removeAttribute('disabled');
                armsSelect.value = '';
            }
        }, 100);
    }
}

function changeQuestionPage(page) {
    state.currentQuestionPage = page;
    render();
    
    setTimeout(() => {
        const questionsList = document.getElementById('questions-list');
        if (questionsList) {
            questionsList.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

function resetQuestionPagination() {
    state.currentQuestionPage = 1;
}

// ========================================
// EXPORTS
// ========================================

window.loadExams = loadExams;
window.loadResults = loadResults;
window.render = render;
window.setPage = setPage;
window.checkDependencies = checkDependencies;
window.changeQuestionPage = changeQuestionPage;
window.resetQuestionPagination = resetQuestionPagination;