// www/js/features/student/student-exam.js - FIXED for question limit & shuffle
// When student starts exam, fetch limited shuffled questions

const StudentExamWithLimit = {
    async startExam(examId) {
        try {
            const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            
            // Get settings to show
            const settingsRes = await fetch(`${apiBase}/exam-settings`);
            const settingsData = await settingsRes.json();
            const limit = settingsData.data?.questions_per_exam || 40;
            
            // Get shuffled limited questions for this exam
            const url = `${apiBase}/exam-questions?exam_id=${examId || ''}`;
            const res = await fetch(url);
            const data = await res.json();
            
            if (!data.ok) throw new Error(data.error || 'Failed to load questions');
            
            const questions = data.data || [];
            const totalBank = data.total_bank || questions.length;
            const served = data.served || questions.length;
            
            console.log(`✅ Exam: ${served} random questions from bank of ${totalBank} (limit: ${limit}, shuffled: ${data.shuffled})`);
            
            // Store for exam session
            window.CURRENT_EXAM_QUESTIONS = questions;
            window.CURRENT_EXAM_META = {
                totalBank,
                served,
                limit,
                shuffled: data.shuffled
            };
            
            // Show info to student
            if (typeof showAlert === 'function') {
                showAlert(`You will answer ${served} random questions out of ${totalBank} in bank. Good luck!`, 'info', 4000);
            }
            
            return questions;
            
        } catch (e) {
            console.error('Failed to load exam with limit:', e);
            // Fallback to old method
            const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            const res = await fetch(`${apiBase}/questions?exam_id=${examId || ''}`);
            const data = await res.json();
            const all = data.data || data.questions || [];
            // Shuffle and limit client-side fallback
            const limit = parseInt(localStorage.getItem('exam_settings') ? JSON.parse(localStorage.getItem('exam_settings')).questions_per_exam : 40);
            const shuffled = [...all].sort(() => 0.5 - Math.random()).slice(0, Math.min(limit, all.length));
            window.CURRENT_EXAM_QUESTIONS = shuffled;
            return shuffled;
        }
    }
};

// Hook into existing student exam start if exists
if (window.StudentExam) {
    const originalStart = window.StudentExam.startExam || window.StudentExam.start;
    window.StudentExam.startExam = async function(examId) {
        const questions = await StudentExamWithLimit.startExam(examId);
        // Call original with filtered questions
        if (originalStart) {
            return originalStart.call(this, examId, questions);
        }
        return questions;
    };
}

window.StudentExamWithLimit = StudentExamWithLimit;
console.log('✅ student-exam.js FIXED - Question limit & shuffle enabled');
