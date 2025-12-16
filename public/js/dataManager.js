/**
 * Data Manager Module
 * Handles all data operations with Firestore
 */

import { getServerTimestamp, formatDate, daysUntil } from './utils.js';

class DataManager {
    constructor(db) {
        this.db = db;
        this.currentUserData = null;
    }

    /**
     * Load user data from Firestore
     */
    async loadUserData(userId) {
        try {
            const userDoc = await this.db.collection('users').doc(userId).get();
            
            if (userDoc.exists) {
                this.currentUserData = userDoc.data();
                
                // Update last login
                await this.db.collection('users').doc(userId).update({
                    lastLogin: getServerTimestamp()
                });
                
                console.log("✓ User data loaded");
                return this.currentUserData;
            } else {
                console.log("ℹ User document not found");
                return null;
            }
        } catch (error) {
            console.error("✗ Error loading user data:", error);
            throw error;
        }
    }

    /**
     * Save user data to Firestore
     */
    async saveUserData(userId, userData) {
        try {
            await this.db.collection('users').doc(userId).set(userData, { merge: true });
            this.currentUserData = userData;
            console.log("✓ User data saved");
        } catch (error) {
            console.error("✗ Error saving user data:", error);
            throw error;
        }
    }

    /**
     * Add a course to user's enrolled courses
     */
    async enrollCourse(userId, course) {
        try {
            if (!this.currentUserData.courses) {
                this.currentUserData.courses = [];
            }

            if (this.currentUserData.courses.some(c => c.id === course.id)) {
                throw new Error('Already enrolled in this course');
            }

            this.currentUserData.courses.push(course);
            await this.saveUserData(userId, this.currentUserData);
            
            console.log("✓ Course enrolled");
            return this.currentUserData;
        } catch (error) {
            console.error("✗ Error enrolling course:", error);
            throw error;
        }
    }

    /**
     * Add an assignment to user's assignments
     */
    async addAssignment(userId, assignment) {
        try {
            if (!this.currentUserData.assignments) {
                this.currentUserData.assignments = [];
            }

            this.currentUserData.assignments.push(assignment);
            await this.saveUserData(userId, this.currentUserData);
            
            console.log("✓ Assignment added");
            return this.currentUserData;
        } catch (error) {
            console.error("✗ Error adding assignment:", error);
            throw error;
        }
    }

    /**
     * Update assignment status
     */
    async updateAssignment(userId, assignmentId, updates) {
        try {
            const assignmentIndex = this.currentUserData.assignments?.findIndex(a => a.id === assignmentId);
            
            if (assignmentIndex !== undefined && assignmentIndex >= 0) {
                this.currentUserData.assignments[assignmentIndex] = {
                    ...this.currentUserData.assignments[assignmentIndex],
                    ...updates
                };
                
                await this.saveUserData(userId, this.currentUserData);
                console.log("✓ Assignment updated");
            }
        } catch (error) {
            console.error("✗ Error updating assignment:", error);
            throw error;
        }
    }

    /**
     * Get user's dashboard statistics
     */
    getDashboardStats() {
        const courses = this.currentUserData.courses || [];
        const assignments = this.currentUserData.assignments || [];
        const pending = assignments.filter(a => !a.completed).length;
        const completedAssignments = assignments.filter(a => a.completed && a.grade);
        
        const average = completedAssignments.length > 0 ?
            (completedAssignments.reduce((sum, a) => sum + a.grade, 0) / completedAssignments.length).toFixed(1) : 0;

        return {
            activeCourses: courses.length,
            pendingAssignments: pending,
            averageGrade: average,
            studyHours: this.currentUserData.studyHours || 0,
            totalCourses: courses.length,
            completedCourses: courses.filter(c => c.progress === 100).length
        };
    }

    /**
     * Get upcoming deadlines
     */
    getUpcomingDeadlines(limit = 5) {
        const assignments = this.currentUserData.assignments || [];
        
        return assignments
            .filter(a => !a.completed && a.dueDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, limit)
            .map(a => ({
                ...a,
                daysUntil: daysUntil(a.dueDate),
                formattedDate: formatDate(a.dueDate)
            }));
    }

    /**
     * Get user's courses
     */
    getCourses() {
        return this.currentUserData.courses || [];
    }

    /**
     * Get user's assignments
     */
    getAssignments(filter = null) {
        let assignments = this.currentUserData.assignments || [];

        if (filter === 'pending') {
            assignments = assignments.filter(a => !a.completed);
        } else if (filter === 'completed') {
            assignments = assignments.filter(a => a.completed);
        }

        return assignments;
    }

    /**
     * Get user's grades
     */
    getGrades() {
        const assignments = this.currentUserData.assignments || [];
        return assignments.filter(a => a.completed && a.grade);
    }
}

export default DataManager;
