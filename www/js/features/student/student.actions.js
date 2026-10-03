// student.actions.js - Student Actions
// Handles student exam flow (info submission, starting exam, answering, submitting)

// ========================================
// STUDENT INFO SUBMISSION
// ========================================

async function submitStudentInfo(e) {
    e.preventDefault();

    const name = document.getElementById('student-name')?.value.trim();
    const studentClass = document.getElementById('student-class')?.value.trim();
    const arms = document.getElementById('student-arms')?.value.trim() || '';

    if (!name || !studentClass) {
        showAlert('Please enter your full name and class', 'error');
        return;
    }

    state.studentInfo = { name, class: studentClass, arms };

    try {
        const allExams = await loadAllExamsFromDB();

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split('T')[0];

        // Filter exams by class match first
        const classMatched = allExams.filter(exam => {
            const examClass = exam.class?.toString().trim();
            const studentCls = studentClass.trim();

            return examClass &&
                   (examClass.toUpperCase() === studentCls.toUpperCase() ||
                    examClass.toUpperCase().replace(/[^A-Z0-9]/g, '') === studentCls.toUpperCase().replace(/[^A-Z0-9]/g, ''));
        });

        // Separate CAs and Exams
        const caExams = classMatched.filter(exam => (exam.assessmentType || 'EXAM') === 'CA');

        const todayExams = classMatched.filter(exam => {
            if ((exam.assessmentType || 'EXAM') !== 'EXAM') return false;
            // Only include exams scheduled for TODAY
            if (!exam.scheduledDate) return false;
            return exam.scheduledDate === today;
        });

        // Store separately for the tabbed UI
        state.caExams = caExams;
        state.todayExams = todayExams;
        state.availableExams = [...caExams, ...todayExams];

        if (caExams.length === 0 && todayExams.length === 0) {
            showAlert(
                `No CAs or exams scheduled today for ${studentClass}. Please contact your teacher or exam office.`,
                'info',
                8000
            );
        }

        setPage('student-exam-list');

    } catch (err) {
        showAlert('Failed to load exams. Check your connection or try again.', 'error');
        console.error(err);
    }
}

// ========================================
// EXAM STARTING
// ========================================

function startExam(examId) {
    const exam = state.availableExams.find(e => e.exam_id === examId);
    if (!exam) {
        showAlert('Exam not found', 'error');
        return;
    }

    // Validate student info exists
    if (!state.studentInfo || !state.studentInfo.name || !state.studentInfo.class) {
        showAlert('Please enter your student information first', 'error');
        setPage('student-info');
        return;
    }
    
    // Validate exam has questions
    if (!exam.questions || exam.questions.length === 0) {
        showAlert('This exam has no questions', 'error');
        return;
    }

    // Defense-in-depth: Check if exam is visible
    if (!isExamVisible(exam)) {
        showAlert('This exam is not currently available. Please check the scheduled date.', 'error');
        return;
    }

    console.log("🚀 Starting exam:", {
        examId: exam.exam_id,
        studentInfo: state.studentInfo,
        questions: exam.questions.length
    });

    state.selectedExam = exam;
    
    let shuffledQuestions = JSON.parse(JSON.stringify(exam.questions));
    shuffledQuestions = shuffleArray(shuffledQuestions);
    
    state.shuffledExam = { ...exam, questions: shuffledQuestions };
    
    state.studentAnswers = {};
    state.currentQuestionIndex = 0;
    state.timeRemaining = exam.duration * 60;
    state.formSubmitted = false;
    
    if (state.examTimer) {
        clearInterval(state.examTimer);
        state.examTimer = null;
    }
    
    let autoSubmitFired = false;
    state.examTimer = setInterval(() => {
        try {
            if (state.timeRemaining > 0) {
                state.timeRemaining--;
            }

            const timerEl = document.getElementById('timer-display');
            if (timerEl) {
                timerEl.textContent = formatTime(state.timeRemaining);
            }

            if (state.timeRemaining <= 0 && !autoSubmitFired) {
                autoSubmitFired = true;
                console.log('⏰ TIME ELAPSED - Auto-submitting exam');
                clearInterval(state.examTimer);
                state.examTimer = null;
                submitExam();
            }
        } catch (err) {
            console.error('❌ Timer error:', err);
            clearInterval(state.examTimer);
            state.examTimer = null;
        }
    }, 1000);
    console.log('✅ Exam timer started:', { duration: exam.duration, seconds: exam.duration * 60 });

    setPage('exam');
}

function startExamSafe(examId) {
    const exam = state.availableExams.find(e => e.exam_id === examId);
    if (!exam) {
        showAlert('Exam not found!', 'error');
        return;
    }

    // Defense-in-depth: Check if exam is visible
    if (!isExamVisible(exam)) {
        showAlert('This exam is not currently available.', 'error');
        return;
    }

    state.selectedExam = exam;
    const shuffled = JSON.parse(JSON.stringify(exam.questions));
    shuffleArray(shuffled);

    state.shuffledExam = { ...exam, questions: shuffled };
    state.studentAnswers = {};
    state.currentQuestionIndex = 0;
    state.timeRemaining = exam.duration * 60;

    if (state.examTimer) clearInterval(state.examTimer);
    state.examTimer = setInterval(() => {
        state.timeRemaining--;

        const timerEl = document.getElementById('timer-display');
        if (timerEl) {
            timerEl.textContent = formatTime(state.timeRemaining);
        }

        if (state.timeRemaining <= 0) {
            clearInterval(state.examTimer);
            console.log("⏰ Time's up. Submitting exam...");
            submitExam();
        }

    }, 1000);

    setPage('exam');
}

