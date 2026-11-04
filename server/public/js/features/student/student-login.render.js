// www/js/features/student/student-login.render.js
// ═══════════════════════════════════════════════════════════
//  Student login page — exam code only, no password.
//  Pre-fills from localStorage if a student logged in before.
// ═══════════════════════════════════════════════════════════

function renderStudentLoginPage() {
    // Remember last successful code for convenience
    const lastCode = localStorage.getItem('cbt_last_exam_code') || '';
    const schoolCode = SCHOOL_CONFIG.schoolCode;
    const sampleCode = `${schoolCode}/SS1/002`;

    return `
        <div class="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] flex items-center justify-center p-4">
            <div class="bg-white rounded-2xl shadow-2xl p-6 md:p-10 w-full max-w-lg animate-fadeIn">

                <div class="text-center mb-8">
                    <div class="w-20 h-20 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E40AF] mx-auto mb-4 flex items-center justify-center shadow-lg">
                        <i data-lucide="graduation-cap" class="w-10 h-10 text-white"></i>
                    </div>
                    <h1 class="text-3xl font-bold text-gray-800 mb-2">Student Login</h1>
                    <p class="text-gray-500">Enter your exam code to begin</p>
                </div>

                <form onsubmit="handleStudentLogin(event)" class="space-y-6">
                    <div>
                        <label for="student-code-input" class="block text-sm font-semibold text-gray-700 mb-2">
                            Exam Code
                        </label>
                        <input type="text"
                               id="student-code-input"
                               value="${lastCode}"
                               placeholder="${sampleCode}"
                               autocomplete="off"
                               autocapitalize="characters"
                               spellcheck="false"
                               class="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-lg font-mono text-center tracking-widest uppercase focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all"
                               required />
                        <p class="text-xs text-gray-500 mt-2 text-center">
                            Format: <code class="bg-gray-100 px-1.5 py-0.5 rounded">${schoolCode}/CLASS/NUMBER</code>
                        </p>
                    </div>

                    <button type="submit"
                            class="w-full bg-gradient-to-r from-[#2563EB] to-[#1E40AF] text-white py-4 rounded-xl hover:opacity-95 transition-all text-lg font-bold shadow-lg flex items-center justify-center gap-2">
                        <i data-lucide="log-in" class="w-5 h-5"></i>
                        Enter Exam Hall
                    </button>

                    <button type="button"
                            onclick="setPage('home')"
                            class="w-full text-gray-500 text-sm py-2 hover:underline">
                        Back to Home
                    </button>
                </form>

                <div class="mt-8 pt-6 border-t border-gray-200">
                    <p class="text-xs text-gray-500 text-center">
                        Don't have an exam code? See your class form teacher.
                    </p>
                </div>
            </div>
        </div>
    `;
}

// Export
window.renderStudentLoginPage = renderStudentLoginPage;

console.log('✅ student-login.render.js loaded');