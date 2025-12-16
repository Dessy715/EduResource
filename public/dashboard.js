import { auth, db, getDoc, doc, getDocs, collection, query, where } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const user = auth.currentUser;
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Load user profile
    await loadUserProfile(user);
    
    // Load enrolled courses
    await loadEnrolledCourses(user);
    
    // Load assignments
    await loadAssignments(user);
    
    // Load recent activity
    await loadRecentActivity(user);
});

async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update UI
            document.getElementById('userName').textContent = userData.name || user.email.split('@')[0];
            document.getElementById('userEmail').textContent = user.email;
            document.getElementById('welcomeName').textContent = userData.name || user.email.split('@')[0];
            
            // Update avatar
            const avatar = document.getElementById('userAvatar');
            if (userData.photoURL) {
                avatar.src = userData.photoURL;
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || user.email)}&background=667eea&color=fff`;
            }
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
    }
}

async function loadEnrolledCourses(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) return;
        
        const userData = userDoc.data();
        const enrolledCourses = userData.enrolledCourses || [];
        
        // Update stats
        document.getElementById('activeCourses').textContent = enrolledCourses.length;
        
        let completedCount = 0;
        let totalGrade = 0;
        let gradeCount = 0;
        
        // Load course details
        const coursesGrid = document.getElementById('enrolledCourses');
        const allCoursesGrid = document.getElementById('allEnrolledCourses');
        coursesGrid.innerHTML = '';
        allCoursesGrid.innerHTML = '';
        
        for (const courseId of enrolledCourses) {
            const courseDoc = await getDoc(doc(db, 'courses', courseId));
            if (courseDoc.exists()) {
                const course = courseDoc.data();
                const progress = userData.progress?.[courseId] || {};
                
                // Calculate completion
                if (progress.completedLessons && progress.totalLessons) {
                    if (progress.completedLessons.length === progress.totalLessons) {
                        completedCount++;
                    }
                }
                
                // Calculate grade
                if (progress.grade) {
                    totalGrade += progress.grade;
                    gradeCount++;
                }
                
                // Create course card
                const card = createDashboardCourseCard(course, courseId, progress);
                coursesGrid.appendChild(card.cloneNode(true));
                allCoursesGrid.appendChild(card);
            }
        }
        
        // Update stats
        document.getElementById('completedCourses').textContent = completedCount;
        if (gradeCount > 0) {
            const average = Math.round(totalGrade / gradeCount);
            document.getElementById('averageGrade').textContent = `${average}%`;
        }
        
    } catch (error) {
        console.error('Error loading enrolled courses:', error);
    }
}

function createDashboardCourseCard(course, courseId, progress) {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.innerHTML = `
        <div class="course-image">
            <i class="fas ${course.icon || 'fa-book'}"></i>
        </div>
        <div class="course-content">
            <h3 class="course-title">${course.title}</h3>
            <p class="course-instructor">${course.instructor}</p>
            <div class="course-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${calculateProgress(progress)}%"></div>
                </div>
                <p>${calculateProgress(progress)}% Complete</p>
            </div>
            <div class="course-actions">
                <a href="course.html?id=${courseId}" class="btn btn-primary">Continue Learning</a>
            </div>
        </div>
    `;
    return card;
}

function calculateProgress(progress) {
    if (!progress.completedLessons || !progress.totalLessons || progress.totalLessons === 0) {
        return 0;
    }
    return Math.round((progress.completedLessons.length / progress.totalLessons) * 100);
}

async function loadAssignments(user) {
    try {
        // This would load assignments from Firestore
        // For now, display a message
        const assignmentsList = document.getElementById('assignmentsList');
        assignmentsList.innerHTML = `
            <div class="assignment-item">
                <h3>No pending assignments</h3>
                <p>All caught up! Check back later for new assignments.</p>
            </div>
        `;
        
        // Update pending assignments count
        document.getElementById('pendingAssignments').textContent = '0';
        
    } catch (error) {
        console.error('Error loading assignments:', error);
    }
}

async function loadRecentActivity(user) {
    try {
        const activityFeed = document.getElementById('recentActivity');
        
        // Sample activity data - in real app, fetch from Firestore
        const activities = [
            { action: 'completed', item: 'Python Functions Lesson', time: '2 hours ago' },
            { action: 'enrolled', item: 'Web Design Fundamentals', time: '1 day ago' },
            { action: 'submitted', item: 'Database Design Assignment', time: '3 days ago' },
            { action: 'earned', item: 'Programming Fundamentals Badge', time: '1 week ago' }
        ];
        
        activityFeed.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <i class="fas fa-${getActivityIcon(activity.action)}"></i>
                <div>
                    <p><strong>${activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}</strong> ${activity.item}</p>
                    <small>${activity.time}</small>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading activity:', error);
    }
}

function getActivityIcon(action) {
    const icons = {
        completed: 'check-circle',
        enrolled: 'book',
        submitted: 'paper-plane',
        earned: 'award'
    };
    return icons[action] || 'circle';
}