// alerts.js - Alert System
// Toast notification system for the application

function showAlert(message, type = 'error', duration = 4000) {
    state.alertMessage = message;
    state.alertType = type;
    state.showAlert = true;

    ensureAlertElement();
    renderAlert(); 
    
    if (state.alertTimeout) clearTimeout(state.alertTimeout);
    state.alertTimeout = setTimeout(hideAlert, duration);
}

function hideAlert() {
    state.showAlert = false;
    const alertElement = document.getElementById('custom-alert');
    if (alertElement) {
        alertElement.classList.add('translate-x-full', 'opacity-0', 'hidden');
        alertElement.classList.remove('translate-x-0', 'opacity-100');
    }
}

function ensureAlertElement() {
    let alertElement = document.getElementById('custom-alert');
    if (!alertElement) {
        alertElement = document.createElement('div');
        alertElement.id = 'custom-alert';
        alertElement.className = 'fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-2xl transition-all duration-300 transform translate-x-full opacity-0 max-w-sm w-full';
        alertElement.innerHTML = `
            <div class="flex items-start gap-3">
                <div id="alert-icon" class="flex-shrink-0"></div>
                <p id="alert-message" class="flex-1 text-sm font-medium"></p>
                <button onclick="hideAlert()" class="flex-shrink-0 text-gray-400 hover:text-gray-600">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
        `;
        document.body.appendChild(alertElement);
    }
}

function renderAlert() {
    const alertElement = document.getElementById('custom-alert');
    if (!alertElement || !state.showAlert) return;

    const messageElement = document.getElementById('alert-message');
    const iconContainer = document.getElementById('alert-icon');
    
    if (!messageElement || !iconContainer) {
        console.error('Alert message or icon container not found');
        return;
    }
    
    messageElement.textContent = state.alertMessage;

    alertElement.className = "fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-2xl transition-all duration-300 transform max-w-sm w-full border-2";
    iconContainer.innerHTML = '';
    
    let iconName, iconColor, bgColor, borderColor;

    switch (state.alertType) {
        case 'success':
            bgColor = 'bg-green-100';
            borderColor = 'border-green-400';
            iconColor = 'text-green-600';
            iconName = 'check-circle';
            break;
        case 'info':
            bgColor = 'bg-blue-100';
            borderColor = 'border-blue-400';
            iconColor = 'text-blue-600';
            iconName = 'info';
            break;
        case 'error':
        default:
            bgColor = 'bg-red-100';
            borderColor = 'border-red-400';
            iconColor = 'text-red-600';
            iconName = 'alert-triangle';
            break;
    }
    
    alertElement.classList.add(bgColor, borderColor);
    iconContainer.innerHTML = `<i data-lucide="${iconName}" class="w-6 h-6 ${iconColor}"></i>`;
    
    if (window.lucide) lucide.createIcons();

    alertElement.classList.remove('hidden', 'translate-x-full', 'opacity-0');
    alertElement.classList.add('translate-x-0', 'opacity-100');
}

// Export to global scope
window.showAlert = showAlert;
window.hideAlert = hideAlert;
window.ensureAlertElement = ensureAlertElement;
window.renderAlert = renderAlert;