import { 
    auth, 
    db, 
    googleProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    addDoc,
    serverTimestamp,
    updateDoc
} from './firebase-config.js';

// DOM Elements
const authModal = document.getElementById('authModal');
const loginButton = document.getElementById('loginButton');
const closeModal = document.querySelector('.close-modal');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const googleSignupBtn = document.getElementById('googleSignupBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupName = document.getElementById('signupName');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupRole = document.getElementById('signupRole');
const authStatus = document.getElementById('authStatus');
const coursesGrid = document.getElementById('coursesGrid');
const searchCourses = document.getElementById('searchCourses');
const categoryFilter = document.getElementById('categoryFilter');
const getStartedBtn = document.getElementById('getStartedBtn');
const viewCoursesBtn = document.getElementById('viewCoursesBtn');
const forgotPassword = document.getElementById('forgotPassword');
const toast = document.getElementById('toast');

// Authentication State
let currentUser = null;
let courses = [];
let userProfileDropdown = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    // Set up auth state observer
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const userData = await loadUserProfile(user);
            updateAuthUI(user, userData);
        } else {
            currentUser = null;
            updateAuthUI(null);
        }
        loadCourses();
    });

    // Setup event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Modal handlers
    if (loginButton) {
        loginButton.addEventListener('click', () => showModal('login'));
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) hideModal();
        });
    }

    // Tab switching
    if (authTabs) {
        authTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchAuthTab(tabName);
            });
        });
    }

    // Auth form submissions
    if (loginBtn) {
        loginBtn.addEventListener('click', handleEmailLogin);
    }
    
    if (signupBtn) {
        signupBtn.addEventListener('click', handleEmailSignup);
    }

    // Google Auth buttons
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', handleGoogleLogin);
    }
    
    if (googleSignupBtn) {
        googleSignupBtn.addEventListener('click', handleGoogleSignup);
    }

    // Enter key in forms
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleEmailLogin();
        });
    }
    
    if (signupPassword) {
        signupPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleEmailSignup();
        });
    }

    // Course search/filter
    if (searchCourses) {
        searchCourses.addEventListener('input', filterCourses);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', filterCourses);
    }

    // CTA buttons
    if (getStartedBtn) {
        getStartedBtn.addEventListener('click', () => {
            if (currentUser) {
                window.location.href = 'dashboard.html';
            } else {
                showModal('signup');
            }
        });
    }
    
    if (viewCoursesBtn) {
        viewCoursesBtn.addEventListener('click', () => {
            document.getElementById('courses').scrollIntoView({ 
                behavior: 'smooth' 
            });
        });
    }

    // Forgot password
    if (forgotPassword) {
        forgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            showForgotPassword();
        });
    }

    // Mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-container')) {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks && navLinks.classList.contains('show')) {
                navLinks.classList.remove('show');
            }
        }
        
        // Close dropdown when clicking outside
        if (userProfileDropdown && !e.target.closest('.user-profile-dropdown')) {
            closeUserDropdown();
        }
    });
}

// Google Authentication Functions
async function handleGoogleLogin() {
    try {
        // Disable button and show loading
        const originalText = googleLoginBtn.innerHTML;
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        console.log('Google login successful:', user.email);
        
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
            // First time Google login - create user profile
            await createGoogleUserProfile(user);
            showToast('Welcome to EduLMS! Profile created successfully.', 'success');
        } else {
            showToast('Login successful!', 'success');
        }
        
        // Hide modal
        hideModal();
        
        // Reset button state
        setTimeout(() => {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = originalText;
        }, 1000);
        
    } catch (error) {
        console.error('Google login error:', error);
        
        // Reset button state
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = '<i class="fab fa-google"></i> Continue with Google';
        
        // Handle specific errors
        if (error.code === 'auth/popup-closed-by-user') {
            showToast('Sign in cancelled', 'info');
        } else if (error.code === 'auth/popup-blocked') {
            showToast('Popup blocked. Please allow popups for this site.', 'error');
        } else {
            showToast(getErrorMessage(error.code), 'error');
        }
    }
}

async function handleGoogleSignup() {
    // Google signup is same as login - it will create profile if needed
    await handleGoogleLogin();
}

