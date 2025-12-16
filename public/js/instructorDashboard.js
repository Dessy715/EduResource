/**
 * Instructor Dashboard Manager
 * Handles all instructor-specific functionality
 */

class InstructorDashboard {
    constructor(authManager, dataManager, uiManager) {
        this.authManager = authManager;
        this.dataManager = dataManager;
        this.uiManager = uiManager;
        this.db = firebase.firestore();
        this.auth = firebase.auth();
        this.currentUser = null;
        this.currentUserData = null;
        this.courses = [];
        this.assignments = [];
        this.submissions = [];
    }

    /**
     * Initialize instructor dashboard
     */
    async initialize() {
        try {
            this.setupEventListeners();
            this.auth.onAuthStateChanged(async (user) => {
                if (user) {
                    this.currentUser = user;
                    const userData = await this.dataManager.loadUserData(user.uid);
                    
                    // Check if user is instructor
                    if (userData.role !== 'instructor') {
                        showMessage('Access denied. Only instructors can access this page.', 'error');
                        window.location.href = '/index.html';
                        return;
                    }
                    
                    this.currentUserData = userData;
                    this.loadDashboard();
                } else {
                    window.location.href = '/index.html';
                }
            });
        } catch (error) {
            console.error('Initialization error:', error);
            showMessage('Failed to initialize dashboard', 'error');
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboard() {
        try {
            this.uiManager.showLoading();
            
            // Update profile
            document.getElementById('instructorName').textContent = this.currentUserData.firstName;
            document.getElementById('userAvatar').src = this.currentUserData.avatar || 'https://via.placeholder.com/40';

            // Load courses
            await this.loadCourses();
            
            // Load statistics
            await this.loadStatistics();

            this.uiManager.hideLoading();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showMessage('Failed to load dashboard', 'error');
            this.uiManager.hideLoading();
        }
    }

    /**
     * Load instructor's courses
     */
    async loadCourses() {
        try {
            const snapshot = await this.db.collection('courses')
                .where('instructor', '==', this.currentUser.uid)
                .get();

            this.courses = [];
            const coursesList = document.getElementById('coursesList');
            const noCoursesMsg = document.getElementById('noCoursesMessage');

            if (snapshot.empty) {
                coursesList.innerHTML = '';
                noCoursesMsg.style.display = 'block';
                return;
            }

            noCoursesMsg.style.display = 'none';
            coursesList.innerHTML = '';

            for (const doc of snapshot.docs) {
                const course = { id: doc.id, ...doc.data() };
                this.courses.push(course);

                const courseCard = document.createElement('div');
                courseCard.className = 'bg-white border rounded-lg p-6 hover:shadow-lg transition';
                courseCard.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="text-xl font-bold text-dark">${course.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">${course.category} • ${course.level}</p>
                        </div>
                        <span class="bg-primary text-white px-3 py-1 rounded-full text-sm">${course.duration}h</span>
                    </div>
                    <p class="text-gray-700 mb-4">${course.description}</p>
                    <div class="flex gap-2 mb-4">
                        <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">${course.students?.length || 0} Students</span>
                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">Active</span>
                    </div>
                    <div class="flex gap-4">
                        <button class="edit-course-btn flex-1 bg-primary text-white py-2 rounded-lg hover:bg-opacity-90" data-course-id="${course.id}">
                            <i class="fas fa-edit mr-2"></i> Edit
                        </button>
                        <button class="view-course-students-btn flex-1 bg-secondary text-white py-2 rounded-lg hover:bg-opacity-90" data-course-id="${course.id}">
                            <i class="fas fa-users mr-2"></i> Students
                        </button>
                        <button class="delete-course-btn flex-1 bg-accent text-white py-2 rounded-lg hover:bg-opacity-90" data-course-id="${course.id}">
                            <i class="fas fa-trash mr-2"></i> Delete
                        </button>
                    </div>
                `;
                coursesList.appendChild(courseCard);
            }

            // Update course select in assignment form
            const assignmentCourseSelect = document.getElementById('assignmentCourse');
            assignmentCourseSelect.innerHTML = '<option value="">Choose a course</option>';
            this.courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.title;
                assignmentCourseSelect.appendChild(option);
            });

            // Update course filter
            const courseFilterSelect = document.getElementById('courseFilterSelect');
            courseFilterSelect.innerHTML = '<option value="">All Courses</option>';
            this.courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course.id;
                option.textContent = course.title;
                courseFilterSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading courses:', error);
            showMessage('Failed to load courses', 'error');
        }
    }

    /**
     * Load assignments and submissions
     */
    async loadAssignments() {
        try {
            const snapshot = await this.db.collection('assignments')
                .where('createdBy', '==', this.currentUser.uid)
                .get();

            this.assignments = [];
            const assignmentsList = document.getElementById('assignmentsList');
            const noAssignmentsMsg = document.getElementById('noAssignmentsMessage');

            if (snapshot.empty) {
                assignmentsList.innerHTML = '';
                noAssignmentsMsg.style.display = 'block';
                return;
            }

            noAssignmentsMsg.style.display = 'none';
            assignmentsList.innerHTML = '';

            for (const doc of snapshot.docs) {
                const assignment = { id: doc.id, ...doc.data() };
                this.assignments.push(assignment);

                // Get course name
                const courseDoc = await this.db.collection('courses').doc(assignment.courseId).get();
                const courseName = courseDoc.data().title;

                // Count submissions
                const submissionsSnapshot = await doc.ref.collection('submissions').get();
                const totalSubmissions = submissionsSnapshot.size;
                const gradedSubmissions = submissionsSnapshot.docs.filter(s => s.data().status === 'graded').length;

                const assignmentCard = document.createElement('div');
                assignmentCard.className = 'bg-white border rounded-lg p-6 hover:shadow-lg transition';
                assignmentCard.innerHTML = `
                    <div class="flex justify-between items-start mb-4">
                        <div>
                            <h4 class="text-xl font-bold text-dark">${assignment.title}</h4>
                            <p class="text-sm text-gray-600 mt-1">${courseName}</p>
                        </div>
                        <span class="text-sm font-semibold text-accent">
                            ${gradedSubmissions}/${totalSubmissions} Graded
                        </span>
                    </div>
                    <p class="text-gray-700 mb-4">${assignment.description}</p>
                    <div class="flex gap-2 mb-4">
                        <span class="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">
                            Due: ${new Date(assignment.dueDate.toDate()).toLocaleDateString()}
                        </span>
                        <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                            Max Score: ${assignment.maxScore}
                        </span>
                    </div>
                    <div class="flex gap-4">
                        <button class="grade-submissions-btn flex-1 bg-primary text-white py-2 rounded-lg hover:bg-opacity-90" data-assignment-id="${assignment.id}">
                            <i class="fas fa-star mr-2"></i> Grade Submissions
                        </button>
                        <button class="edit-assignment-btn flex-1 bg-secondary text-white py-2 rounded-lg hover:bg-opacity-90" data-assignment-id="${assignment.id}">
                            <i class="fas fa-edit mr-2"></i> Edit
                        </button>
                    </div>
                `;
                assignmentsList.appendChild(assignmentCard);
            }
        } catch (error) {
            console.error('Error loading assignments:', error);
            showMessage('Failed to load assignments', 'error');
        }
    }

    /**
     * Load submissions for grading
     */
    async loadSubmissions() {
        try {
            const submissionsList = document.getElementById('submissionsList');
            const noSubmissionsMsg = document.getElementById('noSubmissionsMessage');

            submissionsList.innerHTML = '';
            this.submissions = [];

            for (const assignment of this.assignments) {
                const submissionsSnapshot = await this.db.collection('assignments')
                    .doc(assignment.id)
                    .collection('submissions')
                    .where('status', '==', 'pending')
                    .get();

                for (const subDoc of submissionsSnapshot.docs) {
                    const submission = { 
                        id: subDoc.id, 
                        assignmentId: assignment.id,
                        assignmentTitle: assignment.title,
                        ...subDoc.data() 
                    };
                    this.submissions.push(submission);

                    // Get student name
                    const studentDoc = await this.db.collection('users').doc(submission.studentId).get();
                    const student = studentDoc.data();

                    const submissionCard = document.createElement('div');
                    submissionCard.className = 'bg-white border rounded-lg p-6 hover:shadow-lg transition';
                    submissionCard.innerHTML = `
                        <div class="flex justify-between items-start mb-4">
                            <div>
                                <h4 class="text-lg font-bold text-dark">${student.firstName} ${student.lastName}</h4>
                                <p class="text-sm text-gray-600">${submission.assignmentTitle}</p>
                            </div>
                            <span class="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">Pending Review</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-4">
                            Submitted: ${new Date(submission.submittedAt.toDate()).toLocaleDateString()}
                        </p>
                        <button class="grade-submission-btn w-full bg-primary text-white py-2 rounded-lg hover:bg-opacity-90" data-submission-id="${subDoc.id}" data-assignment-id="${assignment.id}">
                            <i class="fas fa-edit mr-2"></i> Grade Submission
                        </button>
                    `;
                    submissionsList.appendChild(submissionCard);
                }
            }

            if (this.submissions.length === 0) {
                submissionsList.innerHTML = '';
                noSubmissionsMsg.style.display = 'block';
            } else {
                noSubmissionsMsg.style.display = 'none';
            }
        } catch (error) {
            console.error('Error loading submissions:', error);
            showMessage('Failed to load submissions', 'error');
        }
    }

    /**
     * Load enrolled students
     */
    async loadStudents() {
        try {
            const studentsList = document.getElementById('studentsList');
            const noStudentsMsg = document.getElementById('noStudentsMessage');

            studentsList.innerHTML = '';

            const allStudents = [];

            for (const course of this.courses) {
                const studentsSnapshot = await this.db.collection('users')
                    .where('enrolledCourses', 'array-contains', course.id)
                    .where('role', '==', 'student')
                    .get();

                for (const studentDoc of studentsSnapshot.docs) {
                    const student = studentDoc.data();
                    
                    // Get average grade
                    const gradesSnapshot = await this.db.collection('grades')
                        .where('studentId', '==', studentDoc.id)
                        .where('courseId', '==', course.id)
                        .get();

                    let avgGrade = 0;
                    if (!gradesSnapshot.empty) {
                        let totalScore = 0;
                        gradesSnapshot.forEach(doc => {
                            const grade = doc.data();
                            totalScore += (grade.score / grade.maxScore) * 100;
                        });
                        avgGrade = Math.round(totalScore / gradesSnapshot.size);
                    }

                    allStudents.push({
                        ...student,
                        courseId: course.id,
                        courseName: course.title,
                        avgGrade: avgGrade,
                        studentId: studentDoc.id
                    });
                }
            }

            if (allStudents.length === 0) {
                studentsList.innerHTML = '';
                noStudentsMsg.style.display = 'block';
                return;
            }

            noStudentsMsg.style.display = 'none';

            allStudents.forEach(student => {
                const studentCard = document.createElement('div');
                studentCard.className = 'bg-white border rounded-lg p-4 hover:shadow-lg transition';
                studentCard.innerHTML = `
                    <div class="flex items-center gap-4">
                        <img src="${student.avatar || 'https://via.placeholder.com/50'}" alt="${student.firstName}" class="w-12 h-12 rounded-full">
                        <div class="flex-1">
                            <h4 class="font-bold text-dark">${student.firstName} ${student.lastName}</h4>
                            <p class="text-sm text-gray-600">${student.email}</p>
                            <p class="text-sm text-gray-600">${student.courseName}</p>
                        </div>
                        <div class="text-right">
                            <div class="text-2xl font-bold text-primary">${student.avgGrade}%</div>
                            <p class="text-sm text-gray-600">Avg Grade</p>
                        </div>
                        <button class="view-student-progress-btn px-4 py-2 bg-primary text-white rounded-lg hover:bg-opacity-90" data-student-id="${student.studentId}">
                            <i class="fas fa-chart-line"></i> View
                        </button>
                    </div>
                `;
                studentsList.appendChild(studentCard);
            });
        } catch (error) {
            console.error('Error loading students:', error);
            showMessage('Failed to load students', 'error');
        }
    }

    /**
     * Load dashboard statistics
     */
    async loadStatistics() {
        try {
            // Total courses
            document.getElementById('totalCourses').textContent = this.courses.length;

            // Total students
            let totalStudents = 0;
            for (const course of this.courses) {
                totalStudents += course.students?.length || 0;
            }
            document.getElementById('totalStudents').textContent = totalStudents;

            // Pending submissions
            let pendingCount = 0;
            for (const assignment of this.assignments) {
                const submissionsSnapshot = await this.db.collection('assignments')
                    .doc(assignment.id)
                    .collection('submissions')
                    .where('status', '==', 'pending')
                    .get();
                pendingCount += submissionsSnapshot.size;
            }
            document.getElementById('pendingSubmissions').textContent = pendingCount;

            // Average grade
            let totalGrade = 0;
            let gradeCount = 0;
            for (const course of this.courses) {
                const gradesSnapshot = await this.db.collection('grades')
                    .where('courseId', '==', course.id)
                    .get();

                gradesSnapshot.forEach(doc => {
                    const grade = doc.data();
                    totalGrade += (grade.score / grade.maxScore) * 100;
                    gradeCount++;
                });
            }
            const avgGrade = gradeCount > 0 ? Math.round(totalGrade / gradeCount) : 0;
            document.getElementById('avgGrade').textContent = avgGrade + '%';
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Create new course
     */
    async createCourse(courseData) {
        try {
            this.uiManager.showLoading();

            const newCourse = {
                title: courseData.title,
                description: courseData.description,
                category: courseData.category,
                level: courseData.level,
                duration: parseInt(courseData.duration),
                instructor: this.currentUser.uid,
                instructorName: this.currentUserData.firstName + ' ' + this.currentUserData.lastName,
                students: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            };

            const docRef = await this.db.collection('courses').add(newCourse);
            console.log('Course created:', docRef.id);
            
            showMessage('Course created successfully!', 'success');
            await this.loadCourses();
            this.uiManager.hideLoading();
            this.closeModal('createCourseModal');
        } catch (error) {
            console.error('Error creating course:', error);
            showMessage('Failed to create course', 'error');
            this.uiManager.hideLoading();
        }
    }

    /**
     * Create new assignment
     */
    async createAssignment(assignmentData) {
        try {
            this.uiManager.showLoading();

            const newAssignment = {
                courseId: assignmentData.courseId,
                title: assignmentData.title,
                description: assignmentData.description,
                dueDate: new Date(assignmentData.dueDate),
                maxScore: parseInt(assignmentData.maxScore),
                createdBy: this.currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const docRef = await this.db.collection('assignments').add(newAssignment);
            console.log('Assignment created:', docRef.id);
            
            showMessage('Assignment created successfully!', 'success');
            await this.loadAssignments();
            this.uiManager.hideLoading();
            this.closeModal('createAssignmentModal');
        } catch (error) {
            console.error('Error creating assignment:', error);
            showMessage('Failed to create assignment', 'error');
            this.uiManager.hideLoading();
        }
    }

    /**
     * Grade a submission
     */
    async gradeSubmission(assignmentId, studentId, score, feedback) {
        try {
            this.uiManager.showLoading();

            // Update submission
            await this.db.collection('assignments')
                .doc(assignmentId)
                .collection('submissions')
                .doc(studentId)
                .update({
                    status: 'graded',
                    score: parseInt(score),
                    feedback: feedback
                });

            // Get assignment details
            const assignmentDoc = await this.db.collection('assignments').doc(assignmentId).get();
            const assignment = assignmentDoc.data();

            // Create grade record
            await this.db.collection('grades').add({
                studentId: studentId,
                courseId: assignment.courseId,
                assignment: assignment.title,
                score: parseInt(score),
                maxScore: assignment.maxScore,
                percentage: Math.round((parseInt(score) / assignment.maxScore) * 100),
                feedback: feedback,
                gradedAt: firebase.firestore.FieldValue.serverTimestamp(),
                gradedBy: this.currentUser.uid
            });

            showMessage('Submission graded successfully!', 'success');
            await this.loadSubmissions();
            this.uiManager.hideLoading();
        } catch (error) {
            console.error('Error grading submission:', error);
            showMessage('Failed to grade submission', 'error');
            this.uiManager.hideLoading();
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create course button
        document.getElementById('createCourseBtn')?.addEventListener('click', () => {
            this.openModal('createCourseModal');
        });

        // Create course form
        document.getElementById('createCourseForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const courseData = {
                title: document.getElementById('courseTitle').value,
                description: document.getElementById('courseDescription').value,
                category: document.getElementById('courseCategory').value,
                level: document.getElementById('courseLevel').value,
                duration: document.getElementById('courseDuration').value
            };
            this.createCourse(courseData);
            document.getElementById('createCourseForm').reset();
        });

        // Create assignment button
        document.getElementById('createAssignmentBtn')?.addEventListener('click', () => {
            this.openModal('createAssignmentModal');
        });

        // Create assignment form
        document.getElementById('createAssignmentForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const assignmentData = {
                courseId: document.getElementById('assignmentCourse').value,
                title: document.getElementById('assignmentTitle').value,
                description: document.getElementById('assignmentDescription').value,
                dueDate: document.getElementById('assignmentDueDate').value,
                maxScore: document.getElementById('assignmentMaxScore').value
            };
            this.createAssignment(assignmentData);
            document.getElementById('createAssignmentForm').reset();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Logout button
        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            await this.authManager.logout();
            window.location.href = '/index.html';
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('[id$="-modal"]');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    /**
     * Switch tabs
     */
    switchTab(tabName) {
        // Hide all tabs
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-b-2', 'border-primary', 'text-primary');
            btn.classList.add('text-gray-600');
        });

        // Show selected tab
        const tabElement = document.getElementById(tabName + '-tab');
        if (tabElement) {
            tabElement.classList.add('active');
        }

        // Add active to clicked button
        event.target.classList.add('border-b-2', 'border-primary', 'text-primary');
        event.target.classList.remove('text-gray-600');

        // Load tab data
        if (tabName === 'assignments') {
            this.loadAssignments();
        } else if (tabName === 'grades') {
            this.loadSubmissions();
        } else if (tabName === 'students') {
            this.loadStudents();
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
    const dashboard = new InstructorDashboard(authManager, dataManager, uiManager);
    dashboard.initialize();
});
