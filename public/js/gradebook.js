/**
 * Gradebook Manager
 * Manages grade viewing, filtering, and exporting
 */

class GradebookManager {
    constructor() {
        this.currentUser = null;
        this.allGrades = [];
        this.filteredGrades = [];
        this.courses = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.userRole = null;
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
                await this.loadUserRole();
                await this.loadCourses();
                await this.loadGrades();
                this.setupEventListeners();
                this.displayGrades();
                this.updateStatistics();
            });
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Error initializing gradebook', 'error');
        }
    }

    async loadUserRole() {
        try {
            const docSnap = await getDoc(doc(db, 'users', this.currentUser.uid));
            if (docSnap.exists()) {
                this.userRole = docSnap.data().role;
            }
        } catch (error) {
            console.error('Error loading user role:', error);
        }
    }

    async loadCourses() {
        try {
            let q;
            
            if (this.userRole === 'instructor') {
                // Load instructor's courses
                q = query(
                    collection(db, 'courses'),
                    where('createdBy', '==', this.currentUser.uid)
                );
            } else {
                // Load all courses
                q = query(collection(db, 'courses'));
            }

            const querySnapshot = await getDocs(q);
            this.courses = [];

            for (const doc of querySnapshot.docs) {
                this.courses.push({
                    id: doc.id,
                    ...doc.data()
                });
            }

            this.populateCourseFilter();
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    }

    async loadGrades() {
        try {
            let q;

            if (this.userRole === 'instructor') {
                // Get all submissions for instructor's courses
                const courseIds = this.courses.map(c => c.id);
                
                const allSubmissions = [];
                for (const courseId of courseIds) {
                    const submissionQuery = query(
                        collection(db, 'submissions'),
                        where('courseId', '==', courseId)
                    );
                    const snapshot = await getDocs(submissionQuery);
                    allSubmissions.push(...snapshot.docs);
                }

                // Process submissions
                for (const doc of allSubmissions) {
                    const submission = doc.data();
                    const studentDoc = await getDoc(doc(db, 'users', submission.studentId));
                    const courseDoc = await getDoc(doc(db, 'courses', submission.courseId));
                    const assignmentDoc = await getDoc(doc(db, 'assignments', submission.assignmentId));

                    this.allGrades.push({
                        id: doc.id,
                        studentName: studentDoc.exists() ? studentDoc.data().name : 'Unknown',
                        studentEmail: studentDoc.exists() ? studentDoc.data().email : 'Unknown',
                        studentId: submission.studentId,
                        courseName: courseDoc.exists() ? courseDoc.data().title : 'Unknown',
                        courseId: submission.courseId,
                        assignmentName: assignmentDoc.exists() ? assignmentDoc.data().title : 'Unknown',
                        assignmentId: submission.assignmentId,
                        grade: submission.grade || 0,
                        maxPoints: assignmentDoc.exists() ? assignmentDoc.data().maxPoints : 100,
                        status: submission.status,
                        feedback: submission.feedback,
                        submittedAt: submission.submittedAt,
                        ...submission
                    });
                }
            } else {
                // Get student's grades
                q = query(
                    collection(db, 'submissions'),
                    where('studentId', '==', this.currentUser.uid)
                );

                const querySnapshot = await getDocs(q);
                for (const doc of querySnapshot.docs) {
                    const submission = doc.data();
                    const courseDoc = await getDoc(doc(db, 'courses', submission.courseId));
                    const assignmentDoc = await getDoc(doc(db, 'assignments', submission.assignmentId));

                    this.allGrades.push({
                        id: doc.id,
                        studentName: this.currentUser.displayName || 'You',
                        studentEmail: this.currentUser.email,
                        studentId: submission.studentId,
                        courseName: courseDoc.exists() ? courseDoc.data().title : 'Unknown',
                        courseId: submission.courseId,
                        assignmentName: assignmentDoc.exists() ? assignmentDoc.data().title : 'Unknown',
                        assignmentId: submission.assignmentId,
                        grade: submission.grade,
                        maxPoints: assignmentDoc.exists() ? assignmentDoc.data().maxPoints : 100,
                        status: submission.status,
                        feedback: submission.feedback,
                        submittedAt: submission.submittedAt,
                        ...submission
                    });
                }
            }

            this.filteredGrades = [...this.allGrades];
        } catch (error) {
            console.error('Error loading grades:', error);
        }
    }

    populateCourseFilter() {
        const select = document.getElementById('courseFilter');
        
        this.courses.forEach(course => {
            const option = document.createElement('option');
            option.value = course.id;
            option.textContent = course.title;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Filters
        document.getElementById('courseFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('gradeFilter').addEventListener('change', () => {
            this.applyFilters();
        });

        document.getElementById('sortBy').addEventListener('change', () => {
            this.sortGrades();
            this.currentPage = 1;
            this.displayGrades();
        });

        // Export buttons
        document.getElementById('exportCSV').addEventListener('click', () => {
            this.exportToCSV();
        });

        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Pagination
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayGrades();
            }
        });

        document.getElementById('nextPage').addEventListener('click', () => {
            const maxPage = Math.ceil(this.filteredGrades.length / this.itemsPerPage);
            if (this.currentPage < maxPage) {
                this.currentPage++;
                this.displayGrades();
            }
        });

        // Grade modal
        document.getElementById('closeGradeModal').addEventListener('click', () => {
            document.getElementById('gradeModal').classList.add('hidden');
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => {
            window.history.back();
        });
    }

    applyFilters() {
        const courseFilter = document.getElementById('courseFilter').value;
        const gradeFilter = document.getElementById('gradeFilter').value;

        this.filteredGrades = this.allGrades.filter(grade => {
            // Course filter
            if (courseFilter && grade.courseId !== courseFilter) {
                return false;
            }

            // Grade filter
            if (gradeFilter) {
                const percentage = this.calculatePercentage(grade.grade, grade.maxPoints);
                const gradeRanges = {
                    'A': [90, 100],
                    'B': [80, 89],
                    'C': [70, 79],
                    'D': [60, 69],
                    'F': [0, 59]
                };

                const range = gradeRanges[gradeFilter];
                if (percentage < range[0] || percentage > range[1]) {
                    return false;
                }
            }

            return true;
        });

        this.currentPage = 1;
        this.displayGrades();
        this.updateStatistics();
    }

    sortGrades() {
        const sortBy = document.getElementById('sortBy').value;

        this.filteredGrades.sort((a, b) => {
            if (sortBy === 'name') {
                return a.studentName.localeCompare(b.studentName);
            } else if (sortBy === 'grade') {
                return b.grade - a.grade;
            } else if (sortBy === 'submitted') {
                const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate() : new Date(a.submittedAt);
                const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate() : new Date(b.submittedAt);
                return dateB - dateA;
            }
        });
    }

    displayGrades() {
        const tbody = document.getElementById('gradesTable');
        tbody.innerHTML = '';

        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        const pageGrades = this.filteredGrades.slice(start, end);

        pageGrades.forEach(grade => {
            const tr = document.createElement('tr');
            const percentage = this.calculatePercentage(grade.grade, grade.maxPoints);
            const letterGrade = this.getLetterGrade(percentage);
            const submittedDate = grade.submittedAt?.toDate ? grade.submittedAt.toDate() : new Date(grade.submittedAt);

            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap font-medium text-gray-900">${grade.studentName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${grade.studentEmail}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${grade.courseName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${grade.status === 'graded' ? `${grade.grade}/${grade.maxPoints}` : '-'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getLetterGradeBadge(letterGrade)}">
                        ${letterGrade}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${this.getStatusBadge(grade.status)}">
                        ${this.capitalize(grade.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    ${this.formatDate(submittedDate)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button class="text-blue-600 hover:text-blue-700 view-grade-btn" data-id="${grade.id}">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;

            tbody.appendChild(tr);
        });

        // Attach event listeners
        document.querySelectorAll('.view-grade-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const gradeId = btn.dataset.id;
                const grade = this.filteredGrades.find(g => g.id === gradeId);
                this.showGradeDetails(grade);
            });
        });

        // Update pagination
        const maxPage = Math.ceil(this.filteredGrades.length / this.itemsPerPage);
        document.getElementById('pageInfo').textContent = 
            `Showing ${start + 1}-${Math.min(end, this.filteredGrades.length)} of ${this.filteredGrades.length}`;

        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === maxPage;
    }

    showGradeDetails(grade) {
        const content = document.getElementById('gradeModalContent');
        const percentage = this.calculatePercentage(grade.grade, grade.maxPoints);
        const letterGrade = this.getLetterGrade(percentage);
        const submittedDate = grade.submittedAt?.toDate ? grade.submittedAt.toDate() : new Date(grade.submittedAt);

        content.innerHTML = `
            <div class="space-y-4">
                <div>
                    <p class="text-sm text-gray-600">Student</p>
                    <p class="font-medium text-gray-900">${grade.studentName}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600">Course</p>
                    <p class="font-medium text-gray-900">${grade.courseName}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600">Assignment</p>
                    <p class="font-medium text-gray-900">${grade.assignmentName}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-600">Numeric Grade</p>
                        <p class="text-2xl font-bold text-blue-600">${grade.grade}/${grade.maxPoints}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Percentage</p>
                        <p class="text-2xl font-bold text-green-600">${percentage}%</p>
                    </div>
                </div>
                <div>
                    <p class="text-sm text-gray-600">Letter Grade</p>
                    <p class="text-2xl font-bold ${this.getLetterGradeColor(letterGrade)}">${letterGrade}</p>
                </div>
                <div>
                    <p class="text-sm text-gray-600">Submitted</p>
                    <p class="font-medium text-gray-900">${this.formatDate(submittedDate)}</p>
                </div>
                ${grade.feedback ? `
                    <div>
                        <p class="text-sm text-gray-600">Feedback</p>
                        <p class="font-medium text-gray-900">${grade.feedback}</p>
                    </div>
                ` : ''}
            </div>
        `;

        document.getElementById('gradeModal').classList.remove('hidden');
    }

    updateStatistics() {
        const gradedSubmissions = this.filteredGrades.filter(g => g.status === 'graded');
        
        if (gradedSubmissions.length === 0) {
            document.getElementById('averageGrade').textContent = '--';
            document.getElementById('highestGrade').textContent = '--';
            document.getElementById('lowestGrade').textContent = '--';
            document.getElementById('gradedCount').textContent = '0';
            return;
        }

        const percentages = gradedSubmissions.map(g => this.calculatePercentage(g.grade, g.maxPoints));
        const average = percentages.reduce((a, b) => a + b, 0) / percentages.length;
        const highest = Math.max(...percentages);
        const lowest = Math.min(...percentages);

        document.getElementById('averageGrade').textContent = average.toFixed(1) + '%';
        document.getElementById('highestGrade').textContent = highest.toFixed(0) + '%';
        document.getElementById('lowestGrade').textContent = lowest.toFixed(0) + '%';
        document.getElementById('gradedCount').textContent = gradedSubmissions.length;
    }

    async exportToCSV() {
        try {
            this.showToast('Generating CSV...', 'success');

            const headers = ['Student Name', 'Email', 'Course', 'Assignment', 'Grade', 'Max Points', 'Percentage', 'Letter Grade', 'Status', 'Submitted Date'];
            const rows = this.filteredGrades.map(grade => {
                const percentage = this.calculatePercentage(grade.grade, grade.maxPoints);
                const letterGrade = this.getLetterGrade(percentage);
                const submittedDate = grade.submittedAt?.toDate ? grade.submittedAt.toDate() : new Date(grade.submittedAt);

                return [
                    grade.studentName,
                    grade.studentEmail,
                    grade.courseName,
                    grade.assignmentName,
                    grade.grade || '-',
                    grade.maxPoints,
                    Math.round(percentage) + '%',
                    letterGrade,
                    grade.status,
                    this.formatDate(submittedDate)
                ];
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gradebook-${new Date().getTime()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            this.showToast('CSV exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showToast('Error exporting CSV', 'error');
        }
    }

    async exportToPDF() {
        try {
            this.showToast('Generating PDF...', 'success');

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Title
            doc.setFontSize(16);
            doc.text('Gradebook Report', pageWidth / 2, 15, { align: 'center' });

            // Date
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 22, { align: 'center' });

            // Statistics
            doc.setFontSize(11);
            doc.text('Statistics', 14, 35);
            doc.setFontSize(10);
            doc.text(`Total Submissions: ${this.filteredGrades.length}`, 14, 43);
            doc.text(`Average Grade: ${document.getElementById('averageGrade').textContent}`, 14, 50);

            // Table
            const headers = ['Student', 'Course', 'Grade', 'Percentage', 'Status'];
            const rows = this.filteredGrades.slice(0, 20).map(grade => {
                const percentage = this.calculatePercentage(grade.grade, grade.maxPoints);
                return [
                    grade.studentName.substring(0, 15),
                    grade.courseName.substring(0, 12),
                    `${grade.grade}/${grade.maxPoints}`,
                    percentage + '%',
                    grade.status
                ];
            });

            let y = 60;
            const rowHeight = 7;
            const colWidths = [35, 35, 25, 25, 20];

            // Header row
            doc.setFillColor(200, 200, 200);
            headers.forEach((header, i) => {
                doc.text(header, 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y + 5, { align: 'left' });
            });
            y += rowHeight;

            // Data rows
            doc.setFillColor(255, 255, 255);
            rows.forEach(row => {
                row.forEach((cell, i) => {
                    doc.text(cell, 14 + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y + 5, { align: 'left' });
                });
                y += rowHeight;

                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 10;
                }
            });

            doc.save(`gradebook-${new Date().getTime()}.pdf`);
            this.showToast('PDF exported successfully', 'success');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showToast('Error exporting PDF', 'error');
        }
    }

    calculatePercentage(grade, maxPoints) {
        if (!grade || !maxPoints) return 0;
        return Math.round((grade / maxPoints) * 100);
    }

    getLetterGrade(percentage) {
        if (percentage >= 90) return 'A';
        if (percentage >= 80) return 'B';
        if (percentage >= 70) return 'C';
        if (percentage >= 60) return 'D';
        return 'F';
    }

    getLetterGradeBadge(grade) {
        const badges = {
            'A': 'bg-green-100 text-green-800',
            'B': 'bg-blue-100 text-blue-800',
            'C': 'bg-yellow-100 text-yellow-800',
            'D': 'bg-orange-100 text-orange-800',
            'F': 'bg-red-100 text-red-800'
        };
        return badges[grade] || 'bg-gray-100 text-gray-800';
    }

    getLetterGradeColor(grade) {
        const colors = {
            'A': 'text-green-600',
            'B': 'text-blue-600',
            'C': 'text-yellow-600',
            'D': 'text-orange-600',
            'F': 'text-red-600'
        };
        return colors[grade] || 'text-gray-600';
    }

    getStatusBadge(status) {
        const badges = {
            'graded': 'bg-green-100 text-green-800',
            'submitted': 'bg-blue-100 text-blue-800',
            'late': 'bg-orange-100 text-orange-800'
        };
        return badges[status] || 'bg-gray-100 text-gray-800';
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
        new GradebookManager();
    });
} else {
    new GradebookManager();
}
