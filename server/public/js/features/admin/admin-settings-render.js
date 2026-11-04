// www/js/features/admin/admin-settings-render.js - FIXED with Users + Connection Badge
// Uses shared sidebar from admin-settings.js

function renderAdminSettingsPage(state) {
    const userName = state.user?.school_name || state.user?.name || 'Admin';
    const activeTab = state.adminTab || 'classes';

    const tabs = [
        { id: 'classes',     icon: 'school',        label: 'Classes' },
        { id: 'arms',        icon: 'split',         label: 'Arms' },
        { id: 'departments', icon: 'layers',        label: 'Departments' },
        { id: 'assignments', icon: 'user-check',    label: 'Form Teachers' },
        { id: 'year',        icon: 'calendar-days', label: 'Academic Year' },
        { id: 'devices',     icon: 'monitor',       label: 'Devices' },
        { id: 'users',       icon: 'users',         label: 'All Users' }, // NEW
        { id: 'users-pull',  icon: 'download',      label: 'Pending Users (Local → Central)' },
    ];

    const tabsHtml = tabs.map(t => `
        <button onclick="switchAdminTab('${t.id}')"
                class="flex items-center gap-2 px-4 py-3 border-b-2 font-semibold transition-colors whitespace-nowrap
                       ${activeTab === t.id
                            ? 'border-purple-600 text-purple-700 bg-purple-50'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
            <i data-lucide="${t.icon}" class="w-4 h-4"></i>
            <span>${t.label}</span>
        </button>
    `).join('');

    let panel = '';
    switch (activeTab) {
        case 'classes':     panel = renderAdminClassesPanel(); break;
        case 'arms':        panel = renderAdminArmsPanel(); break;
        case 'departments': panel = renderAdminDepartmentsPanel(); break;
        case 'assignments': panel = renderAdminAssignmentsPanel(); break;
        case 'year':        panel = renderAdminYearPanel(); break;
        case 'devices':     panel = renderAdminDevicesPanel(); break;
        case 'users-pull':
            panel = typeof AdminUsersPull !== 'undefined' && typeof AdminUsersPull.render === 'function'
                ? AdminUsersPull.render()
                : '<div class="p-6 text-red-600">Pending users module is unavailable. Reload the page.</div>';
            break;
        case 'users':       panel = typeof renderAdminUsersPanel === 'function' ? renderAdminUsersPanel() : '<div class="p-6">Loading Users...</div>'; break;
        default:            panel = renderAdminClassesPanel();
    }

    return `
        <div class="flex h-screen overflow-hidden bg-gray-50">
            ${typeof renderExamOfficeSidebar === 'function' ? renderExamOfficeSidebar(userName, 'admin-setup') : ''}

            <!-- Main Content -->
            <div class="flex-1 flex flex-col overflow-hidden w-full">
                <header class="bg-white shadow-sm border-b border-gray-200">
                    <div class="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
                        <div class="flex items-center gap-3">
                            <button onclick="toggleExamOfficeSidebar()" class="md:hidden hamburger-btn" id="examOfficeHamburgerBtn">
                                <span></span><span></span><span></span>
                            </button>
                            <div>
                                <h2 class="text-lg md:text-2xl font-bold text-gray-800">School Setup</h2>
                                <p class="text-xs md:text-sm text-gray-500 hidden sm:block">Manage classes, arms, departments, form teachers - Central DB</p>
                            </div>
                        </div>
                        
                        
                    </div>
                </header>

                <div class="bg-white border-b border-gray-200 px-4 md:px-6 overflow-x-auto">
                    <div class="flex gap-1">${tabsHtml}</div>
                </div>

                <main class="flex-1 overflow-y-auto p-4 md:p-6">
                    ${panel}
                </main>
            </div>
        </div>

        <script>
            setTimeout(() => {
                if (typeof lucide !== 'undefined') {
                    try { lucide.createIcons(); } catch(e){}
                }
                if (typeof updateAdminConnectionBadge === 'function') {
                    updateAdminConnectionBadge();
                }
            }, 150);
        </script>
    `;
}

async function updateAdminConnectionBadge() {
    const badge = document.getElementById('admin-connection-badge');
    if (!badge) return;

    // Use SAME logic as bottom green badge (lan.status.js)
    const isConnected = window.LAN_CONFIG?.isConnected || window.LAN_STATUS?.connected || navigator.onLine;
    const ip = window.LAN_CONFIG?.serverIP || window.location.hostname || '192.168.1.176';
    
    // Try to get real health for table count
    let tables = 11;
    try {
        const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
        const res = await fetch(`${apiBase}/health`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            tables = data.checks?.schema_tables_found || 11;
        }
    } catch(e) {}

    if (isConnected) {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm font-semibold text-green-700';
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span><span>Connected ${ip}:8000 - ${tables} tables - Central DB</span>`;
    } else {
        badge.className = 'flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-sm font-semibold text-red-700';
        badge.innerHTML = `<span class="w-2.5 h-2.5 rounded-full bg-red-500"></span><span>Offline - Local DB</span>`;
    }
}

function renderAdminUsersPanel() {
    setTimeout(() => {
        if (window.AdminUsersRender) {
            window.AdminUsersRender.renderToElement && window.AdminUsersRender.renderToElement('admin-users-container');
            if (!window.AdminUsersRender.renderToElement) {
                window.AdminUsersRender.render && window.AdminUsersRender.render();
            }
        }
    }, 200);

    return `
        <div id="admin-users-container">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">All Registered Users - Central DB</h3>
                        <p class="text-sm text-gray-500 mt-1">Shows teachers registering from phones on same WiFi: cbt_platform.users</p>
                    </div>
                    <button onclick="AdminUsersRender && AdminUsersRender.load()" class="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700">Refresh</button>
                </div>
                <div id="usersTable" class="overflow-x-auto">
                    <div class="text-center py-8 text-gray-400">
                        <div class="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                        <p>Loading users from central DB...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

window.renderAdminSettingsPage = renderAdminSettingsPage;
window.updateAdminConnectionBadge = updateAdminConnectionBadge;
window.renderAdminUsersPanel = renderAdminUsersPanel;
console.log('FIXED admin-settings-render.js - Users tab + live badge');
