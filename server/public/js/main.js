// main.js - Application Entry Point

function updateLoadingStatus(message) {
    const statusElement = document.getElementById('loading-status');
    if (statusElement) {
        statusElement.textContent = message;
    }
    console.log('📝 Status:', message);
}

function showErrorPage(error) {
    const app = document.getElementById('app');
    if (!app) {
        console.error('App container not found!');
        return;
    }
    
    app.innerHTML = `
        <div class="min-h-screen bg-red-50 flex items-center justify-center p-4">
            <div class="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <i data-lucide="alert-triangle" class="w-8 h-8 text-red-600"></i>
                </div>
                <h2 class="text-xl font-bold text-gray-800 mb-2">Initialization Error</h2>
                <p class="text-gray-600 mb-4">${error.message || 'Failed to initialize the application'}</p>
                <details class="text-left mb-4">
                    <summary class="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                        Technical Details
                    </summary>
                    <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">${error.stack || error.toString()}</pre>
                </details>
                <button onclick="location.reload()" class="bg-[#2563EB] text-white px-6 py-2 rounded-lg hover:bg-[#1D4ED8] transition-colors">
                    Refresh Page
                </button>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function init() {
    console.log('🚀 Starting initialization...');
    updateLoadingStatus('Starting app...');

    try {
        if (!window.indexedDB) {
            throw new Error('IndexedDB is not supported');
        }

        initDB()
            .then(() => seedDefaultsIfEmpty())
            .then(() => ensureLocalDeviceRegistered())
            .then(() => getCurrentAcademicYearFromDB().then(ay => {
                if (ay) state.currentAcademicYear = ay;
            }))
            .then(() => loadExams())
            .then(() => loadResults())
            .then(async () => {
                console.log('🎨 Rendering app...');
                render();
                handleElectronButtons();

                if (window.LanBootstrap) {
                    try {
                        console.log('🔌 Starting LAN Bootstrap...');
                        await LanBootstrap.boot();
                    } catch (lanError) {
                        console.error('⚠️ LAN bootstrap error:', lanError);
                    }
                }

                console.log('✅ App initialized successfully');
                updateLoadingStatus('Ready!');
            })
            .catch(error => {
                console.error('❌ Initialization error:', error);
                showErrorPage(error);
            });

    } catch (error) {
        showErrorPage(error);
    }
}

function handleElectronButtons() {
    const closeBtn = document.getElementById('close-app-btn');
    const minBtn = document.getElementById('minimize-app-btn');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            if (window.electronAPI) window.electronAPI.closeApp();
        });
    }
    
    if (minBtn) {
        minBtn.addEventListener('click', () => {
            if (window.electronAPI && window.electronAPI.minimizeApp) window.electronAPI.minimizeApp();
        });
    }
}

window._logoutOriginal = logout;
window.logout = () => {
    if (!confirm("Are you sure you want to log out?")) return;
    if (typeof window._logoutOriginal === 'function') window._logoutOriginal();
};

window.init = init;

window.addEventListener('load', function() {
    console.log('📄 Window fully loaded, starting app...');
    setTimeout(init, 100);
});

window.addEventListener('load', () => {
    console.log('✅ Window fully loaded');
    if (window.lucide) lucide.createIcons();
});

console.log('🚀 main.js loaded');