/**
 * UI Manager Module
 * Handles all UI updates and interactions
 */

class UIManager {
    constructor() {
        this.currentTab = 'overview';
        this.isSidebarOpen = false;
    }

    /**
     * Update authentication UI based on login state
     */
    updateAuthUI(user, userData) {
        const authButtons = document.getElementById('authButtons');
        const profileSection = document.getElementById('profileSection');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const dashboardContent = document.getElementById('dashboardContent');

        if (user) {
            // User is logged in
            if (authButtons) authButtons.classList.add('hidden');
            if (profileSection) profileSection.classList.remove('hidden');
            if (welcomeScreen) welcomeScreen.classList.add('hidden');
            if (dashboardContent) dashboardContent.classList.remove('hidden');

            this.updateUserProfile(user, userData);
        } else {
            // User is not logged in
            if (authButtons) authButtons.classList.remove('hidden');
            if (profileSection) profileSection.classList.add('hidden');
            if (welcomeScreen) welcomeScreen.classList.remove('hidden');
            if (dashboardContent) dashboardContent.classList.add('hidden');
        }
    }

    /**
     * Update user profile display
     */
    updateUserProfile(user, userData) {
        const userName = userData?.name || user.displayName || 'Student';
        const userRole = userData?.role || 'student';
        const userMajor = userData?.major || 'Computer Science';

        // Update name displays
        const userNameElement = document.getElementById('userName');
        const displayUserNameElement = document.getElementById('displayUserName');
        
        if (userNameElement) userNameElement.textContent = userName;
        if (displayUserNameElement) displayUserNameElement.textContent = userName;

        // Update major with role badge
        const userMajorElement = document.getElementById('userMajor');
        if (userMajorElement) {
            userMajorElement.innerHTML = `
                <span class="inline-flex items-center">
                    <span class="mr-2">${userMajor}</span>
                    <span class="role-badge ${userRole}">
                        ${userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                </span>
            `;
        }

        // Update avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            if (user.photoURL) {
                avatar.src = user.photoURL;
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=4F46E5&color=fff`;
            }
        }
    }

    /**
     * Show authentication modal
     */
    showAuthModal(type = 'login') {
        const modal = document.getElementById('authModal');
        const modalTitle = document.getElementById('modalTitle');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        // Clear forms
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

    /**
     * Hide authentication modal
     */
    hideAuthModal() {
        const modal = document.getElementById('authModal');
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
    }

    /**
     * Initialize role selection in registration form
     */
    initializeRoleSelection() {
        const roleOptions = document.querySelectorAll('.role-option');
        
        roleOptions.forEach(option => {
            option.classList.remove('border-primary', 'border-secondary', 'border-accent', 
                                  'bg-primary/5', 'bg-secondary/5', 'bg-accent/5');
            option.classList.add('border-gray-200');
        });

        const studentOption = document.querySelector('.role-option[data-role="student"]');
        if (studentOption) {
            studentOption.classList.remove('border-gray-200');
            studentOption.classList.add('border-primary', 'bg-primary/5');
        }
        document.getElementById('registerRole').value = 'student';

        roleOptions.forEach(option => {
            option.addEventListener('click', () => {
                roleOptions.forEach(opt => {
                    opt.classList.remove('border-primary', 'border-secondary', 'border-accent', 
                                       'bg-primary/5', 'bg-secondary/5', 'bg-accent/5');
                    opt.classList.add('border-gray-200');
                });

                const role = option.dataset.role;
                option.classList.remove('border-gray-200');

                switch(role) {
                    case 'student':
                        option.classList.add('border-primary', 'bg-primary/5');
                        break;
                    case 'instructor':
                        option.classList.add('border-secondary', 'bg-secondary/5');
                        break;
                    case 'admin':
                        option.classList.add('border-accent', 'bg-accent/5');
                        break;
                }

                document.getElementById('registerRole').value = role;
            });
        });
    }

    /**
     * Show loading overlay
     */
    showLoading(text = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay && loadingText) {
            loadingText.textContent = text;
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Switch to a different tab
     */
    switchTab(tabId) {
        this.currentTab = tabId;

        // Update sidebar active state
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('text-primary', 'bg-primary/10');
            btn.classList.add('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
        });

        const activeTabBtn = document.querySelector(`[data-tab="${tabId}"]`);
        if (activeTabBtn) {
            activeTabBtn.classList.remove('text-gray-700', 'hover:text-primary', 'hover:bg-gray-50');
            activeTabBtn.classList.add('text-primary', 'bg-primary/10');
        }

        // Update mobile tab active state
        if (['overview', 'courses', 'assignments', 'grades'].includes(tabId)) {
            document.querySelectorAll('#mobileTabNav .mobile-tab-item').forEach(btn => {
                btn.classList.remove('active');
            });

            const activeMobileTab = document.querySelector(`#mobileTabNav [data-tab="${tabId}"]`);
            if (activeMobileTab) {
                activeMobileTab.classList.add('active');
            }
        }

        // Show tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetTab = document.getElementById(tabId);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.closeSidebarOnMobile();
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');

        if (this.isSidebarOpen) {
            sidebar?.classList.remove('active');
            sidebarBackdrop?.classList.remove('active');
            this.isSidebarOpen = false;
        } else {
            sidebar?.classList.add('active');
            sidebarBackdrop?.classList.add('active');
            this.isSidebarOpen = true;
        }
    }

    /**
     * Close sidebar on mobile
     */
    closeSidebarOnMobile() {
        if (window.innerWidth < 1024) {
            const sidebar = document.getElementById('sidebar');
            const sidebarBackdrop = document.getElementById('sidebarBackdrop');

            sidebar?.classList.remove('active');
            sidebarBackdrop?.classList.remove('active');
            this.isSidebarOpen = false;
        }
    }

    /**
     * Update responsive layout
     */
    updateResponsiveLayout(isLoggedIn) {
        const isMobile = window.innerWidth < 1024;
        const mobileTabNav = document.getElementById('mobileTabNav');
        const sidebar = document.getElementById('sidebar');
        const mobileMenuToggle = document.getElementById('mobileMenuToggle');

        if (isMobile) {
            if (sidebar) sidebar.classList.remove('lg:flex');
            if (mobileTabNav && isLoggedIn) {
                mobileTabNav.classList.remove('hidden');
            } else if (mobileTabNav) {
                mobileTabNav.classList.add('hidden');
            }
            if (mobileMenuToggle && isLoggedIn) {
                mobileMenuToggle.classList.remove('hidden');
            } else if (mobileMenuToggle) {
                mobileMenuToggle.classList.add('hidden');
            }
        } else {
            if (mobileTabNav) mobileTabNav.classList.add('hidden');
            if (mobileMenuToggle) mobileMenuToggle.classList.add('hidden');
            if (sidebar && isLoggedIn) {
                sidebar.classList.add('lg:flex');
                this.closeSidebarOnMobile();
            }
        }
    }

    /**
     * Update button loading state
     */
    setButtonLoading(buttonId, isLoading, loadingText = 'Loading...') {
        const button = document.getElementById(buttonId);
        if (button) {
            button.disabled = isLoading;
            if (isLoading) {
                button.dataset.originalText = button.textContent;
                button.textContent = loadingText;
            } else {
                button.textContent = button.dataset.originalText || 'Submit';
            }
        }
    }
}

export default UIManager;