async function createGoogleUserProfile(user) {
    try {
        // Extract name from Google profile
        const displayName = user.displayName || 'Google User';
        const firstName = displayName.split(' ')[0];
        const lastName = displayName.split(' ').slice(1).join(' ') || '';
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            uid: user.uid,
            name: displayName,
            firstName: firstName,
            lastName: lastName,
            email: user.email,
            photoURL: user.photoURL || null,
            role: 'student', // Default role for Google signups
            provider: 'google',
            providerId: user.providerData[0]?.providerId || 'google.com',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            emailVerified: user.emailVerified || false,
            enrolledCourses: [],
            progress: {},
            settings: {
                emailNotifications: true,
                darkMode: false,
                language: 'en'
            },
            preferences: {
                receiveMarketingEmails: false,
                showOnlineStatus: true
            }
        });
        
        console.log('Google user profile created successfully');
        
    } catch (error) {
        console.error('Error creating Google user profile:', error);
        throw error;
    }
}

// Email/Password Authentication Functions
async function handleEmailLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    const errorElement = document.getElementById('loginError');

    // Validation
    if (!email || !password) {
        showError(errorElement, 'Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError(errorElement, 'Please enter a valid email address');
        return;
    }

    try {
        errorElement.textContent = '';
        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update user profile with provider info if not set
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            if (!userData.provider) {
                await updateDoc(doc(db, 'users', userCredential.user.uid), {
                    provider: 'email',
                    lastLogin: serverTimestamp()
                });
            }
        }
        
        showToast('Login successful!', 'success');
        
        // Hide modal after delay
        setTimeout(() => {
            hideModal();
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Login';
            
            redirectUser(userCredential.user);
        }, 1500);

    } catch (error) {
        console.error('Login error:', error);
        showError(errorElement, getErrorMessage(error.code));
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Login';
    }
}

async function handleEmailSignup() {
    const name = signupName.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const role = signupRole.value;
    const errorElement = document.getElementById('signupError');

    // Validation
    if (!name || !email || !password) {
        showError(errorElement, 'Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError(errorElement, 'Please enter a valid email address');
        return;
    }

    if (password.length < 6) {
        showError(errorElement, 'Password must be at least 6 characters');
        return;
    }

    try {
        errorElement.textContent = '';
        signupBtn.disabled = true;
        signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
            uid: userCredential.user.uid,
            name: name,
            firstName: name.split(' ')[0],
            lastName: name.split(' ').slice(1).join(' ') || '',
            email: email,
            role: role,
            provider: 'email',
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            emailVerified: false,
            enrolledCourses: [],
            progress: {},
            settings: {
                emailNotifications: true,
                darkMode: false,
                language: 'en'
            },
            preferences: {
                receiveMarketingEmails: true,
                showOnlineStatus: true
            }
        });

        showToast('Account created successfully!', 'success');
        
        // Hide modal after delay
        setTimeout(() => {
            hideModal();
            signupBtn.disabled = false;
            signupBtn.innerHTML = 'Sign Up';
            
            redirectUser(userCredential.user, role);
        }, 1500);

    } catch (error) {
        console.error('Signup error:', error);
        showError(errorElement, getErrorMessage(error.code));
        signupBtn.disabled = false;
        signupBtn.innerHTML = 'Sign Up';
    }
}

async function handleLogout() {
    try {
        showToast('Logging out...', 'info');
        await signOut(auth);
        showToast('Logged out successfully', 'success');
        // Close dropdown if open
        closeUserDropdown();
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error logging out', 'error');
    }
}

// User Profile Functions
async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            // Update last login
            await updateDoc(doc(db, 'users', user.uid), {
                lastLogin: serverTimestamp()
            });
            return userData;
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
    return null;
}

