/**
 * Global Search Manager
 * Handles searching across courses, assignments, users, and materials
 */

class SearchManager {
    constructor() {
        this.currentUser = null;
        this.searchTimeout = null;
        this.activeFilters = {
            courses: true,
            assignments: true,
            users: true,
            materials: true
        };
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
                this.setupEventListeners();

                // Check for search query in URL
                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('q');
                if (query) {
                    document.getElementById('searchInput').value = query;
                    this.performSearch(query);
                }
            });
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error initializing search', 'error');
        }
    }

    setupEventListeners() {
        // Search input with debounce
        document.getElementById('searchInput').addEventListener('input', (e) => {
            clearTimeout(this.searchTimeout);
            const query = e.target.value.trim();

            if (query.length === 0) {
                this.showEmptyState();
                return;
            }

            this.searchTimeout = setTimeout(() => {
                this.performSearch(query);
            }, 300);
        });

        // Filter checkboxes
        document.querySelectorAll('.filter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const filter = e.target.dataset.filter;
                this.activeFilters[filter] = e.target.checked;

                const query = document.getElementById('searchInput').value.trim();
                if (query.length > 0) {
                    this.performSearch(query);
                }
            });
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.history.back();
        });
    }

    async performSearch(query) {
        try {
            document.getElementById('emptyState').classList.add('hidden');
            document.getElementById('noResultsState').classList.add('hidden');
            document.getElementById('resultsContainer').classList.add('hidden');

            const results = {
                courses: [],
                assignments: [],
                users: [],
                materials: []
            };

            const searchPromises = [];

            // Search courses
            if (this.activeFilters.courses) {
                searchPromises.push(
                    this.searchCourses(query).then(courses => {
                        results.courses = courses;
                    })
                );
            }

            // Search assignments
            if (this.activeFilters.assignments) {
                searchPromises.push(
                    this.searchAssignments(query).then(assignments => {
                        results.assignments = assignments;
                    })
                );
            }

            // Search users
            if (this.activeFilters.users) {
                searchPromises.push(
                    this.searchUsers(query).then(users => {
                        results.users = users;
                    })
                );
            }

            // Search materials
            if (this.activeFilters.materials) {
                searchPromises.push(
                    this.searchMaterials(query).then(materials => {
                        results.materials = materials;
                    })
                );
            }

            await Promise.all(searchPromises);

            // Check if any results found
            const hasResults = Object.values(results).some(arr => arr.length > 0);

            if (!hasResults) {
                this.showNoResultsState();
            } else {
                this.displayResults(results);
            }

        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Search error. Please try again.', 'error');
        }
    }

    async searchCourses(query) {
        try {
            const q = query(
                collection(db, 'courses'),
                where('title', '>=', query),
                where('title', '<=', query + '\uf8ff'),
                limit(10)
            );

            const querySnapshot = await getDocs(q);
            const courses = [];

            for (const doc of querySnapshot.docs) {
                courses.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            // Also search in description if no title matches
            if (courses.length === 0) {
                const allCoursesSnap = await getDocs(collection(db, 'courses'));
                for (const doc of allCoursesSnap.docs) {
                    const course = doc.data();
                    const queryLower = query.toLowerCase();
                    
                    if (course.description?.toLowerCase().includes(queryLower) ||
                        course.code?.toLowerCase().includes(queryLower)) {
                        courses.push({
                            id: doc.id,
                            ...course
                        });
                    }
                }
            }

            return courses.slice(0, 10);
        } catch (error) {
            console.error('Error searching courses:', error);
            return [];
        }
    }

    async searchAssignments(query) {
        try {
            const q = query(
                collection(db, 'assignments'),
                where('title', '>=', query),
                where('title', '<=', query + '\uf8ff'),
                limit(10)
            );

            const querySnapshot = await getDocs(q);
            const assignments = [];

            for (const doc of querySnapshot.docs) {
                const assignment = {
                    id: doc.id,
                    ...doc.data()
                };

                // Get course info
                if (assignment.courseId) {
                    const courseSnap = await getDoc(doc(db, 'courses', assignment.courseId));
                    if (courseSnap.exists()) {
                        assignment.courseName = courseSnap.data().title;
                    }
                }

                assignments.push(assignment);
            }

            // Also search in description
            if (assignments.length === 0) {
                const allSnap = await getDocs(collection(db, 'assignments'));
                for (const doc of allSnap.docs) {
                    const assignment = doc.data();
                    const queryLower = query.toLowerCase();
                    
                    if (assignment.description?.toLowerCase().includes(queryLower)) {
                        const assignmentObj = {
                            id: doc.id,
                            ...assignment
                        };

                        if (assignment.courseId) {
                            const courseSnap = await getDoc(doc(db, 'courses', assignment.courseId));
                            if (courseSnap.exists()) {
                                assignmentObj.courseName = courseSnap.data().title;
                            }
                        }

                        assignments.push(assignmentObj);
                    }
                }
            }

            return assignments.slice(0, 10);
        } catch (error) {
            console.error('Error searching assignments:', error);
            return [];
        }
    }

    async searchUsers(query) {
        try {
            const queryLower = query.toLowerCase();
            const allUsersSnap = await getDocs(collection(db, 'users'));
            const users = [];

            for (const doc of allUsersSnap.docs) {
                const user = doc.data();
                if (user.name?.toLowerCase().includes(queryLower) ||
                    user.email?.toLowerCase().includes(queryLower)) {
                    users.push({
                        id: doc.id,
                        ...user
                    });
                }

                if (users.length >= 10) break;
            }

            return users;
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }

    async searchMaterials(query) {
        try {
            const queryLower = query.toLowerCase();
            const allLessonsSnap = await getDocs(collection(db, 'lessons'));
            const materials = [];

            for (const doc of allLessonsSnap.docs) {
                const lesson = doc.data();
                if (lesson.title?.toLowerCase().includes(queryLower) ||
                    lesson.description?.toLowerCase().includes(queryLower)) {
                    materials.push({
                        id: doc.id,
                        ...lesson
                    });
                }

                if (materials.length >= 10) break;
            }

            return materials;
        } catch (error) {
            console.error('Error searching materials:', error);
            return [];
        }
    }

    displayResults(results) {
        document.getElementById('resultsContainer').classList.remove('hidden');

        // Display courses
        if (this.activeFilters.courses && results.courses.length > 0) {
            this.displayCourseResults(results.courses);
        }

        // Display assignments
        if (this.activeFilters.assignments && results.assignments.length > 0) {
            this.displayAssignmentResults(results.assignments);
        }

        // Display users
        if (this.activeFilters.users && results.users.length > 0) {
            this.displayUserResults(results.users);
        }

        // Display materials
        if (this.activeFilters.materials && results.materials.length > 0) {
            this.displayMaterialResults(results.materials);
        }
    }

    displayCourseResults(courses) {
        const section = document.getElementById('coursesResults');
        const list = document.getElementById('coursesList');

        list.innerHTML = '';
        section.classList.remove('hidden');
        document.getElementById('coursesCount').textContent = `${courses.length} result${courses.length !== 1 ? 's' : ''}`;

        courses.forEach(course => {
            const div = document.createElement('div');
            div.className = 'bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition cursor-pointer';
            div.onclick = () => {
                window.location.href = `course.html?id=${course.id}`;
            };

            const studentCount = course.enrolledStudents ? course.enrolledStudents.length : 0;

            div.innerHTML = `
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <h3 class="text-lg font-semibold text-gray-900">${course.title}</h3>
                        <p class="text-sm text-gray-600 mt-1">${course.description || 'No description'}</p>
                        <div class="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                            <span><i class="fas fa-user mr-1"></i>${course.instructor}</span>
                            <span><i class="fas fa-users mr-1"></i>${studentCount} students</span>
                            <span><i class="fas fa-code mr-1"></i>${course.code}</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        ${course.rating ? `<div class="text-right"><i class="fas fa-star text-yellow-400"></i> ${course.rating}</div>` : ''}
                    </div>
                </div>
            `;

            list.appendChild(div);
        });
    }

    displayAssignmentResults(assignments) {
        const section = document.getElementById('assignmentsResults');
        const list = document.getElementById('assignmentsList');

        list.innerHTML = '';
        section.classList.remove('hidden');
        document.getElementById('assignmentsCount').textContent = `${assignments.length} result${assignments.length !== 1 ? 's' : ''}`;

        assignments.forEach(assignment => {
            const div = document.createElement('div');
            div.className = 'bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition cursor-pointer';
            div.onclick = () => {
                window.location.href = `submit-assignment.html?id=${assignment.id}`;
            };

            const dueDate = assignment.dueDate?.toDate ? assignment.dueDate.toDate() : new Date(assignment.dueDate);

            div.innerHTML = `
                <div>
                    <h3 class="text-lg font-semibold text-gray-900">${assignment.title}</h3>
                    <p class="text-sm text-gray-600 mt-1">${assignment.description || 'No description'}</p>
                    <div class="flex items-center space-x-4 mt-3 text-sm text-gray-600">
                        <span><i class="fas fa-book mr-1"></i>${assignment.courseName || 'Unknown Course'}</span>
                        <span><i class="fas fa-clock mr-1"></i>Due: ${this.formatDate(dueDate)}</span>
                        <span><i class="fas fa-star mr-1"></i>${assignment.maxPoints} points</span>
                    </div>
                </div>
            `;

            list.appendChild(div);
        });
    }

    displayUserResults(users) {
        const section = document.getElementById('usersResults');
        const list = document.getElementById('usersList');

        list.innerHTML = '';
        section.classList.remove('hidden');
        document.getElementById('usersCount').textContent = `${users.length} result${users.length !== 1 ? 's' : ''}`;

        users.forEach(user => {
            const div = document.createElement('div');
            div.className = 'bg-white rounded-lg shadow-sm p-4 flex items-center justify-between';

            div.innerHTML = `
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900">${user.name || 'Unknown'}</h3>
                        <p class="text-sm text-gray-600">${user.email}</p>
                    </div>
                </div>
                <div>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getRoleBadgeClass(user.role)}">
                        ${this.capitalize(user.role)}
                    </span>
                </div>
            `;

            list.appendChild(div);
        });
    }

    displayMaterialResults(materials) {
        const section = document.getElementById('materialsResults');
        const list = document.getElementById('materialsList');

        list.innerHTML = '';
        section.classList.remove('hidden');
        document.getElementById('materialsCount').textContent = `${materials.length} result${materials.length !== 1 ? 's' : ''}`;

        materials.forEach(material => {
            const div = document.createElement('div');
            div.className = 'bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition';

            const icon = this.getLessonIcon(material.type);

            div.innerHTML = `
                <div class="flex items-start space-x-4">
                    <div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-semibold text-gray-900">${material.title}</h3>
                        <p class="text-sm text-gray-600 mt-1">${material.description || 'No description'}</p>
                        <div class="flex items-center space-x-3 mt-3 text-sm text-gray-600">
                            <span>${this.capitalize(material.type)}</span>
                            <span>${material.duration || 0} minutes</span>
                        </div>
                    </div>
                </div>
            `;

            list.appendChild(div);
        });
    }

    getLessonIcon(type) {
        const icons = {
            'video': 'fa-video',
            'document': 'fa-file-pdf',
            'quiz': 'fa-question-circle',
            'assignment': 'fa-tasks',
            'reading': 'fa-book'
        };
        return icons[type] || 'fa-file';
    }

    getRoleBadgeClass(role) {
        const classes = {
            'student': 'bg-blue-100 text-blue-800',
            'instructor': 'bg-purple-100 text-purple-800',
            'admin': 'bg-red-100 text-red-800'
        };
        return classes[role] || 'bg-gray-100 text-gray-800';
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    showEmptyState() {
        document.getElementById('emptyState').classList.remove('hidden');
        document.getElementById('noResultsState').classList.add('hidden');
        document.getElementById('resultsContainer').classList.add('hidden');
    }

    showNoResultsState() {
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('noResultsState').classList.remove('hidden');
        document.getElementById('resultsContainer').classList.add('hidden');
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
        new SearchManager();
    });
} else {
    new SearchManager();
}
