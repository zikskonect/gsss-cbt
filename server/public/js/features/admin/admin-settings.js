// www/js/features/admin/admin-settings.js
// SINGLE SOURCE OF TRUTH FOR EXAM OFFICE SIDEBAR

function renderExamOfficeSidebar(userName, activePage) {
    const menuItems = [
        { id: 'exam-office-dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
        { id: 'exam-office-schedule',  icon: 'calendar',         label: 'Schedule' },
        { id: 'exam-office-results',   icon: 'bar-chart-2',      label: 'View Results' },
        { id: 'exam-office-upload',    icon: 'upload',           label: 'Upload Exams' },
        { id: 'admin-setup',           icon: 'settings',         label: 'Setup' }
    ];

    const navHtml = menuItems.map(item => {
        const isActive = activePage === item.id;
        return `
            <li>
                <a href="#" onclick="setPageAndCloseSidebarEO('${item.id}')"
                   class="exam-office-menu-item ${isActive ? 'menu-item-active bg-white/20 border-l-4 border-white' : ''} flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
                   data-page="${item.id}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    <span class="font-medium">${item.label}</span>
                </a>
            </li>
        `;
    }).join('');

    return `
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
                            <h1 class="text-xl font-bold truncate">${userName}</h1>
                            <p class="text-xs text-purple-200">Exam Office Portal</p>
                        </div>
                    </div>
                </div>

                <nav class="flex-1 py-4">
                    <ul class="space-y-1 px-3">
                        ${navHtml}
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
    `;
}

window.renderExamOfficeSidebar = renderExamOfficeSidebar;

async function switchAdminTab(tabId) {
    state.adminTab = tabId;

    // Ensure required data is loaded
    if (tabId === 'classes'     && (!state.classes || state.classes.length === 0))                     state.classes = await loadAllClassesFromDB();
    if (tabId === 'arms'        && (!state.arms || state.arms.length === 0))                           state.arms = await loadAllArmsFromDB();
    if (tabId === 'departments' && (!state.departments || state.departments.length === 0))             state.departments = await loadAllDepartmentsFromDB();
    
    if (tabId === 'assignments') {
        const localClasses = await loadAllClassesFromDB();
        const localArms = await loadAllArmsFromDB();
        state.classes = localClasses;
        state.arms = localArms;

        const centralReady = window.LanApi &&
            window.LAN_CONFIG?.enabled &&
            window.LanApi.loadToken() &&
            window.LanApi.loadToken() !== 'offline';

        if (centralReady) {
            const [classesResponse, armsResponse] = await Promise.all([
                LanApi.get('/classes'),
                LanApi.get('/arms'),
            ]);

            if (classesResponse.ok && classesResponse.data?.classes?.length) {
                state.classes = classesResponse.data.classes;
                for (const cls of state.classes) await saveClassToDB(cls);
            } else if (classesResponse.error) {
                console.warn('Central classes unavailable; using local classes:', classesResponse.error.message);
            }

            if (armsResponse.ok && armsResponse.data?.arms?.length) {
                state.arms = armsResponse.data.arms;
                for (const arm of state.arms) await saveArmToDB(arm);
            } else if (armsResponse.error) {
                console.warn('Central arms unavailable; using local arms:', armsResponse.error.message);
            }
        }

        if (!state.formTeacherAssignments || state.formTeacherAssignments.length === 0) {
            state.formTeacherAssignments = await loadAllFormTeacherAssignmentsFromDB();
        }
        if (window.LanIntegration) {
            const res = await LanIntegration.getFormTeachers();
            if (res.ok) {
                state.formTeachers = res.data.teachers || [];
            }
        }
        if (centralReady) {
            const assignmentsRes = await LanApi.get('/assignments');
            if (assignmentsRes.ok && assignmentsRes.data?.assignments) {
                state.formTeacherAssignments = assignmentsRes.data.assignments;
                for (const assignment of state.formTeacherAssignments) {
                    await saveFormTeacherAssignmentToDB(assignment);
                }
            }
        }
    }
    
    if (tabId === 'year'        && (!state.academicYears || state.academicYears.length === 0))         { state.academicYears = await loadAllAcademicYearsFromDB(); state.currentAcademicYear = await getCurrentAcademicYearFromDB(); }
    
    if (tabId === 'devices') { 
        await refreshAdminDevices(); 
        return; 
    }

    render();
}

async function refreshAdminDevices() {
    try {
        const res = await LanApi.get('/devices');
        if (res.ok) {
            state.liveDevices = res.data.devices || [];
        } else {
            state.liveDevices = await loadAllDevicesFromDB();
        }
    } catch (_) {
        state.liveDevices = await loadAllDevicesFromDB();
    }
    render();
}

async function adminApproveDevice(deviceId) {
    const res = await LanApi.post('/devices/' + deviceId + '/approve', {});
    if (res.ok) {
        showAlert('✅ Device approved and ready for exams', 'success', 2500);
        await refreshAdminDevices();
        if (typeof updateAdminConnectionBadge === 'function') updateAdminConnectionBadge();
    } else {
        showAlert('Failed to approve: ' + (res.error?.message || 'unknown error'), 'error', 5000);
    }
}

async function adminBlockDevice(deviceId) {
    if (!confirm('Block this device? It will be disconnected immediately and cannot access exams.')) return;
    const res = await LanApi.post('/devices/' + deviceId + '/block', {});
    if (res.ok) {
        showAlert('🚫 Device blocked', 'info', 2500);
        await refreshAdminDevices();
        if (typeof updateAdminConnectionBadge === 'function') updateAdminConnectionBadge();
    } else {
        showAlert('Failed to block: ' + (res.error?.message || 'unknown error'), 'error', 5000);
    }
}

window.switchAdminTab = switchAdminTab;
window.refreshAdminDevices = refreshAdminDevices;
window.adminApproveDevice = adminApproveDevice;
window.adminBlockDevice = adminBlockDevice;

console.log('✅ admin-settings.js loaded - sidebar includes Setup');
