/**
 * EduLearn Main Application
 * Orchestrates all modules and initializes the app
 */

// Import firebase-config at the top level
class EduLearnApp {
    constructor() {
        this.auth = null;
        this.db = null;
        this.authManager = null;
        this.dataManager = null;
        this.uiManager = null;
        this.eventHandler = null;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log("🚀 Initializing EduLearn...");

            // Initialize Firebase
            if (!await this.initializeFirebase()) {
                throw new Error("Firebase initialization failed");
            }

            // Setup managers
            this.setupManagers();

            // Setup event listeners
            this.eventHandler.setupEventListeners();

            // Check authentication state
            this.setupAuthStateListener();

            console.log("✅ EduLearn initialized successfully");
        } catch (error) {
            console.error("❌ Initialization error:", error);
            showMessage("Failed to initialize application", "error");
        }
    }

    /**
     * Initialize Firebase
     */
    async initializeFirebase() {
        try {
            const { auth: fbAuth, db: fbDb } = await import('./firebase-config.js');
            this.auth = fbAuth;
            this.db = fbDb;
            console.log("✓ Firebase initialized");
            return true;
        } catch (error) {
            console.error("✗ Firebase error:", error);
            return false;
        }
    }

    /**
     * Setup all managers
     */
    setupManagers() {
        // AuthManager
        this.authManager = new AuthManager(this.auth, this.db);

        // DataManager
        this.dataManager = new DataManager(this.db);

        // UIManager
        this.uiManager = new UIManager();

        // EventHandler
        this.eventHandler = new EventHandler(this.authManager, this.dataManager, this.uiManager);

        console.log("✓ Managers initialized");
    }

    /**
     * Setup authentication state listener
     */
    setupAuthStateListener() {
        this.authManager.checkAuthState(async (user) => {
            if (user) {
                try {
                    const userData = await this.dataManager.loadUserData(user.uid);
                    this.uiManager.updateAuthUI(user, userData);
                    this.uiManager.updateResponsiveLayout(true);
                    console.log("✓ User authenticated:", user.email);
                } catch (error) {
                    console.error("Error loading user data:", error);
                    showMessage("Error loading your data", "error");
                }
            } else {
                this.uiManager.updateAuthUI(null, null);
                this.uiManager.updateResponsiveLayout(false);
                console.log("✓ User not authenticated");
            }
        });
    }

    /**
     * Update dashboard
     */
    updateDashboard(role = 'student') {
        const stats = this.dataManager.getDashboardStats();
        const deadlines = this.dataManager.getUpcomingDeadlines();

        // Update stats cards
        document.getElementById('activeCoursesCount').textContent = stats.activeCourses;
        document.getElementById('pendingAssignmentsCount').textContent = stats.pendingAssignments;
        document.getElementById('averageGrade').textContent = stats.averageGrade + '%';
        document.getElementById('studyHours').textContent = stats.studyHours;

        // Update upcoming deadline
        if (deadlines.length > 0) {
            const deadline = deadlines[0];
            document.getElementById('deadlineTitle').textContent = deadline.title;
            document.getElementById('deadlineTime').textContent = `Due in ${deadline.daysUntil} days`;
        }

        // Display courses
        this.displayCourses(stats);
    }

    /**
     * Display user's courses
     */
    displayCourses(stats) {
        const container = document.getElementById('coursesContainer');
        const courses = this.dataManager.getCourses();

        if (!container) return;

        if (courses.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <i class="fas fa-book-open text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
                    <p class="text-gray-500 mb-4">Join a course to get started with your learning journey.</p>
                    <button id="joinFirstCourse" class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                        Join Your First Course
                    </button>
                </div>
            `;

            document.getElementById('joinFirstCourse')?.addEventListener('click', () => {
                this.eventHandler.handleJoinCourse();
            });
            return;
        }

        container.innerHTML = courses.map((course, index) => `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div class="h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div class="p-6">
                    <div class="flex items-start justify-between mb-4">
                        <div>
                            <span class="inline-block px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">${course.code}</span>
                            <h4 class="text-lg font-bold text-gray-900 mt-2">${course.title}</h4>
                            <p class="text-gray-600 text-sm mt-1">${course.instructor}</p>
                        </div>
                        <div class="relative w-12 h-12">
                            <svg class="progress-ring w-12 h-12" viewBox="0 0 100 100">
                                <circle class="text-gray-200" stroke-width="8" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50"/>
                                <circle class="progress-ring-circle text-blue-600" stroke-width="8" stroke-linecap="round" stroke="currentColor" fill="transparent" r="45" cx="50" cy="50" 
                                    style="stroke-dashoffset: ${283 - (283 * (course.progress || 0) / 100)};"/>
                            </svg>
                            <span class="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">${course.progress || 0}%</span>
                        </div>
                    </div>
                    <p class="text-gray-600 text-sm mb-4">${course.description}</p>
                    <div class="flex items-center justify-between text-sm text-gray-500">
                        <div class="flex items-center space-x-4">
                            <span><i class="fas fa-users mr-1"></i>${course.students} students</span>
                            <span><i class="fas fa-file-alt mr-1"></i>${course.modules} modules</span>
                        </div>
                        <button class="text-primary hover:text-primary/80 font-medium">Continue →</button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get application instance
     */
    static getInstance() {
        if (!window.EduLearnAppInstance) {
            window.EduLearnAppInstance = new EduLearnApp();
        }
        return window.EduLearnAppInstance;
    }
}

/**
 * Global utility function for messages
 */
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 px-6 py-3 rounded-lg text-white z-50 
        ${type === 'error' ? 'bg-red-500' : 
          type === 'success' ? 'bg-green-500' : 
          'bg-blue-500'} 
        shadow-lg animate-pulse`;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    setTimeout(() => messageDiv.remove(), 3000);
}

/**
 * Simple class definitions (without ES6 import/export for now)
 */

class AuthManager {
    constructor(auth, db) {
        this.auth = auth;
        this.db = db;
        this.currentUser = null;
    }

    checkAuthState(callback) {
        if (!this.auth) return;
        this.auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;
            if (callback) callback(user);
        });
    }

    async loginWithEmail(email, password) {
        return await this.auth.signInWithEmailAndPassword(email, password);
    }

    async registerWithEmail(email, password, confirmPassword, userData) {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');

        const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
        await userCredential.user.updateProfile({ displayName: userData.name });

        const { serverTimestamp, setDoc, doc } = await import('./firebase-config.js');
        const userDoc = {
            uid: userCredential.user.uid,
            name: userData.name,
            email: email,
            role: userData.role || 'student',
            major: userData.major,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            courses: [],
            assignments: [],
            studyHours: 0
        };

        await setDoc(doc(this.db, 'users', userCredential.user.uid), userDoc);
        return userCredential.user;
    }

    async loginWithGoogle() {
        const { googleProvider } = await import('./firebase-config.js');
        const result = await this.auth.signInWithPopup(googleProvider);
        const user = result.user;

        const { serverTimestamp, setDoc, getDoc, doc } = await import('./firebase-config.js');
        const userDocRef = doc(this.db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (!userDocSnap.exists()) {
            const userData = {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                role: 'student',
                major: 'Computer Science',
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                courses: [],
                assignments: [],
                studyHours: 0
            };
            await setDoc(userDocRef, userData);
        }

        return user;
    }

    async logout() {
        await this.auth.signOut();
        this.currentUser = null;
    }
}

class DataManager {
    constructor(db) {
        this.db = db;
        this.currentUserData = null;
    }

    async loadUserData(userId) {
        const { getDoc, doc, updateDoc, serverTimestamp } = await import('./firebase-config.js');
        const userDocRef = doc(this.db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            this.currentUserData = userDocSnap.data();
            await updateDoc(userDocRef, {
                lastLogin: serverTimestamp()
            });
            return this.currentUserData;
        }
        return null;
    }

    async saveUserData(userId, userData) {
        const { setDoc, doc } = await import('./firebase-config.js');
        await setDoc(doc(this.db, 'users', userId), userData, { merge: true });
        this.currentUserData = userData;
    }

    async enrollCourse(userId, course) {
        if (!this.currentUserData.courses) this.currentUserData.courses = [];
        if (this.currentUserData.courses.some(c => c.id === course.id)) {
            throw new Error('Already enrolled');
        }
        this.currentUserData.courses.push(course);
        await this.saveUserData(userId, this.currentUserData);
        return this.currentUserData;
    }

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
            studyHours: this.currentUserData.studyHours || 0
        };
    }

    getUpcomingDeadlines(limit = 5) {
        const assignments = this.currentUserData.assignments || [];
        return assignments
            .filter(a => !a.completed && a.dueDate)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .slice(0, limit);
    }

    getCourses() {
        return this.currentUserData.courses || [];
    }
}

class UIManager {
    constructor() {
        this.currentTab = 'overview';
        this.isSidebarOpen = false;
    }

    updateAuthUI(user, userData) {
        const authButtons = document.getElementById('authButtons');
        const profileSection = document.getElementById('profileSection');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const dashboardContent = document.getElementById('dashboardContent');

        if (user) {
            authButtons?.classList.add('hidden');
            profileSection?.classList.remove('hidden');
            welcomeScreen?.classList.add('hidden');
            dashboardContent?.classList.remove('hidden');
            this.updateUserProfile(user, userData);
        } else {
            authButtons?.classList.remove('hidden');
            profileSection?.classList.add('hidden');
            welcomeScreen?.classList.remove('hidden');
            dashboardContent?.classList.add('hidden');
        }
    }

    updateUserProfile(user, userData) {
        const userName = userData?.name || user.displayName || 'Student';
        document.getElementById('userName').textContent = userName;
        document.getElementById('displayUserName').textContent = userName;

        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.src = user.photoURL || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4F46E5&color=fff`;
        }
    }

    showAuthModal(type = 'login') {
        const modal = document.getElementById('authModal');
        const modalTitle = document.getElementById('modalTitle');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        loginForm.reset();
        registerForm.reset();

        if (type === 'login') {
            modalTitle.textContent = 'Login';
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            modalTitle.textContent = 'Create Account';
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
            this.initializeRoleSelection();
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    initializeRoleSelection() {
        const roleOptions = document.querySelectorAll('.role-option');
        roleOptions.forEach(option => {
            option.classList.remove('border-primary', 'bg-primary/5');
            option.classList.add('border-gray-200');
            option.addEventListener('click', () => {
                roleOptions.forEach(opt => {
                    opt.classList.remove('border-primary', 'bg-primary/5');
                    opt.classList.add('border-gray-200');
                });
                option.classList.remove('border-gray-200');
                option.classList.add('border-primary', 'bg-primary/5');
                document.getElementById('registerRole').value = option.dataset.role;
            });
        });
        document.querySelector('[data-role="student"]')?.classList.add('border-primary', 'bg-primary/5');
        document.getElementById('registerRole').value = 'student';
    }

    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            document.getElementById('loadingText').textContent = text;
            overlay.classList.remove('hidden');
        }
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.classList.add('hidden');
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('text-primary', 'bg-primary/10');
            btn.classList.add('text-gray-700');
        });
        document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('text-primary', 'bg-primary/10');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(tabId)?.classList.add('active');
    }

    updateResponsiveLayout(isLoggedIn) {
        const isMobile = window.innerWidth < 1024;
        const mobileTabNav = document.getElementById('mobileTabNav');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');

        if (isMobile && isLoggedIn) {
            mobileTabNav?.classList.remove('hidden');
            mobileMenuToggle?.classList.remove('hidden');
        } else {
            mobileTabNav?.classList.add('hidden');
            mobileMenuToggle?.classList.add('hidden');
        }
    }
}

