// auth.student.js - Student login (exam code only)
// ═══════════════════════════════════════════════════════════
//  Students do NOT have passwords. Their exam code
//  (e.g. GSS/SS1/002) IS the credential.
//
//  Login flow:
//    1. Student types exam code (tolerant of case/spaces)
//    2. We normalise + look up the student record
//    3. We verify status is 'active'
//    4. Session starts → student sees exams for their class
// ═══════════════════════════════════════════════════════════

async function handleStudentLogin(event) {
    event.preventDefault();

    const input = document.getElementById('student-code-input');
    if (!input) {
        console.error('Student code input not found');
        return;
    }

    const raw = input.value.trim();
    if (!raw) {
        showAlert('Please enter your exam code', 'error');
        return;
    }

    // Normalise: uppercase, strip spaces, rebuild padded format
    const normalised = normaliseExamCode(raw);
    if (!normalised) {
        showAlert(
            'Invalid exam code format.\nExpected: ' + SCHOOL_CONFIG.schoolCode + '/SS1/002',
            'error',
            6000
        );
        return;
    }

    try {
        const student = await getStudentByExamCode(normalised);

        if (!student) {
            showAlert('No student found with that exam code. Please check and try again.', 'error');
            return;
        }

        if (student.status !== 'active') {
            showAlert(
                `This exam code is marked as "${student.status}". Please contact your form teacher.`,
                'error',
                6000
            );
            return;
        }

        // Block if the current academic year doesn't match
        const currentYear = state.currentAcademicYear?.year_id || SCHOOL_CONFIG.academicYear;
        if (student.academic_year !== currentYear) {
            showAlert(
                `This code belongs to a previous session (${student.academic_year}). Please use your current exam code.`,
                'error',
                8000
            );
            return;
        }

        localStorage.setItem('cbt_last_exam_code', student.exam_code);

        // ── Success ────────────────────────────────────
        clearSessionState();
        state.isStudent = true;
        state.isAuthenticated = true;
        state.studentSession = student;

        // Populate studentInfo so the existing exam flow keeps working
        state.studentInfo = {
            name:      student.name,
            class:     student.class_name || student.class_code,
            arms:      student.arm || '',
            exam_code: student.exam_code,
        };

        showAlert(`Welcome, ${student.name}!`, 'success');

        // Load exams for the student's class
        await loadExamsForStudent(student);

        setTimeout(() => setPage('student-exam-list'), 400);
    } catch (err) {
        console.error('Student login error:', err);
        showAlert('Login failed: ' + err.message, 'error');
    }
}

/**
 * Filter state.availableExams to only the exams that apply to this student.
 * Same logic as the old submitStudentInfo() — scheduled exams only,
 * matching class code, and where assessmentType allows it.
 */
async function loadExamsForStudent(student) {
    try {
        // Prefer the server response while online. It applies the authoritative
        // server date and pushed-to-client rules before returning any questions.
        if (window.LanIntegration?.getStudentExams && navigator.onLine) {
            const response = await LanIntegration.getStudentExams(student.exam_code);
            if (response.ok) {
                const exams = (response.data?.exams || []).map(exam => ({
                    exam_id: exam.exam_id,
                    subject: exam.subject,
                    class: exam.class_name,
                    duration: Number(exam.duration),
                    assessmentType: exam.assessment_type || 'EXAM',
                    scheduledDate: exam.scheduled_date,
                    questions: exam.questions || [],
                }));

                state.caExams = exams.filter(exam => exam.assessmentType === 'CA');
                state.todayExams = exams.filter(exam => exam.assessmentType !== 'CA');
                state.availableExams = exams;
                state.studentTab = state.caExams.length > 0 ? 'ca' : 'today';
                if (exams.length === 0) {
                    showAlert(
                        `No exams scheduled today for ${student.class_name || student.class_code}.`,
                        'info',
                        6000
                    );
                }
                return;
            }
        }

        // Offline fallback: apply the same exact-date rule to cached exams.
        const allExams = await loadAllExamsFromDB();
        const studentClassCode = student.class_code;
        const studentClassName = student.class_name || student.class_code;
        const today = new Date();
        const todayKey = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
        ].join('-');

        const filtered = (allExams || []).filter(exam => {
            const examClass = exam.class?.toString().trim();
            if (!examClass) return false;

            const normalise = s => s.toUpperCase().replace(/[^A-Z0-9]/g, '');
            const classMatch =
                normalise(examClass) === normalise(studentClassName) ||
                normalise(examClass) === normalise(studentClassCode);

            return classMatch && exam.scheduledDate === todayKey;
        });

        state.caExams = filtered.filter(exam => (exam.assessmentType || 'EXAM') === 'CA');
        state.todayExams = filtered.filter(exam => (exam.assessmentType || 'EXAM') !== 'CA');
        state.availableExams = filtered;
        state.studentTab = state.caExams.length > 0 ? 'ca' : 'today';

        if (filtered.length === 0) {
            showAlert(`No scheduled exams found for ${studentClassName}.`, 'info', 6000);
        }
    } catch (err) {
        console.error('loadExamsForStudent error:', err);
        state.availableExams = [];
    }
}

window.handleStudentLogin     = handleStudentLogin;
window.loadExamsForStudent    = loadExamsForStudent;

console.log('✅ auth.student.js loaded');