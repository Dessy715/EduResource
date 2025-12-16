const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK
admin.initializeApp();

// Configure email transporter
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER || 'your-email@gmail.com',
        pass: process.env.GMAIL_PASSWORD || 'your-app-password'
    }
});

// Firestore reference
const db = admin.firestore();

/**
 * Cloud Function: Send Welcome Email
 * Triggered when new user is created
 */
exports.sendWelcomeEmail = functions.auth.user().onCreate(async (user) => {
    try {
        const userData = await db.collection('users').doc(user.uid).get();
        const data = userData.data();

        const mailOptions = {
            from: process.env.GMAIL_USER || 'noreply@edulms.com',
            to: user.email,
            subject: 'Welcome to EduLMS - Your Learning Journey Starts Here!',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: 'Arial', sans-serif; background-color: #f5f5f5; }
                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
                        .header { background: linear-gradient(135deg, #4F46E5 0%, #10B981 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                        .content { padding: 30px 0; }
                        .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
                        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Welcome to EduLMS!</h1>
                            <p>Your Modern Learning Platform</p>
                        </div>
                        <div class="content">
                            <p>Hi ${data?.firstName || 'Student'},</p>
                            <p>Welcome to EduLMS, your comprehensive learning management system!</p>
                            <p>We're excited to have you join our community of learners. Here's what you can do:</p>
                            <ul>
                                <li>📚 Browse and enroll in courses</li>
                                <li>✅ Complete assignments and submit work</li>
                                <li>📊 Track your grades and progress</li>
                                <li>💬 Collaborate with instructors and peers</li>
                            </ul>
                            <p><strong>Account Details:</strong></p>
                            <ul>
                                <li><strong>Email:</strong> ${user.email}</li>
                                <li><strong>Role:</strong> ${data?.role || 'Student'}</li>
                                <li><strong>Account Created:</strong> ${new Date().toLocaleDateString()}</li>
                            </ul>
                            <p>Ready to get started? Log in to your dashboard and explore available courses.</p>
                            <a href="https://edulms-learning.web.app" class="button">Go to Dashboard</a>
                        </div>
                        <div class="footer">
                            <p>© 2025 EduLMS. All rights reserved.</p>
                            <p>If you have any questions, contact us at support@edulms.com</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${user.email}`);
        return true;
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return false;
    }
});

/**
 * Cloud Function: Send Assignment Reminder
 * Triggered daily at 8 AM to remind students about upcoming deadlines
 */
exports.sendAssignmentReminders = functions.pubsub
    .schedule('0 8 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Get assignments due tomorrow or today
            const assignmentSnapshot = await db.collection('assignments')
                .where('dueDate', '<=', tomorrow)
                .where('dueDate', '>=', now)
                .get();

            let emailsCount = 0;

            for (const assignmentDoc of assignmentSnapshot.docs) {
                const assignment = assignmentDoc.data();

                // Get course info
                const courseDoc = await db.collection('courses').doc(assignment.courseId).get();
                const course = courseDoc.data();

                // Get all students enrolled in the course
                const studentsSnapshot = await db.collection('users')
                    .where('enrolledCourses', 'array-contains', assignment.courseId)
                    .get();

                for (const studentDoc of studentsSnapshot.docs) {
                    const student = studentDoc.data();

                    // Check if student hasn't submitted
                    const submissionRef = db.collection('assignments')
                        .doc(assignmentDoc.id)
                        .collection('submissions')
                        .doc(studentDoc.id);

                    const submission = await submissionRef.get();

                    if (!submission.exists || submission.data().status === 'pending') {
                        const daysUntil = Math.ceil((assignment.dueDate.toDate() - now) / (1000 * 60 * 60 * 24));

                        const mailOptions = {
                            from: process.env.GMAIL_USER || 'noreply@edulms.com',
                            to: student.email,
                            subject: `Reminder: "${assignment.title}" is due in ${daysUntil} day(s)`,
                            html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <style>
                                        body { font-family: 'Arial', sans-serif; }
                                        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
                                        .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; }
                                        .button { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                                    </style>
                                </head>
                                <body>
                                    <div class="container">
                                        <h2>Assignment Reminder</h2>
                                        <div class="alert">
                                            <p><strong>"${assignment.title}"</strong> from ${course.title}</p>
                                            <p>Due Date: ${assignment.dueDate.toDate().toLocaleDateString()} at ${assignment.dueDate.toDate().toLocaleTimeString()}</p>
                                            <p>Time remaining: <strong>${daysUntil} day(s)</strong></p>
                                        </div>
                                        <p>${assignment.description || 'No description provided.'}</p>
                                        <a href="https://edulms-learning.web.app" class="button">View Assignment</a>
                                    </div>
                                </body>
                                </html>
                            `
                        };

                        await transporter.sendMail(mailOptions);
                        emailsCount++;
                    }
                }
            }

            console.log(`Sent ${emailsCount} assignment reminder emails`);
            return { emailsSent: emailsCount };
        } catch (error) {
            console.error('Error sending assignment reminders:', error);
            throw error;
        }
    });

