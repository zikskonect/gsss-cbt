// www/js/features/admin/admin.users.pull.js - NEW FLOW: LocalDB → Admin pulls to CentralDB

const AdminUsersPull = {
  _pendingLocalUsers: [],

  render() {
    const container = document.getElementById('admin-users-container');
    if (!container) return;

    const html = `
      <div class="p-4 md:p-6">
        <!-- Info Banner -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
          <div class="flex gap-3">
            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">💡</div>
            <div>
              <h3 class="font-semibold text-blue-900 text-sm">New Flow: Local First → Admin Pull</h3>
              <p class="text-sm text-blue-800 mt-1">1. Student/Teacher registers on their phone → Saved to <code>their phone's IndexedDB</code> (local).<br>2. Their device appears in <b>Devices</b> tab as pending.<br>3. Admin approves device, then this tab shows their pending user.<br>4. Admin clicks <b>Pull to Central DB</b> → Moves to MySQL <code>cbt_platform.users</code>.</p>
            </div>
          </div>
        </div>

        <div class="grid md:grid-cols-2 gap-5">
          <!-- Local IndexedDB Users (this browser) -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 class="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <span class="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center text-sm">📱</span>
              This Device - LocalDB Users
              <span id="localUsersCount" class="ml-auto px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs border border-amber-200">0</span>
            </h3>
            <div id="localUsersTable" class="space-y-2 max-h-96 overflow-y-auto">
              <div class="text-center py-8 text-gray-400 text-sm">Loading local users...</div>
            </div>
            <button onclick="AdminUsersPull.loadLocal()" class="mt-3 w-full py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium">🔄 Refresh Local</button>
          </div>

          <!-- Central MySQL Users -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 class="font-bold text-gray-800 flex items-center gap-2 mb-3">
              <span class="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center text-sm">🗄️</span>
              Central DB - Approved Users
              <span id="centralUsersCount" class="ml-auto px-2.5 py-1 bg-green-50 text-green-700 rounded-full text-xs border border-green-200">0</span>
            </h3>
            <div id="centralUsersTable" class="space-y-2 max-h-96 overflow-y-auto">
              <div class="text-center py-8 text-gray-400 text-sm">Loading central users...</div>
            </div>
            <button onclick="AdminUsersPull.loadCentral()" class="mt-3 w-full py-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-lg text-sm font-medium">🔄 Refresh Central</button>
          </div>
        </div>

        <!-- Pending Devices with Users -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mt-5">
          <h3 class="font-bold text-gray-800 flex items-center gap-2 mb-3">
            <span class="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center text-sm">🔗</span>
            Pending Pull - Devices Waiting Approval
          </h3>
          <div id="pendingPullTable" class="text-sm text-gray-500">Check Devices tab first - approve devices, then their users will be pullable.</div>
        </div>
      </div>
    `;

    container.innerHTML = html;
    void this.loadLocal();
    void this.loadCentral();
    void this.loadPendingDevices();
    return html;
  },

  async loadLocal() {
    const el = document.getElementById('localUsersTable');
    const badge = document.getElementById('localUsersCount');
    if (!el) return;

    try {
      const allUsers = await this._getAllLocalUsers();
      
      if (badge) badge.textContent = `${allUsers.length}`;

      if (!allUsers.length) {
        el.innerHTML = `<div class="text-center py-8"><p class="text-gray-400">No local users on this device</p><p class="text-xs text-gray-400 mt-1">Register a user on this device to see it here</p></div>`;
        return;
      }

      let html = '';
      allUsers.forEach(u => {
        const phone = u.phone_number || u.phone || '';
        const name = u.name || 'Unnamed';
        const role = u.role || 'teacher';
        const isInCentral = false; // Will check

        html += `
          <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-xs font-bold">${name.substring(0,2).toUpperCase()}</div>
              <div>
                <div class="font-semibold text-sm text-gray-900">${name}</div>
                <div class="text-xs text-gray-500 font-mono">${phone} • ${role}</div>
              </div>
            </div>
            <button onclick="AdminUsersPull.pullUser('${phone}')" class="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold">⬆️ Pull to Central</button>
          </div>
        `;
      });
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = `<div class="text-red-500 text-sm">Error: ${e.message}</div>`;
    }
  },

  async _getAllLocalUsers() {
    try {
      const db = await initDB();
      const users = await new Promise((resolve, reject) => {
        const tx = db.transaction('users', 'readonly');
        const request = tx.objectStore('users').getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      const teachers = typeof window.getAllTeachersLocal === 'function'
        ? await window.getAllTeachersLocal()
        : [];
      const records = [users, teachers];

      const byPhone = new Map();
      records.flat().forEach(user => {
        const phone = user.phone_number || user.phone;
        if (phone) byPhone.set(phone, { ...user, phone_number: phone });
      });
      return Array.from(byPhone.values());
    } catch (e) {
      console.error('Get local users error:', e);
      return [];
    }
  },

  async loadCentral() {
    const el = document.getElementById('centralUsersTable');
    const badge = document.getElementById('centralUsersCount');
    if (!el) return;

    try {
      const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
      const res = await fetch(`${apiBase}/users`, { headers: adminAuthHeaders() });
      const data = await res.json();
      const users = data.data || data.users || [];

      if (badge) badge.textContent = `${users.length}`;

      if (!users.length) {
        el.innerHTML = `<div class="text-center py-8 text-gray-400">No central users</div>`;
        return;
      }

      let html = '';
      users.forEach(u => {
        const phone = u.phone_number || u.phone || '';
        const name = u.name || 'Unnamed';
        html += `
          <div class="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">${name.substring(0,2).toUpperCase()}</div>
              <div>
                <div class="font-semibold text-sm text-gray-900">${name}</div>
                <div class="text-xs text-gray-600 font-mono">${phone}</div>
              </div>
            </div>
            <span class="text-xs text-green-700 font-medium">✓ Central</span>
          </div>
        `;
      });
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = `<div class="text-red-500 text-sm">Error: ${e.message}<br>Is server running?</div>`;
    }
  },

  async loadPendingDevices() {
    const el = document.getElementById('pendingPullTable');
    if (!el) return;

    try {
      const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
      const res = await fetch(`${apiBase}/devices`, { headers: adminAuthHeaders() });
      const data = await res.json();
      const devices = (data.data || data.devices || []).filter(d => d.status === 'pending');

      if (!devices.length) {
        el.innerHTML = `<div class="text-center py-6 text-gray-400">No pending devices. When another phone opens http://${window.location.hostname}:8000, it appears as pending in Devices tab. Approve it first.</div>`;
        return;
      }

      let html = `<div class="space-y-2">`;
      devices.forEach(d => {
        html += `
          <div class="flex items-center justify-between p-3 border border-amber-200 bg-amber-50 rounded-lg">
            <div>
              <code class="text-xs bg-white px-2 py-1 rounded">${d.device_id}</code>
              <span class="ml-2 text-sm">${d.platform} • Last seen: ${new Date(d.last_seen).toLocaleTimeString()}</span>
            </div>
            <button onclick="approveDevice('${d.device_id}')" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs">✅ Approve Device</button>
          </div>
        `;
      });
      html += `</div>`;
      el.innerHTML = html;
    } catch (e) {
      el.innerHTML = `<div class="text-red-500">Error loading devices: ${e.message}</div>`;
    }
  },

  async pullUser(phone) {
    if (!confirm(`Pull user ${phone} from LocalDB to Central MySQL (cbt_platform.users)?`)) return;

    try {
      const localUsers = await this._getAllLocalUsers();
      const user = localUsers.find(u => (u.phone_number || u.phone) === phone);
      if (!user) { alert('User not found in local DB'); return; }

      const password = user.password;
      if (!password || typeof password !== 'string') {
        alert(`Cannot pull ${phone}: no password/hash is stored locally.`);
        return;
      }

      const response = await LanApi.post('/users/pull', {
        name: user.name,
        phone_number: user.phone_number || user.phone,
        password,
        role: user.role || 'teacher',
        email: user.email || null,
        school_name: user.school_name || null,
        device_id: localStorage.getItem('cbt_device_id') || null
      });
      if (response.ok) {
        alert(`✅ User ${phone} pulled to Central DB!`);
        await this.loadCentral();
      } else {
        const message = response.error?.message || 'Unknown server error';
        if (response.status === 401 || response.error?.code === 'invalid_token') {
          alert('Your Exam Office session has expired. Please log out and log in again, then retry the pull.');
        } else {
          alert(`Failed to pull ${phone}: ${message}`);
        }
      }
    } catch (e) {
      alert(`Pull failed: ${e.message}`);
    }
  }
};

function adminAuthHeaders() {
  const token = localStorage.getItem('cbt_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

window.AdminUsersPull = AdminUsersPull;

// Also patch saveUserToDB to always save local first
const originalSaveUserToDB = window.saveUserToDB;
window.saveUserToDBWithLocalFirst = async function(user) {
  console.log('📱 Saving to LocalDB first:', user.phone_number);
  const result = await originalSaveUserToDB(user);
  // Try to register device as pending
  try {
    const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
    await fetch(`${apiBase}/devices/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_id: getDeviceId(), platform: 'web', status: 'pending' })
    });
  } catch(e){}
  return result;
};

console.log('✅ admin.users.pull.js loaded - Local First flow');
