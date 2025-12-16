/**
 * Authentication Module
 * Handles all authentication-related operations
 */

import { showMessage, getServerTimestamp, isValidEmail, getErrorMessage } from './utils.js';

class AuthManager {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
    }

    /**
     * Check current authentication state
     */
    checkAuthState(callback) {
        if (!this.auth) {
            console.error("Firebase Auth not initialized");
            return;
        }

        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.currentUser = user;
                console.log("✓ User logged in:", user.email);
            } else {
                this.currentUser = null;
                console.log("✓ User logged out");
            }
            
            if (callback) callback(user);
        });
    }

    /**
     * Email/Password Login
     */
    async loginWithEmail(email, password) {
        if (!email || !password) {
            throw new Error('Please enter both email and password');
        }

        if (!isValidEmail(email)) {
            throw new Error('Invalid email address');
        }

        try {
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            console.log("✓ Login successful:", userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error("✗ Login error:", error);
            throw new Error(getErrorMessage(error.code));
        }
    }

    /**
     * Email/Password Registration
     */
    async registerWithEmail(email, password, confirmPassword, userData) {
        if (!email || !password || !confirmPassword) {
            throw new Error('Please fill in all fields');
        }

        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters');
        }

        if (!isValidEmail(email)) {
            throw new Error('Invalid email address');
        }

        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            
            // Update profile
            await userCredential.user.updateProfile({
                displayName: userData.name
            });

            // Create user document in Firestore
            await this.createUserDocument(userCredential.user, userData);
            
            console.log("✓ Registration successful:", userCredential.user.email);
            return userCredential.user;
        } catch (error) {
            console.error("✗ Registration error:", error);
            throw new Error(getErrorMessage(error.code));
        }
    }

    /**
     * Google Sign In
     */
    async loginWithGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const result = await this.auth.signInWithPopup(provider);
            const user = result.user;

            // Check if user exists in Firestore
            const userDoc = await this.db.collection('users').doc(user.uid).get();
            
            if (!userDoc.exists) {
                // Create new user document for Google users
                await this.createUserDocument(user, {
                    name: user.displayName,
                    role: 'student',
                    major: 'Computer Science'
                });
                console.log("✓ New Google user created");
            }

            console.log("✓ Google sign-in successful:", user.email);
            return user;
        } catch (error) {
            console.error("✗ Google sign-in error:", error);
            throw new Error(getErrorMessage(error.code));
        }
    }

    /**
     * Create user document in Firestore
     */
    async createUserDocument(user, userData) {
        try {
            const userDoc = {
                uid: user.uid,
                name: userData.name || user.displayName || 'User',
                email: user.email,
                photoURL: user.photoURL || null,
                role: userData.role || 'student',
                major: userData.major || 'Computer Science',
                createdAt: getServerTimestamp(),
                lastLogin: getServerTimestamp(),
                courses: [],
                assignments: [],
                studyHours: 0
            };

            // Add role-specific data
            if (userData.role === 'student') {
                userDoc.studentData = {
                    enrollmentDate: getServerTimestamp(),
                    year: 1,
                    gpa: 0.0,
                    enrolledCourses: [],
                    completedCourses: []
                };
            } else if (userData.role === 'instructor') {
                userDoc.instructorData = {
                    department: userData.major || 'Computer Science',
                    createdCourses: []
                };
            }

            await this.db.collection('users').doc(user.uid).set(userDoc, { merge: true });
            console.log("✓ User document created");
        } catch (error) {
            console.error("✗ Error creating user document:", error);
            throw error;
        }
    }

    /**
     * Logout
     */
    async logout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            console.log("✓ Logout successful");
        } catch (error) {
            console.error("✗ Logout error:", error);
            throw error;
        }
    }
}

export default AuthManager;
