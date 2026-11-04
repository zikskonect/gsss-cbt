// Admin Devices - Approve pending devices
function renderAdminDevicesPanel() {
  setTimeout(() => loadDevicesTable(), 100);
  return `
    <div class="p-4 md:p-6">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-5">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">💻</span>
              Device Approval - LAN Management
            </h2>
            <p class="text-sm text-gray-500 mt-1">Devices that open http://${window.location.hostname}:8000 must be approved by Exam Office</p>
          </div>
          <button onclick="loadDevicesTable()" class="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">🔄 Refresh</button>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div id="devicesTable" class="p-8 text-center text-gray-400">
          <div class="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p>Loading devices from cbt_platform.devices...</p>
        </div>
      </div>
    </div>
  `;
}

async function loadDevicesTable() {
  const el = document.getElementById('devicesTable');
  if (!el) return;

  try {
    const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
    const res = await fetch(`${apiBase}/devices`, { headers: adminAuthHeaders() });
    const data = await res.json();
    const devices = data.data || data.devices || data || [];

    if (!devices.length) {
      el.innerHTML = `<div class="text-center py-12"><p>No devices yet. Open http://${window.location.hostname}:8000 on another phone/PC, it will appear here as pending.</p></div>`;
      return;
    }

    let html = `
      <table class="w-full">
        <thead><tr class="bg-gray-50 border-b text-xs font-bold text-gray-600 uppercase">
          <th class="text-left px-5 py-3">Device ID</th>
          <th class="text-left px-5 py-3">Platform</th>
          <th class="text-left px-5 py-3">Role</th>
          <th class="text-left px-5 py-3">Status</th>
          <th class="text-left px-5 py-3">Last Seen</th>
          <th class="text-right px-5 py-3">Actions</th>
        </tr></thead>
        <tbody class="divide-y divide-gray-100">
    `;

    devices.forEach(d => {
      const id = d.device_id || d.id;
      const status = d.status || 'pending';
      const statusColor = status === 'approved' ? 'bg-green-100 text-green-700 border-green-200' : status === 'pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-red-100 text-red-700 border-red-200';
      
      html += `
        <tr class="hover:bg-gray-50">
          <td class="px-5 py-4"><code class="bg-gray-100 px-2 py-1 rounded text-xs">${id}</code></td>
          <td class="px-5 py-4 text-sm">${d.platform || 'web'}</td>
          <td class="px-5 py-4 text-sm">${d.role || '—'}</td>
          <td class="px-5 py-4"><span class="px-2.5 py-1 rounded-full text-xs font-semibold border ${statusColor}">${status}</span></td>
          <td class="px-5 py-4 text-sm text-gray-600">${d.last_seen ? new Date(d.last_seen).toLocaleString() : d.updated_at || ''}</td>
          <td class="px-5 py-4 text-right">
            ${status === 'pending' ? `
              <button onclick="approveDevice('${id}')" class="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold mr-1">✅ Approve</button>
              <button onclick="blockDevice('${id}')" class="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs">Block</button>
            ` : status === 'approved' ? `
              <span class="text-xs text-green-600">✓ Approved</span>
              <button onclick="blockDevice('${id}')" class="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">Block</button>
            ` : `
              <button onclick="approveDevice('${id}')" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs">Approve</button>
            `}
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    el.innerHTML = html;

  } catch (e) {
    el.innerHTML = `<div class="p-8 text-center text-red-500">Error: ${e.message}</div>`;
  }
}

async function approveDevice(deviceId) {
  if (!confirm(`Approve device ${deviceId}? It will be able to access CBT.`)) return;
  try {
    const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
    const res = await fetch(`${apiBase}/devices/${deviceId}/approve`, { method: 'POST', headers: adminAuthHeaders() });
    const data = await res.json();
    if (data.ok) {
      alert('✅ Device approved!');
      loadDevicesTable();
    } else {
      alert('Failed: ' + (data.error || 'Unknown'));
    }
  } catch (e) { alert('Error: ' + e.message); }
}

async function blockDevice(deviceId) {
  if (!confirm(`Block device ${deviceId}?`)) return;
  try {
    const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
    await fetch(`${apiBase}/devices/${deviceId}/block`, { method: 'POST', headers: adminAuthHeaders() });
    loadDevicesTable();
  } catch (e) { alert('Error: ' + e.message); }
}

function adminAuthHeaders() {
  const token = localStorage.getItem('cbt_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

window.renderAdminDevicesPanel = renderAdminDevicesPanel;
window.loadDevicesTable = loadDevicesTable;
window.approveDevice = approveDevice;
window.blockDevice = blockDevice;
console.log('✅ admin.devices.render.js with Approve button loaded');