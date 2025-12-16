/**
 * SubmissionManager - Handles assignment submissions with file uploads
 * Manages file uploads to Firebase Storage and submission records to Firestore
 */

class SubmissionManager {
    constructor() {
        this.currentAssignment = null;
        this.currentSubmission = null;
        this.selectedFile = null;
        this.submissionType = 'file'; // file, text, or url
        this.initialize();
    }

    async initialize() {
        const urlParams = new URLSearchParams(window.location.search);
        const assignmentId = urlParams.get('id');
        
        if (!assignmentId) {
            this.showToast('Assignment not found', 'error');
            setTimeout(() => window.location.href = 'dashboard.html', 2000);
            return;
        }

        try {
            await this.loadAssignment(assignmentId);
            this.setupEventListeners();
            this.checkPreviousSubmission();
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error loading assignment', 'error');
        }
    }

    async loadAssignment(assignmentId) {
        try {
            const docSnap = await getDoc(doc(db, 'assignments', assignmentId));
            if (!docSnap.exists()) {
                throw new Error('Assignment not found');
            }

            this.currentAssignment = {
                id: docSnap.id,
                ...docSnap.data()
            };

            this.displayAssignmentDetails();
            this.setupSubmissionType();
        } catch (error) {
            console.error('Error loading assignment:', error);
            throw error;
        }
    }

    displayAssignmentDetails() {
        const { title, description, dueDate, maxPoints, submissionType, courseId } = this.currentAssignment;

        document.getElementById('assignmentTitle').textContent = title;
        document.getElementById('assignmentDescription').textContent = description;
        document.getElementById('maxPoints').textContent = maxPoints;
        document.getElementById('submissionType').textContent = this.formatSubmissionType(submissionType);

        // Format due date
        if (dueDate) {
            const dueDateObj = dueDate.toDate ? dueDate.toDate() : new Date(dueDate);
            document.getElementById('dueDate').textContent = this.formatDate(dueDateObj);
            this.updateStatusBadge(dueDateObj);
        }

        // Load course name
        this.loadCourseName(courseId);
    }

    async loadCourseName(courseId) {
        try {
            const docSnap = await getDoc(doc(db, 'courses', courseId));
            if (docSnap.exists()) {
                document.getElementById('assignmentCourse').textContent = docSnap.data().title;
            }
        } catch (error) {
            console.error('Error loading course:', error);
        }
    }

    setupSubmissionType() {
        const type = this.currentAssignment.submissionType;
        this.submissionType = type;

        // Hide all sections first
        document.getElementById('fileUploadSection').classList.add('hidden');
        document.getElementById('textSubmissionSection').classList.add('hidden');
        document.getElementById('urlSubmissionSection').classList.add('hidden');

        // Show relevant section
        if (type === 'file') {
            document.getElementById('fileUploadSection').classList.remove('hidden');
        } else if (type === 'text') {
            document.getElementById('textSubmissionSection').classList.remove('hidden');
        } else if (type === 'url') {
            document.getElementById('urlSubmissionSection').classList.remove('hidden');
        }
    }