// UI Functions
function updateAuthUI(user, userData = null) {
    if (!authStatus) return;
    
    if (user) {
        // User is logged in - show profile dropdown
        const displayName = userData?.name || user.displayName || user.email.split('@')[0];
        const userEmail = user.email;
        const provider = userData?.provider || 'email';
        const role = userData?.role || 'student';
        const avatarInitials = displayName.charAt(0).toUpperCase();
        
        authStatus.innerHTML = `
            <div class="user-profile-dropdown">
                <button class="user-profile-btn" onclick="toggleUserDropdown()">
                    <div class="user-avatar">
                        ${user.photoURL ? 
                            `<img src="${user.photoURL}" alt="${displayName}" style="width:100%;height:100%;border-radius:50%;">` : 
                            avatarInitials
                        }
                    </div>
                    <span class="user-name">${displayName}</span>
                    <i class="fas fa-chevron-down chevron"></i>
                </button>
                <div class="dropdown-menu">
                    <div class="dropdown-header">
                        <div style="font-weight: 600;">${displayName}</div>
                        <div class="user-email">${userEmail}</div>
                        <div class="account-type-badge ${provider}">
                            <i class="fab fa-${provider === 'google' ? 'google' : 'envelope'}"></i>
                            ${provider === 'google' ? 'Google Account' : 'Email Account'}
                        </div>
                        <div class="account-type-badge">
                            <i class="fas fa-user-tag"></i>
                            ${role.charAt(0).toUpperCase() + role.slice(1)}
                        </div>
                    </div>
                    <div class="dropdown-divider"></div>
                    <a href="dashboard.html" class="dropdown-item">
                        <i class="fas fa-tachometer-alt"></i>
                        Dashboard
                    </a>
                    <a href="profile.html" class="dropdown-item">
                        <i class="fas fa-user"></i>
                        My Profile
                    </a>
                    <a href="settings.html" class="dropdown-item">
                        <i class="fas fa-cog"></i>
                        Settings
                    </a>
                    <div class="dropdown-divider"></div>
                    <button onclick="handleLogout()" class="dropdown-item">
                        <i class="fas fa-sign-out-alt"></i>
                        Logout
                    </button>
                </div>
            </div>
        `;
        
        // Store dropdown reference for event handling
        userProfileDropdown = {
            button: authStatus.querySelector('.user-profile-btn'),
            menu: authStatus.querySelector('.dropdown-menu')
        };
        
    } else {
        // User is not logged in
        authStatus.innerHTML = `
            <button id="loginButton" class="btn btn-outline">
                <i class="fas fa-sign-in-alt"></i> Login / Signup
            </button>
        `;
        // Re-attach event listener to new button
        const newLoginBtn = document.getElementById('loginButton');
        if (newLoginBtn) {
            newLoginBtn.addEventListener('click', () => showModal('login'));
        }
        userProfileDropdown = null;
    }
}

function toggleUserDropdown() {
    if (!userProfileDropdown) return;
    
    const isOpen = userProfileDropdown.menu.classList.contains('show');
    
    // Close all other dropdowns
    closeUserDropdown();
    
    if (!isOpen) {
        userProfileDropdown.button.classList.add('open');
        userProfileDropdown.menu.classList.add('show');
    }
}

function closeUserDropdown() {
    if (!userProfileDropdown) return;
    
    userProfileDropdown.button.classList.remove('open');
    userProfileDropdown.menu.classList.remove('show');
}

// Modal Functions
function showModal(tabName) {
    if (!authModal) return;
    authModal.classList.add('active');
    if (tabName) {
        switchAuthTab(tabName);
    }
}

function hideModal() {
    if (!authModal) return;
    authModal.classList.remove('active');
    // Clear form errors
    const errorElements = document.querySelectorAll('[id$="Error"]');
    errorElements.forEach(el => el.textContent = '');
}

// Tab Switching
function switchAuthTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));
    
    // Remove active class from all tabs
    authTabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab content
    const selectedContent = document.getElementById(`${tabName}TabContent`);
    if (selectedContent) {
        selectedContent.classList.add('active');
    }
    
    // Add active class to selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

// Course Functions
async function loadCourses() {
    try {
        if (!coursesGrid) return;
        
        // Fetch courses from Firestore
        const coursesCollection = collection(db, 'courses');
        const coursesSnapshot = await getDocs(coursesCollection);
        
        courses = [];
        coursesGrid.innerHTML = '';
        
        coursesSnapshot.forEach((doc) => {
            const course = { id: doc.id, ...doc.data() };
            courses.push(course);
            displayCourse(course);
        });
    } catch (error) {
        console.error('Error loading courses:', error);
    }
}

function displayCourse(course) {
    if (!coursesGrid) return;
    
    const courseCard = document.createElement('div');
    courseCard.className = 'course-card';
    courseCard.innerHTML = `
        <div class="course-image">
            <i class="fas ${course.icon || 'fa-book'}"></i>
        </div>
        <div class="course-content">
            <h3 class="course-title">${course.title || 'Course'}</h3>
            <p class="course-category">${course.category || 'General'}</p>
            <p class="course-instructor">${course.instructor || 'Instructor'}</p>
            <p class="course-description">${course.description ? course.description.substring(0, 100) + '...' : ''}</p>
            <div class="course-footer">
                <span class="course-rating">
                    <i class="fas fa-star"></i> ${course.rating || '4.5'}
                </span>
                <button class="btn btn-primary" onclick="enrollInCourse('${course.id}')">
                    Enroll Now
                </button>
            </div>
        </div>
    `;
    coursesGrid.appendChild(courseCard);
}

