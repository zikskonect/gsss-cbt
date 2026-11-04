// www/js/features/admin/admin-exam-settings.js
// Admin setting for question limit & shuffling

const AdminExamSettings = {
    async loadSettings() {
        try {
            const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            const res = await fetch(`${apiBase}/exam-settings`);
            const data = await res.json();
            return data.data || data || { questions_per_exam: 40, shuffle_questions: 1, shuffle_options: 1 };
        } catch (e) {
            // Fallback to localStorage
            const local = localStorage.getItem('exam_settings');
            if (local) return JSON.parse(local);
            return { questions_per_exam: 40, shuffle_questions: 1, shuffle_options: 1 };
        }
    },

    async saveSettings(settings) {
        try {
            const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            const res = await fetch(`${apiBase}/exam-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            localStorage.setItem('exam_settings', JSON.stringify(settings));
            return data;
        } catch (e) {
            localStorage.setItem('exam_settings', JSON.stringify(settings));
            return { ok: true, message: 'Saved locally (offline)' };
        }
    },

    async renderPanel() {
        const settings = await this.loadSettings();
        
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-3xl">
                <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2 mb-1">
                    <i data-lucide="settings-2" class="w-5 h-5 text-purple-600"></i>
                    Exam Question Settings - Question Bank Shuffling
                </h3>
                <p class="text-sm text-gray-500 mb-6">Set how many questions students get from the bank. E.g., 40 random out of 200+ questions.</p>

                <div class="space-y-6">
                    <!-- Questions per exam -->
                    <div class="border border-gray-200 rounded-lg p-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-2">
                            Questions per exam (Limit)
                        </label>
                        <div class="flex items-center gap-4">
                            <input type="number" id="questionsLimit" value="${settings.questions_per_exam || 40}" min="1" max="200" 
                                   class="w-32 px-4 py-2 border border-gray-300 rounded-lg text-lg font-bold text-center">
                            <div class="text-sm text-gray-600">
                                <div>Students will get <strong id="limitPreview" class="text-purple-700 text-lg">${settings.questions_per_exam || 40}</strong> random questions</div>
                                <div>From bank of <span id="bankCount">...</span> questions (shuffled)</div>
                            </div>
                        </div>
                        <div class="mt-3 flex gap-2">
                            <button onclick="document.getElementById('questionsLimit').value=20; AdminExamSettings.updatePreview()" class="px-3 py-1 bg-gray-100 rounded text-sm">20</button>
                            <button onclick="document.getElementById('questionsLimit').value=40; AdminExamSettings.updatePreview()" class="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm font-bold">40 (Recommended)</button>
                            <button onclick="document.getElementById('questionsLimit').value=50; AdminExamSettings.updatePreview()" class="px-3 py-1 bg-gray-100 rounded text-sm">50</button>
                            <button onclick="document.getElementById('questionsLimit').value=100; AdminExamSettings.updatePreview()" class="px-3 py-1 bg-gray-100 rounded text-sm">100</button>
                        </div>
                        <p class="text-xs text-gray-500 mt-2">If bank has 200 questions and limit is 40, each student gets 40 different random questions.</p>
                    </div>

                    <!-- Shuffle settings -->
                    <div class="border border-gray-200 rounded-lg p-4">
                        <label class="block text-sm font-semibold text-gray-700 mb-3">Shuffling Options</label>
                        
                        <label class="flex items-center gap-3 py-2 cursor-pointer">
                            <input type="checkbox" id="shuffleQuestions" ${settings.shuffle_questions ? 'checked' : ''} class="w-5 h-5 text-purple-600 rounded">
                            <div>
                                <div class="font-medium">Shuffle Questions</div>
                                <div class="text-xs text-gray-500">Each student gets questions in different order (prevents cheating)</div>
                            </div>
                        </label>

                        <label class="flex items-center gap-3 py-2 cursor-pointer">
                            <input type="checkbox" id="shuffleOptions" ${settings.shuffle_options ? 'checked' : ''} class="w-5 h-5 text-purple-600 rounded">
                            <div>
                                <div class="font-medium">Shuffle Options (A-D)</div>
                                <div class="text-xs text-gray-500">Options A-D shuffled for each student</div>
                            </div>
                        </label>
                    </div>

                    <!-- How it works -->
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 class="font-semibold text-blue-900 mb-2">How it works:</h4>
                        <ul class="text-sm text-blue-800 space-y-1 list-disc list-inside">
                            <li>Teacher sets 200+ questions in question bank</li>
                            <li>Admin sets limit to 40 here</li>
                            <li>Student A logs in → Gets random 40 questions (Q23, Q105, Q7, ...)</li>
                            <li>Student B logs in → Gets different random 40 (Q156, Q12, Q89, ...)</li>
                            <li>Same student retakes → Gets another random 40</li>
                            <li>Prevents cheating, fair distribution</li>
                        </ul>
                    </div>

                    <!-- Save -->
                    <div class="flex gap-3">
                        <button onclick="AdminExamSettings.save()" class="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2">
                            <i data-lucide="save" class="w-4 h-4"></i>
                            Save Settings
                        </button>
                        <button onclick="AdminExamSettings.testShuffle()" class="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200">
                            Test Shuffle (Preview 5 random)
                        </button>
                    </div>

                    <div id="examSettingsStatus" class="text-sm mt-3"></div>
                    <div id="shuffleTestResult" class="mt-4"></div>
                </div>
            </div>

            <script>
                setTimeout(() => {
                    const input = document.getElementById('questionsLimit');
                    if (input) {
                        input.addEventListener('input', () => AdminExamSettings.updatePreview());
                        AdminExamSettings.updatePreview();
                        AdminExamSettings.loadBankCount();
                    }
                }, 100);
            </script>
        `;
    },

    updatePreview() {
        const val = document.getElementById('questionsLimit')?.value || 40;
        const preview = document.getElementById('limitPreview');
        if (preview) preview.textContent = val;
    },

    async loadBankCount() {
        try {
            const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            const res = await fetch(`${apiBase}/questions/count`);
            const data = await res.json();
            const count = data.count || data.total || 0;
            const el = document.getElementById('bankCount');
            if (el) el.textContent = count + (count ? '' : ' (add questions first)');
        } catch (e) {
            const el = document.getElementById('bankCount');
            if (el) el.textContent = '200+ (estimated)';
        }
    },

    async save() {
        const limit = parseInt(document.getElementById('questionsLimit').value) || 40;
        const shuffleQ = document.getElementById('shuffleQuestions').checked ? 1 : 0;
        const shuffleO = document.getElementById('shuffleOptions').checked ? 1 : 0;

        const settings = {
            questions_per_exam: limit,
            shuffle_questions: shuffleQ,
            shuffle_options: shuffleO
        };

        const status = document.getElementById('examSettingsStatus');
        status.innerHTML = '<span class="text-blue-600">Saving...</span>';

        try {
            const result = await this.saveSettings(settings);
            status.innerHTML = `<span class="text-green-600">✅ Saved! Students will now get ${limit} random questions per exam. ${result.message || ''}</span>`;
            if (typeof showAlert === 'function') showAlert(`Settings saved: ${limit} questions per exam`, 'success');
        } catch (e) {
            status.innerHTML = `<span class="text-red-600">❌ Save failed: ${e.message}</span>`;
        }
    },

    async testShuffle() {
        const limit = parseInt(document.getElementById('questionsLimit').value) || 40;
        const resultDiv = document.getElementById('shuffleTestResult');
        resultDiv.innerHTML = '<div class="text-sm text-gray-500">Testing shuffle...</div>';

        try {
            const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
            // Get all questions then shuffle client-side for preview
            const res = await fetch(`${apiBase}/questions`);
            const data = await res.json();
            const questions = data.data || data.questions || data || [];
            
            if (!questions.length) {
                resultDiv.innerHTML = '<div class="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">No questions in bank yet. Add questions first.</div>';
                return;
            }

            // Shuffle and take limit
            const shuffled = [...questions].sort(() => 0.5 - Math.random()).slice(0, Math.min(5, limit));
            
            let html = `<div class="border border-gray-200 rounded-lg p-3 bg-gray-50"><div class="font-semibold mb-2">Preview: 5 random out of ${questions.length} (limit: ${limit}):</div>`;
            shuffled.forEach((q, i) => {
                html += `<div class="text-sm py-1 border-b border-gray-200 last:border-0">${i+1}. ${q.question_text ? q.question_text.substring(0,80)+'...' : q.question || 'Question '+q.id}</div>`;
            });
            html += `<div class="text-xs text-gray-500 mt-2">Each student will get different random ${limit} questions.</div></div>`;
            resultDiv.innerHTML = html;
        } catch (e) {
            resultDiv.innerHTML = `<div class="p-3 bg-red-50 border border-red-200 rounded text-sm">Test failed: ${e.message}. Bank may be empty.</div>`;
        }
    }
};

window.AdminExamSettings = AdminExamSettings;
console.log('✅ admin-exam-settings.js loaded - Question limit & shuffle');
