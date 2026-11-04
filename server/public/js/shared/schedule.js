// schedule.js - Exam Scheduling Logic
// Functions for determining exam visibility and status

// TODO: replace with server-time check when online sync ships

/**
 * Checks if an exam should be visible to students based on scheduled date
 * @param {Object} exam - The exam object with optional scheduledDate field
 * @returns {boolean} - True if the exam should be visible
 */
function isExamVisible(exam) {
    // If no scheduled date, exam is always visible
    if (!exam.scheduledDate) {
        return true;
    }
    
    try {
        const now = new Date();
        const scheduled = new Date(exam.scheduledDate);
        
        // Check if scheduled date is valid
        if (isNaN(scheduled.getTime())) {
            console.warn('Invalid scheduled date for exam:', exam.exam_id);
            return true; // Default to visible if date is invalid
        }
        
        // Exam is visible if scheduled date is today or in the past
        return scheduled <= now;
    } catch (error) {
        console.error('Error checking exam visibility:', error);
        return true; // Default to visible on error
    }
}

/**
 * Returns a status label for an exam based on its scheduled date
 * @param {Object} exam - The exam object with optional scheduledDate field
 * @returns {string} - 'upcoming' | 'available' | 'closed'
 */
function getExamStatusLabel(exam) {
    if (!exam.scheduledDate) {
        return 'available';
    }
    
    try {
        const now = new Date();
        const scheduled = new Date(exam.scheduledDate);
        
        if (isNaN(scheduled.getTime())) {
            return 'available';
        }
        
        if (scheduled > now) {
            return 'upcoming';
        } else {
            // Check if it's still within a reasonable timeframe (e.g., not more than 7 days old)
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            if (scheduled < sevenDaysAgo) {
                return 'closed';
            }
            return 'available';
        }
    } catch (error) {
        console.error('Error getting exam status:', error);
        return 'available';
    }
}

// Export to global scope
window.isExamVisible = isExamVisible;
window.getExamStatusLabel = getExamStatusLabel;