function filterCourses() {
    const searchTerm = searchCourses ? searchCourses.value.toLowerCase() : '';
    const selectedCategory = categoryFilter ? categoryFilter.value : '';
    
    const filtered = courses.filter(course => {
        const matchesSearch = !searchTerm || 
            course.title.toLowerCase().includes(searchTerm) ||
            course.description.toLowerCase().includes(searchTerm);
        
        const matchesCategory = !selectedCategory || course.category === selectedCategory;
        
        return matchesSearch && matchesCategory;
    });
    
    coursesGrid.innerHTML = '';
    filtered.forEach(course => displayCourse(course));
}

async function enrollInCourse(courseId) {
    if (!currentUser) {
        showModal('signup');
        return;
    }
    
    try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const enrolledCourses = userDoc.data().enrolledCourses || [];
            
            if (!enrolledCourses.includes(courseId)) {
                enrolledCourses.push(courseId);
                await updateDoc(userRef, {
                    enrolledCourses: enrolledCourses
                });
                showToast('Successfully enrolled in course!', 'success');
                window.location.href = `course.html?id=${courseId}`;
            } else {
                window.location.href = `course.html?id=${courseId}`;
            }
        }
    } catch (error) {
        console.error('Error enrolling in course:', error);
        showToast('Error enrolling in course', 'error');
    }
}

function viewCourseDetails(courseId) {
    window.location.href = `course.html?id=${courseId}`;
}

// Mobile Menu
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        navLinks.classList.toggle('show');
    }
}

// Forgot Password
function showForgotPassword() {
    const email = loginEmail.value.trim();
    
    if (!email) {
        showError(document.getElementById('loginError'), 'Please enter your email address');
        return;
    }
    
    if (!isValidEmail(email)) {
        showError(document.getElementById('loginError'), 'Please enter a valid email address');
        return;
    }
    
    try {
        sendPasswordResetEmail(auth, email);
        showToast('Password reset email sent! Check your inbox.', 'success');
        hideModal();
    } catch (error) {
        console.error('Password reset error:', error);
        showError(document.getElementById('loginError'), getErrorMessage(error.code));
    }
}

// Toast Notifications
function showToast(message, type = 'info') {
    if (!toast) {
        // Create toast if it doesn't exist
        const newToast = document.createElement('div');
        newToast.id = 'toast';
        newToast.className = `toast ${type}`;
        newToast.textContent = message;
        document.body.appendChild(newToast);
        
        setTimeout(() => {
            newToast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            newToast.classList.remove('show');
            setTimeout(() => newToast.remove(), 300);
        }, 3000);
    } else {
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Error Display
function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.display = 'block';
    element.style.color = '#ef4444';
}

// Email Validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Error Messages
function getErrorMessage(code) {
    const errorMessages = {
        'auth/user-not-found': 'No account found with this email address',
        'auth/wrong-password': 'Incorrect password',
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password is too weak. Use at least 6 characters',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'This operation is not allowed',
        'auth/too-many-requests': 'Too many login attempts. Please try again later',
        'auth/popup-closed-by-user': 'Sign in was cancelled',
        'auth/popup-blocked': 'Popup was blocked. Please allow popups for this site',
        'auth/network-request-failed': 'Network error. Please check your connection'
    };
    
    return errorMessages[code] || 'An error occurred. Please try again.';
}

// User Redirect
function redirectUser(user, role = 'student') {
    // Redirect based on role
    if (role === 'instructor') {
        window.location.href = 'instructor-dashboard.html';
    } else if (role === 'admin') {
        window.location.href = 'admin-dashboard.html';
    } else {
        window.location.href = 'dashboard.html';
    }
}

// Make functions available globally
window.enrollInCourse = enrollInCourse;
window.viewCourseDetails = viewCourseDetails;
window.handleLogout = handleLogout;
window.showModal = showModal;
window.hideModal = hideModal;
window.toggleUserDropdown = toggleUserDropdown;
window.handleGoogleLogin = handleGoogleLogin;
window.handleGoogleSignup = handleGoogleSignup;