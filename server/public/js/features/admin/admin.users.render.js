// www/js/features/admin/admin.users.render.js - BEAUTIFUL UI matching GSS Gwags purple theme

const AdminUsersRender = {
  _allUsers: [],

  async render() {
    const container = document.getElementById('admin-content') || document.querySelector('main') || document.getElementById('admin-users-container');
    if (!container) return;

    // If container is the inner div, render full page
    const isFullPage = container.id === 'admin-users-container' || container.tagName === 'MAIN';

    const html = `
      <div class="p-4 md:p-6">
        <!-- Header Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">👥</span>
                All Registered Users
              </h2>
              <p class="text-sm text-gray-500 mt-1">Central DB: <code class="bg-gray-100 px-1.5 py-0.5 rounded text-xs">cbt_platform.users</code> • All devices see same data</p>
            </div>
            <div class="flex items-center gap-2">
              <span id="usersCountBadge" class="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-semibold border border-purple-200">Loading...</span>
              <button onclick="AdminUsersRender.load()" class="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Refresh
              </button>
            </div>
          </div>

          <!-- Search & Filter -->
          <div class="flex flex-col md:flex-row gap-3 mt-5">
            <div class="flex-1 relative">
              <svg class="w-5 h-5 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input id="userSearch" placeholder="Search name or phone..." class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm" onkeyup="AdminUsersRender.filter()">
            </div>
            <select id="roleFilter" onchange="AdminUsersRender.filter()" class="px-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm font-medium focus:ring-2 focus:ring-purple-500 outline-none">
              <option value="">All Roles</option>
              <option value="teacher">👨‍🏫 Teacher</option>
              <option value="form_teacher">👨‍🏫 Form Teacher</option>
              <option value="exam_office">🏢 Exam Office</option>
              <option value="admin">🔑 Admin</option>
            </select>
          </div>
        </div>

        <!-- Table Card -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div id="usersTable" class="overflow-x-auto">
            <div class="flex flex-col items-center justify-center py-16 text-gray-400">
              <div class="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
              <p class="text-sm font-medium">Loading users from central DB...</p>
              <p class="text-xs mt-1">Fetching from http://${window.location.hostname}:8000/api/users</p>
            </div>
          </div>
        </div>
      </div>
    `;

    if (isFullPage && container.id === 'admin-users-container') {
      container.innerHTML = html;
    } else {
      // For main content area
      const target = document.getElementById('admin-users-container') || container;
      target.innerHTML = html;
    }

    if (window.lucide) { try { lucide.createIcons(); } catch(e){} }
    this.load();
  },

  renderToElement(elementId) {
    const el = document.getElementById(elementId);
    if (el) this.render();
  },

  async load() {
    const el = document.getElementById('usersTable');
    const badge = document.getElementById('usersCountBadge');
    if (!el) return;

    try {
      let users = [];
      try {
        const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
        const res = await fetch(`${apiBase}/users`, { headers: adminAuthHeaders() });
        const data = await res.json();
        users = data.data || data.users || [];
      } catch (e) {
        console.warn('API users failed, fallback to local', e);
        if (window.Storage) {
          try { users = await Storage.getAll('users') || []; } catch(err){}
        }
      }

      this._allUsers = users;

      if (badge) badge.textContent = `${users.length} users`;

      if (!users.length) {
        el.innerHTML = `
          <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl">📭</div>
            <h3 class="font-semibold text-gray-800">No users found</h3>
            <p class="text-sm text-gray-500 mt-1 max-w-sm">Teachers should open <code class="bg-gray-100 px-1.5 py-0.5 rounded">http://${window.location.hostname}:8000</code> on their phone and register. They will appear here in central DB.</p>
          </div>
        `;
        return;
      }

      let html = `
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              <th class="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
              <th class="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Phone</th>
              <th class="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
              <th class="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
              <th class="text-left px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Registered</th>
              <th class="text-right px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
      `;

      users.forEach(u => {
        const phone = u.phone_number || u.phone || '';
        const name = u.name || 'Unnamed';
        const role = u.role || 'teacher';
        const status = u.status || 'active';
        const date = u.created_at ? new Date(u.created_at).toLocaleDateString('en-GB') : '';

        // Role styling
        let roleBadge = '';
        if (role === 'teacher') roleBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">👨‍🏫 Teacher</span>`;
        else if (role === 'form_teacher') roleBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">👨‍🏫 Form Teacher</span>`;
        else if (role === 'exam_office') roleBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">🏢 Exam Office</span>`;
        else roleBadge = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">${role}</span>`;

        const statusBadge = status === 'active' 
          ? `<span class="inline-flex items-center gap-1 text-xs font-medium text-green-700"><span class="w-2 h-2 bg-green-500 rounded-full"></span>active</span>`
          : `<span class="inline-flex items-center gap-1 text-xs font-medium text-red-600"><span class="w-2 h-2 bg-red-500 rounded-full"></span>${status}</span>`;

        const initials = name.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();

        html += `
          <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">${initials}</div>
                <div>
                  <div class="font-semibold text-gray-900 text-sm">${name}</div>
                  <div class="text-xs text-gray-500">${phone ? '' : 'No phone'}</div>
                </div>
              </div>
            </td>
            <td class="px-5 py-4">
              <code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">${phone}</code>
            </td>
            <td class="px-5 py-4">${roleBadge}</td>
            <td class="px-5 py-4">${statusBadge}</td>
            <td class="px-5 py-4 text-sm text-gray-600">${date}</td>
            <td class="px-5 py-4 text-right">
              <div class="flex items-center justify-end gap-1.5">
                <button onclick="AdminUsersRender.toggleBlock('${phone}', '${status}')" class="px-3 py-1.5 ${status==='active' ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' : 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200'} border rounded-lg text-xs font-semibold transition-colors">
                  ${status==='active' ? 'Block' : 'Unblock'}
                </button>
                <button onclick="AdminUsersRender.deleteUser('${phone}')" class="px-3 py-1.5 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg text-xs font-semibold transition-colors">
                  Delete
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      html += `</tbody></table>`;
      html += `<div class="bg-gray-50 px-5 py-3 border-t border-gray-200 text-xs text-gray-500 flex items-center justify-between">
        <span>Total: <strong class="text-gray-800">${users.length}</strong> users in central DB • Synced across all devices</span>
        <span class="flex items-center gap-1"><span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Live • cbt_platform.users</span>
      </div>`;

      el.innerHTML = html;

    } catch (err) {
      el.innerHTML = `
        <div class="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-2xl">⚠️</div>
          <h3 class="font-semibold text-gray-800">Error loading users</h3>
          <p class="text-sm text-gray-500 mt-1">${err.message}</p>
          <button onclick="AdminUsersRender.load()" class="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm">Retry</button>
        </div>
      `;
      if (badge) badge.textContent = 'Error';
    }
  },

  filter() {
    const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
    const role = document.getElementById('roleFilter')?.value || '';
    const rows = document.querySelectorAll('#usersTable tbody tr');
    let visible = 0;
    rows.forEach(tr => {
      const text = tr.textContent.toLowerCase();
      const roleMatch = !role || text.includes(role);
      const searchMatch = !q || text.includes(q);
      const show = roleMatch && searchMatch;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const badge = document.getElementById('usersCountBadge');
    if (badge && (q || role)) {
      badge.textContent = `${visible} / ${this._allUsers.length} users`;
    } else if (badge) {
      badge.textContent = `${this._allUsers.length} users`;
    }
  },

  async toggleBlock(phone, currentStatus) {
    const action = currentStatus === 'active' ? 'block' : 'unblock';
    if (!confirm(`${action.toUpperCase()} ${phone}?`)) return;
    try {
      const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
      await fetch(`${apiBase}/users/${phone}/${action}`, { method: 'POST', headers: adminAuthHeaders() });
      this.load();
    } catch (e) { alert(`${action} failed: ${e.message}`); }
  },

  async deleteUser(phone) {
    if (!confirm(`Delete ${phone}? This cannot be undone!`)) return;
    try {
      const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
      await fetch(`${apiBase}/users/${phone}`, { method: 'DELETE', headers: adminAuthHeaders() });
      this.load();
    } catch (e) { alert(`Delete failed: ${e.message}`); }
  }
};

function adminAuthHeaders() {
  const token = localStorage.getItem('cbt_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

window.AdminUsersRender = AdminUsersRender;
console.log('✅ admin.users.render.js BEAUTIFUL UI loaded');