class EventHandler {
    constructor(authManager, dataManager, uiManager) {
        this.authManager = authManager;
        this.dataManager = dataManager;
        this.uiManager = uiManager;
    }

    setupEventListeners() {
        // Auth buttons
        document.getElementById('loginBtn')?.addEventListener('click', () => this.uiManager.showAuthModal('login'));
        document.getElementById('registerBtn')?.addEventListener('click', () => this.uiManager.showAuthModal('register'));
        document.getElementById('logoutBtn')?.addEventListener('click', () => this.handleLogout());
        document.getElementById('closeModal')?.addEventListener('click', () => this.uiManager.hideAuthModal());

        // Forms
        document.getElementById('loginForm')?.addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm')?.addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('googleLoginBtn')?.addEventListener('click', () => this.handleGoogleLogin());
        document.getElementById('googleRegisterBtn')?.addEventListener('click', () => this.handleGoogleLogin());

        // Modal switching
        document.getElementById('switchToLogin')?.addEventListener('click', () => this.uiManager.showAuthModal('login'));
        document.getElementById('switchToRegister')?.addEventListener('click', () => this.uiManager.showAuthModal('register'));

        // Navigation
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.uiManager.switchTab(btn.dataset.tab);
            });
        });

        document.getElementById('joinCourseBtn')?.addEventListener('click', () => this.handleJoinCourse());

        // Modal backdrop click
        document.getElementById('authModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'authModal') this.uiManager.hideAuthModal();
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.uiManager.hideAuthModal();
        });
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        this.uiManager.showLoading('Logging in...');

        try {
            await this.authManager.loginWithEmail(email, password);
            showMessage('Login successful!', 'success');
            this.uiManager.hideAuthModal();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const major = document.getElementById('registerMajor').value;
        const role = document.getElementById('registerRole').value;

        if (!name || !email || !password || !major) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        this.uiManager.showLoading('Creating account...');

        try {
            await this.authManager.registerWithEmail(email, password, confirmPassword, { name, role, major });
            showMessage(`Account created! Welcome as ${role}`, 'success');
            this.uiManager.hideAuthModal();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async handleGoogleLogin() {
        this.uiManager.showLoading('Signing in with Google...');
        try {
            await this.authManager.loginWithGoogle();
            showMessage('Google sign-in successful!', 'success');
            this.uiManager.hideAuthModal();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async handleLogout() {
        try {
            await this.authManager.logout();
            showMessage('Logged out successfully', 'success');
        } catch (error) {
            showMessage('Logout failed', 'error');
        }
    }

    async handleJoinCourse() {
        if (!this.authManager.currentUser) {
            this.uiManager.showAuthModal('login');
            return;
        }

        const course = {
            id: 'cs101',
            code: 'CS101',
            title: 'Introduction to Programming',
            instructor: 'Prof. Smith',
            color: 'blue',
            progress: 0,
            students: 45,
            modules: 8,
            description: 'Learn the fundamentals of programming with Python.'
        };

        try {
            await this.dataManager.enrollCourse(this.authManager.currentUser.uid, course);
            showMessage(`Successfully joined ${course.title}!`, 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = EduLearnApp.getInstance();
    app.initialize();
});
