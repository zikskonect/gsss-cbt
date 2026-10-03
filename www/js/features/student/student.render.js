// student.render.js - Student Render Functions
// Renders student pages (info form, exam list, exam interface, results)

function renderStudentInfoForm(state) {
    // Always use fresh empty values to prevent disabled state issues
    const studentInfo = { name: '', class: '', arms: '' };
    
    return `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl p-6 md:p-8 w-full max-w-md animate-fadeIn">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 rounded-full bg-[#B80236] mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="user-check" class="w-8 h-8 text-white"></i>
                    </div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Student Information</h1>
                    <p class="text-gray-600 text-sm md:text-base">Please enter your details to start the exam.</p>
                </div>
                <form id="student-info-form" onsubmit="submitStudentInfo(event)" class="space-y-4">
                    <div>
                        <label for="student-name" class="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                        <input type="text" 
                               id="student-name" 
                               name="student-name"
                               value=""
                               class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base focus:ring-2 focus:ring-[#B80236] focus:border-transparent" 
                               placeholder="e.g., John Doe" 
                               required />
                    </div>
                    <div>
                        <label for="student-class" class="block text-sm font-semibold text-gray-700 mb-2">Class</label>
                        <select id="student-class" 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base focus:ring-2 focus:ring-[#B80236] focus:border-transparent" 
                                required>
                            <option value="">Select Class</option>
                            <option value="SS 1" ${studentInfo.class === 'SS 1' ? 'selected' : ''}>SS 1</option>
                            <option value="SS 2" ${studentInfo.class === 'SS 2' ? 'selected' : ''}>SS 2</option>
                            <option value="SS 3" ${studentInfo.class === 'SS 3' ? 'selected' : ''}>SS 3</option>
                        </select>
                    </div>
                    <div>
                        <label for="student-arms" class="block text-sm font-semibold text-gray-700 mb-2">Arms</label>
                        <select id="student-arms" 
                                class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base focus:ring-2 focus:ring-[#B80236] focus:border-transparent" 
                                required>
                            <option value="">Select Arms</option>
                            <option value="A" ${studentInfo.arms === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" ${studentInfo.arms === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${studentInfo.arms === 'C' ? 'selected' : ''}>C</option>
                            <option value="D" ${studentInfo.arms === 'D' ? 'selected' : ''}>D</option>
                            <option value="E" ${studentInfo.arms === 'E' ? 'selected' : ''}>E</option>
                            <option value="F" ${studentInfo.arms === 'F' ? 'selected' : ''}>F</option>                            
                            <option value="G" ${studentInfo.arms === 'G' ? 'selected' : ''}>G</option>
                            <option value="H" ${studentInfo.arms === 'H' ? 'selected' : ''}>H</option>
                        </select>
                    </div>
                    <button type="submit" 
                        class="w-full bg-[#B80236] text-white py-3 rounded-lg hover:bg-[#900028] transition-colors text-sm md:text-base font-semibold">
                        Proceed to Exams
                    </button>
                    <button type="button" onclick="setPage('home')" class="w-full text-gray-500 text-sm py-2 hover:underline">
                        Back to Home
                    </button>
                </form>
            </div>
        </div>
    `;
}