/**
 * Cloud Function: Send Grade Notification
 * Triggered when instructor grades an assignment
 */
exports.notifyGradePosted = functions.firestore
    .document('grades/{gradeId}')
    .onCreate(async (snap) => {
        try {
            const grade = snap.data();

            // Get student info
            const studentDoc = await db.collection('users').doc(grade.studentId).get();
            const student = studentDoc.data();

            // Get course info
            const courseDoc = await db.collection('courses').doc(grade.courseId).get();
            const course = courseDoc.data();

            const mailOptions = {
                from: process.env.GMAIL_USER || 'noreply@edulms.com',
                to: student.email,
                subject: `Your grade for "${grade.assignment}" has been posted!`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { font-family: 'Arial', sans-serif; }
                            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
                            .grade-box { 
                                background: linear-gradient(135deg, #4F46E5 0%, #10B981 100%);
                                color: white;
                                padding: 30px;
                                border-radius: 8px;
                                text-align: center;
                                margin: 20px 0;
                            }
                            .grade-score { font-size: 48px; font-weight: bold; }
                            .button { display: inline-block; background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h2>Grade Posted!</h2>
                            <p>Hi ${student.firstName},</p>
                            <p>Your assignment <strong>"${grade.assignment}"</strong> in <strong>${course.title}</strong> has been graded!</p>
                            <div class="grade-box">
                                <div class="grade-score">${grade.score}/${grade.maxScore}</div>
                                <p>${Math.round((grade.score / grade.maxScore) * 100)}%</p>
                            </div>
                            ${grade.feedback ? `<p><strong>Feedback:</strong></p><p>${grade.feedback}</p>` : ''}
                            <a href="https://edulms-learning.web.app" class="button">View Detailed Grade</a>
                        </div>
                    </body>
                    </html>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`Grade notification sent to ${student.email}`);
            return true;
        } catch (error) {
            console.error('Error sending grade notification:', error);
            throw error;
        }
    });

/**
 * Cloud Function: Send Course Enrollment Confirmation
 * Triggered when student enrolls in a course
 */
exports.confirmCourseEnrollment = functions.firestore
    .document('users/{userId}')
    .onUpdate(async (change) => {
        try {
            const beforeData = change.before.data();
            const afterData = change.after.data();

            const oldCourses = beforeData.enrolledCourses || [];
            const newCourses = afterData.enrolledCourses || [];

            // Find newly added course
            const newCourseId = newCourses.find(id => !oldCourses.includes(id));

            if (newCourseId) {
                const courseDoc = await db.collection('courses').doc(newCourseId).get();
                const course = courseDoc.data();

                const mailOptions = {
                    from: process.env.GMAIL_USER || 'noreply@edulms.com',
                    to: afterData.email,
                    subject: `You're now enrolled in "${course.title}"!`,
                    html: `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body { font-family: 'Arial', sans-serif; }
                                .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; }
                                .course-header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px; }
                                .button { display: inline-block; background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 15px; }
                                .info-row { margin: 10px 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="course-header">
                                    <h2>${course.title}</h2>
                                    <p>Level: ${course.level}</p>
                                </div>
                                <p>Hi ${afterData.firstName},</p>
                                <p>Congratulations! You've successfully enrolled in <strong>${course.title}</strong>.</p>
                                <h3>Course Details:</h3>
                                <div class="info-row">
                                    <strong>Instructor:</strong> ${course.instructorName}
                                </div>
                                <div class="info-row">
                                    <strong>Duration:</strong> ${course.duration} hours
                                </div>
                                <div class="info-row">
                                    <strong>Level:</strong> ${course.level}
                                </div>
                                <p>${course.description}</p>
                                <a href="https://edulms-learning.web.app" class="button">Start Learning</a>
                            </div>
                        </body>
                        </html>
                    `
                };

                await transporter.sendMail(mailOptions);
                console.log(`Enrollment confirmation sent to ${afterData.email}`);
            }

            return true;
        } catch (error) {
            console.error('Error sending enrollment confirmation:', error);
            return false;
        }
    });

/**
 * HTTP Cloud Function: Get User Statistics
 * Called from frontend to get dashboard stats
 */
exports.getUserStats = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const uid = req.query.uid;

            if (!uid) {
                return res.status(400).json({ error: 'Missing UID parameter' });
            }

            // Get user
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = userDoc.data();
            const enrolledCourses = user.enrolledCourses || [];

            // Calculate stats
            const stats = {
                activeCourses: enrolledCourses.length,
                completedCourses: 0,
                pendingAssignments: 0,
                submittedAssignments: 0,
                averageGrade: 0
            };

            // Get grades
            const gradesSnapshot = await db.collection('grades')
                .where('studentId', '==', uid)
                .get();

            let totalScore = 0;
            gradesSnapshot.forEach(doc => {
                const grade = doc.data();
                totalScore += (grade.score / grade.maxScore) * 100;
            });

            if (gradesSnapshot.size > 0) {
                stats.averageGrade = Math.round(totalScore / gradesSnapshot.size);
            }

            // Get assignments
            for (const courseId of enrolledCourses) {
                const assignmentsSnapshot = await db.collection('assignments')
                    .where('courseId', '==', courseId)
                    .get();

                for (const assignmentDoc of assignmentsSnapshot.docs) {
                    const submissionRef = assignmentDoc.ref.collection('submissions').doc(uid);
                    const submission = await submissionRef.get();

                    if (submission.exists) {
                        if (submission.data().status === 'graded') {
                            stats.submittedAssignments++;
                        } else {
                            stats.pendingAssignments++;
                        }
                    } else {
                        stats.pendingAssignments++;
                    }
                }
            }

            return res.json(stats);
        } catch (error) {
            console.error('Error getting user stats:', error);
            return res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    });
});

