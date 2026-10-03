function renderHomePage() {
    // Everything school-specific comes from SCHOOL_CONFIG (sch_config.js).
    // To reskin for a new school, only sch_config.js needs to change — this file does not.
    const schoolName = window.SCHOOL_CONFIG?.schoolName || 'TESTULATOR';
    const schoolShortName = window.SCHOOL_CONFIG?.schoolShortName || 'GSSS';
    const logoPath = window.SCHOOL_CONFIG?.logoPath || 'js/icons/sch_logo.png';
    const primary = window.SCHOOL_CONFIG?.themeColor || '#B80236';
    const secondary = window.SCHOOL_CONFIG?.secondaryColor || '#6d5e92';
    const primaryHover = shadeHexColor(primary, -18);
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });

    return `
        <div class="fixed inset-0 flex flex-col md:flex-row overflow-hidden bg-[#F7F6F3]"
             style="height: 100vh; height: 100dvh;">

            <!-- BRAND PANEL -->
            <div class="relative flex-shrink-0 w-full md:w-[46%] h-[26%] sm:h-[27%] md:h-full bg-[#14151F] overflow-hidden flex flex-col px-6 sm:px-10 md:px-14 py-5 sm:py-6 md:py-10">

                <!-- faint OMR-sheet dot grid -->
                <div class="absolute inset-0 pointer-events-none opacity-[0.06]"
                     style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 22px 22px;"></div>
                <div class="absolute -top-24 -left-24 w-72 h-72 rounded-full blur-3xl pointer-events-none"
                     style="background-color: ${primary}; opacity: 0.2;"></div>

                <!-- Identity -->
                <div class="relative z-10 flex items-center gap-3 md:gap-4 flex-shrink-0">
                    <div class="relative w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 flex-shrink-0">
                        <img src="${logoPath}"
                             alt=""
                             class="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl object-cover border border-white/15"
                             onerror="this.parentElement.innerHTML='<div class=&quot;w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg md:rounded-xl flex items-center justify-center&quot; style=&quot;background-color:${primary}&quot;><i data-lucide=&quot;graduation-cap&quot; class=&quot;w-6 h-6 md:w-7 md:h-7 text-white&quot;></i></div>'; if(window.lucide) lucide.createIcons();">
                    </div>
                    <div class="min-w-0">
                        <h1 class="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight">${schoolName}</h1>
                        <p class="text-white/55 text-xs sm:text-sm mt-0.5">Offline Examination Platform</p>
                    </div>
                </div>

                <!-- Answer-sheet illustration -->
                <div class="relative z-10 flex-1 hidden md:flex items-center justify-center min-h-0 my-4">
                    <div class="relative w-52 h-60">
                        <div class="absolute inset-0 bg-white/10 rounded-2xl" style="transform: rotate(-7deg);"></div>
                        <div class="absolute inset-0 bg-white/15 rounded-2xl" style="transform: rotate(4deg);"></div>
                        <div class="absolute inset-0 bg-[#F7F6F3] rounded-2xl shadow-2xl p-5 flex flex-col gap-3">
                            <div class="h-2 w-3/5 bg-[#1B1D2A]/15 rounded-full"></div>
                            <div class="h-2 w-2/5 bg-[#1B1D2A]/10 rounded-full mb-1"></div>
                            ${[1, 2, 3, 4].map(row => `
                            <div class="flex items-center gap-2.5">
                                <div class="h-2 flex-1 bg-[#1B1D2A]/10 rounded-full"></div>
                                <div class="w-4 h-4 rounded-full border-2 flex-shrink-0"
                                     style="${row === 2 ? `border-color:${primary}; background-color:${primary};` : 'border-color: rgba(27,29,42,0.2);'}"></div>
                            </div>`).join('')}
                        </div>
                        <div class="absolute -top-3 -right-3 w-9 h-9 rounded-full shadow-lg flex items-center justify-center"
                             style="background-color: ${primary};">
                            <i data-lucide="check" class="w-4 h-4 text-white"></i>
                        </div>
                    </div>
                </div>

                <div class="relative z-10 hidden md:flex items-center gap-2.5 mt-auto pt-4 md:pt-0 flex-shrink-0">
                    <span class="text-xs text-white/40">${schoolShortName}</span>
                    <span class="w-px h-3 bg-white/15"></span>
                    <span class="text-xs text-white/40">${todayLabel}</span>
                </div>
            </div>

            <!-- ACTION PANEL -->
            <div class="relative flex-1 min-h-0 flex flex-col justify-center px-6 sm:px-10 md:px-16 py-6 md:py-10 gap-4 md:gap-5 overflow-y-auto">

                <div class="absolute top-0 right-0 w-64 h-64 pointer-events-none"
                     style="background: radial-gradient(circle at top right, ${primary}, transparent 70%); opacity: 0.05;"></div>

                <button id="closeBtn"
                        aria-label="Close application"
                        class="absolute top-4 right-4 md:top-6 md:right-6 z-20 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/5 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>

                <div class="relative z-10 mb-1 pr-10">
                    <p class="text-xl md:text-xl font-bold text-[#1B1D2A]">Continue as</p>
                    <p class="text-sm text-gray-500 mt-1">Pick your role to sign in.</p>
                </div>

                <!-- Primary action: Student -->
                <button onclick="setPage('student-info')"
                        class="relative z-10 group relative w-full text-left transition-colors rounded-2xl overflow-hidden shadow-lg"
                        style="background-color: ${primary};"
                        onmouseover="this.style.backgroundColor='${primaryHover}'"
                        onmouseout="this.style.backgroundColor='${primary}'">
                    <span class="hidden md:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F7F6F3]"></span>
                    <span class="hidden md:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F7F6F3]"></span>
                    <div class="flex items-center gap-4 md:gap-5 pl-7 md:pl-9 pr-6 py-4 md:py-6">
                        <div class="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                            <i data-lucide="list-checks" class="w-6 h-6 md:w-7 md:h-7 text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-white font-bold text-base md:text-lg leading-tight">Start your exam</p>
                            <p class="text-white/70 text-xs md:text-sm leading-tight mt-1">For registered students</p>
                        </div>
                        <i data-lucide="chevron-right" class="w-5 h-5 md:w-6 md:h-6 text-white/70 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"></i>
                    </div>
                </button>

                <!-- Secondary actions: Teacher / Exam Office -->
                <div class="relative z-10 grid grid-cols-2 gap-3.5 md:gap-4">
                    <button onclick="setPage('teacher-login')"
                            class="flex flex-col items-center justify-center gap-2.5 py-5 md:py-6 rounded-2xl border-2 border-black/10 bg-white hover:shadow-md transition-all"
                            style="--role-color: ${secondary};"
                            onmouseover="this.style.borderColor='${secondary}66'"
                            onmouseout="this.style.borderColor=''">
                        <div class="w-11 h-11 md:w-11 md:h-11 rounded-full flex items-center justify-center" style="background-color: ${secondary}1A;">
                            <i data-lucide="presentation" class="w-5 h-5 md:w-5.5 md:h-5.5" style="color: ${secondary};"></i>
                        </div>
                        <span class="text-sm font-semibold text-[#1B1D2A]">Teacher</span>
                    </button>
                    <button onclick="setPage('exam-office-login')"
                            class="flex flex-col items-center justify-center gap-2.5 py-5 md:py-6 rounded-2xl border-2 border-black/10 bg-white hover:border-[#1B1D2A]/30 hover:shadow-md transition-all">
                        <div class="w-11 h-11 md:w-11 md:h-11 rounded-full bg-[#1B1D2A]/5 flex items-center justify-center">
                            <i data-lucide="building-2" class="w-5 h-5 md:w-5.5 md:h-5.5 text-[#1B1D2A]"></i>
                        </div>
                        <span class="text-sm font-semibold text-[#1B1D2A]">Exam Office</span>
                    </button>
                </div>

                <div class="relative z-10 flex md:hidden items-center gap-2.5 mt-1">
                    <span class="text-xs text-gray-400">${schoolShortName}</span>
                    <span class="w-px h-3 bg-black/10"></span>
                    <span class="text-xs text-gray-400">Works without internet</span>
                </div>
            </div>
        </div>
    `;
}

// Darkens (negative percent) or lightens (positive percent) a hex color.
// Used to derive a hover shade of SCHOOL_CONFIG.themeColor without needing
// a separate config field for it.
function shadeHexColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    let r = (num >> 16) + amt;
    let g = (num >> 8 & 0x00FF) + amt;
    let b = (num & 0x0000FF) + amt;
    r = Math.max(Math.min(255, r), 0);
    g = Math.max(Math.min(255, g), 0);
    b = Math.max(Math.min(255, b), 0);
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
}

// Export to global scope
window.renderHomePage = renderHomePage;
window.shadeHexColor = shadeHexColor;