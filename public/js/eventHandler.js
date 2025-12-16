/**
 * Event Handler Module
 * Manages all event listeners and interactions
 */

import { showMessage, isValidEmail } from './utils.js';

class EventHandler {
    constructor(authManager, dataManager, uiManager) {
        this.authManager = authManager;
        this.dataManager = dataManager;
        this.uiManager = uiManager;
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupAuthButtons();
        this.setupModalEvents();
        this.setupFormEvents();
        this.setupNavigationEvents();
        this.setupResponsiveEvents();
    }

    /**
     * Setup authentication buttons
     */
    setupAuthButtons() {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const welcomeLoginBtn = document.getElementById('welcomeLoginBtn');
        const welcomeRegisterBtn = document.getElementById('welcomeRegisterBtn');

        loginBtn?.addEventListener('click', () => this.uiManager.showAuthModal('login'));
        registerBtn?.addEventListener('click', () => this.uiManager.showAuthModal('register'));
        logoutBtn?.addEventListener('click', () => this.handleLogout());
        welcomeLoginBtn?.addEventListener('click', () => this.uiManager.showAuthModal('login'));
        welcomeRegisterBtn?.addEventListener('click', () => this.uiManager.showAuthModal('register'));
    }

    /**
     * Setup modal events
     */
    setupModalEvents() {
        const closeModal = document.getElementById('closeModal');
        const authModal = document.getElementById('authModal');

        closeModal?.addEventListener('click', () => this.uiManager.hideAuthModal());

        authModal?.addEventListener('click', (e) => {
            if (e.target.id === 'authModal') {
                this.uiManager.hideAuthModal();
            }
        });

        // Modal tab switches
        document.getElementById('switchToLogin')?.addEventListener('click', () => this.uiManager.showAuthModal('login'));
        document.getElementById('switchToRegister')?.addEventListener('click', () => this.uiManager.showAuthModal('register'));
    }

    /**
     * Setup form events
     */
    setupFormEvents() {
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const googleLoginBtn = document.getElementById('googleLoginBtn');
        const googleRegisterBtn = document.getElementById('googleRegisterBtn');

        loginForm?.addEventListener('submit', (e) => this.handleLogin(e));
        registerForm?.addEventListener('submit', (e) => this.handleRegister(e));
        googleLoginBtn?.addEventListener('click', () => this.handleGoogleLogin());
        googleRegisterBtn?.addEventListener('click', () => this.handleGoogleLogin());
    }

    /**
     * Setup navigation events
     */
    setupNavigationEvents() {
        // Desktop sidebar tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = btn.dataset.tab;
                this.uiManager.switchTab(tabId);
            });
        });

        // Mobile bottom tabs
        document.querySelectorAll('#mobileTabNav .mobile-tab-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                this.uiManager.switchTab(tabId);
            });
        });

        // Mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');
        mobileMenuToggle?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.uiManager.toggleSidebar();
        });

        // Course action buttons
        document.getElementById('joinCourseBtn')?.addEventListener('click', () => this.handleJoinCourse());
    }

    /**
     * Setup responsive events
     */
    setupResponsiveEvents() {
        // Sidebar backdrop
        document.getElementById('sidebarBackdrop')?.addEventListener('click', () => {
            this.uiManager.closeSidebarOnMobile();
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 1024 && this.uiManager.isSidebarOpen) {
                const sidebar = document.getElementById('sidebar');
                const mobileToggle = document.getElementById('mobileMenuToggle');

                if (sidebar && mobileToggle) {
                    const isClickInsideSidebar = sidebar.contains(e.target);
                    const isClickOnToggle = mobileToggle.contains(e.target);

                    if (!isClickInsideSidebar && !isClickOnToggle) {
                        this.uiManager.closeSidebarOnMobile();
                    }
                }
            }
        });

        // Escape key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.uiManager.hideAuthModal();
                this.uiManager.closeSidebarOnMobile();
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.uiManager.updateResponsiveLayout(this.authManager.currentUser !== null);
        });
    }

    /**
     * Handle email login
     */
    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        this.uiManager.showLoading('Logging in...');
        this.uiManager.setButtonLoading('loginSubmitBtn', true, 'Logging in...');

        try {
            await this.authManager.loginWithEmail(email, password);
            showMessage('Login successful!', 'success');
            this.uiManager.hideAuthModal();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
            this.uiManager.setButtonLoading('loginSubmitBtn', false);
        }
    }

    /**
     * Handle email registration
     */
    async handleRegister(e) {
        e.preventDefault();

        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const major = document.getElementById('registerMajor').value;
        const role = document.getElementById('registerRole').value;

        if (!name || !email || !password || !confirmPassword || !major) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showMessage('Invalid email address', 'error');
            return;
        }

        this.uiManager.showLoading('Creating account...');
        this.uiManager.setButtonLoading('registerSubmitBtn', true, 'Creating account...');

        try {
            await this.authManager.registerWithEmail(email, password, confirmPassword, {
                name,
                role,
                major
            });

            showMessage(`Account created successfully! Welcome as ${role}`, 'success');
            this.uiManager.hideAuthModal();
        } catch (error) {
            showMessage(error.message, 'error');
        } finally {
            this.uiManager.hideLoading();
            this.uiManager.setButtonLoading('registerSubmitBtn', false);
        }
    }

    /**
     * Handle Google login
     */
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

    /**
     * Handle logout
     */
    async handleLogout() {
        try {
            await this.authManager.logout();
            showMessage('Logged out successfully', 'success');
        } catch (error) {
            showMessage('Logout failed: ' + error.message, 'error');
        }
    }

    /**
     * Handle joining a course
     */
    async handleJoinCourse() {
        if (!this.authManager.currentUser) {
            this.uiManager.showAuthModal('login');
            return;
        }

        // Sample course
        const sampleCourse = {
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
            await this.dataManager.enrollCourse(this.authManager.currentUser.uid, sampleCourse);
            showMessage(`Successfully joined ${sampleCourse.title}!`, 'success');
        } catch (error) {
            showMessage(error.message, 'error');
        }
    }
}

export default EventHandler;
