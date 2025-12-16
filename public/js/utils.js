/**
 * Utility Module
 * Common helper functions for the app
 */

/**
 * Show a message toast notification
 */
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 
        ${type === 'error' ? 'bg-red-500' : 
          type === 'success' ? 'bg-green-500' : 
          'bg-blue-500'} 
        shadow-lg animate-bounce`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

/**
 * Get firebase server timestamp
 */
function getServerTimestamp() {
    return firebase.firestore.FieldValue.serverTimestamp();
}

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Format date to readable string
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${month}/${day}/${year}`;
}

/**
 * Calculate days until date
 */
function daysUntil(date) {
    if (!date) return 0;
    const now = new Date();
    const target = new Date(date);
    const diffTime = target - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Handle common Firebase errors
 */
function getErrorMessage(errorCode) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email address',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'Email already in use',
        'auth/weak-password': 'Password is too weak',
        'auth/invalid-email': 'Invalid email address',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many login attempts. Try again later',
        'auth/popup-closed-by-user': 'You closed the sign-in window',
        'auth/account-exists-with-different-credential': 'An account already exists with this email',
        'auth/popup-blocked': 'Popup was blocked. Please allow popups',
        'auth/operation-not-allowed': 'This operation is not enabled',
        'auth/unauthorized-domain': 'This domain is not authorized',
        'auth/cancelled-popup-request': 'Sign in was cancelled'
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
}

export { 
    showMessage, 
    getServerTimestamp, 
    isValidEmail, 
    formatDate, 
    daysUntil, 
    getErrorMessage 
};