// ========================================
// ANSWER HANDLING
// ========================================

function updateAnswer(questionId, answer) {
    state.studentAnswers[questionId] = answer.trim();

    const currentQuestion = (state.shuffledExam || state.selectedExam).questions[state.currentQuestionIndex];
    const radioButtons = document.querySelectorAll(`input[name="answer-${currentQuestion.id}"]`);
    
    radioButtons.forEach(radio => {
        const label = radio.closest('label');
        if (radio.value === answer) {
            label.classList.remove('border-gray-300');
            label.classList.add('border-[#B80236]', 'bg-pink-50');
        } else {
            label.classList.remove('border-[#B80236]', 'bg-pink-50');
            label.classList.add('border-gray-300');
        }
    });

    const paletteButtons = document.querySelectorAll('.question-palette button, #mobile-question-grid button');
    const currentIndex = state.currentQuestionIndex;
    const btn = paletteButtons[currentIndex];
    if (btn) {
        btn.classList.remove('bg-gray-200', 'text-gray-700');
        btn.classList.add('bg-green-500', 'text-white', 'hover:bg-green-600');
        if (!btn.innerHTML.includes('check')) {
            btn.innerHTML += ' check';
        }
    }

    console.log(`Answer saved: Q${questionId} = ${answer}`);
}

// ========================================
// NAVIGATION
// ========================================

function nextQuestion() {
    const exam = state.shuffledExam || state.selectedExam;
    if (!exam) return;
    if (state.currentQuestionIndex < exam.questions.length - 1) {
        state.currentQuestionIndex++;
        render();
    }
}

function previousQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        render();
    }
}

function changeQuestion(direction) {
    direction === 1 ? nextQuestion() : previousQuestion();
}

function goToQuestion(index) {
    const exam = state.shuffledExam || state.selectedExam;
    if (!exam || !exam.questions) return;
    if (index >= 0 && index < exam.questions.length) {
        state.currentQuestionIndex = index;
        render();
    }
}

// ========================================
// EXAM SUBMISSION
// ========================================

async function submitExam() {
    if (state.formSubmitted && state.showResultModal) {
        console.log('ℹ️ Exam already submitted.');
        return;
    }
    
    console.log('📤 Submitting exam...');
    
    const activeExam = state.shuffledExam || state.selectedExam;
    
    if (!activeExam) {
        console.error("No active exam found to submit");
        showAlert('Error: Exam data missing.', 'error');
        return;
    }

    const { score, total, durationTakenSeconds } = calculateScore(activeExam, state.studentAnswers);
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    const result_id = `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = {
        result_id: result_id,
        exam_id: activeExam.exam_id,
        exam_subject: activeExam.subject,
        student_name: state.studentInfo?.name || 'Anonymous Student',
        student_class: state.studentInfo?.class || '',
        student_arms: state.studentInfo?.arms || '',
        score: score,
        total: total,
        percentage: percentage,
        answers: state.studentAnswers,
        exam_details: activeExam,
        duration_taken: durationTakenSeconds,
        submitted_at: new Date().toISOString()
    };

    state.lastResult = result;
    state.showResultModal = true;
    state.formSubmitted = true;
    
    if (state.examTimer) {
        clearInterval(state.examTimer);
    }

    try {
        if (typeof saveResultToDB !== 'function') {
            throw new Error('saveResultToDB function not found. Storage.js might not be loaded.');
        }

        await saveResultToDB(result);
        console.log('✅ Result saved successfully');
        showAlert('✅ Exam submitted successfully!', 'success', 3000);

    } catch (error) {
        console.error('❌ Database save failed:', error);
        showAlert('⚠️ Score calculated, but failed to save to teacher records.', 'info', 6000);
    }

    render();
}

// ========================================
// QUIT/EXIT
// ========================================

async function quitCBT() {
    if (confirm("Are you sure you want to exit the GSSS CBT System?")) {
        try {
            const { exit } = window.__TAURI__.process;
            await exit(0);
        } catch (e) {
            console.log("Not in Tauri environment, using fallback.");
            window.close();
        }
    }
}

// Export to global scope
window.submitStudentInfo = submitStudentInfo;
window.startExam = startExam;
window.startExamSafe = startExamSafe;
window.updateAnswer = updateAnswer;
window.nextQuestion = nextQuestion;
window.previousQuestion = previousQuestion;
window.changeQuestion = changeQuestion;
window.goToQuestion = goToQuestion;
window.submitExam = submitExam;
function switchStudentTab(tab) {
    state.studentTab = tab;
    render();
}

window.switchStudentTab = switchStudentTab;
window.quitCBT = quitCBT;