// state.js - Application State Management
// Central state object and state management functions

// ========== STATE MANAGEMENT ==========
let state = {
    isAuthenticated: false,
    isTeacher: false,
    isExamOffice: false,
    user: null,
    currentPage: 'home',
    availableExams: [],
    studentInfo: { name: '', class: '', arms: '' },
    selectedExam: null,
    formSubmitted: false,
    examTimer: null,
    timeRemaining: 0,
    editingExamId: null,
    currentExamData: null,
    studentAnswers: {},
    resultFilter: { subject: '', class: '', arms: '' },
    showResultModal: false,
    lastResult: null,
    answersExpanded: false,
    allResults: [],
    currentQuestionIndex: 0,
    shuffleQuestions: false,
    shuffledExam: null,
    showFilterModal: false,
    showAlert: false,
    alertMessage: '',
    alertType: 'error',
    editingQuestionId: null,
    allTeachers: [],
    showTeacherRegisterModal: false,
    currentQuestionPage: 1,
    questionsPerPage: 20,
    recentUploads: [],
    showResultModal: false,
    caExams: [],
    todayExams: [],
    studentTab: 'ca',
};

// Reset exam state without affecting other state
function resetExamState() {
    if (window.state) {
        // Clear exam-related state
        state.selectedExam = null;
        state.shuffledExam = null;
        state.studentAnswers = {};
        state.currentQuestionIndex = 0;
        state.timeRemaining = 0;
        state.examStarted = false;
        state.examSubmitted = false;
        
        
        // Keep only essential student info
        if (state.studentInfo) {
            state.studentInfo = {
                name: state.studentInfo.name || '',
                class: state.studentInfo.class || '',
                arms: state.studentInfo.arms || ''
            };
        }
        
        // Force re-render
        if (typeof render === 'function') render();
    }
}

// Export to global scope
window.state = state;
window.resetExamState = resetExamState;