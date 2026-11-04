// image-handling.js - Image Upload and Management
// Handles image uploads for questions and diagrams

// Global state for current question image
let currentQuestionImage = null;

// Handle image file selection
function handleQuestionImageUpload(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file (PNG, JPG, GIF, etc.)', 'error');
        return;
    }
    
    // Validate file size (max 5MB for mobile compatibility)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        showAlert('Image is too large. Please use an image under 5MB.', 'error');
        return;
    }
    
    // Read the file as base64
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const base64Image = e.target.result;
        currentQuestionImage = base64Image;
        
        // Show preview
        displayImagePreview(base64Image);
        
        showAlert('Image uploaded successfully!', 'success', 2000);
    };
    
    reader.onerror = function() {
        showAlert('Failed to read image file. Please try again.', 'error');
    };
    
    reader.readAsDataURL(file);
}

// Display image preview
function displayImagePreview(base64Image) {
    const previewContainer = document.getElementById('image-preview-container');
    if (!previewContainer) return;
    
    previewContainer.innerHTML = `
        <div class="relative inline-block">
            <img src="${base64Image}" 
                 alt="Question Image" 
                 class="max-w-full max-h-64 rounded-lg border-2 border-gray-300 shadow-md" />
            <button type="button" 
                    onclick="removeQuestionImage()" 
                    class="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 shadow-lg transition-colors"
                    title="Remove image">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `;
    
    if (window.lucide) lucide.createIcons();
}

// Remove question image
function removeQuestionImage() {
    currentQuestionImage = null;
    const previewContainer = document.getElementById('image-preview-container');
    if (previewContainer) {
        previewContainer.innerHTML = '';
    }
    
    const fileInput = document.getElementById('question-image-input');
    if (fileInput) {
        fileInput.value = '';
    }
    
    showAlert('Image removed', 'info', 2000);
}

// Trigger file input click
function triggerImageUpload() {
    const fileInput = document.getElementById('question-image-input');
    if (fileInput) {
        fileInput.click();
    }
}

// Handle paste event for images
function handlePasteImage(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            event.preventDefault();
            
            const blob = items[i].getAsFile();
            
            const maxSize = 5 * 1024 * 1024;
            if (blob.size > maxSize) {
                showAlert('Image is too large. Please use an image under 5MB.', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(e) {
                currentQuestionImage = e.target.result;
                displayImagePreview(e.target.result);
                showAlert('Image pasted successfully!', 'success', 2000);
            };
            reader.onerror = function() {
                showAlert('Failed to read pasted image. Please try again.', 'error');
            };
            reader.readAsDataURL(blob);
            
            break;
        }
    }
}

// Initialize paste listener when on Create Exam page
function initPasteListener() {
    document.removeEventListener('paste', handlePasteImage);
    document.addEventListener('paste', handlePasteImage);
    console.log('✅ Paste listener initialized for images');
}

// Clean up paste listener when leaving Create Exam page
function cleanupPasteListener() {
    document.removeEventListener('paste', handlePasteImage);
    console.log('🧹 Paste listener removed');
}

function renderQuestionImage(question) {
    if (!question.image) return '';
    
    return `
        <div class="mb-6 flex justify-center">
            <img src="${question.image}" 
                 alt="Question diagram" 
                 class="max-w-full max-h-96 rounded-lg border-2 border-gray-300 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
                 onclick="openImageModal('${question.image}')" />
        </div>
    `;
}

function openImageModal(imageSrc) {
    const modal = document.createElement('div');
    modal.id = 'image-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4';
    modal.innerHTML = `
        <div class="relative max-w-7xl max-h-full">
            <img src="${imageSrc}" 
                 alt="Full size image" 
                 class="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
            <button onclick="closeImageModal()" 
                    class="absolute top-4 right-4 bg-white text-gray-800 rounded-full p-3 hover:bg-gray-200 shadow-lg transition-colors">
                <i data-lucide="x" class="w-6 h-6"></i>
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    if (window.lucide) lucide.createIcons();
    
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeImageModal();
        }
    });
}

function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.remove();
    }
}

// Export to global scope
window.currentQuestionImage = currentQuestionImage;
window.handleQuestionImageUpload = handleQuestionImageUpload;
window.displayImagePreview = displayImagePreview;
window.removeQuestionImage = removeQuestionImage;
window.triggerImageUpload = triggerImageUpload;
window.handlePasteImage = handlePasteImage;
window.initPasteListener = initPasteListener;
window.cleanupPasteListener = cleanupPasteListener;
window.renderQuestionImage = renderQuestionImage;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;