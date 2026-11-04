// www/js/core/device-gate.js - Device approval gate - blocks access if not approved
// Must be loaded before render

const DeviceGate = {
  async check() {
    const apiBase = window.LAN_CONFIG?.apiBase || `http://${window.location.hostname}:8000/api`;
    const deviceId = window.getDeviceId ? getDeviceId() : localStorage.getItem('cbt_device_id') || 'web-' + Math.random().toString(36).substr(2,9);
    
    try {
      // Register device as pending if new
      const res = await fetch(`${apiBase}/devices/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: deviceId,
          platform: 'web',
          user_agent: navigator.userAgent,
          role: window.state?.user?.role || 'unknown'
        })
      });
      const data = await res.json();
      const status = data.data?.status || data.status || 'pending';

      console.log(`🔒 Device ${deviceId} status: ${status}`);

      if (status === 'blocked') {
        this.showBlockedPage(deviceId);
        return false;
      }

      if (status === 'pending') {
        // Allow exam office to approve, but block students/teachers until approved
        const isExamOffice = window.state?.isExamOffice || window.state?.user?.role === 'exam_office';
        if (!isExamOffice && window.state?.currentPage !== 'exam-office-login' && window.state?.currentPage !== 'admin-setup') {
          // For non-exam-office, show pending screen
          if (window.state?.currentPage === 'home' || window.state?.currentPage === 'teacher-login' || window.state?.currentPage === 'student-login') {
            // Allow login pages, but check after login
            return true;
          }
          this.showPendingPage(deviceId);
          return false;
        }
      }

      return true; // Approved or exam office
    } catch (e) {
      console.warn('Device gate check failed (offline?), allowing:', e.message);
      return true; // Allow offline
    }
  },

  showPendingPage(deviceId) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div class="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
          <h2 class="text-xl font-bold text-gray-800 mb-2">Device Pending Approval</h2>
          <p class="text-gray-600 mb-2">Your device <code class="bg-gray-100 px-2 py-1 rounded text-xs">${deviceId.substring(0,20)}...</code> is waiting for Exam Office approval.</p>
          <p class="text-sm text-gray-500 mb-6">Please contact Exam Office to approve your device from <b>School Setup → Devices → Approve</b></p>
          <div class="space-y-2">
            <button onclick="location.reload()" class="w-full bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 font-semibold">🔄 Check Again</button>
            <button onclick="setPage('home')" class="w-full bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 text-sm">Back to Home</button>
          </div>
          <p class="text-xs text-gray-400 mt-4">Device ID: ${deviceId}</p>
        </div>
      </div>
    `;
  },

  showBlockedPage(deviceId) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
      <div class="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🚫</div>
          <h2 class="text-xl font-bold text-gray-800 mb-2">Device Blocked</h2>
          <p class="text-gray-600 mb-6">Your device has been blocked by Exam Office.</p>
          <button onclick="setPage('home')" class="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg">Back</button>
        </div>
      </div>
    `;
  }
};

// Hook into setPage to check gate
const originalSetPage = window.setPage;
if (originalSetPage) {
  window.setPage = async function(page) {
    const allowed = await DeviceGate.check();
    if (!allowed && page !== 'home') {
      console.log('🚫 Device gate blocked page:', page);
      return;
    }
    return originalSetPage(page);
  };
}

window.DeviceGate = DeviceGate;
console.log('✅ device-gate.js loaded - Approval required');
