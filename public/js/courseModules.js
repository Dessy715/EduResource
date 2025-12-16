/**
 * Course Modules Manager
 * Manages course structure with modules and lessons
 */

class CourseModulesManager {
    constructor() {
        this.currentCourse = null;
        this.currentUser = null;
        this.isInstructor = false;
        this.modules = [];
        this.lessons = {};
        this.editingModuleId = null;
        this.initialize();
    }

    async initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');

        if (!courseId) {
            this.showToast('Course not found', 'error');
            setTimeout(() => window.location.href = 'dashboard.html', 2000);
            return;
        }

        try {
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    window.location.href = 'index.html';
                    return;
                }

                this.currentUser = user;
                await this.loadCourse(courseId);
                await this.loadUserRole();
                await this.loadModules();
                this.setupEventListeners();
                this.updateUI();
            });
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error loading course', 'error');
        }
    }

    async loadCourse(courseId) {
        try {
            const docSnap = await getDoc(doc(db, 'courses', courseId));
            if (!docSnap.exists()) {
                throw new Error('Course not found');
            }

            this.currentCourse = {
                id: docSnap.id,
                ...docSnap.data()
            };

            this.displayCourseHeader();
        } catch (error) {
            console.error('Error loading course:', error);
            throw error;
        }
    }

    async loadUserRole() {
        try {
            const docSnap = await getDoc(doc(db, 'users', this.currentUser.uid));
            if (docSnap.exists()) {
                this.isInstructor = docSnap.data().role === 'instructor';
                
                // Show instructor actions if user is instructor and course owner
                if (this.isInstructor && docSnap.data().uid === this.currentCourse.createdBy) {
                    document.getElementById('instructorActions').classList.remove('hidden');
                }
            }
        } catch (error) {
            console.error('Error loading user role:', error);
        }
    }

    async loadModules() {
        try {
            const q = query(
                collection(db, 'courseModules'),
                where('courseId', '==', this.currentCourse.id),
                orderBy('order', 'asc')
            );

            const querySnapshot = await getDocs(q);
            this.modules = [];

            for (const doc of querySnapshot.docs) {
                const module = {
                    id: doc.id,
                    ...doc.data()
                };
                this.modules.push(module);
                await this.loadLessonsForModule(module.id);
            }

            this.displayModules();
        } catch (error) {
            console.error('Error loading modules:', error);
        }
    }

    async loadLessonsForModule(moduleId) {
        try {
            const q = query(
                collection(db, 'lessons'),
                where('moduleId', '==', moduleId),
                orderBy('order', 'asc')
            );

            const querySnapshot = await getDocs(q);
            this.lessons[moduleId] = [];

            for (const doc of querySnapshot.docs) {
                this.lessons[moduleId].push({
                    id: doc.id,
                    ...doc.data()
                });
            }
        } catch (error) {
            console.error('Error loading lessons:', error);
        }
    }

    displayCourseHeader() {
        document.getElementById('courseTitle').textContent = this.currentCourse.title;
        document.getElementById('courseCode').textContent = this.currentCourse.code;
        document.getElementById('instructorName').textContent = this.currentCourse.instructor;
        document.getElementById('totalModules').textContent = this.modules.length;
        document.getElementById('totalLessons').textContent = 
            Object.values(this.lessons).reduce((sum, arr) => sum + arr.length, 0);
    }

    displayModules() {
        const container = document.getElementById('modulesContainer');
        container.innerHTML = '';

        if (this.modules.length === 0) {
            container.innerHTML = '<div class="text-center py-12"><p class="text-gray-600">No modules yet. Add one to get started!</p></div>';
            return;
        }

        this.modules.forEach((module, index) => {
            const moduleEl = this.createModuleElement(module, index);
            container.appendChild(moduleEl);
        });

        this.updateProgress();
    }

    createModuleElement(module, index) {
        const lessons = this.lessons[module.id] || [];
        const completedLessons = lessons.filter(l => l.completed).length;
        const moduleProgress = lessons.length > 0 ? (completedLessons / lessons.length) * 100 : 0;

        const div = document.createElement('div');
        div.className = 'bg-white rounded-lg shadow-sm p-6';
        div.innerHTML = `
            <div class="flex items-start justify-between mb-4">
                <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                            ${index + 1}
                        </div>
                        <h3 class="text-lg font-bold text-gray-900">${module.name}</h3>
                    </div>
                    <p class="text-gray-600 text-sm">${module.description || 'No description'}</p>
                </div>
                ${this.isInstructor ? `
                    <div class="flex items-center space-x-2 ml-4">
                        <button class="text-blue-600 hover:text-blue-700 edit-module-btn" data-id="${module.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="text-red-600 hover:text-red-700 delete-module-btn" data-id="${module.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                ` : ''}
            </div>

            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-gray-600">${completedLessons}/${lessons.length} lessons completed</span>
                    <span class="text-sm font-medium text-gray-900">${Math.round(moduleProgress)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${moduleProgress}%"></div>
                </div>
            </div>

            <div class="space-y-2" id="lessons-${module.id}">
                ${lessons.map((lesson, i) => `
                    <div class="flex items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer lesson-item" data-lesson-id="${lesson.id}" data-module-id="${module.id}">
                        <div class="flex-1">
                            <div class="flex items-center space-x-2">
                                <i class="fas fa-${this.getLessonIcon(lesson.type)} text-gray-400"></i>
                                <span class="font-medium text-gray-900">${lesson.title}</span>
                                ${lesson.required ? '<span class="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>' : ''}
                            </div>
                            <p class="text-xs text-gray-600 mt-1">${lesson.duration || 0} minutes</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            ${lesson.completed ? '<i class="fas fa-check-circle text-green-600"></i>' : '<i class="fas fa-circle text-gray-400"></i>'}
                            ${this.isInstructor ? `
                                <button class="text-blue-600 hover:text-blue-700 edit-lesson-btn" data-id="${lesson.id}" data-module-id="${module.id}">
                                    <i class="fas fa-edit text-sm"></i>
                                </button>
                                <button class="text-red-600 hover:text-red-700 delete-lesson-btn" data-id="${lesson.id}">
                                    <i class="fas fa-trash text-sm"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            ${this.isInstructor ? `
                <button class="mt-3 w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition add-lesson-btn" data-module-id="${module.id}">
                    <i class="fas fa-plus mr-2"></i>Add Lesson
                </button>
            ` : ''}
        `;

        return div;
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

    setupEventListeners() {
        // Add module button
        document.getElementById('addModuleBtn').addEventListener('click', () => {
            this.editingModuleId = null;
            this.showModuleModal();
        });

        // Module form
        document.getElementById('moduleForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveModule();
        });

        document.getElementById('closeModalBtn').addEventListener('click', () => {
            document.getElementById('moduleModal').classList.add('hidden');
        });

        document.getElementById('cancelModalBtn').addEventListener('click', () => {
            document.getElementById('moduleModal').classList.add('hidden');
        });

        // Lesson form
        document.getElementById('lessonForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveLesson();
        });

        document.getElementById('closeLessonModalBtn').addEventListener('click', () => {
            document.getElementById('lessonModal').classList.add('hidden');
        });

        document.getElementById('cancelLessonModalBtn').addEventListener('click', () => {
            document.getElementById('lessonModal').classList.add('hidden');
        });

        document.getElementById('lessonType').addEventListener('change', (e) => {
            this.updateLessonTypeFields(e.target.value);
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.history.back();
        });

        // Dynamic event listeners
        this.attachModuleEventListeners();
    }

    attachModuleEventListeners() {
        // Edit module
        document.querySelectorAll('.edit-module-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const moduleId = btn.dataset.id;
                this.editingModuleId = moduleId;
                const module = this.modules.find(m => m.id === moduleId);
                document.getElementById('moduleName').value = module.name;
                document.getElementById('moduleDescription').value = module.description || '';
                document.getElementById('moduleDuration').value = module.duration || 7;
                document.getElementById('modalTitle').textContent = 'Edit Module';
                this.showModuleModal();
            });
        });

        // Delete module
        document.querySelectorAll('.delete-module-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const moduleId = btn.dataset.id;
                if (confirm('Delete this module and all its lessons?')) {
                    this.deleteModule(moduleId);
                }
            });
        });

        // Add lesson
        document.querySelectorAll('.add-lesson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const moduleId = btn.dataset.moduleId;
                document.getElementById('lessonModuleId').value = moduleId;
                document.getElementById('lessonForm').reset();
                this.updateLessonTypeFields('video');
                this.showLessonModal();
            });
        });

        // Edit lesson
        document.querySelectorAll('.edit-lesson-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lessonId = btn.dataset.id;
                const moduleId = btn.dataset.moduleId;
                const lesson = this.lessons[moduleId].find(l => l.id === lessonId);
                
                document.getElementById('lessonModuleId').value = moduleId;
                document.getElementById('lessonTitle').value = lesson.title;
                document.getElementById('lessonType').value = lesson.type;
                document.getElementById('lessonDescription').value = lesson.description || '';
                document.getElementById('lessonDuration').value = lesson.duration || 30;
                document.getElementById('lessonRequired').checked = lesson.required || false;
                
                if (lesson.videoUrl) document.getElementById('videoUrl').value = lesson.videoUrl;
                if (lesson.documentUrl) document.getElementById('documentUrl').value = lesson.documentUrl;
                
                this.updateLessonTypeFields(lesson.type);
                this.showLessonModal();
            });
        });

        // Lesson click to mark complete
        document.querySelectorAll('.lesson-item').forEach(el => {
            el.addEventListener('click', async (e) => {
                if (!e.target.closest('button')) {
                    const lessonId = el.dataset.lessonId;
                    const moduleId = el.dataset.moduleId;
                    await this.toggleLessonCompletion(lessonId, moduleId);
                }
            });
        });
    }

    async saveModule() {
        const name = document.getElementById('moduleName').value;
        const description = document.getElementById('moduleDescription').value;
        const duration = parseInt(document.getElementById('moduleDuration').value);

        if (!name) {
            this.showToast('Module name is required', 'error');
            return;
        }

        try {
            const moduleData = {
                courseId: this.currentCourse.id,
                name,
                description,
                duration,
                order: this.modules.length,
                createdAt: serverTimestamp()
            };

            if (this.editingModuleId) {
                await updateDoc(doc(db, 'courseModules', this.editingModuleId), moduleData);
                this.showToast('Module updated', 'success');
            } else {
                await addDoc(collection(db, 'courseModules'), moduleData);
                this.showToast('Module created', 'success');
            }

            document.getElementById('moduleModal').classList.add('hidden');
            document.getElementById('moduleForm').reset();
            await this.loadModules();
        } catch (error) {
            console.error('Error saving module:', error);
            this.showToast('Error saving module', 'error');
        }
    }

    async deleteModule(moduleId) {
        try {
            await deleteDoc(doc(db, 'courseModules', moduleId));
            
            // Delete all lessons in this module
            if (this.lessons[moduleId]) {
                for (const lesson of this.lessons[moduleId]) {
                    await deleteDoc(doc(db, 'lessons', lesson.id));
                }
            }

            this.showToast('Module deleted', 'success');
            await this.loadModules();
        } catch (error) {
            console.error('Error deleting module:', error);
            this.showToast('Error deleting module', 'error');
        }
    }

    async saveLesson() {
        const moduleId = document.getElementById('lessonModuleId').value;
        const title = document.getElementById('lessonTitle').value;
        const type = document.getElementById('lessonType').value;
        const description = document.getElementById('lessonDescription').value;
        const duration = parseInt(document.getElementById('lessonDuration').value);
        const required = document.getElementById('lessonRequired').checked;

        if (!title) {
            this.showToast('Lesson title is required', 'error');
            return;
        }

        try {
            const lessonData = {
                moduleId,
                courseId: this.currentCourse.id,
                title,
                type,
                description,
                duration,
                required,
                order: (this.lessons[moduleId] || []).length,
                completed: false,
                createdAt: serverTimestamp()
            };

            if (type === 'video') {
                lessonData.videoUrl = document.getElementById('videoUrl').value;
            } else if (type === 'document') {
                lessonData.documentUrl = document.getElementById('documentUrl').value;
            }

            await addDoc(collection(db, 'lessons'), lessonData);
            this.showToast('Lesson created', 'success');

            document.getElementById('lessonModal').classList.add('hidden');
            document.getElementById('lessonForm').reset();
            await this.loadModules();
        } catch (error) {
            console.error('Error saving lesson:', error);
            this.showToast('Error saving lesson', 'error');
        }
    }

    async toggleLessonCompletion(lessonId, moduleId) {
        try {
            const lesson = this.lessons[moduleId].find(l => l.id === lessonId);
            await updateDoc(doc(db, 'lessons', lessonId), {
                completed: !lesson.completed
            });

            await this.loadModules();
        } catch (error) {
            console.error('Error updating lesson:', error);
            this.showToast('Error updating lesson', 'error');
        }
    }

    updateLessonTypeFields(type) {
        document.getElementById('videoUrlSection').classList.add('hidden');
        document.getElementById('documentSection').classList.add('hidden');

        if (type === 'video') {
            document.getElementById('videoUrlSection').classList.remove('hidden');
        } else if (type === 'document') {
            document.getElementById('documentSection').classList.remove('hidden');
        }
    }

    updateProgress() {
        const totalLessons = Object.values(this.lessons).reduce((sum, arr) => sum + arr.length, 0);
        const completedLessons = Object.values(this.lessons)
            .reduce((sum, arr) => sum + arr.filter(l => l.completed).length, 0);

        const progress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
        document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
        document.getElementById('progressBar').style.width = progress + '%';
    }

    updateUI() {
        this.displayCourseHeader();
    }

    showModuleModal() {
        document.getElementById('moduleModal').classList.remove('hidden');
        if (!this.editingModuleId) {
            document.getElementById('moduleForm').reset();
            document.getElementById('modalTitle').textContent = 'Add Module';
        }
    }

    showLessonModal() {
        document.getElementById('lessonModal').classList.remove('hidden');
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
        new CourseModulesManager();
    });
} else {
    new CourseModulesManager();
}