function renderStudentDashboard(state) {
    const student = state.studentInfo;
    const filteredExams = state.availableExams.filter(exam => exam.class === student.class);

    const examListHtml = filteredExams.length > 0 ? filteredExams.map(exam => `
        <div class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow border-l-4 border-[#B80236] h-full flex flex-col">
            <div class="flex-1">
                <p class="font-bold text-gray-900 text-xl mb-2">${exam.subject}</p>
                <p class="text-gray-600 font-medium mb-4">${exam.exam_id}</p>
                <div class="flex flex-wrap gap-3 text-sm text-gray-600">
                    <span class="flex items-center gap-1">
                        <i data-lucide="list" class="w-4 h-4"></i> 
                        ${exam.questions.length} Questions
                    </span>
                    <span class="flex items-center gap-1">
                        <i data-lucide="clock" class="w-4 h-4"></i> 
                        ${exam.duration} mins
                    </span>
                    <span class="flex items-center gap-1">
                        <i data-lucide="school" class="w-4 h-4"></i> 
                        ${exam.class}
                    </span>
                </div>
            </div>
            <button onclick="startExamSafe('${exam.exam_id}')" 
                    class="bg-[#B80236] hover:bg-[#900028] text-white px-6 py-3 rounded-lg font-bold transition-all transform hover:scale-105 mt-4 w-full flex items-center justify-center gap-2">
                Start Exam
                <i data-lucide="arrow-right" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('') : `
        <div class="col-span-full text-center py-12">
            <i data-lucide="inbox" class="w-16 h-16 text-gray-400 mx-auto mb-4"></i>
            <p class="text-gray-500 text-lg">No exams available for your class.</p>
        </div>
    `;

    return `
        <div class="min-h-screen bg-gray-50">
            <header class="bg-[#B80236] text-white p-4 md:p-6 shadow-lg">
                <div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold mb-2">Welcome, ${student.name}</h1>
                        <p class="text-sm md:text-base font-medium">Class: ${student.class}${student.arms}</p>
                    </div>
                    <button onclick="setPage('student-info')" 
                            class="bg-[#900028] hover:bg-[#700020] px-4 py-2 rounded-lg transition-colors text-sm flex items-center gap-2">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i> Back
                    </button>
                </div>
            </header>
            
            <main class="max-w-7xl mx-auto p-4 md:p-6">
                <div class="bg-white rounded-xl shadow-lg p-6">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-2xl font-bold text-gray-800">Select Your Exam</h2>
                        <span class="px-4 py-2 bg-[#B80236] text-white rounded-lg font-semibold">
                            ${filteredExams.length} Total
                        </span>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${examListHtml}
                    </div>
                </div>
            </main>
        </div>
    `;
}

function renderStudentExamList(state) {
    const { name = 'Student', class: studentClass = '', arms = '' } = state.studentInfo || {};

    const caExams = state.caExams || [];
    const todayExams = state.todayExams || [];

    // Default tab: CAs if any exist, else Exams Today
    const activeTab = state.studentTab || (caExams.length > 0 ? 'ca' : 'today');

    // ---- Render CAs tab ----
    const caListHtml = caExams.length > 0
        ? caExams.map(exam => `
            <div class="bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all border-l-4 border-emerald-500 mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-2xl font-bold text-gray-800">${exam.subject}</h3>
                            <span class="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold">CA</span>
                        </div>
                        <p class="text-gray-600 mt-1 text-lg font-medium">${exam.exam_id}</p>
                        <div class="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
                            <span><i data-lucide="list" class="w-4 h-4 inline"></i> ${exam.questions.length} Questions</span>
                            <span><i data-lucide="clock" class="w-4 h-4 inline"></i> ${exam.duration} mins</span>
                            <span><i data-lucide="school" class="w-4 h-4 inline"></i> ${exam.class}</span>
                        </div>
                    </div>
                    <button onclick="startExamSafe('${exam.exam_id}')"
                            class="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors whitespace-nowrap">
                        Start CA →
                    </button>
                </div>
            </div>
        `).join('')
        : `
            <div class="text-center py-16">
                <i data-lucide="clipboard-check" class="w-20 h-20 text-gray-300 mx-auto mb-4"></i>
                <p class="text-xl text-gray-600">No CAs available for</p>
                <p class="text-3xl font-bold text-emerald-600 mt-3">${studentClass}${arms || ''}</p>
                <p class="text-gray-500 mt-6">Your teacher will share CAs when they're ready.</p>
            </div>
        `;

    // ---- Render EXAMS TODAY tab ----
    const todayListHtml = todayExams.length > 0
        ? todayExams.map(exam => `
            <div class="bg-white p-6 rounded-xl shadow hover:shadow-xl transition-all border-l-4 border-[#B80236] mb-6">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <h3 class="text-2xl font-bold text-gray-800">${exam.subject}</h3>
                            <span class="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full font-bold">EXAM</span>
                        </div>
                        <p class="text-gray-600 mt-1 text-lg font-medium">${exam.exam_id}</p>
                        <div class="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
                            <span><i data-lucide="list" class="w-4 h-4 inline"></i> ${exam.questions.length} Questions</span>
                            <span><i data-lucide="clock" class="w-4 h-4 inline"></i> ${exam.duration} mins</span>
                            <span><i data-lucide="school" class="w-4 h-4 inline"></i> ${exam.class}</span>
                        </div>
                    </div>
                    <button onclick="startExamSafe('${exam.exam_id}')"
                            class="bg-[#B80236] hover:bg-[#900028] text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors whitespace-nowrap">
                        Start Exam →
                    </button>
                </div>
            </div>
        `).join('')
        : `
            <div class="text-center py-16">
                <i data-lucide="calendar-x" class="w-20 h-20 text-gray-300 mx-auto mb-4"></i>
                <p class="text-2xl font-bold text-gray-700">No exams scheduled for today</p>
                <p class="text-gray-500 mt-4">Check back on your exam day.</p>
            </div>
        `;

    return `
        <div class="min-h-screen bg-gradient-to-br from-pink-50 to-red-50">
            <header class="bg-[#B80236] text-white p-6 shadow-lg">
                <div class="max-w-5xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl md:text-3xl font-bold">Welcome, ${name}!</h1>
                        <p class="text-pink-100 text-lg">Class: ${studentClass}${arms}</p>
                    </div>
                    <button onclick="setPage('home')" class="bg-white/20 hover:bg-white/30 px-6 py-3 rounded-lg">
                        <i data-lucide="home" class="w-5 h-5"></i> Home
                    </button>
                </div>
            </header>

            <main class="max-w-5xl mx-auto p-6">
                <!-- Tabs -->
                <div class="flex gap-2 mb-8 bg-white rounded-xl p-2 shadow-md">
                    <button onclick="switchStudentTab('ca')"
                            class="flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'ca'
                                    ? 'bg-emerald-600 text-white shadow-md'
                                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                            }">
                        <i data-lucide="clipboard-check" class="w-5 h-5"></i>
                        CAs
                        <span class="text-xs px-2 py-0.5 rounded-full ${
                            activeTab === 'ca' ? 'bg-white/25' : 'bg-emerald-100 text-emerald-700'
                        }">${caExams.length}</span>
                    </button>
                    <button onclick="switchStudentTab('today')"
                            class="flex-1 py-3 px-4 rounded-lg font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'today'
                                    ? 'bg-[#B80236] text-white shadow-md'
                                    : 'bg-transparent text-gray-600 hover:bg-gray-100'
                            }">
                        <i data-lucide="calendar-check" class="w-5 h-5"></i>
                        Exams Today
                        <span class="text-xs px-2 py-0.5 rounded-full ${
                            activeTab === 'today' ? 'bg-white/25' : 'bg-rose-100 text-rose-700'
                        }">${todayExams.length}</span>
                    </button>
                </div>

                <div class="space-y-6">
                    ${activeTab === 'ca' ? caListHtml : todayListHtml}
                </div>
            </main>
        </div>
    `;
}

function renderExamInterface(state) {
    const student = state.studentInfo || {};
    const welcomeName = student.name || 'Student';
    const studentClassArms = (student.class && student.arms) ? `${student.class} ${student.arms}` : 'N/A';

    const exam = state.shuffledExam || state.selectedExam;

    if (!exam || !exam.questions || exam.questions.length === 0) {
        return `<div style="padding:40px;text-align:center;">Error: No Exam Loaded</div>`;
    }

    const currentQuestion = exam.questions[state.currentQuestionIndex];
    const totalQuestions = exam.questions.length;
    const currentQuestionNumber = state.currentQuestionIndex + 1;
    const progress = (currentQuestionNumber / totalQuestions) * 100;

    console.log('📝 Current Question:', {
        id: currentQuestion.id,
        question: currentQuestion.question.substring(0, 50),
        type: currentQuestion.type,
        hasImage: !!currentQuestion.image,
        imageLength: currentQuestion.image ? currentQuestion.image.length : 0,
        imagePreview: currentQuestion.image ? currentQuestion.image.substring(0, 100) : 'NO IMAGE'
    });

    let optionsContent = '';
    const questionType = currentQuestion.type ? currentQuestion.type.toLowerCase().trim() : '';
    const qid = currentQuestion.id;

    /* =========================================================
       MULTIPLE CHOICE
       - 2 columns x 2 rows (A+B top row, C+D bottom row)
       - No card styling, flat background
       - onclick directly updates DOM styles immediately (no re-render needed)
       - Selected = solid maroon bg + white text + white checkmark badge
    ========================================================= */
    if (questionType === 'multiple_choice') {
        const opts = currentQuestion.options || [];

        const buildClick = (label) => `
            (function(){
                var wrap = document.getElementById('opts-${qid}');
                if(!wrap) return;
                wrap.querySelectorAll('[data-opt]').forEach(function(lbl){
                    var mine = lbl.getAttribute('data-opt') === '${label}';
                    lbl.style.background = mine ? '#B80236' : '#f0f2f5';
                    var b = lbl.querySelector('[data-b]');
                    var t = lbl.querySelector('[data-t]');
                    var c = lbl.querySelector('[data-c]');
                    if(b){ b.style.background=mine?'#fff':'#d1d5db'; b.style.color=mine?'#B80236':'#4b5563'; }
                    if(t){ t.style.color=mine?'#fff':'#1f2937'; }
                    if(c){ c.style.display=mine?'flex':'none'; }
                });
                updateAnswer('${qid}', '${label}');
            })()`.replace(/\n\s+/g, ' ');

        optionsContent += `<div id="opts-${qid}" style="display:flex;flex-direction:column;gap:10px;width:100%;">`;

        [[0,1],[2,3]].forEach(function(row) {
            optionsContent += `<div style="display:flex;gap:10px;width:100%;">`;
            row.forEach(function(index) {
                const optionText = (opts[index] || '').trim();
                const optionLabel = String.fromCharCode(65 + index);
                const sel = state.studentAnswers[qid] === optionLabel;
                const dis = optionText === '';

                optionsContent += `
                    <label data-opt="${optionLabel}"
                        onclick="${buildClick(optionLabel)}"
                        style="position:relative;display:flex;align-items:center;gap:10px;flex:1;
                            padding:12px 14px;border-radius:10px;
                            cursor:${dis ? 'default' : 'pointer'};
                            opacity:${dis ? '0.35' : '1'};
                            pointer-events:${dis ? 'none' : 'auto'};
                            background:${sel ? '#B80236' : '#f0f2f5'};
                            user-select:none;">

                        <span data-b style="display:inline-flex;align-items:center;justify-content:center;
                            width:30px;height:30px;min-width:30px;border-radius:7px;
                            font-size:13px;font-weight:800;
                            background:${sel ? '#fff' : '#d1d5db'};
                            color:${sel ? '#B80236' : '#4b5563'};">
                            ${optionLabel}
                        </span>

                        <span data-t style="font-size:13px;font-weight:500;line-height:1.4;flex:1;min-width:0;
                            color:${sel ? '#fff' : '#1f2937'};">
                            ${optionText}
                        </span>

                        <span data-c style="display:${sel ? 'flex' : 'none'};align-items:center;justify-content:center;
                            width:22px;height:22px;min-width:22px;border-radius:50%;
                            background:rgba(255,255,255,0.25);flex-shrink:0;">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                                stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                            </svg>
                        </span>

                        <input type="radio" name="answer-${qid}" value="${optionLabel}"
                            ${sel ? 'checked' : ''} ${dis ? 'disabled' : ''}
                            style="position:absolute;width:0;height:0;opacity:0;pointer-events:none;">
                    </label>`;
            });
            optionsContent += `</div>`;
        });

        optionsContent += `</div>`;
    }

    /* =========================================================
       TRUE / FALSE
       - Side by side, same direct DOM onclick approach
       - Selected = solid maroon
    ========================================================= */
    else if (questionType === 'true_false' || questionType === 'truefalse') {
        const sel = state.studentAnswers[qid];

        const tfClick = (val) => `
            (function(){
                ['True','False'].forEach(function(v){
                    var lbl = document.getElementById('tf-${qid}-'+v);
                    if(!lbl) return;
                    var mine = v === '${val}';
                    lbl.style.background = mine ? '#B80236' : '#f0f2f5';
                    var ic = lbl.querySelector('[data-ic]');
                    var tx = lbl.querySelector('[data-tx]');
                    if(ic){ ic.style.background = mine ? 'rgba(255,255,255,0.25)' : (v==='True'?'#dcfce7':'#fee2e2'); }
                    if(tx){ tx.style.color = mine ? '#fff' : '#374151'; }
                });
                updateAnswer('${qid}', '${val}');
            })()`.replace(/\n\s+/g, ' ');

        optionsContent = `
            <div style="display:flex;gap:14px;width:100%;max-width:500px;margin:0 auto;">

                <label id="tf-${qid}-True" onclick="${tfClick('True')}"
                    style="position:relative;flex:1;display:flex;flex-direction:column;
                        align-items:center;justify-content:center;gap:8px;
                        padding:20px 12px;border-radius:12px;cursor:pointer;user-select:none;
                        background:${sel === 'True' ? '#B80236' : '#f0f2f5'};">
                    <div data-ic style="width:42px;height:42px;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;
                        background:${sel === 'True' ? 'rgba(255,255,255,0.25)' : '#dcfce7'};">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"
                            stroke="${sel === 'True' ? '#fff' : '#16a34a'}" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                        </svg>
                    </div>
                    <span data-tx style="font-size:15px;font-weight:800;
                        color:${sel === 'True' ? '#fff' : '#374151'};">TRUE</span>
                    <input type="radio" name="answer-${qid}" value="True"
                        ${sel === 'True' ? 'checked' : ''}
                        style="position:absolute;width:0;height:0;opacity:0;pointer-events:none;">
                </label>

                <label id="tf-${qid}-False" onclick="${tfClick('False')}"
                    style="position:relative;flex:1;display:flex;flex-direction:column;
                        align-items:center;justify-content:center;gap:8px;
                        padding:20px 12px;border-radius:12px;cursor:pointer;user-select:none;
                        background:${sel === 'False' ? '#B80236' : '#f0f2f5'};">
                    <div data-ic style="width:42px;height:42px;border-radius:50%;
                        display:flex;align-items:center;justify-content:center;
                        background:${sel === 'False' ? 'rgba(255,255,255,0.25)' : '#fee2e2'};">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"
                            stroke="${sel === 'False' ? '#fff' : '#dc2626'}" stroke-width="2.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </div>
                    <span data-tx style="font-size:15px;font-weight:800;
                        color:${sel === 'False' ? '#fff' : '#374151'};">FALSE</span>
                    <input type="radio" name="answer-${qid}" value="False"
                        ${sel === 'False' ? 'checked' : ''}
                        style="position:absolute;width:0;height:0;opacity:0;pointer-events:none;">
                </label>
            </div>`;
    }

    /* =========================================================
       FULL PAGE LAYOUT
    ========================================================= */
    return `
        <div class="no-select" style="position:fixed;inset:0;display:flex;flex-direction:column;
            height:100vh;background:#f0f2f5;overflow:hidden;margin:0;padding:0;">

            <!-- HEADER -->
            <header style="position:relative;flex-shrink:0;z-index:40;
                background:linear-gradient(90deg,#B80236 0%,#8a0228 100%);
                padding:10px 20px;-webkit-app-region:no-drag;">
                <div style="position:absolute;inset:0;opacity:0.07;pointer-events:none;
                    background-image:radial-gradient(circle,#fff 1px,transparent 1px);
                    background-size:18px 18px;"></div>
                <div style="position:relative;display:flex;justify-content:space-between;align-items:center;">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:40px;height:40px;border-radius:50%;
                            background:rgba(255,255,255,0.2);border:2px solid rgba(255,255,255,0.4);
                            display:flex;align-items:center;justify-content:center;
                            font-size:17px;font-weight:800;color:#fff;flex-shrink:0;">
                            ${welcomeName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style="font-size:15px;font-weight:700;color:#fff;line-height:1.2;">${exam.subject}</div>
                            <div style="font-size:12px;color:rgba(255,255,255,0.85);">
                                <b>${welcomeName}</b>&nbsp;•&nbsp;${studentClassArms}
                            </div>
                        </div>
                    </div>
                    <div style="background:linear-gradient(135deg,#fbbf24,#f59e0b);border-radius:12px;
                        padding:7px 16px;border:2px solid rgba(255,255,255,0.5);
                        box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                        <div style="font-size:10px;font-weight:700;color:#1f2937;text-transform:uppercase;letter-spacing:0.05em;">Time Left</div>
                        <div id="timer-display" style="font-size:22px;font-family:monospace;font-weight:900;color:#111;line-height:1.1;">
                            ${formatTime(state.timeRemaining)}
                        </div>
                    </div>
                </div>
            </header>

            <!-- PROGRESS BAR -->
            <div style="height:4px;background:#dde1e7;flex-shrink:0;">
                <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#22c55e,#16a34a);transition:width 0.4s;"></div>
            </div>

            <!-- BODY -->
            <div style="display:flex;flex:1;overflow:hidden;gap:12px;padding:12px;min-height:0;">

                <!-- SIDEBAR -->
                <aside class="hidden lg:flex" style="flex-direction:column;width:215px;flex-shrink:0;
                    background:#fff;border-radius:18px;box-shadow:0 2px 16px rgba(0,0,0,0.07);
                    padding:14px;overflow-y:auto;">

                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                        <span style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.07em;">Questions</span>
                        <span style="font-size:10px;font-weight:700;color:#B80236;background:#fce7f3;padding:1px 8px;border-radius:20px;">${totalQuestions}</span>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:5px;margin-bottom:14px;">
                        ${exam.questions.map((q, idx) => {
                            const isAnswered = !!state.studentAnswers[q.id];
                            const isCurrent = idx === state.currentQuestionIndex;
                            const bg = isCurrent ? '#B80236' : isAnswered ? '#22c55e' : '#f3f4f6';
                            const col = (isCurrent || isAnswered) ? '#fff' : '#6b7280';
                            const ring = isCurrent ? 'box-shadow:0 0 0 2px #fff,0 0 0 4px #B80236;' : '';
                            return `<button onclick="goToQuestion(${idx})" style="height:34px;border-radius:7px;
                                font-size:11px;font-weight:700;border:none;cursor:pointer;
                                background:${bg};color:${col};${ring}transition:all 0.15s;">
                                ${idx + 1}
                            </button>`;
                        }).join('')}
                    </div>

                    <div style="border-top:1px solid #f3f4f6;padding-top:10px;display:flex;flex-direction:column;gap:7px;">
                        <div style="display:flex;align-items:center;gap:7px;">
                            <div style="width:11px;height:11px;border-radius:3px;background:#B80236;"></div>
                            <span style="font-size:11px;color:#6b7280;">Current</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:7px;">
                            <div style="width:11px;height:11px;border-radius:3px;background:#22c55e;"></div>
                            <span style="font-size:11px;color:#6b7280;">Answered</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:7px;">
                            <div style="width:11px;height:11px;border-radius:3px;background:#e5e7eb;border:1px solid #d1d5db;"></div>
                            <span style="font-size:11px;color:#6b7280;">Pending</span>
                        </div>
                    </div>

                    <div style="margin-top:auto;padding-top:12px;border-top:1px solid #f3f4f6;">
                        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                            <span style="font-size:11px;color:#6b7280;">Progress</span>
                            <span style="font-size:11px;font-weight:700;color:#B80236;">${Math.round(progress)}%</span>
                        </div>
                        <div style="height:5px;background:#e5e7eb;border-radius:99px;overflow:hidden;">
                            <div style="height:100%;width:${progress}%;background:linear-gradient(90deg,#B80236,#8a0228);border-radius:99px;transition:width 0.4s;"></div>
                        </div>
                    </div>
                </aside>

                <!-- MAIN PANEL -->
                <main style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;min-height:0;">
                    <div style="flex:1;background:#fff;border-radius:18px;
                        box-shadow:0 2px 16px rgba(0,0,0,0.07);
                        display:flex;flex-direction:column;overflow:hidden;min-height:0;">

                        <!-- Question + image -->
                        <div style="flex-shrink:0;padding:16px 20px 14px;border-bottom:2px solid #f3f4f6;">
                            ${isValidImageSrc(currentQuestion.image) ? `
                                <div style="display:flex;justify-content:center;margin-bottom:10px;">
                                    <img src="${currentQuestion.image}" alt="Question diagram"
                                        style="max-width:100%;max-height:80px;border-radius:10px;
                                            border:2px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.1);cursor:pointer;"
                                        onclick="openImageModal('${currentQuestion.image.replace(/'/g, "\\'")}')"/>
                                </div>` : ''}
                            <div style="border-left:4px solid #B80236;padding-left:12px;">
                                <p style="margin:0;font-size:17px;font-weight:600;color:#1f2937;line-height:1.6;">
                                    ${currentQuestion.question}
                                </p>
                            </div>
                        </div>

                        <!-- Options -->
                        <div style="flex:1;display:flex;align-items:center;padding:16px 20px;overflow:hidden;min-height:0;">
                            <div style="width:100%;">
                                ${optionsContent}
                            </div>
                        </div>
                    </div>
                </main>
            </div>

            <!-- FOOTER -->
            <footer style="flex-shrink:0;padding:6px 14px 12px;z-index:30;">
                <div style="background:#fff;border-radius:14px;padding:9px 16px;
                    box-shadow:0 2px 12px rgba(0,0,0,0.08);
                    display:flex;justify-content:space-between;align-items:center;">

                    <button onclick="changeQuestion(-1)"
                        ${state.currentQuestionIndex === 0 ? 'style="visibility:hidden;"' : ''}
                        style="display:flex;align-items:center;gap:6px;padding:7px 18px;
                            font-size:13px;font-weight:700;border:none;border-radius:9px;cursor:pointer;
                            background:#f3f4f6;color:#374151;">
                        <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                        </svg>
                        Previous
                    </button>

                    <span class="lg:hidden" style="font-size:13px;font-weight:700;color:#9ca3af;">
                        ${currentQuestionNumber} / ${totalQuestions}
                    </span>

                    ${state.currentQuestionIndex === totalQuestions - 1
                        ? `<button onclick="submitExam()"
                                style="display:flex;align-items:center;gap:6px;padding:7px 22px;
                                    font-size:13px;font-weight:700;border:none;border-radius:9px;cursor:pointer;
                                    background:linear-gradient(90deg,#22c55e,#16a34a);color:#fff;">
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Submit Exam
                            </button>`
                        : `<button onclick="changeQuestion(1)"
                                style="display:flex;align-items:center;gap:6px;padding:7px 22px;
                                    font-size:13px;font-weight:700;border:none;border-radius:9px;cursor:pointer;
                                    background:linear-gradient(90deg,#B80236,#8a0228);color:#fff;">
                                Next
                                <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                                </svg>
                            </button>`
                    }
                </div>
            </footer>
        </div>
    `;
}

function renderStudentResultsPage() {
    return `<div class="min-h-screen flex items-center justify-center p-4"><p class="text-xl text-gray-600">Student result viewing is disabled.</p></div>`;
}

function renderStudentResultModal(result) {
    const percentage = result.percentage || 0;
    const passed = percentage >= 50;
    const wrong = result.total - result.score;
    
    return `
        <div id="result-modal" class="fixed inset-0 bg-gradient-to-br from-orange-900/90 via-red-900/90 to-orange-900/90 backdrop-blur-sm flex items-center justify-center z-[9999] p-3">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[96vh] overflow-y-auto">
                <!-- Header -->
                <div class="bg-gradient-to-br from-orange-600 via-red-700 to-orange-800 text-white p-4 rounded-t-2xl relative overflow-hidden">
                    <div class="absolute inset-0 opacity-10">
                        <div class="absolute inset-0" style="background-image: 
                            repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px);"></div>
                    </div>
                    
                    <div class="relative">
                        <div class="text-center mb-3">
                            <h2 class="text-lg font-bold mb-0.5">Exam Completed! 🎉</h2>
                            <p class="text-white/80 text-xs">${result.student_name || 'Student'}</p>
                        </div>
                        
                        <div class="flex justify-center mb-2">
                            <div class="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex flex-col items-center justify-center shadow-xl">
                                <div class="text-4xl font-black text-white leading-none">
                                    ${result.score}
                                </div>
                                <div class="flex items-center gap-1 text-white/80">
                                    <div class="h-px w-3 bg-white/50"></div>
                                    <span class="text-base font-bold">${result.total}</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="text-center">
                            <span class="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold">
                                ${passed ? 'Passed ✓' : 'Needs Improvement'} • ${percentage}%
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-4">
                    <!-- Stats Grid -->
                    <div class="grid grid-cols-3 gap-2 mb-3">
                        <div class="bg-gradient-to-br from-emerald-50 to-green-50 p-2.5 rounded-lg text-center border-2 border-emerald-200">
                            <div class="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                                <i data-lucide="check" class="w-3.5 h-3.5 text-white"></i>
                            </div>
                            <p class="text-xl font-black text-emerald-600">${result.score}</p>
                            <p class="text-[8px] font-bold text-emerald-700 uppercase">Correct</p>
                        </div>
                        <div class="bg-gradient-to-br from-rose-50 to-red-50 p-2.5 rounded-lg text-center border-2 border-rose-200">
                            <div class="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-rose-500 to-red-600 rounded-lg flex items-center justify-center">
                                <i data-lucide="x" class="w-3.5 h-3.5 text-white"></i>
                            </div>
                            <p class="text-xl font-black text-rose-600">${wrong}</p>
                            <p class="text-[8px] font-bold text-rose-700 uppercase">Wrong</p>
                        </div>
                        <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-2.5 rounded-lg text-center border-2 border-blue-200">
                            <div class="w-7 h-7 mx-auto mb-1 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <i data-lucide="list" class="w-3.5 h-3.5 text-white"></i>
                            </div>
                            <p class="text-xl font-black text-blue-600">${result.total}</p>
                            <p class="text-[8px] font-bold text-blue-700 uppercase">Total</p>
                        </div>
                    </div>

                    <!-- Quick Info -->
                    <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-2.5 mb-3 border border-orange-200">
                        <div class="flex items-center justify-between text-xs">
                            <div class="flex items-center gap-1.5">
                                <i data-lucide="clock" class="w-3.5 h-3.5 text-orange-600"></i>
                                <span class="font-bold text-orange-900 font-mono">
                                    ${Math.floor((result.duration_taken || 0) / 60)}:${((result.duration_taken || 0) % 60).toString().padStart(2, '0')}
                                </span>
                            </div>
                            <div class="h-3 w-px bg-orange-300"></div>
                            <div class="flex items-center gap-1.5">
                                <i data-lucide="book-open" class="w-3.5 h-3.5 text-orange-600"></i>
                                <span class="font-semibold text-orange-900 truncate max-w-[120px]">
                                    ${result.exam_id || result.exam_subject || 'Exam'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Performance Message -->
                    <div class="bg-gradient-to-r ${passed ? 'from-emerald-500 to-green-600' : 'from-orange-500 to-red-600'} p-2.5 rounded-lg mb-3 text-center">
                        <p class="font-bold text-white text-xs leading-tight">
                            ${passed 
                                ? percentage >= 70 
                                    ? '🌟 Excellent work!' 
                                    : '👍 Good job!'
                                : '💪 Keep practicing!'}
                        </p>
                    </div>

                    <!-- View Answers Toggle -->
                    ${window.state?.answersExpanded ? '' : `
                    <button 
                        onclick="toggleAnswers()" 
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-3 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 mb-3"
                    >
                        <i data-lucide="chevron-down" class="w-3.5 h-3.5"></i>
                        View Answers
                    </button>
                    `}

                    ${window.state?.answersExpanded ? `
                    <div class="mb-3">
                        <button 
                            onclick="toggleAnswers()" 
                            class="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 px-3 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 mb-2"
                        >
                            <i data-lucide="chevron-up" class="w-3.5 h-3.5"></i>
                            Hide Answers
                        </button>
                        <div class="max-h-[200px] overflow-y-auto">
                            ${renderDetailedAnswers(result)}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Action Buttons -->
                    <div class="grid grid-cols-2 gap-2">
                        <button 
                            onclick="closeResultModal(); setPage('home');" 
                            class="bg-gradient-to-br from-orange-600 to-red-700 hover:from-orange-700 hover:to-red-800 text-white py-2.5 px-3 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            <i data-lucide="home" class="w-3.5 h-3.5"></i>
                            EXIT
                        </button>
                        <button 
                            onclick="closeResultModal(); setPage('student-info');" 
                            class="bg-gradient-to-br ${passed ? 'from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700' : 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'} text-white py-2.5 px-3 rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                            <i data-lucide="${passed ? 'arrow-right' : 'refresh-cw'}" class="w-3.5 h-3.5"></i>
                            ${passed ? 'NEXT' : 'RETRY'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Export to global scope
window.renderStudentInfoForm = renderStudentInfoForm;
window.renderStudentDashboard = renderStudentDashboard;
window.renderStudentExamList = renderStudentExamList;
window.renderExamInterface = renderExamInterface;
window.renderStudentResultsPage = renderStudentResultsPage;
window.renderStudentResultModal = renderStudentResultModal;