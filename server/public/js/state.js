// state.js - Application State Management (v2)

let state = {
    // ─── Auth / Session ────────────────────────────────
    isAuthenticated: false,
    isTeacher: false,
    isExamOffice: false,
    isFormTeacher: false,
    isStudent: false,
    user: null,
    studentSession: null,       // { exam_code, name, class_code, class_name, arm, ... }

    // ─── Navigation ────────────────────────────────────
    currentPage: 'home',

    // ─── Exams ─────────────────────────────────────────
    availableExams: [],
    selectedExam: null,
    formSubmitted: false,
    examTimer: null,
    timeRemaining: 0,
    editingExamId: null,
    currentExamData: null,
    studentAnswers: {},
    currentQuestionIndex: 0,
    shuffleQuestions: false,
    shuffledExam: null,
    editingQuestionId: null,
    currentQuestionPage: 1,
    questionsPerPage: 20,
    recentUploads: [],

    // ─── Student taking exam ───────────────────────────
    studentInfo: { name: '', class: '', arms: '', exam_code: '' },

    // ─── Results ───────────────────────────────────────
    resultFilter: { subject: '', class: '', arms: '' },
    showResultModal: false,
    lastResult: null,
    answersExpanded: false,
    allResults: [],

    // ─── UI ────────────────────────────────────────────
    showFilterModal: false,
    showAlert: false,
    alertMessage: '',
    alertType: 'error',
    allTeachers: [],
    showTeacherRegisterModal: false,

    // ─── Admin / Setup (NEW) ───────────────────────────
    classes: [],
    arms: [],
    departments: [],
    formTeacherAssignments: [],
    academicYears: [],
    currentAcademicYear: null,
    adminTab: 'classes',        // classes | arms | departments | assignments | year | devices

    // ─── Form teacher (NEW) ────────────────────────────
    myAssignments: [],          // filtered FTA list for the logged-in form teacher
    activeAssignment: null,     // the currently selected tab (class+arm)
    myStudents: [],             // students in activeAssignment

    // ─── Assessment type (existing) ────────────────────
    assessmentType: 'EXAM',
    caExams: [],
    todayExams: [],
    studentTab: 'ca',
};

// Reset exam state without affecting other state
function resetExamState() {
    if (window.state) {
        state.selectedExam = null;
        state.shuffledExam = null;
        state.studentAnswers = {};
        state.currentQuestionIndex = 0;
        state.timeRemaining = 0;
        state.examStarted = false;
        state.examSubmitted = false;

        if (state.studentInfo) {
            state.studentInfo = {
                name: state.studentInfo.name || '',
                class: state.studentInfo.class || '',
                arms: state.studentInfo.arms || '',
                exam_code: state.studentInfo.exam_code || '',
            };
        }

        if (typeof render === 'function') render();
    }
}

window.state = state;
window.resetExamState = resetExamState;