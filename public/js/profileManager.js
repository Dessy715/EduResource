/**
 * Profile Manager
 * Handles user profile management and settings
 */

class ProfileManager {
    constructor(authManager, dataManager) {
        this.authManager = authManager;
        this.dataManager = dataManager;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.storage = firebase.storage();
        this.currentUser = null;
        this.currentUserData = null;
    }

    /**
     * Initialize profile manager
     */
    async initialize() {
        try {
            this.setupEventListeners();
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    const userData = await this.dataManager.loadUserData(user.uid);
                    this.currentUserData = userData;
                    this.loadProfile();
                } else {
                    window.location.href = '/index.html';
                }
            });
        } catch (error) {
            console.error('Initialization error:', error);
            showMessage('Failed to initialize profile', 'error');
        }
    }

    /**
     * Load profile data
     */
    async loadProfile() {
        try {
            this.displayProfile();
            await this.loadStatistics();
            await this.loadCourses();
            await this.loadAchievements();
            this.loadSettings();
        } catch (error) {
            console.error('Error loading profile:', error);
            showMessage('Failed to load profile', 'error');
        }
    }

    /**
     * Display profile information
     */
    displayProfile() {
        // Update profile header
        document.getElementById('profileAvatar').src = this.currentUserData.avatar || 'https://via.placeholder.com/150';
        document.getElementById('profileName').textContent = `${this.currentUserData.firstName} ${this.currentUserData.lastName}`;
        document.getElementById('profileEmail').textContent = this.currentUserData.email;
        document.getElementById('profileRole').textContent = this.currentUserData.role.charAt(0).toUpperCase() + this.currentUserData.role.slice(1);

        // Update about tab
        document.getElementById('firstNameDisplay').textContent = this.currentUserData.firstName;
        document.getElementById('lastNameDisplay').textContent = this.currentUserData.lastName;
        document.getElementById('emailDisplay').textContent = this.currentUserData.email;
        document.getElementById('roleDisplay').textContent = this.currentUserData.role;
        document.getElementById('institutionDisplay').textContent = this.currentUserData.institution || 'Not specified';
        document.getElementById('bioDisplay').textContent = this.currentUserData.bio || 'No bio added yet';

        // Update member since
        const createdAt = this.currentUserData.createdAt?.toDate() || new Date();
        document.getElementById('memberSinceDisplay').textContent = new Date(createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Populate edit form
        document.getElementById('editFirstName').value = this.currentUserData.firstName;
        document.getElementById('editLastName').value = this.currentUserData.lastName;
        document.getElementById('editInstitution').value = this.currentUserData.institution || '';
        document.getElementById('editBio').value = this.currentUserData.bio || '';
    }

    /**
     * Load user statistics
     */
    async loadStatistics() {
        try {
            // Enrolled courses
            const enrolledCoursesCount = this.currentUserData.enrolledCourses?.length || 0;
            document.getElementById('enrolledCoursesCount').textContent = enrolledCoursesCount;

            // Assignments count
            let assignmentsCount = 0;
            for (const courseId of (this.currentUserData.enrolledCourses || [])) {
                const assignmentsSnapshot = await this.db.collection('assignments')
                    .where('courseId', '==', courseId)
                    .get();
                assignmentsCount += assignmentsSnapshot.size;
            }
            document.getElementById('assignmentsCount').textContent = assignmentsCount;

            // Average grade
            const gradesSnapshot = await this.db.collection('grades')
                .where('studentId', '==', this.currentUser.uid)
                .get();

            let totalGrade = 0;
            if (!gradesSnapshot.empty) {
                gradesSnapshot.forEach(doc => {
                    const grade = doc.data();
                    totalGrade += (grade.score / grade.maxScore) * 100;
                });
                const avgGrade = Math.round(totalGrade / gradesSnapshot.size);
                document.getElementById('averageGradeCount').textContent = avgGrade + '%';
            } else {
                document.getElementById('averageGradeCount').textContent = '0%';
            }

            // Streak (example: days since last activity)
            const lastLogin = this.currentUserData.lastLogin?.toDate() || new Date();
            const today = new Date();
            const daysAgo = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
            const streak = daysAgo === 0 ? (this.currentUserData.streak || 1) : 0;
            document.getElementById('streakCount').textContent = streak;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Load user's courses
     */
    async loadCourses() {
        try {
            const enrolledCoursesList = document.getElementById('enrolledCoursesList');
            const noCoursesMessage = document.getElementById('noCoursesMessage');

            enrolledCoursesList.innerHTML = '';

            const courseIds = this.currentUserData.enrolledCourses || [];

            if (courseIds.length === 0) {
                noCoursesMessage.style.display = 'block';
                return;
            }

            noCoursesMessage.style.display = 'none';

            for (const courseId of courseIds) {
                const courseDoc = await this.db.collection('courses').doc(courseId).get();
                if (!courseDoc.exists) continue;

                const course = courseDoc.data();

                // Get grade for this course
                const gradesSnapshot = await this.db.collection('grades')
                    .where('studentId', '==', this.currentUser.uid)
                    .where('courseId', '==', courseId)
                    .get();

                let courseGrade = 0;
                if (!gradesSnapshot.empty) {
                    let totalScore = 0;
                    gradesSnapshot.forEach(doc => {
                        const grade = doc.data();
                        totalScore += (grade.score / grade.maxScore) * 100;
                    });
                    courseGrade = Math.round(totalScore / gradesSnapshot.size);
                }

                const courseCard = document.createElement('div');
                courseCard.className = 'bg-light rounded-lg p-6 hover:shadow-lg transition';
                courseCard.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="text-lg font-bold text-dark">${course.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">by ${course.instructorName}</p>
                        </div>
                        <span class="bg-primary text-white px-3 py-1 rounded-full text-sm">${courseGrade}%</span>
                    </div>
                    <p class="text-gray-700 mb-4">${course.description}</p>
                    <div class="flex gap-2 mb-4">
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">${course.level}</span>
                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">${course.category}</span>
                    </div>
                    <a href="course.html?id=${courseId}" class="inline-block bg-primary text-white px-4 py-2 rounded-lg hover:bg-opacity-90">
                        <i class="fas fa-arrow-right mr-2"></i> View Course
                    </a>
                `;
                enrolledCoursesList.appendChild(courseCard);
            }
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    /**
     * Load achievements/badges
     */
    async loadAchievements() {
        try {
            const achievementsList = document.querySelector('#achievements-tab .grid') || 
                                    document.querySelector('#achievements-tab');
            const noAchievementsMessage = document.getElementById('noAchievementsMessage');

            // Define achievements based on user progress
            const achievements = [];

            // Check various criteria
            const gradesSnapshot = await this.db.collection('grades')
                .where('studentId', '==', this.currentUser.uid)
                .get();

            // First course complete
            if (this.currentUserData.enrolledCourses?.length > 0) {
                achievements.push({
                    id: 'first-course',
                    name: 'First Step',
                    description: 'Enroll in your first course',
                    icon: 'fa-book',
                    color: 'bg-blue-500'
                });
            }

            // Perfect score (100%)
            let hasPerfectScore = false;
            gradesSnapshot.forEach(doc => {
                const grade = doc.data();
                if (grade.percentage === 100) {
                    hasPerfectScore = true;
                }
            });

            if (hasPerfectScore) {
                achievements.push({
                    id: 'perfect-score',
                    name: 'Perfect Score',
                    description: 'Get 100% on an assignment',
                    icon: 'fa-star',
                    color: 'bg-yellow-500'
                });
            }

            // Honor roll (average > 90%)
            if (gradesSnapshot.size > 0) {
                let totalGrade = 0;
                gradesSnapshot.forEach(doc => {
                    const grade = doc.data();
                    totalGrade += grade.percentage;
                });
                const avgGrade = totalGrade / gradesSnapshot.size;

                if (avgGrade > 90) {
                    achievements.push({
                        id: 'honor-roll',
                        name: 'Honor Roll',
                        description: 'Maintain a grade average above 90%',
                        icon: 'fa-trophy',
                        color: 'bg-purple-500'
                    });
                }

                if (avgGrade > 80) {
                    achievements.push({
                        id: 'good-grades',
                        name: 'Good Student',
                        description: 'Maintain a grade average above 80%',
                        icon: 'fa-graduation-cap',
                        color: 'bg-green-500'
                    });
                }
            }

            // Multiple courses (3+)
            if ((this.currentUserData.enrolledCourses?.length || 0) >= 3) {
                achievements.push({
                    id: 'course-explorer',
                    name: 'Course Explorer',
                    description: 'Enroll in 3 or more courses',
                    icon: 'fa-compass',
                    color: 'bg-orange-500'
                });
            }

            if (achievements.length === 0) {
                noAchievementsMessage.style.display = 'block';
                return;
            }

            noAchievementsMessage.style.display = 'none';

            // Display achievements
            const gridContainer = document.querySelector('#achievements-tab .grid');
            if (gridContainer) {
                gridContainer.innerHTML = '';
                achievements.forEach(achievement => {
                    const badgeElement = document.createElement('div');
                    badgeElement.className = 'text-center p-6 bg-light rounded-lg hover:shadow-lg transition';
                    badgeElement.innerHTML = `
                        <div class="${achievement.color} text-white rounded-full w-16 h-16 flex items-center justify-center text-2xl mx-auto mb-4">
                            <i class="fas ${achievement.icon}"></i>
                        </div>
                        <h4 class="font-bold text-dark">${achievement.name}</h4>
                        <p class="text-sm text-gray-600">${achievement.description}</p>
                    `;
                    gridContainer.appendChild(badgeElement);
                });
            }
        } catch (error) {
            console.error('Error loading achievements:', error);
        }
    }

    /**
     * Load user settings
     */
    loadSettings() {
        const emailNotificationsToggle = document.getElementById('emailNotificationsToggle');
        const pushNotificationsToggle = document.getElementById('pushNotificationsToggle');
        const darkModeToggle = document.getElementById('darkModeToggle');

        emailNotificationsToggle.checked = this.currentUserData.settings?.emailNotifications !== false;
        pushNotificationsToggle.checked = this.currentUserData.settings?.pushNotifications !== false;
        darkModeToggle.checked = this.currentUserData.settings?.darkMode === true;
    }

    /**
     * Save profile changes
     */
    async saveProfileChanges(formData) {
        try {
            const updates = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                institution: formData.institution,
                bio: formData.bio
            };

            await this.dataManager.saveUserData(this.currentUser.uid, updates);
            
            // Update local data
            this.currentUserData = { ...this.currentUserData, ...updates };
            
            showMessage('Profile updated successfully!', 'success');
            this.displayProfile();
            this.closeModal('editProfileModal');
        } catch (error) {
            console.error('Error saving profile:', error);
            showMessage('Failed to save profile changes', 'error');
        }
    }

    /**
     * Change password
     */
    async changePassword(currentPassword, newPassword) {
        try {
            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                currentPassword
            );

            await this.currentUser.reauthenticateWithCredential(credential);

            // Update password
            await this.currentUser.updatePassword(newPassword);

            showMessage('Password changed successfully!', 'success');
            this.closeModal('changePasswordModal');
            document.getElementById('changePasswordForm').reset();
        } catch (error) {
            console.error('Error changing password:', error);
            if (error.code === 'auth/wrong-password') {
                showMessage('Current password is incorrect', 'error');
            } else {
                showMessage(getErrorMessage(error.code), 'error');
            }
        }
    }

    /**
     * Upload avatar
     */
    async uploadAvatar(file) {
        try {
            if (!file.type.startsWith('image/')) {
                showMessage('Please select an image file', 'error');
                return;
            }

            if (file.size > 5 * 1024 * 1024) {
                showMessage('File size must be less than 5MB', 'error');
                return;
            }

            const storageRef = this.storage.ref(`avatars/${this.currentUser.uid}`);
            await storageRef.put(file);

            const url = await storageRef.getDownloadURL();

            await this.dataManager.saveUserData(this.currentUser.uid, { avatar: url });

            this.currentUserData.avatar = url;
            document.getElementById('profileAvatar').src = url;

            showMessage('Avatar uploaded successfully!', 'success');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showMessage('Failed to upload avatar', 'error');
        }
    }

    /**
     * Delete account
     */
    async deleteAccount(password) {
        try {
            if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                return;
            }

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                this.currentUser.email,
                password
            );

            await this.currentUser.reauthenticateWithCredential(credential);

            // Delete user data from Firestore
            await this.db.collection('users').doc(this.currentUser.uid).delete();

            // Delete user account
            await this.currentUser.delete();

            showMessage('Account deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        } catch (error) {
            console.error('Error deleting account:', error);
            showMessage(getErrorMessage(error.code), 'error');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Profile tab buttons
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Edit profile button
        document.getElementById('editProfileBtn')?.addEventListener('click', () => {
            this.openModal('editProfileModal');
        });

        // Edit profile form
        document.getElementById('editProfileForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                firstName: document.getElementById('editFirstName').value,
                lastName: document.getElementById('editLastName').value,
                institution: document.getElementById('editInstitution').value,
                bio: document.getElementById('editBio').value
            };
            this.saveProfileChanges(formData);
        });

        // Change password button
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
            this.openModal('changePasswordModal');
        });

        // Change password form
        document.getElementById('changePasswordForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmPassword) {
                showMessage('New passwords do not match', 'error');
                return;
            }

            if (newPassword.length < 6) {
                showMessage('Password must be at least 6 characters', 'error');
                return;
            }

            this.changePassword(currentPassword, newPassword);
        });

        // Avatar upload
        document.getElementById('uploadAvatarBtn')?.addEventListener('click', () => {
            document.getElementById('avatarInput').click();
        });

        document.getElementById('avatarInput')?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.uploadAvatar(e.target.files[0]);
            }
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await this.authManager.logout();
            window.location.href = '/index.html';
        });

        // Delete account button
        document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
            const password = prompt('Enter your password to confirm account deletion:');
            if (password) {
                this.deleteAccount(password);
            }
        });

        // Settings toggles
        document.getElementById('emailNotificationsToggle')?.addEventListener('change', (e) => {
            this.updateSetting('emailNotifications', e.target.checked);
        });

        document.getElementById('pushNotificationsToggle')?.addEventListener('change', (e) => {
            this.updateSetting('pushNotifications', e.target.checked);
        });

        document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
            this.updateSetting('darkMode', e.target.checked);
            if (e.target.checked) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });

        // Modal close buttons
        document.querySelectorAll('.profile-modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('[id$="-modal"]');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * Update a setting
     */
    async updateSetting(settingName, value) {
        try {
            const settings = this.currentUserData.settings || {};
            settings[settingName] = value;

            await this.dataManager.saveUserData(this.currentUser.uid, { settings });
            this.currentUserData.settings = settings;
        } catch (error) {
            console.error('Error updating setting:', error);
            showMessage('Failed to update setting', 'error');
        }
    }

    /**
     * Switch tabs
     */
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.profile-tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active from all buttons
        document.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.classList.remove('border-b-2', 'border-primary', 'text-primary');
            btn.classList.add('text-gray-600');
        });

        // Show selected tab
        const tabElement = document.getElementById(tabName + '-tab');
        if (tabElement) {
            tabElement.classList.add('active');
        }

        // Add active to clicked button
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('border-b-2', 'border-primary', 'text-primary');
            event.currentTarget.classList.remove('text-gray-600');
        }
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    const profileManager = new ProfileManager(authManager, dataManager);
    profileManager.initialize();
});
