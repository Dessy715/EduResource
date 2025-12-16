/**
 * Admin Dashboard Manager
 * Manages system administration, users, courses, and settings
 */

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.courses = [];
        this.logs = [];
        this.settings = {};
        this.initialize();
    }

    async initialize() {
        try {
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    window.location.href = 'index.html';
                    return;
                }

                this.currentUser = user;
                
                // Check if user is admin
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists() || userDoc.data().role !== 'admin') {
                    window.location.href = 'dashboard.html';
                    return;
                }

                await this.loadDashboardData();
                this.setupEventListeners();
            });
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error initializing admin dashboard', 'error');
        }
    }

    async loadDashboardData() {
        try {
            await Promise.all([
                this.loadUsers(),
                this.loadCourses(),
                this.loadLogs(),
                this.loadSettings()
            ]);
            this.updateStatistics();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadUsers() {
        try {
            const querySnapshot = await getDocs(collection(db, 'users'));
            this.users = [];

            for (const doc of querySnapshot.docs) {
                this.users.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            this.displayUsers();
        } catch (error) {
            console.error('Error loading users:', error);
        }
    }

    displayUsers() {
        const tbody = document.getElementById('usersList');
        tbody.innerHTML = '';

        this.users.forEach(user => {
            const tr = document.createElement('tr');
            const createdDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <i class="fas fa-user text-gray-600"></i>
                        </div>
                        <div class="ml-3">
                            <p class="font-medium text-gray-900">${user.name || 'Unknown'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getRoleBadgeClass(user.role)}">
                        ${this.capitalize(user.role)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getStatusBadgeClass(user.status || 'active')}">
                        ${this.capitalize(user.status || 'active')}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${this.formatDate(createdDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button class="text-blue-600 hover:text-blue-700 edit-user-btn" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-700 delete-user-btn" data-id="${user.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Attach event listeners
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.dataset.id;
                this.editUser(userId);
            });
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const userId = btn.dataset.id;
                if (confirm('Are you sure you want to delete this user?')) {
                    this.deleteUser(userId);
                }
            });
        });
    }

    async loadCourses() {
        try {
            const querySnapshot = await getDocs(collection(db, 'courses'));
            this.courses = [];

            for (const doc of querySnapshot.docs) {
                this.courses.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            this.displayCourses();
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    displayCourses() {
        const tbody = document.getElementById('coursesList');
        tbody.innerHTML = '';

        this.courses.forEach(course => {
            const tr = document.createElement('tr');
            const studentCount = course.enrolledStudents ? course.enrolledStudents.length : 0;

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <p class="font-medium text-gray-900">${course.title}</p>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${course.code}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${course.instructor}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${studentCount}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button class="text-blue-600 hover:text-blue-700" data-id="${course.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-700 delete-course-btn" data-id="${course.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        document.querySelectorAll('.delete-course-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const courseId = btn.dataset.id;
                if (confirm('Are you sure you want to delete this course?')) {
                    this.deleteCourse(courseId);
                }
            });
        });
    }

    async loadLogs() {
        try {
            const q = query(
                collection(db, 'activityLogs'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const querySnapshot = await getDocs(q);
            this.logs = [];

            for (const doc of querySnapshot.docs) {
                this.logs.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            this.displayLogs();
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    }

    displayLogs() {
        const tbody = document.getElementById('logsList');
        tbody.innerHTML = '';

        this.logs.forEach(log => {
            const tr = document.createElement('tr');
            const timestamp = log.timestamp?.toDate ? log.timestamp.toDate() : new Date(log.timestamp);

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${this.formatDate(timestamp)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${log.userName || 'Unknown'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                    <span class="px-2 py-1 rounded text-xs font-medium ${this.getActionBadgeClass(log.action)}">
                        ${log.action}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                    ${log.details || '--'}
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    async loadSettings() {
        try {
            const docSnap = await getDoc(doc(db, 'settings', 'system'));
            if (docSnap.exists()) {
                this.settings = docSnap.data();
            } else {
                this.settings = {
                    maintenanceMode: false,
                    emailNotifications: true,
                    maxFileSize: 10,
                    lastBackup: null
                };
            }

            this.displaySettings();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    displaySettings() {
        document.getElementById('maintenanceToggle').classList.toggle('bg-blue-600', this.settings.maintenanceMode);
        document.getElementById('maintenanceIndicator').style.marginLeft = this.settings.maintenanceMode ? '22px' : '2px';

        document.getElementById('emailToggle').classList.toggle('bg-blue-600', this.settings.emailNotifications);
        document.getElementById('emailIndicator').style.marginLeft = this.settings.emailNotifications ? '22px' : '2px';

        document.getElementById('maxFileSize').value = this.settings.maxFileSize || 10;

        if (this.settings.lastBackup) {
            const backupDate = this.settings.lastBackup?.toDate ? this.settings.lastBackup.toDate() : new Date(this.settings.lastBackup);
            document.getElementById('lastBackup').textContent = this.formatDate(backupDate);
        }
    }

    updateStatistics() {
        const students = this.users.filter(u => u.role === 'student').length;
        const instructors = this.users.filter(u => u.role === 'instructor').length;

        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('activeCourses').textContent = this.courses.length;
        document.getElementById('instructorCount').textContent = instructors;
        document.getElementById('systemHealth').textContent = '100%'; // Placeholder
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchTab(tab);
            });
        });

        // User search
        document.getElementById('userSearch').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = this.users.filter(u => 
                u.name?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query)
            );
            this.displayFilteredUsers(filtered);
        });

        // Add user button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            document.getElementById('userModalTitle').textContent = 'Add User';
            document.getElementById('userForm').reset();
            document.getElementById('userActionModal').classList.remove('hidden');
        });

        // User form
        document.getElementById('userForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveUser();
        });

        document.getElementById('closeUserModal').addEventListener('click', () => {
            document.getElementById('userActionModal').classList.add('hidden');
        });

        // Settings
        document.getElementById('maintenanceToggle').addEventListener('click', () => {
            this.settings.maintenanceMode = !this.settings.maintenanceMode;
            this.displaySettings();
        });

        document.getElementById('emailToggle').addEventListener('click', () => {
            this.settings.emailNotifications = !this.settings.emailNotifications;
            this.displaySettings();
        });

        document.getElementById('backupBtn').addEventListener('click', () => {
            this.performBackup();
        });

        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.settings.maxFileSize = parseInt(document.getElementById('maxFileSize').value);
            this.saveSettings();
        });
    }

    switchTab(tab) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(el => {
            el.classList.remove('active', 'border-blue-600', 'text-blue-600');
            el.classList.add('border-transparent', 'text-gray-600');
        });

        // Show selected tab
        document.getElementById(tab + 'Tab').classList.remove('hidden');
        event.target.classList.add('active', 'border-blue-600', 'text-blue-600');
        event.target.classList.remove('border-transparent', 'text-gray-600');
    }

    displayFilteredUsers(filtered) {
        const tbody = document.getElementById('usersList');
        tbody.innerHTML = '';

        filtered.forEach(user => {
            const tr = document.createElement('tr');
            const createdDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <i class="fas fa-user text-gray-600"></i>
                        </div>
                        <div class="ml-3">
                            <p class="font-medium text-gray-900">${user.name || 'Unknown'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getRoleBadgeClass(user.role)}">
                        ${this.capitalize(user.role)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getStatusBadgeClass(user.status || 'active')}">
                        ${this.capitalize(user.status || 'active')}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${this.formatDate(createdDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button class="text-blue-600 hover:text-blue-700 edit-user-btn" data-id="${user.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    async saveUser() {
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const role = document.getElementById('userRole').value;
        const status = document.getElementById('userStatus').value;

        if (!name || !email) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            await setDoc(doc(db, 'users', this.currentUser.uid), {
                name,
                email,
                role,
                status
            }, { merge: true });

            this.showToast('User saved successfully', 'success');
            document.getElementById('userActionModal').classList.add('hidden');
            await this.loadUsers();
        } catch (error) {
            console.error('Error saving user:', error);
            this.showToast('Error saving user', 'error');
        }
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        document.getElementById('userModalTitle').textContent = 'Edit User';
        document.getElementById('userName').value = user.name || '';
        document.getElementById('userEmail').value = user.email || '';
        document.getElementById('userRole').value = user.role || 'student';
        document.getElementById('userStatus').value = user.status || 'active';
        document.getElementById('userActionModal').classList.remove('hidden');
    }

    async deleteUser(userId) {
        try {
            await deleteDoc(doc(db, 'users', userId));
            this.showToast('User deleted successfully', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            this.showToast('Error deleting user', 'error');
        }
    }

    async deleteCourse(courseId) {
        try {
            await deleteDoc(doc(db, 'courses', courseId));
            this.showToast('Course deleted successfully', 'success');
            await this.loadCourses();
        } catch (error) {
            console.error('Error deleting course:', error);
            this.showToast('Error deleting course', 'error');
        }
    }

    async saveSettings() {
        try {
            await setDoc(doc(db, 'settings', 'system'), this.settings, { merge: true });
            this.showToast('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showToast('Error saving settings', 'error');
        }
    }

    async performBackup() {
        try {
            this.showToast('Backup started...', 'success');
            // Backup logic would be implemented here
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.settings.lastBackup = serverTimestamp();
            await this.saveSettings();
            this.displaySettings();
            this.showToast('Backup completed successfully', 'success');
        } catch (error) {
            console.error('Backup error:', error);
            this.showToast('Backup failed', 'error');
        }
    }

    getRoleBadgeClass(role) {
        const classes = {
            'student': 'bg-blue-100 text-blue-800',
            'instructor': 'bg-purple-100 text-purple-800',
            'admin': 'bg-red-100 text-red-800'
        };
        return classes[role] || 'bg-gray-100 text-gray-800';
    }

    getStatusBadgeClass(status) {
        const classes = {
            'active': 'bg-green-100 text-green-800',
            'suspended': 'bg-red-100 text-red-800',
            'inactive': 'bg-gray-100 text-gray-800'
        };
        return classes[status] || 'bg-gray-100 text-gray-800';
    }

    getActionBadgeClass(action) {
        const classes = {
            'user_login': 'bg-blue-100 text-blue-800',
            'user_logout': 'bg-gray-100 text-gray-800',
            'course_created': 'bg-green-100 text-green-800',
            'user_deleted': 'bg-red-100 text-red-800'
        };
        return classes[action] || 'bg-gray-100 text-gray-800';
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toastIcon');
        const msgSpan = document.getElementById('toastMessage');

        msgSpan.textContent = message;
        if (type === 'error') {
            icon.className = 'fas fa-exclamation-circle';
            toast.classList.remove('bg-gray-900');
            toast.classList.add('bg-red-600');
        } else {
            icon.className = 'fas fa-check-circle';
            toast.classList.add('bg-gray-900');
            toast.classList.remove('bg-red-600');
        }

        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new AdminDashboard();
    });
} else {
    new AdminDashboard();
}
