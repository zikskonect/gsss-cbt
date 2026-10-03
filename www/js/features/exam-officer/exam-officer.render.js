// exam-officer.render.js - Exam Officer Render Functions
// Renders exam officer pages (login, register, dashboard, upload, results, schedule)

function renderExamOfficeRegisterPage() {
    return `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl p-6 md:p-8 w-full max-w-md animate-fadeIn">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 rounded-full bg-purple-600 mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="building" class="w-8 h-8 text-white"></i>
                    </div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Exam Office Registration</h1>
                    <p class="text-gray-600 text-sm md:text-base">Create your school account.</p>
                </div>
                <form id="exam-office-registration-form" onsubmit="handleExamOfficeRegistration(event)" class="space-y-4">
                    <div>
                        <label for="exam-office-school-name" class="block text-sm font-semibold text-gray-700 mb-2">School Name</label>
                        <input type="text" id="exam-office-school-name" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" placeholder="e.g., GSSS International" required />
                    </div>
                    <div>
                        <label for="exam-office-admin-name" class="block text-sm font-semibold text-gray-700 mb-2">Admin Full Name</label>
                        <input type="text" id="exam-office-admin-name" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" required />
                    </div>
                    <div>
                        <label for="exam-office-phone" class="block text-sm font-semibold text-gray-700 mb-2">Phone Number (as ID)</label>
                        <input type="tel" id="exam-office-phone" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" placeholder="e.g., 08012345678" required />
                    </div>
                    <div>
                        <label for="exam-office-email" class="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                        <input type="email" id="exam-office-email" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" placeholder="e.g., admin@yourschool.edu" required />
                    </div>
                    <div>
                        <label for="exam-office-password" class="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input type="password" id="exam-office-password" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" required />
                    </div>

                    <button type="submit" 
                        class="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-colors text-sm md:text-base font-semibold">
                        Register School
                    </button>
                    <button type="button" onclick="setPage('exam-office-login')" class="w-full text-gray-500 text-sm py-2 hover:underline">
                        Already Registered? Login
                    </button>
                </form>
            </div>
        </div>
    `;
}

function renderExamOfficeLoginPage() {
    return `
        <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl p-6 md:p-8 w-full max-w-md animate-fadeIn">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 rounded-full bg-indigo-600 mx-auto mb-4 flex items-center justify-center">
                        <i data-lucide="building" class="w-8 h-8 text-white"></i>
                    </div>
                    <h1 class="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Exam Office Login</h1>
                    <p class="text-gray-600 text-sm md:text-base">Enter your credentials to access your school account.</p>
                </div>
                <form id="exam-office-login-form" onsubmit="handleExamOfficeLogin(event)" class="space-y-4">
                    <div>
                        <label for="exam-office-login-phone" class="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                        <input type="tel" id="exam-office-login-phone" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" placeholder="e.g., 08012345678" required />
                    </div>
                    <div>
                        <label for="exam-office-login-password" class="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input type="password" id="exam-office-login-password" class="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm md:text-base" required />
                    </div>
                    <button type="submit" 
                        class="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors text-sm md:text-base font-semibold">
                        Login
                    </button>
                    <button type="button" onclick="setPage('exam-office-register')" class="w-full text-indigo-600 text-sm py-2 hover:underline">
                        Need an account? Register here.
                    </button>
                    <button type="button" onclick="setPage('home')" class="w-full text-gray-500 text-sm py-2 hover:underline">
                        Back to Home
                    </button>
                </form>
            </div>
        </div>
    `;
}