/**
 * HTTP Cloud Function: Get Course Details
 * Called from frontend to get detailed course information
 */
exports.getCourseDetails = functions.https.onRequest((req, res) => {
    cors(req, res, async () => {
        try {
            const courseId = req.query.courseId;

            if (!courseId) {
                return res.status(400).json({ error: 'Missing courseId parameter' });
            }

            const courseDoc = await db.collection('courses').doc(courseId).get();
            if (!courseDoc.exists) {
                return res.status(404).json({ error: 'Course not found' });
            }

            const course = courseDoc.data();

            // Get assignments count
            const assignmentsSnapshot = await db.collection('assignments')
                .where('courseId', '==', courseId)
                .get();

            course.assignmentCount = assignmentsSnapshot.size;
            course.enrollmentCount = course.students?.length || 0;

            return res.json(course);
        } catch (error) {
            console.error('Error getting course details:', error);
            return res.status(500).json({ error: 'Internal server error', details: error.message });
        }
    });
});

/**
 * Cloud Function: Update User Statistics
 * Triggered weekly to calculate and cache user statistics
 */
exports.updateUserStatistics = functions.pubsub
    .schedule('0 0 * * 0')  // Every Sunday at midnight
    .onRun(async (context) => {
        try {
            const usersSnapshot = await db.collection('users').get();
            let updatedCount = 0;

            for (const userDoc of usersSnapshot.docs) {
                const stats = {
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                    totalCoursesEnrolled: userDoc.data().enrolledCourses?.length || 0
                };

                // Get user grades
                const gradesSnapshot = await db.collection('grades')
                    .where('studentId', '==', userDoc.id)
                    .get();

                if (gradesSnapshot.size > 0) {
                    let totalScore = 0;
                    gradesSnapshot.forEach(gradeDoc => {
                        const grade = gradeDoc.data();
                        totalScore += (grade.score / grade.maxScore) * 100;
                    });
                    stats.averageGrade = Math.round(totalScore / gradesSnapshot.size);
                }

                await userDoc.ref.update(stats);
                updatedCount++;
            }

            console.log(`Updated statistics for ${updatedCount} users`);
            return { usersUpdated: updatedCount };
        } catch (error) {
            console.error('Error updating user statistics:', error);
            throw error;
        }
    });

module.exports = {
    sendWelcomeEmail: exports.sendWelcomeEmail,
    sendAssignmentReminders: exports.sendAssignmentReminders,
    notifyGradePosted: exports.notifyGradePosted,
    confirmCourseEnrollment: exports.confirmCourseEnrollment,
    getUserStats: exports.getUserStats,
    getCourseDetails: exports.getCourseDetails,
    updateUserStatistics: exports.updateUserStatistics
};
