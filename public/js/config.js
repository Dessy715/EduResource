/**
 * Configuration Module
 * Handles Firebase and app configuration
 */

const APP_CONFIG = {
    firebase: {
        apiKey: "AIzaSyABPIPlcodXrees7rMItdnEthzffKaqhCY",
        authDomain: "learning-mgt-sys-ec11d.web.app",
        projectId: "learning-mgt-sys-ec11d",
        messagingSenderId: "192661015638"
    },
    app: {
        name: "EduLearn",
        version: "1.0.0"
    }
};

// Firebase services
let auth = null;
let db = null;

/**
 * Initialize Firebase
 */
function initializeFirebase() {
    try {
        firebase.initializeApp(APP_CONFIG.firebase);
        auth = firebase.auth();
        db = firebase.firestore();
        console.log("✓ Firebase initialized successfully");
        return true;
    } catch (error) {
        console.error("✗ Firebase initialization error:", error);
        showMessage("Firebase initialization failed. Please check your configuration.", "error");
        return false;
    }
}

/**
 * Export configuration and initialization function
 */
export { APP_CONFIG, initializeFirebase, auth, db };