    async checkPreviousSubmission() {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        try {
            const q = query(
                collection(db, 'submissions'),
                where('assignmentId', '==', this.currentAssignment.id),
                where('studentId', '==', currentUser.uid)
            );

            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                this.currentSubmission = {
                    id: querySnapshot.docs[0].id,
                    ...querySnapshot.docs[0].data()
                };
                this.displayPreviousSubmission();
            }
        } catch (error) {
            console.error('Error checking previous submission:', error);
        }
    }

    displayPreviousSubmission() {
        const submission = this.currentSubmission;
        const section = document.getElementById('previousSubmission');
        
        section.classList.remove('hidden');
        document.getElementById('prevSubmitDate').textContent = this.formatDate(
            submission.submittedAt?.toDate ? submission.submittedAt.toDate() : new Date(submission.submittedAt)
        );
        document.getElementById('prevStatus').textContent = this.capitalize(submission.status);

        if (submission.status === 'graded') {
            document.getElementById('prevGrade').classList.remove('hidden');
            document.getElementById('prevGradeValue').textContent = `${submission.grade}/${this.currentAssignment.maxPoints}`;
            
            if (submission.feedback) {
                document.getElementById('prevFeedback').classList.remove('hidden');
                document.getElementById('prevFeedbackValue').textContent = submission.feedback;
            }
        }
    }

    setupEventListeners() {
        // File upload
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');
        const removeFileBtn = document.getElementById('removeFileBtn');

        selectFileBtn.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50');
            if (e.dataTransfer.files.length > 0) {
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        removeFileBtn.addEventListener('click', () => this.removeFile());

        // Text submission
        const textContent = document.getElementById('textContent');
        textContent.addEventListener('input', (e) => {
            const count = e.target.value.length;
            document.getElementById('charCount').textContent = count;
            if (count > 5000) {
                e.target.value = e.target.value.substring(0, 5000);
            }
        });

        // Form submission
        document.getElementById('submissionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.showConfirmModal();
        });

        document.getElementById('cancelBtn').addEventListener('click', () => {
            window.location.back();
        });

        // Confirmation modal
        document.getElementById('confirmCancel').addEventListener('click', () => {
            document.getElementById('confirmModal').classList.add('hidden');
        });

        document.getElementById('confirmSubmit').addEventListener('click', () => {
            document.getElementById('confirmModal').classList.add('hidden');
            this.submitAssignment();
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.location.back();
        });
    }

    handleFileSelect(file) {
        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showToast('File size exceeds 10MB limit', 'error');
            return;
        }

        // Validate file type
        const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                             'application/msword', 'text/plain', 'image/jpeg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showToast('File type not supported', 'error');
            return;
        }

        this.selectedFile = file;
        this.displayFilePreview(file);
    }

    displayFilePreview(file) {
        const preview = document.getElementById('filePreview');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const fileIcon = document.getElementById('fileIcon');

        // Set file icon based on type
        const extension = file.name.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'fa-file-pdf',
            'docx': 'fa-file-word',
            'doc': 'fa-file-word',
            'txt': 'fa-file-lines',
            'jpg': 'fa-file-image',
            'jpeg': 'fa-file-image',
            'png': 'fa-file-image'
        };

        fileIcon.className = `fas ${iconMap[extension] || 'fa-file'} text-2xl text-gray-400`;
        fileName.textContent = file.name;
        fileSize.textContent = this.formatFileSize(file.size);
        preview.classList.remove('hidden');
    }

    removeFile() {
        this.selectedFile = null;
        document.getElementById('fileInput').value = '';
        document.getElementById('filePreview').classList.add('hidden');
    }

    showConfirmModal() {
        document.getElementById('confirmModal').classList.remove('hidden');
    }

    async submitAssignment() {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;

        try {
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated');
            }

            let fileUrl = null;

            // Handle file upload
            if (this.submissionType === 'file' && this.selectedFile) {
                fileUrl = await this.uploadFile(currentUser.uid);
            }

            // Prepare submission data
            const submissionData = {
                assignmentId: this.currentAssignment.id,
                courseId: this.currentAssignment.courseId,
                studentId: currentUser.uid,
                submittedAt: serverTimestamp(),
                status: 'submitted',
                grade: null,
                feedback: null,
                gradedBy: null,
                gradedAt: null,
                comments: document.getElementById('comments').value
            };

            // Add content based on submission type
            if (this.submissionType === 'file' && fileUrl) {
                submissionData.fileUrl = fileUrl;
                submissionData.fileName = this.selectedFile.name;
            } else if (this.submissionType === 'text') {
                submissionData.content = document.getElementById('textContent').value;
            } else if (this.submissionType === 'url') {
                submissionData.content = document.getElementById('urlContent').value;
            }

            // Check if resubmitting
            if (this.currentSubmission) {
                // Update existing submission
                await updateDoc(doc(db, 'submissions', this.currentSubmission.id), submissionData);
                this.showToast('Assignment resubmitted successfully', 'success');
            } else {
                // Create new submission
                await addDoc(collection(db, 'submissions'), submissionData);
                this.showToast('Assignment submitted successfully', 'success');
            }

            // Update user statistics
            await this.updateUserStats(currentUser.uid);

            // Redirect after success
            setTimeout(() => {
                window.location.href = `dashboard.html?tab=assignments`;
            }, 1500);

        } catch (error) {
            console.error('Error submitting assignment:', error);
            this.showToast(`Error: ${error.message}`, 'error');
            submitBtn.disabled = false;
        }
    }

    async uploadFile(userId) {
        return new Promise((resolve, reject) => {
            const fileRef = ref(storage, `submissions/${userId}/${this.currentAssignment.id}/${this.selectedFile.name}`);
            const uploadTask = uploadBytesResumable(fileRef, this.selectedFile);

            // Show progress bar
            document.getElementById('uploadProgress').classList.remove('hidden');

            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    document.getElementById('progressBar').style.width = progress + '%';
                    document.getElementById('progressPercent').textContent = Math.round(progress) + '%';
                },
                (error) => {
                    console.error('Upload error:', error);
                    reject(error);
                },
                async () => {
                    try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve(downloadUrl);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    async updateUserStats(userId) {
        try {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const submissions = (userSnap.data().submissions || 0) + 1;
                await updateDoc(userRef, { submissions });
            }
        } catch (error) {
            console.error('Error updating user stats:', error);
        }
    }

    updateStatusBadge(dueDate) {
        const now = new Date();
        const badge = document.getElementById('statusBadge');

        if (now > dueDate) {
            badge.textContent = 'Past Due';
            badge.className = 'px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800';
        } else {
            const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            if (daysLeft === 0) {
                badge.textContent = 'Due Today';
                badge.className = 'px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800';
            }
        }
    }

    formatSubmissionType(type) {
        const map = {
            'file': 'File Upload',
            'text': 'Text/Answer',
            'url': 'URL/Link'
        };
        return map[type] || type;
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
        }

        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 3000);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SubmissionManager();
    });
} else {
    new SubmissionManager();
}
