// results-shared.js - Shared Results Functions
// Functions for viewing, filtering, and managing results

// Validate that an image source is actually usable
function isValidImageSrc(src) {
    if (!src || typeof src !== 'string') return false;
    const s = src.trim();
    if (!s) return false;
    if (s === 'null' || s === 'undefined') return false;
    return s.startsWith('data:image/') || /^https?:\/\//i.test(s) || s.startsWith('/');
}

// Helper function to check if answer is correct
function checkAnswerCorrect(question, studentAnswer) {
    if (question.type === 'essay' || !studentAnswer) {
        return false;
    }

    const qType = question.type ? question.type.toLowerCase().trim() : '';

    if (qType === 'true_false' || qType === 'truefalse') {
        return studentAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    }

    if (qType === 'multiple_choice') {
        if (question.correct_answer.includes(',')) {
            const studentAnswers = studentAnswer.split(',').map(s => s.trim().toUpperCase()).sort().join(',');
            const correctAnswers = question.correct_answer.split(',').map(s => s.trim().toUpperCase()).sort().join(',');
            return studentAnswers === correctAnswers;
        } else {
            return studentAnswer.trim().toUpperCase() === question.correct_answer.trim().toUpperCase();
        }
    }

    return false;
}

// Render detailed answers breakdown
function renderDetailedAnswers(result) {
    const exam = result.exam_details;
    const answers = result.answers;
    
    if (!exam || !exam.questions) {
        return '<p class="text-gray-500 text-center">No detailed answers available</p>';
    }
    
    return `
        <div class="border-t border-gray-200 pt-4">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i data-lucide="file-text" class="w-5 h-5"></i>
                Detailed Answers
            </h3>
            <div class="space-y-4 max-h-96 overflow-y-auto">
                ${exam.questions.map((q, idx) => {
                    const studentAnswer = answers[q.id];
                    const isCorrect = checkAnswerCorrect(q, studentAnswer);
                    
                    return `
                        <div class="border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'} rounded-lg p-4">
                            <div class="flex items-start gap-3">
                                <div class="flex-shrink-0 w-8 h-8 rounded-full ${isCorrect ? 'bg-green-500' : 'bg-red-500'} flex items-center justify-center">
                                    <i data-lucide="${isCorrect ? 'check' : 'x'}" class="w-5 h-5 text-white"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="font-semibold text-gray-800 mb-2">Q${idx + 1}: ${q.question}</p>
                                    
                                    ${q.type === 'multiple_choice' ? `
                                        <div class="space-y-1 text-sm mb-2">
                                            ${q.options.map((opt, i) => {
                                                const letter = String.fromCharCode(65 + i);
                                                const isStudentAnswer = studentAnswer === letter;
                                                const isCorrectAnswer = q.correct_answer.includes(letter);
                                                
                                                return `
                                                    <div class="flex items-center gap-2 ${isStudentAnswer ? 'font-semibold' : ''}">
                                                        <span class="w-6 ${isCorrectAnswer ? 'text-green-600' : 'text-gray-600'}">${letter}.</span>
                                                        <span class="${isStudentAnswer ? (isCorrect ? 'text-green-700' : 'text-red-700') : 'text-gray-600'}">
                                                            ${opt}
                                                            ${isStudentAnswer ? ' ← Your answer' : ''}
                                                            ${isCorrectAnswer ? ' ✓ Correct' : ''}
                                                        </span>
                                                    </div>
                                                `;
                                            }).join('')}
                                        </div>
                                    ` : (q.type === 'true_false' || q.type === 'truefalse') ? `
                                        <p class="text-sm mb-1">
                                            <span class="font-medium">Your answer:</span> 
                                            <span class="${isCorrect ? 'text-green-700' : 'text-red-700'}">${studentAnswer || 'No answer'}</span>
                                        </p>
                                        <p class="text-sm">
                                            <span class="font-medium">Correct answer:</span> 
                                            <span class="text-green-700">${q.correct_answer}</span>
                                        </p>
                                    ` : `
                                        <p class="text-sm text-gray-600">Essay question - will be graded by teacher</p>
                                        <p class="text-sm mt-1">
                                            <span class="font-medium">Your answer:</span> ${studentAnswer || 'No answer provided'}
                                        </p>
                                    `}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function viewDetailedResult(resultId) {
    const result = state.allResults.find(r => r.result_id === resultId);
    
    if (result) {
        state.lastResult = result;
        state.showResultModal = true;
        state.answersExpanded = false;
        render();
    } else {
        showAlert('Result not found', 'error');
    }
}

function closeResultModal() {
    state.showResultModal = false;
    state.lastResult = null;
    state.answersExpanded = false;
    
    state.studentInfo = { name: '', class: '', arms: '' };
    
    setPage('student-info');
}

function toggleAnswers() {
    state.answersExpanded = !state.answersExpanded;
    render();
}

function toggleFilterModal() {
    state.showFilterModal = !state.showFilterModal;
    render();
}

function clearFilters() {
    state.resultFilter = { subject: '', class: '', arms: '' };
    render();
}

// Helper function to get filtered results
function getFilteredResults() {
    let filtered = [...state.allResults];
    
    console.log('Filtering results:', {
        total: filtered.length,
        filters: state.resultFilter
    });
    
    if (state.resultFilter.subject && state.resultFilter.subject !== '') {
        filtered = filtered.filter(r => 
            r.exam_subject && 
            r.exam_subject.toLowerCase().includes(state.resultFilter.subject.toLowerCase())
        );
        console.log(`After subject filter: ${filtered.length} results`);
    }
    
    if (state.resultFilter.class && state.resultFilter.class !== '') {
        filtered = filtered.filter(r => 
            r.student_class && 
            r.student_class.toLowerCase().includes(state.resultFilter.class.toLowerCase())
        );
        console.log(`After class filter: ${filtered.length} results`);
    }
    
    if (state.resultFilter.arms && state.resultFilter.arms !== '') {
        filtered = filtered.filter(r => 
            r.student_arms && 
            r.student_arms.toLowerCase().includes(state.resultFilter.arms.toLowerCase())
        );
        console.log(`After arms filter: ${filtered.length} results`);
    }
    
    console.log(`Final filtered results: ${filtered.length}`);
    return filtered;
}

function applyFilters() {
    const subject = document.getElementById('filter-subject').value;
    const studentClass = document.getElementById('filter-class').value;
    const arms = document.getElementById('filter-arms').value;
    
    state.resultFilter = { subject, class: studentClass, arms };
    toggleFilterModal();
}

// ========================================
// RENDER FILTER MODAL
// ========================================

function renderFilterModal(state) {
    // Get unique subjects from available results for the dropdown
    const subjects = [...new Set(state.allResults.map(r => r.exam_subject).filter(Boolean))].sort();
    
    return `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div class="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-bold text-gray-800">Filter Results</h3>
                    <button onclick="toggleFilterModal()" class="text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <form id="filter-form" class="space-y-4" onsubmit="event.preventDefault(); applyFilters();">
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Subject</label>
                        <select id="filter-subject" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm">
                            <option value="">All Subjects</option>
                            ${subjects.map(subject => 
                                `<option value="${subject}" ${state.resultFilter.subject === subject ? 'selected' : ''}>${subject}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                        <select id="filter-class" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm">
                            <option value="">All Classes</option>
                            <option value="SS 1" ${state.resultFilter.class === 'SS 1' ? 'selected' : ''}>SS 1</option>
                            <option value="SS 2" ${state.resultFilter.class === 'SS 2' ? 'selected' : ''}>SS 2</option>
                            <option value="SS 3" ${state.resultFilter.class === 'SS 3' ? 'selected' : ''}>SS 3</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-2">Arms</label>
                        <select id="filter-arms" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm">
                            <option value="">All Arms</option>
                            <option value="A" ${state.resultFilter.arms === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" ${state.resultFilter.arms === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${state.resultFilter.arms === 'C' ? 'selected' : ''}>C</option>
                            <option value="D" ${state.resultFilter.arms === 'D' ? 'selected' : ''}>D</option>
                            <option value="E" ${state.resultFilter.arms === 'E' ? 'selected' : ''}>E</option>
                            <option value="F" ${state.resultFilter.arms === 'F' ? 'selected' : ''}>F</option>
                            <option value="G" ${state.resultFilter.arms === 'G' ? 'selected' : ''}>G</option>
                            <option value="H" ${state.resultFilter.arms === 'H' ? 'selected' : ''}>H</option>
                        </select>
                    </div>
                    <div class="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onclick="clearFilters()" class="bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 text-sm font-semibold">
                            Clear Filters
                        </button>
                        <button type="button" onclick="applyFilters()" class="bg-[#B80236] text-white py-2 px-4 rounded-lg hover:bg-[#900028] text-sm font-semibold">
                            Apply Filters
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

// ========================================
// EXPORTS
// ========================================

window.isValidImageSrc = isValidImageSrc;
window.checkAnswerCorrect = checkAnswerCorrect;
window.renderDetailedAnswers = renderDetailedAnswers;
window.viewDetailedResult = viewDetailedResult;
window.closeResultModal = closeResultModal;
window.toggleAnswers = toggleAnswers;
window.toggleFilterModal = toggleFilterModal;
window.clearFilters = clearFilters;
window.getFilteredResults = getFilteredResults;
window.applyFilters = applyFilters;
window.renderFilterModal = renderFilterModal;