function renderExamOfficeDashboard(state) {
    const userName = state.user ? state.user.school_name || state.user.name : 'School';

    // Split CAs and EXAMS
    const caExams = state.availableExams.filter(e => (e.assessmentType || 'EXAM') === 'CA');
    const examExams = state.availableExams.filter(e => (e.assessmentType || 'EXAM') === 'EXAM');

    // Group ONLY exams by class (matches schedule-page behavior)
    const examsByClass = {};
    examExams.forEach(exam => {
        const cls = exam.class || 'Unknown';
        if (!examsByClass[cls]) examsByClass[cls] = [];
        examsByClass[cls].push(exam);
    });

    const scheduledExams = state.availableExams.filter(exam => exam.scheduledDate);
    const totalResults = state.allResults.length;
    const totalExams = state.availableExams.length;

    // Class cards HTML
    const classCardsHtml = Object.keys(examsByClass).length > 0
        ? Object.entries(examsByClass).map(([cls, exams]) => {
            const scheduledCount = exams.filter(e => e.scheduledDate).length;
            return `
                <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer border-t-4 border-purple-600" onclick="showClassExams('${cls.replace(/'/g, "\\'")}')">
                    <div class="p-6">
                        <div class="flex items-center justify-between mb-4">
                            <div class="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                                <i data-lucide="school" class="w-6 h-6 text-white"></i>
                            </div>
                            <span class="text-2xl font-bold text-gray-800">${exams.length}</span>
                        </div>
                        <h3 class="font-bold text-lg text-gray-800">${cls}</h3>
                        <p class="text-sm text-gray-600">${scheduledCount} scheduled</p>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="col-span-3 text-center py-12"><i data-lucide="inbox" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i><p class="text-gray-500 text-lg">No exams available. Upload exams first!</p></div>';

    return `
        <style>
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #7e22ce; border-radius: 4px; }
        </style>

        <div class="flex h-screen overflow-hidden bg-gray-50 relative">
            <div id="examOfficeSidebarOverlay" class="sidebar-overlay" onclick="toggleExamOfficeSidebar()"></div>

            <aside id="examOfficeSidebar" class="sidebar-transition bg-gradient-to-b from-purple-700 to-purple-900 text-white w-64 flex-shrink-0 shadow-2xl fixed md:relative h-full z-50 overflow-y-auto sidebar-hidden md:sidebar-visible">
                <div class="flex flex-col h-full">
                    <button onclick="toggleExamOfficeSidebar()"
                            class="md:hidden absolute top-3 right-3 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>

                    <div class="p-6 border-b border-white/20">
                        <div class="flex items-center gap-3">
                            <div class="bg-white/20 p-2 rounded-lg">
                                <i data-lucide="building" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold">${userName}</h1>
                                <p class="text-xs text-purple-200">Exam Office Portal</p>
                            </div>
                        </div>
                    </div>

                    <nav class="flex-1 py-4">
                        <ul class="space-y-1 px-3">
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-dashboard')"
                                   class="exam-office-menu-item menu-item-active flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                                   data-page="exam-office-dashboard">
                                    <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                                    <span class="font-medium">Dashboard</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-schedule')"
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                                   data-page="exam-office-schedule">
                                    <i data-lucide="calendar" class="w-5 h-5"></i>
                                    <span class="font-medium">Schedule</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-results')"
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                                   data-page="exam-office-results">
                                    <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                                    <span class="font-medium">View Results</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-upload')"
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                                   data-page="exam-office-upload">
                                    <i data-lucide="upload" class="w-5 h-5"></i>
                                    <span class="font-medium">Upload Exams</span>
                                </a>
                            </li>
                            <div class="border-t border-white/20 mt-2 pt-2">
                                <li>
                                    <button onclick="logout()" class="w-full exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-left">
                                        <i data-lucide="log-out" class="w-5 h-5"></i>
                                        <span class="font-medium">Logout</span>
                                    </button>
                                </li>
                            </div>
                        </ul>
                    </nav>
                </div>
            </aside>

            <div class="flex-1 flex flex-col overflow-hidden w-full">
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                        <div class="flex items-center gap-3">
                            <button onclick="toggleExamOfficeSidebar()"
                                    class="md:hidden hamburger-btn"
                                    id="examOfficeHamburgerBtn"
                                    aria-label="Toggle menu">
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                            <div>
                                <h2 class="text-lg md:text-2xl font-bold text-gray-800">Exam Administration</h2>
                                <p class="text-xs md:text-sm text-gray-500 hidden sm:block">Click a class to schedule exams</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 md:gap-3">
                            <button class="relative p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <i data-lucide="bell" class="w-5 h-5 md:w-6 md:h-6"></i>
                                <span class="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                        </div>
                    </div>
                </header>

                <main class="flex-1 overflow-y-auto p-4 md:p-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                        <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
                            <div class="flex items-center justify-between mb-3 md:mb-4">
                                <div class="bg-white/20 p-2 md:p-3 rounded-lg">
                                    <i data-lucide="file-text" class="w-6 h-6 md:w-8 md:h-8"></i>
                                </div>
                                <span class="text-2xl md:text-3xl font-bold">${totalExams}</span>
                            </div>
                            <p class="text-blue-100 text-xs md:text-sm font-medium">Total Exams</p>
                        </div>
                        <div class="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
                            <div class="flex items-center justify-between mb-3 md:mb-4">
                                <div class="bg-white/20 p-2 md:p-3 rounded-lg">
                                    <i data-lucide="calendar" class="w-6 h-6 md:w-8 md:h-8"></i>
                                </div>
                                <span class="text-2xl md:text-3xl font-bold">${scheduledExams.length}</span>
                            </div>
                            <p class="text-green-100 text-xs md:text-sm font-medium">Scheduled Exams</p>
                        </div>
                        <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-4 md:p-6 text-white">
                            <div class="flex items-center justify-between mb-3 md:mb-4">
                                <div class="bg-white/20 p-2 md:p-3 rounded-lg">
                                    <i data-lucide="bar-chart-2" class="w-6 h-6 md:w-8 md:h-8"></i>
                                </div>
                                <span class="text-2xl md:text-3xl font-bold">${totalResults}</span>
                            </div>
                            <p class="text-purple-100 text-xs md:text-sm font-medium">Total Results</p>
                        </div>
                    </div>

                    <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl shadow-lg p-4 md:p-6 border-2 border-amber-200 mb-4 md:mb-6">
                        <div class="flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div class="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                                <div class="bg-amber-500 p-2 md:p-3 rounded-lg flex-shrink-0">
                                    <i data-lucide="upload-cloud" class="w-6 h-6 md:w-8 md:h-8 text-white"></i>
                                </div>
                                <div>
                                    <h3 class="text-base md:text-xl font-bold text-gray-800">Upload Exam(s)</h3>
                                    <p class="text-xs text-gray-600 hidden sm:block">Import exams from CSV files to your platform</p>
                                </div>
                            </div>
                            <button onclick="setPageAndCloseSidebarEO('exam-office-upload')"
                                    class="bg-amber-500 hover:bg-amber-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg transition-colors flex items-center gap-2 font-semibold shadow-md hover:shadow-lg text-sm md:text-base w-full sm:w-auto justify-center">
                                <i data-lucide="upload" class="w-4 h-4 md:w-5 md:h-5"></i>
                                <span>Upload Now</span>
                            </button>
                        </div>
                    </div>

                    <div class="bg-white rounded-xl shadow-lg p-4 md:p-6">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-6">
                            <h2 class="text-xl md:text-2xl font-bold text-gray-800">Classes</h2>
                            <span class="px-3 py-1 md:px-4 md:py-2 bg-purple-600 text-white rounded-lg font-semibold text-sm md:text-base">${Object.keys(examsByClass).length} Classes</span>
                        </div>
                        <p class="text-xs md:text-sm text-gray-600 mb-3 md:mb-4">Click on a class card to view and schedule exams for that class. CAs are excluded (they don't need scheduling).</p>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                            ${classCardsHtml}
                        </div>
                    </div>
                </main>
            </div>
        </div>

        <div id="examOfficeModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div class="flex justify-between items-center p-4 md:p-6 border-b">
                    <h3 id="modalTitle" class="text-lg md:text-xl font-bold text-gray-800"></h3>
                    <button onclick="closeExamOfficeModal()" class="text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="w-5 h-5 md:w-6 md:h-6"></i>
                    </button>
                </div>
                <div id="modalContent" class="flex-1 overflow-y-auto p-4 md:p-6"></div>
            </div>
        </div>

        <script>
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 100);
        </script>
    `;
}

function renderExamOfficeUploadPage(state) {
    const recentUploads = state.recentUploads || [];
    const userName = state.user ? state.user.school_name || state.user.name : 'School';

    return `
        <style>
            .upload-zone {
                border: 3px dashed #c084fc;
                border-radius: 16px;
                padding: 60px 30px;
                text-align: center;
                background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
                transition: all 0.3s ease;
                cursor: pointer;
                position: relative;
            }
            .upload-zone:hover, .upload-zone.drag-over {
                border-color: #7e22ce;
                background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%);
                transform: scale(1.01);
            }
            .upload-zone.has-file {
                border-color: #22c55e;
                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            }
            .file-list-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background: #fff;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                margin-bottom: 8px;
                transition: all 0.2s ease;
            }
            .file-list-item:hover {
                border-color: #c084fc;
                box-shadow: 0 2px 8px rgba(192, 132, 252, 0.15);
            }
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #7e22ce; border-radius: 4px; }
        </style>

        <div class="flex h-screen overflow-hidden bg-gray-50 relative">
            <!-- Overlay for mobile -->
            <div id="examOfficeSidebarOverlay" class="sidebar-overlay" onclick="toggleExamOfficeSidebar()"></div>
            
            <!-- Sidebar -->
            <aside id="examOfficeSidebar" class="sidebar-transition bg-gradient-to-b from-purple-700 to-purple-900 text-white w-64 flex-shrink-0 shadow-2xl fixed md:relative h-full z-50 overflow-y-auto sidebar-hidden md:sidebar-visible">
                <div class="flex flex-col h-full">
                    <button onclick="toggleExamOfficeSidebar()" 
                            class="md:hidden absolute top-3 right-3 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                    
                    <div class="p-6 border-b border-white/20">
                        <div class="flex items-center gap-3">
                            <div class="bg-white/20 p-2 rounded-lg">
                                <i data-lucide="building" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold">${userName}</h1>
                                <p class="text-xs text-purple-200">Exam Office Portal</p>
                            </div>
                        </div>
                    </div>
                    
                    <nav class="flex-1 py-4">
                        <ul class="space-y-1 px-3">
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-dashboard')" 
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-dashboard">
                                    <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                                    <span class="font-medium">Dashboard</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-schedule')" 
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-schedule">
                                    <i data-lucide="calendar" class="w-5 h-5"></i>
                                    <span class="font-medium">Schedule</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-results')" 
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-results">
                                    <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                                    <span class="font-medium">View Results</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-upload')" 
                                   class="exam-office-menu-item menu-item-active flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-upload">
                                    <i data-lucide="upload" class="w-5 h-5"></i>
                                    <span class="font-medium">Upload Exams</span>
                                </a>
                            </li>
                            <div class="border-t border-white/20 mt-2 pt-2">
                            <li>
                                <button onclick="logout()" class="w-full exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-left">
                                    <i data-lucide="log-out" class="w-5 h-5"></i>
                                    <span class="font-medium">Logout</span>
                                </button>
                            </li>
                            </div>
                        </ul>
                    </nav>
                </div>
            </aside>

            <!-- Main Content -->
            <div class="flex-1 flex flex-col overflow-hidden w-full">
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                        <div class="flex items-center gap-3">
                            <button onclick="toggleExamOfficeSidebar()" 
                                    class="md:hidden hamburger-btn" 
                                    id="examOfficeHamburgerBtn"
                                    aria-label="Toggle menu">
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                            <div>
                                <h2 class="text-lg md:text-2xl font-bold text-gray-800">Upload Exams</h2>
                                <p class="text-xs md:text-sm text-gray-500 hidden sm:block">Import exam files (CSV) to your school platform</p>
                            </div>
                        </div>
                    </div>
                </header>

                                    <!-- Package Import Banner (compact) -->
                    <div class="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-3 md:p-4 mb-4 md:mb-6">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <div class="bg-indigo-600 p-2 rounded-lg flex-shrink-0">
                                    <i data-lucide="package" class="w-5 h-5 text-white"></i>
                                </div>
                                <div class="min-w-0">
                                    <p class="font-semibold text-gray-800 text-sm md:text-base">Import Complete Package</p>
                                    <p class="text-xs text-gray-600">Replace all exams with a single package file</p>
                                </div>
                            </div>
                            <button onclick="handleImportPackage()" 
                                    class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg flex-shrink-0">
                                <i data-lucide="package-plus" class="w-4 h-4"></i>
                                <span>Import Package</span>
                            </button>
                        </div>
                    </div>

                <main class="flex-1 overflow-y-auto p-4 md:p-6">
                    <!-- Upload Instructions Card -->
                    <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 md:p-6 mb-4 md:mb-6">
                        <div class="flex items-start gap-3 mb-2">
                            <i data-lucide="info" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"></i>
                            <div>
                                <h3 class="font-semibold text-blue-800">How It Works</h3>
                                <p class="text-sm text-blue-700 mt-1">Upload one or more CSV exam files. The file format must match the standard CSV export format (exam_id, subject, class, duration, questions_json). You can upload files for multiple classes at once.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Upload Area -->
                    <div class="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-4 md:mb-6">
                        <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <i data-lucide="upload-cloud" class="w-6 h-6 text-purple-600"></i>
                            Upload Exam Files
                        </h2>

                        <div id="upload-zone" class="upload-zone" onclick="document.getElementById('exam-file-input').click()" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
                            <input type="file" id="exam-file-input" multiple accept=".csv,text/csv" onchange="handleExamOfficeFileSelect(event)" style="display:none;">
                            <div id="upload-content">
                                <i data-lucide="upload-cloud" class="w-16 h-16 text-purple-400 mx-auto mb-4"></i>
                                <p class="text-lg font-semibold text-gray-700 mb-2">Drag & Drop CSV files here</p>
                                <p class="text-sm text-gray-500 mb-4">or click to browse your files</p>
                                <span class="inline-block bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-xs font-semibold">.csv format only</span>
                            </div>
                            <div id="upload-status" class="hidden mt-4">
                                <div class="flex items-center justify-between mb-2">
                                    <span id="files-selected-info" class="text-sm font-medium text-gray-700"></span>
                                    <button onclick="clearFileList()" class="text-sm text-red-500 hover:underline">Clear All</button>
                                </div>
                                <div id="file-list" class="space-y-1"></div>
                                <div class="flex justify-between items-center mt-4">
                                    <span id="upload-progress-text" class="text-sm text-gray-500"></span>
                                    <button id="process-upload-btn" onclick="processExamUpload()" class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-colors flex items-center gap-2">
                                        <i data-lucide="upload" class="w-4 h-4"></i>
                                        Upload & Save All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Recently Uploaded Exams -->
                    <div class="bg-white rounded-xl shadow-lg p-4 md:p-6">
                        <div class="flex justify-between items-center mb-4">
                            <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <i data-lucide="clock" class="w-5 h-5 text-purple-600"></i>
                                Recent Uploads
                            </h2>
                            <span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold">${recentUploads.length} upload(s)</span>
                        </div>

                        ${recentUploads.length > 0 ? `
                            <div class="space-y-3">
                                ${recentUploads.map((upload, idx) => `
                                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div class="flex items-center gap-3">
                                            <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <i data-lucide="file-text" class="w-5 h-5 text-purple-600"></i>
                                            </div>
                                            <div class="min-w-0">
                                                <p class="font-semibold text-gray-800 truncate">${upload.filename}</p>
                                                <p class="text-xs text-gray-500">${upload.examCount} exam(s) • ${upload.questionCount} question(s)</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-2 flex-shrink-0">
                                            <span class="text-xs px-2 py-1 ${upload.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'} rounded-full font-semibold">${upload.status === 'success' ? 'Processed' : 'Pending'}</span>
                                            <span class="text-xs text-gray-400">${upload.time}</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <div class="text-center py-8">
                                <i data-lucide="inbox" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                                <p class="text-gray-500">No uploads yet. Upload your first exam file above!</p>
                            </div>
                        `}
                    </div>
                </main>
            </div>
        </div>

        <script>
            setTimeout(() => { 
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons(); 
                }
            }, 100);
        </script>
    `;
}

// ========================================
// EXAM OFFICE SCHEDULE PAGE
// ========================================

function renderExamOfficeSchedulePage(state) {
    const userName = state.user ? state.user.school_name || state.user.name : 'School';

    // Separate CA and Exam assessments
    const caExams = state.availableExams.filter(e => (e.assessmentType || 'EXAM') === 'CA');
    const examExams = state.availableExams.filter(e => (e.assessmentType || 'EXAM') === 'EXAM');

    // Group EXAM exams by class (CAs don't need scheduling)
    const examsByClass = {};
    examExams.forEach(exam => {
        const cls = exam.class || 'Unknown';
        if (!examsByClass[cls]) examsByClass[cls] = [];
        examsByClass[cls].push(exam);
    });

    const today = new Date().toISOString().split('T')[0];

    // Class cards HTML with scheduling
    const classCardsHtml = Object.keys(examsByClass).length > 0
        ? Object.entries(examsByClass).map(([cls, exams]) => {
            return `
                <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden border-t-4 border-purple-600">
                    <div class="p-5">
                        <div class="flex items-center justify-between mb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
                                    <i data-lucide="school" class="w-5 h-5 text-white"></i>
                                </div>
                                <h3 class="font-bold text-lg text-gray-800">${cls}</h3>
                            </div>
                            <span class="text-sm font-semibold text-gray-500">${exams.length} exams</span>
                        </div>

                        <button onclick="openClassScheduleModal('${cls.replace(/'/g, "\\'")}')"
                                class="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                            <i data-lucide="calendar-plus" class="w-4 h-4"></i>
                            Schedule All for ${cls}
                        </button>

                        <div class="mt-3 space-y-2 max-h-48 overflow-y-auto">
                            ${exams.map(exam => {
                                const isScheduled = exam.scheduledDate;
                                const scheduledDate = isScheduled ? new Date(exam.scheduledDate).toLocaleDateString() : 'Not scheduled';
                                const statusLabel = getExamStatusLabel(exam);

                                let statusColor = 'text-gray-400';
                                if (statusLabel === 'upcoming') statusColor = 'text-yellow-600';
                                else if (statusLabel === 'available') statusColor = 'text-green-600';
                                else if (statusLabel === 'closed') statusColor = 'text-red-600';

                                return `
                                    <div class="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <div class="flex-1 min-w-0">
                                            <p class="text-sm font-medium text-gray-800 truncate">${exam.subject}</p>
                                            <p class="text-xs text-gray-500">${isScheduled ? '📅 ' + scheduledDate : '⏳ Not scheduled'}</p>
                                        </div>
                                        <div class="flex items-center gap-2 flex-shrink-0">
                                            <span class="text-xs font-semibold ${statusColor}">${statusLabel.charAt(0).toUpperCase() + statusLabel.slice(1)}</span>
                                            <button onclick="openExamScheduleModal('${exam.exam_id}')"
                                                    class="p-1.5 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                                    title="Schedule this exam">
                                                <i data-lucide="calendar" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="col-span-3 text-center py-12"><i data-lucide="inbox" class="w-16 h-16 text-gray-300 mx-auto mb-4"></i><p class="text-gray-500 text-lg">No Examinations available to schedule. CAs are excluded.</p></div>';

    return `
        <style>
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #7e22ce; border-radius: 4px; }
        </style>

        <div class="flex h-screen overflow-hidden bg-gray-50 relative">
            <div id="examOfficeSidebarOverlay" class="sidebar-overlay" onclick="toggleExamOfficeSidebar()"></div>

            <aside id="examOfficeSidebar" class="sidebar-transition bg-gradient-to-b from-purple-700 to-purple-900 text-white w-64 flex-shrink-0 shadow-2xl fixed md:relative h-full z-50 overflow-y-auto sidebar-hidden md:sidebar-visible">
                <div class="flex flex-col h-full">
                    <button onclick="toggleExamOfficeSidebar()"
                            class="md:hidden absolute top-3 right-3 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>

                    <div class="p-6 border-b border-white/20">
                        <div class="flex items-center gap-3">
                            <div class="bg-white/20 p-2 rounded-lg">
                                <i data-lucide="building" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold">${userName}</h1>
                                <p class="text-xs text-purple-200">Exam Office Portal</p>
                            </div>
                        </div>
                    </div>

                    <nav class="flex-1 py-4">
                        <ul class="space-y-1 px-3">
                            <li><a href="#" onclick="setPageAndCloseSidebarEO('exam-office-dashboard')" class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" data-page="exam-office-dashboard"><i data-lucide="layout-dashboard" class="w-5 h-5"></i><span class="font-medium">Dashboard</span></a></li>
                            <li><a href="#" onclick="setPageAndCloseSidebarEO('exam-office-schedule')" class="exam-office-menu-item menu-item-active flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" data-page="exam-office-schedule"><i data-lucide="calendar" class="w-5 h-5"></i><span class="font-medium">Schedule</span></a></li>
                            <li><a href="#" onclick="setPageAndCloseSidebarEO('exam-office-results')" class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" data-page="exam-office-results"><i data-lucide="bar-chart-2" class="w-5 h-5"></i><span class="font-medium">View Results</span></a></li>
                            <li><a href="#" onclick="setPageAndCloseSidebarEO('exam-office-upload')" class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" data-page="exam-office-upload"><i data-lucide="upload" class="w-5 h-5"></i><span class="font-medium">Upload Exams</span></a></li>
                            <li><button onclick="logout()" class="w-full exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-left"><i data-lucide="log-out" class="w-5 h-5"></i><span class="font-medium">Logout</span></button></li>
                        </ul>
                    </nav>
                </div>
            </aside>

            <div class="flex-1 flex flex-col overflow-hidden w-full">
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                        <div class="flex items-center gap-3">
                            <button onclick="toggleExamOfficeSidebar()"
                                    class="md:hidden hamburger-btn"
                                    id="examOfficeHamburgerBtn"
                                    aria-label="Toggle menu">
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                            <div>
                                <h2 class="text-lg md:text-2xl font-bold text-gray-800">Schedule Exams</h2>
                                <p class="text-xs md:text-sm text-gray-500 hidden sm:block">Set dates for exams and export packages</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="exportAllExamsSingleFile()"
                                    class="bg-green-600 hover:bg-green-700 text-white px-3 md:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-xs md:text-sm font-semibold">
                                <i data-lucide="package" class="w-4 h-4"></i>
                                <span class="hidden sm:inline">Export Package</span>
                                <span class="sm:hidden">Export</span>
                            </button>
                        </div>
                    </div>
                </header>

                <main class="flex-1 overflow-y-auto p-4 md:p-6">

                    ${caExams.length > 0 ? `
                        <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4 mb-4 flex items-start gap-3">
                            <i data-lucide="info" class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"></i>
                            <div class="flex-1">
                                <p class="text-sm text-blue-800 font-semibold">${caExams.length} CA exam(s) don't need scheduling</p>
                                <p class="text-xs text-blue-700 mt-0.5">Continuous Assessments are always visible to students as soon as the package is imported.</p>
                            </div>
                        </div>
                    ` : ''}

                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        ${classCardsHtml}
                    </div>
                </main>
            </div>
        </div>

        <!-- Individual Exam Schedule Modal -->
        <div id="examScheduleModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 id="examScheduleModalTitle" class="text-xl font-bold text-gray-800">Schedule Exam</h3>
                    <button onclick="closeExamScheduleModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-6">
                    <p id="examScheduleInfo" class="text-sm text-gray-600 mb-4">Set the date for this exam.</p>
                    <form id="exam-schedule-form" onsubmit="saveExamSchedule(event)">
                        <input type="hidden" id="schedule-exam-id">
                        <div class="mb-4">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Schedule Date</label>
                            <input type="date" id="schedule-date-picker"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                   min="${today}"
                                   required />
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" onclick="closeExamScheduleModal()" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                                <i data-lucide="calendar-check" class="w-4 h-4"></i>
                                Schedule
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Class Schedule Modal -->
        <div id="classScheduleModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-xl w-full max-w-md">
                <div class="flex justify-between items-center p-6 border-b">
                    <h3 id="classScheduleModalTitle" class="text-xl font-bold text-gray-800">Schedule All</h3>
                    <button onclick="closeClassScheduleModal()" class="text-gray-400 hover:text-gray-600"><i data-lucide="x" class="w-6 h-6"></i></button>
                </div>
                <div class="p-6">
                    <p id="classScheduleInfo" class="text-sm text-gray-600 mb-4">Set the date for all exams in this class.</p>
                    <form id="class-schedule-form" onsubmit="saveClassSchedule(event)">
                        <input type="hidden" id="schedule-class-name">
                        <div class="mb-4">
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Schedule Date</label>
                            <input type="date" id="class-schedule-date-picker"
                                   class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                   min="${today}"
                                   required />
                        </div>
                        <div class="flex justify-end gap-3">
                            <button type="button" onclick="closeClassScheduleModal()" class="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors">Cancel</button>
                            <button type="submit" class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                                <i data-lucide="calendar-check" class="w-4 h-4"></i>
                                Schedule All
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <script>
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }, 100);
        </script>
    `;
}

function renderExamOfficeResultsPage(state) {
    const { subject, class: studentClass, arms } = state.resultFilter || {};
    const userName = state.user?.school_name || state.user?.name || 'School';
    
    const filteredResults = state.allResults.filter(result => {
        const subjectMatch = !subject || result.exam_subject === subject;
        const classMatch = !studentClass || result.student_class === studentClass;
        const armsMatch = !arms || result.student_arms === arms;
        return subjectMatch && classMatch && armsMatch;
    });

    const getGrade = (percentage) => {
        if (percentage >= 70) return { grade: 'A1', color: 'text-green-600 bg-green-100' };
        if (percentage >= 65) return { grade: 'B2', color: 'text-green-600 bg-green-100' };
        if (percentage >= 60) return { grade: 'B3', color: 'text-yellow-600 bg-yellow-100' };
        if (percentage >= 55) return { grade: 'C4', color: 'text-yellow-600 bg-yellow-100' };
        if (percentage >= 50) return { grade: 'C5', color: 'text-yellow-700 bg-yellow-100' };
        if (percentage >= 45) return { grade: 'C6', color: 'text-orange-600 bg-yellow-100' };
        if (percentage >= 40) return { grade: 'D7', color: 'text-red-600 bg-red-100' };
        if (percentage >= 35) return { grade: 'E8', color: 'text-red-600 bg-red-100' };
        return { grade: 'F9', color: 'text-red-700 bg-red-200 font-bold' };
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const resultsList = filteredResults.length === 0 ? 
        `<tr><td colspan="9" class="px-6 py-12 text-center text-gray-500 text-lg">No results found. Try adjusting the filters.</td></tr>` :
        filteredResults.map((result, index) => {
            const totalQuestions = result.exam_details?.questions?.length || 1;
            const percentage = Math.round((result.score / totalQuestions) * 100);
            const { grade, color } = getGrade(percentage);

            return `
                <tr class="hover:bg-gray-50 transition-colors border-b">
                    <td class="px-4 py-4 text-sm font-medium text-gray-900">${index + 1}</td>
                    <td class="px-4 py-4 text-sm font-semibold text-gray-800">${result.student_name || 'Anonymous'}</td>
                    <td class="px-4 py-4 text-sm text-gray-600">${result.student_class}${result.student_arms}</td>
                    <td class="px-4 py-4 text-sm text-gray-700 font-medium">${result.exam_subject}</td>
                    <td class="px-4 py-4 text-sm font-bold text-gray-800">${result.score}<span class="text-gray-400">/${totalQuestions}</span></td>
                    <td class="px-4 py-4 text-lg font-bold text-gray-900">${percentage}%</td>
                    <td class="px-4 py-4">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${color}">
                            ${grade}
                        </span>
                    </td>
                    <td class="px-4 py-4 text-xs text-gray-500">${formatDate(result.submitted_at)}</td>
                    <td class="px-4 py-4 text-right">                        
                        <button onclick="viewDetailedResult('${result.result_id}')" 
                                class="text-purple-600 hover:text-purple-800 font-bold underline text-sm">
                            View Details
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    return `
        <style>
            ::-webkit-scrollbar { width: 8px; }
            ::-webkit-scrollbar-track { background: #f1f1f1; }
            ::-webkit-scrollbar-thumb { background: #7e22ce; border-radius: 4px; }
        </style>

        <div class="flex h-screen overflow-hidden bg-gray-50 relative">
            <!-- Overlay for mobile -->
            <div id="examOfficeSidebarOverlay" class="sidebar-overlay" onclick="toggleExamOfficeSidebar()"></div>
            
            <!-- Sidebar -->
            <aside id="examOfficeSidebar" class="sidebar-transition bg-gradient-to-b from-purple-700 to-purple-900 text-white w-64 flex-shrink-0 shadow-2xl fixed md:relative h-full z-50 overflow-y-auto sidebar-hidden md:sidebar-visible">
                <div class="flex flex-col h-full">
                    <button onclick="toggleExamOfficeSidebar()" 
                            class="md:hidden absolute top-3 right-3 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors z-10">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                    
                    <div class="p-6 border-b border-white/20">
                        <div class="flex items-center gap-3">
                            <div class="bg-white/20 p-2 rounded-lg">
                                <i data-lucide="building" class="w-8 h-8"></i>
                            </div>
                            <div>
                                <h1 class="text-xl font-bold">${userName}</h1>
                                <p class="text-xs text-purple-200">Exam Office Portal</p>
                            </div>
                        </div>
                    </div>
                    
                    <nav class="flex-1 py-4">
                        <ul class="space-y-1 px-3">
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-dashboard')" 
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-dashboard">
                                    <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
                                    <span class="font-medium">Dashboard</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-schedule')" 
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-schedule">
                                    <i data-lucide="calendar" class="w-5 h-5"></i>
                                    <span class="font-medium">Schedule</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-results')" 
                                   class="exam-office-menu-item menu-item-active flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-results">
                                    <i data-lucide="bar-chart-2" class="w-5 h-5"></i>
                                    <span class="font-medium">View Results</span>
                                </a>
                            </li>
                            <li>
                                <a href="#" onclick="setPageAndCloseSidebarEO('exam-office-upload')" 
                                   class="exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors" 
                                   data-page="exam-office-upload">
                                    <i data-lucide="upload" class="w-5 h-5"></i>
                                    <span class="font-medium">Upload Exams</span>
                                </a>
                            </li>
                            <div class="border-t border-white/20 mt-2 pt-2">
                            <li>
                                <button onclick="logout()" class="w-full exam-office-menu-item flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-left">
                                    <i data-lucide="log-out" class="w-5 h-5"></i>
                                    <span class="font-medium">Logout</span>
                                </button>
                            </li>
                            </div>
                        </ul>
                    </nav>
                </div>
            </aside>

            <!-- Main Content -->
            <div class="flex-1 flex flex-col overflow-hidden w-full">
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                        <div class="flex items-center gap-3">
                            <button onclick="toggleExamOfficeSidebar()" 
                                    class="md:hidden hamburger-btn" 
                                    id="examOfficeHamburgerBtn"
                                    aria-label="Toggle menu">
                                <span></span>
                                <span></span>
                                <span></span>
                            </button>
                            <div>
                                <h2 class="text-lg md:text-2xl font-bold text-gray-800">Exam Results</h2>
                                <p class="text-xs md:text-sm text-gray-500 hidden sm:block">View and analyze all exam results</p>
                            </div>
                        </div>
                        <button onclick="toggleFilterModal()" class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2">
                            <i data-lucide="filter" class="w-4 h-4"></i>
                            <span class="hidden sm:inline">Filter</span>
                        </button>
                    </div>
                </header>

                <main class="flex-1 overflow-y-auto p-4 md:p-6">
                    <div class="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div class="px-4 md:px-6 py-4 md:py-5 bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                            <h2 class="text-xl font-bold text-gray-800">Results Summary</h2>
                            <p class="text-sm text-gray-600">Total: <strong>${filteredResults.length}</strong> record(s)</p>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full">
                                <thead class="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th class="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase">#</th>
                                        <th class="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase">Student</th>
                                        <th class="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase">Class</th>
                                        <th class="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase">Subject</th>
                                        <th class="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase">Score</th>
                                        <th class="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase">%</th>
                                        <th class="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase">Grade</th>
                                        <th class="px-4 py-4 text-left text-xs font-bold text-gray-600 uppercase">Date</th>
                                        <th class="px-4 py-4 text-center text-xs font-bold text-gray-600 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-200">
                                    ${resultsList}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>

        ${state.showFilterModal ? renderFilterModal(state) : ''}

        <script>
            setTimeout(() => { 
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons(); 
                }
            }, 100);
        </script>
    `;
}

// ========================================
// EXAM OFFICE MODAL HELPERS
// ========================================

function showClassExams(className) {
    const modal = document.getElementById('examOfficeModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    const exams = state.availableExams.filter(exam => exam.class === className);
    
    modalTitle.textContent = `${className} - Select Exams to Schedule`;
    
    modalContent.innerHTML = exams.map(exam => {
        const isScheduled = exam.scheduledDate;
        const scheduledDate = isScheduled ? new Date(exam.scheduledDate).toLocaleDateString() : '';
        const statusLabel = getExamStatusLabel(exam);
        
        let statusBadge = '';
        if (statusLabel === 'upcoming') {
            statusBadge = `<span class="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold">Upcoming</span>`;
        } else if (statusLabel === 'available') {
            statusBadge = `<span class="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-semibold">Available</span>`;
        } else if (statusLabel === 'closed') {
            statusBadge = `<span class="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">Closed</span>`;
        }
        
        return `
            <div class="${isScheduled ? 'bg-green-50 border-l-4 border-green-500' : 'bg-gray-50 border-l-4 border-gray-300'} rounded-lg p-4 mb-3">
                <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-2">
                            <input type="checkbox" 
                                    ${isScheduled ? 'checked' : ''}
                                    onchange="toggleExamSchedule('${exam.exam_id}', this.checked)"
                                    class="w-5 h-5 text-green-600 rounded focus:ring-green-500 cursor-pointer">
                            <h3 class="font-bold text-gray-800">${exam.subject}</h3>
                            ${statusBadge}
                        </div>
                        <p class="text-xs text-gray-500 mb-2">${exam.exam_id}</p>
                        <div class="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span class="flex items-center gap-1">
                                <i data-lucide="list" class="w-3 h-3"></i> ${exam.questions.length} Questions
                            </span>
                            <span class="flex items-center gap-1">
                                <i data-lucide="clock" class="w-3 h-3"></i> ${exam.duration} mins
                            </span>
                        </div>
                        ${isScheduled ? `<p class="text-xs text-green-600 mt-2 font-semibold">Scheduled: ${scheduledDate}</p>` : ''}
                    </div>
                    <div class="flex flex-col gap-1">
                        <button onclick="shareExamWithOptions('${exam.exam_id}')" 
                                class="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors" title="Share">
                            <i data-lucide="share-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    modal.classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeExamOfficeModal() {
    const modal = document.getElementById('examOfficeModal');
    if (modal) modal.classList.add('hidden');
}

// ========================================
// SCHEDULE MODAL FUNCTIONS
// ========================================

let currentScheduleExamId = null;

function openExamScheduleModal(examId) {
    currentScheduleExamId = examId;
    const exam = state.availableExams.find(e => e.exam_id === examId);
    if (!exam) return;
    
    document.getElementById('schedule-exam-id').value = examId;
    document.getElementById('examScheduleModalTitle').textContent = `Schedule: ${exam.subject}`;
    document.getElementById('examScheduleInfo').textContent = `Set the date for ${exam.subject} (${exam.class})`;
    
    if (exam.scheduledDate) {
        document.getElementById('schedule-date-picker').value = exam.scheduledDate;
    } else {
        document.getElementById('schedule-date-picker').value = '';
    }
    
    document.getElementById('examScheduleModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeExamScheduleModal() {
    document.getElementById('examScheduleModal').classList.add('hidden');
}

async function saveExamSchedule(event) {
    event.preventDefault();
    const examId = document.getElementById('schedule-exam-id').value;
    const date = document.getElementById('schedule-date-picker').value;
    
    if (!date) {
        showAlert('Please select a date', 'error');
        return;
    }
    
    try {
        const exam = state.availableExams.find(e => e.exam_id === examId);
        if (!exam) {
            showAlert('Exam not found', 'error');
            return;
        }
        
        exam.scheduledDate = date;
        await saveExamToDB(exam);
        await loadExams();
        
        showAlert(`✅ "${exam.subject}" scheduled for ${new Date(date).toLocaleDateString()}`, 'success');
        closeExamScheduleModal();
        render();
    } catch (err) {
        console.error('Error scheduling exam:', err);
        showAlert('Failed to schedule exam', 'error');
    }
}

function openClassScheduleModal(className) {
    document.getElementById('schedule-class-name').value = className;
    document.getElementById('classScheduleModalTitle').textContent = `Schedule All: ${className}`;
    document.getElementById('classScheduleInfo').textContent = `Set the date for all Examinations in ${className} (CAs are excluded)`;
    document.getElementById('class-schedule-date-picker').value = '';
    document.getElementById('classScheduleModal').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeClassScheduleModal() {
    document.getElementById('classScheduleModal').classList.add('hidden');
}

async function saveClassSchedule(event) {
    event.preventDefault();
    const className = document.getElementById('schedule-class-name').value;
    const date = document.getElementById('class-schedule-date-picker').value;

    if (!date) {
        showAlert('Please select a date', 'error');
        return;
    }

    try {
        // Only schedule EXAM type (skip CAs)
        const classExams = state.availableExams.filter(
            e => e.class === className && (e.assessmentType || 'EXAM') === 'EXAM'
        );

        if (classExams.length === 0) {
            showAlert('No Examinations to schedule in this class (CAs are excluded)', 'info');
            closeClassScheduleModal();
            return;
        }

        let scheduled = 0;

        for (const exam of classExams) {
            exam.scheduledDate = date;
            await saveExamToDB(exam);
            scheduled++;
        }

        await loadExams();
        showAlert(`✅ ${scheduled} examination(s) scheduled for ${new Date(date).toLocaleDateString()}`, 'success');
        closeClassScheduleModal();
        render();
    } catch (err) {
        console.error('Error scheduling class exams:', err);
        showAlert('Failed to schedule exams', 'error');
    }
}

// ========================================
// EXPORTS
// ========================================

window.renderExamOfficeRegisterPage = renderExamOfficeRegisterPage;
window.renderExamOfficeLoginPage = renderExamOfficeLoginPage;
window.renderExamOfficeDashboard = renderExamOfficeDashboard;
window.renderExamOfficeUploadPage = renderExamOfficeUploadPage;
window.renderExamOfficeSchedulePage = renderExamOfficeSchedulePage;
window.renderExamOfficeResultsPage = renderExamOfficeResultsPage;
window.showClassExams = showClassExams;
window.closeExamOfficeModal = closeExamOfficeModal;
window.openExamScheduleModal = openExamScheduleModal;
window.closeExamScheduleModal = closeExamScheduleModal;
window.saveExamSchedule = saveExamSchedule;
window.openClassScheduleModal = openClassScheduleModal;
window.closeClassScheduleModal = closeClassScheduleModal;
window.saveClassSchedule = saveClassSchedule;