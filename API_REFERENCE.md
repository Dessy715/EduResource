# EduLMS API Reference

## Overview

EduLMS uses Firebase services. This document provides complete API reference for all modules and methods.

---

## 1. Authentication API (`authManager.js`)

### Class: AuthManager

#### `checkAuthState(callback: Function)`
**Purpose**: Monitor authentication state changes

**Parameters**:
- `callback(user: User, userData: Object)` - Executed when auth state changes

**Returns**: Function to unsubscribe from listener

**Example**:
```javascript
const unsubscribe = authManager.checkAuthState((user, userData) => {
    if (user) {
        console.log('User logged in:', user.email);
    } else {
        console.log('User logged out');
    }
});

// Stop listening
unsubscribe();
```

---

#### `loginWithEmail(email: string, password: string)`
**Purpose**: Authenticate user with email and password

**Parameters**:
- `email` - User's email address
- `password` - User's password

**Returns**: Promise<{user: User, userData: Object}>

**Throws**: Firebase AuthError

**Example**:
```javascript
try {
    const { user, userData } = await authManager.loginWithEmail(
        'user@example.com',
        'password123'
    );
    console.log('Login successful:', user.email);
} catch (error) {
    console.error('Login failed:', error.message);
}
```

**Error Codes**:
- `auth/user-not-found` - Email not registered
- `auth/wrong-password` - Incorrect password
- `auth/invalid-email` - Invalid email format
- `auth/too-many-requests` - Too many failed attempts

---

#### `registerWithEmail(email: string, password: string, confirmPassword: string, userData: Object)`
**Purpose**: Create new user account with profile data

**Parameters**:
- `email` - User's email address
- `password` - User's password (min 6 characters)
- `confirmPassword` - Password confirmation
- `userData` - Profile data object:
  - `firstName` - First name
  - `lastName` - Last name
  - `role` - User role: "student", "instructor", "admin"
  - `institution` - School/University name (optional)
  - `avatar` - Avatar URL (optional)

**Returns**: Promise<{user: User, userData: Object}>

**Throws**: Firebase AuthError, Validation Error

**Example**:
```javascript
try {
    const { user, userData } = await authManager.registerWithEmail(
        'newuser@example.com',
        'secure123',
        'secure123',
        {
            firstName: 'John',
            lastName: 'Doe',
            role: 'student',
            institution: 'MIT'
        }
    );
    console.log('Registration successful');
} catch (error) {
    console.error('Registration failed:', error.message);
}
```

**Error Codes**:
- `auth/email-already-in-use` - Email already registered
- `auth/weak-password` - Password too weak
- `auth/invalid-email` - Invalid email format
- Validation: Passwords don't match

---

#### `loginWithGoogle()`
**Purpose**: Authenticate user using Google OAuth

**Parameters**: None

**Returns**: Promise<{user: User, userData: Object}>

**Throws**: Firebase AuthError

**Example**:
```javascript
try {
    const { user, userData } = await authManager.loginWithGoogle();
    console.log('Google login successful:', user.email);
} catch (error) {
    if (error.code === 'auth/popup-closed-by-user') {
        console.log('Login popup was closed');
    } else {
        console.error('Login failed:', error.message);
    }
}
```

---

#### `createUserDocument(user: FirebaseUser, userData: Object)`
**Purpose**: Create Firestore user profile document

**Parameters**:
- `user` - Firebase User object
- `userData` - User profile data

**Returns**: Promise<void>

**Example**:
```javascript
await authManager.createUserDocument(firebaseUser, {
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'instructor'
});
```

---

#### `logout()`
**Purpose**: Sign out current user

**Parameters**: None

**Returns**: Promise<void>

**Example**:
```javascript
await authManager.logout();
console.log('User logged out');
```

---

## 2. Data Management API (`dataManager.js`)

### Class: DataManager

#### `loadUserData(userId: string)`
**Purpose**: Fetch user profile from Firestore

**Parameters**:
- `userId` - Firebase UID

**Returns**: Promise<Object> - User data object

**Example**:
```javascript
const userData = await dataManager.loadUserData('user123');
console.log('User:', userData.firstName, userData.lastName);
```

**Returns Object Structure**:
```javascript
{
    uid: 'user123',
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'student',
    enrolledCourses: ['course1', 'course2'],
    avatar: 'https://...',
    lastLogin: Timestamp,
    createdAt: Timestamp,
    institution: 'MIT'
}
```

---

#### `saveUserData(userId: string, userData: Object)`
**Purpose**: Update user profile in Firestore

**Parameters**:
- `userId` - Firebase UID
- `userData` - Partial user data to update

**Returns**: Promise<void>

**Example**:
```javascript
await dataManager.saveUserData('user123', {
    firstName: 'Johnny',
    avatar: 'https://new-avatar.jpg'
});
```

---

#### `enrollCourse(userId: string, course: Object)`
**Purpose**: Enroll user in a course

**Parameters**:
- `userId` - Firebase UID
- `course` - Course object:
  - `id` - Course ID
  - `title` - Course title
  - `instructor` - Instructor name

**Returns**: Promise<void>

**Example**:
```javascript
await dataManager.enrollCourse('user123', {
    id: 'course1',
    title: 'JavaScript Basics',
    instructor: 'Jane Smith'
});
```

---

#### `addAssignment(userId: string, assignment: Object)`
**Purpose**: Add assignment to user's course

**Parameters**:
- `userId` - Firebase UID
- `assignment` - Assignment object:
  - `courseId` - Course ID
  - `title` - Assignment title
  - `dueDate` - Due date timestamp
  - `description` - Assignment description

**Returns**: Promise<string> - Assignment ID

**Example**:
```javascript
const assignmentId = await dataManager.addAssignment('user123', {
    courseId: 'course1',
    title: 'Chapter 1 Exercises',
    dueDate: new Date('2025-12-20'),
    description: 'Complete exercises 1-10'
});
```

---

#### `updateAssignment(userId: string, assignmentId: string, updates: Object)`
**Purpose**: Update assignment submission status

**Parameters**:
- `userId` - Firebase UID
- `assignmentId` - Assignment ID
- `updates` - Update data:
  - `status` - "submitted", "graded", "pending"
  - `submittedAt` - Submission timestamp
  - `feedback` - Instructor feedback

**Returns**: Promise<void>

**Example**:
```javascript
await dataManager.updateAssignment('user123', 'assign1', {
    status: 'graded',
    feedback: 'Excellent work!'
});
```

---

#### `getDashboardStats()`
**Purpose**: Get aggregated user statistics

**Parameters**: None

**Returns**: Promise<Object>

**Example**:
```javascript
const stats = await dataManager.getDashboardStats();
console.log(`Active courses: ${stats.activeCourses}`);
console.log(`Pending assignments: ${stats.pendingAssignments}`);
console.log(`Average grade: ${stats.averageGrade}%`);
```

**Returns Object Structure**:
```javascript
{
    activeCourses: 5,
    completedCourses: 2,
    pendingAssignments: 3,
    submittedAssignments: 12,
    averageGrade: 85.5,
    learningStreak: 7  // days
}
```

---

#### `getUpcomingDeadlines(limit: number = 5)`
**Purpose**: Get list of upcoming assignment deadlines

**Parameters**:
- `limit` - Maximum number of deadlines to return (default: 5)

**Returns**: Promise<Array<Object>>

**Example**:
```javascript
const deadlines = await dataManager.getUpcomingDeadlines(10);
deadlines.forEach(deadline => {
    console.log(`${deadline.title} due ${deadline.dueDate}`);
});
```

**Returns Array Element Structure**:
```javascript
{
    id: 'assign1',
    title: 'Chapter 1 Quiz',
    courseId: 'course1',
    courseName: 'JavaScript Basics',
    dueDate: Timestamp,
    daysUntil: 3,
    status: 'pending'
}
```

---

#### `getCourses(filter: Object = {})`
**Purpose**: Get list of courses with optional filtering

**Parameters**:
- `filter` - Optional filter object:
  - `category` - Filter by category
  - `instructor` - Filter by instructor
  - `level` - Filter by difficulty level

**Returns**: Promise<Array<Object>>

**Example**:
```javascript
const webCourses = await dataManager.getCourses({ 
    category: 'web-development' 
});
```

---

#### `getAssignments(filter: Object = {})`
**Purpose**: Get assignments with optional filtering

**Parameters**:
- `filter` - Optional filter object:
  - `courseId` - Filter by course
  - `status` - Filter by status (pending, graded, etc)
  - `dueAfter` - Filter after date

**Returns**: Promise<Array<Object>>

---

#### `getGrades()`
**Purpose**: Get user's grades across all courses

**Parameters**: None

**Returns**: Promise<Array<Object>>

**Example**:
```javascript
const grades = await dataManager.getGrades();
grades.forEach(grade => {
    console.log(`${grade.courseName}: ${grade.score}%`);
});
```

---

## 3. UI Management API (`uiManager.js`)

### Class: UIManager

#### `updateAuthUI(user: FirebaseUser, userData: Object)`
**Purpose**: Update UI based on authentication state

**Parameters**:
- `user` - Firebase User object (null if logged out)
- `userData` - User profile data

**Returns**: void

**Example**:
```javascript
uiManager.updateAuthUI(firebaseUser, userData);
// Shows dashboard if logged in, shows login form if logged out
```

---

#### `updateUserProfile(user: FirebaseUser, userData: Object)`
**Purpose**: Update user profile display

**Parameters**:
- `user` - Firebase User object
- `userData` - User profile data

**Returns**: void

**Example**:
```javascript
uiManager.updateUserProfile(firebaseUser, {
    firstName: 'John',
    lastName: 'Doe',
    avatar: 'https://...'
});
```

---

#### `showAuthModal(type: string)`
**Purpose**: Display authentication modal

**Parameters**:
- `type` - Modal type: "login", "register"

**Returns**: void

**Example**:
```javascript
uiManager.showAuthModal('register');
// Shows registration form
```

---

#### `hideAuthModal()`
**Purpose**: Close authentication modal

**Parameters**: None

**Returns**: void

**Example**:
```javascript
uiManager.hideAuthModal();
```

---

#### `switchTab(tabId: string)`
**Purpose**: Switch between dashboard tabs

**Parameters**:
- `tabId` - Tab ID: "dashboard", "courses", "assignments", "grades"

**Returns**: void

**Example**:
```javascript
uiManager.switchTab('assignments');
// Shows assignments tab
```

---

#### `showLoading()`
**Purpose**: Show loading spinner

**Parameters**: None

**Returns**: void

---

#### `hideLoading()`
**Purpose**: Hide loading spinner

**Parameters**: None

**Returns**: void

---

#### `toggleSidebar()`
**Purpose**: Toggle sidebar visibility on mobile

**Parameters**: None

**Returns**: void

---

## 4. Event Handler API (`eventHandler.js`)

### Class: EventHandler

#### `setupEventListeners()`
**Purpose**: Initialize all event listeners

**Parameters**: None

**Returns**: void

**Example**:
```javascript
eventHandler.setupEventListeners();
// Sets up all button clicks, form submissions, etc.
```

---

## 5. Utility Functions (`utils.js`)

#### `showMessage(message: string, type: string, duration: number = 3000)`
**Purpose**: Display toast notification

**Parameters**:
- `message` - Message text
- `type` - Message type: "success", "error", "info", "warning"
- `duration` - Display duration in milliseconds

**Returns**: void

**Example**:
```javascript
showMessage('Course enrolled successfully!', 'success');
showMessage('Please fill all fields', 'error');
```

---

#### `isValidEmail(email: string)`
**Purpose**: Validate email format

**Parameters**:
- `email` - Email address

**Returns**: boolean

**Example**:
```javascript
if (!isValidEmail(emailInput.value)) {
    showMessage('Invalid email format', 'error');
}
```

---

#### `getErrorMessage(errorCode: string)`
**Purpose**: Get user-friendly error message

**Parameters**:
- `errorCode` - Firebase error code

**Returns**: string - User-friendly error message

**Example**:
```javascript
try {
    await authManager.loginWithEmail(email, password);
} catch (error) {
    const message = getErrorMessage(error.code);
    showMessage(message, 'error');
}
```

**Supported Error Codes**:
- `auth/invalid-email` → "Invalid email format"
- `auth/user-not-found` → "Email not registered"
- `auth/wrong-password` → "Incorrect password"
- `auth/email-already-in-use` → "Email already registered"
- `auth/weak-password` → "Password too weak"
- `firestore/permission-denied` → "Access denied"
- And 20+ more Firebase errors

---

#### `formatDate(timestamp: Timestamp | Date)`
**Purpose**: Format timestamp to readable date

**Parameters**:
- `timestamp` - Firestore Timestamp or JavaScript Date

**Returns**: string - Formatted date (e.g., "Dec 15, 2025")

**Example**:
```javascript
const dueDate = formatDate(assignment.dueDate);
console.log(`Due: ${dueDate}`);
```

---

#### `daysUntil(targetDate: Timestamp | Date)`
**Purpose**: Calculate days until a date

**Parameters**:
- `targetDate` - Target date

**Returns**: number - Days remaining (negative if past due)

**Example**:
```javascript
const daysLeft = daysUntil(assignment.dueDate);
if (daysLeft < 0) {
    console.log('Assignment is overdue');
} else if (daysLeft === 0) {
    console.log('Due today');
} else {
    console.log(`${daysLeft} days left`);
}
```

---

#### `getServerTimestamp()`
**Purpose**: Get current server timestamp

**Parameters**: None

**Returns**: Timestamp - Firebase server timestamp

**Example**:
```javascript
const createdAt = getServerTimestamp();
await dataManager.saveUserData(userId, { createdAt });
```

---

## Firestore Database Schema

### Collections and Documents

#### `users` Collection
```
users/{uid}
├── uid: string
├── email: string
├── firstName: string
├── lastName: string
├── role: "student" | "instructor" | "admin"
├── avatar: string (URL)
├── institution: string
├── enrolledCourses: array
├── createdAt: timestamp
├── lastLogin: timestamp
└── settings: object
    ├── notifications: boolean
    ├── emailNotifications: boolean
    └── theme: "light" | "dark"
```

#### `courses` Collection
```
courses/{courseId}
├── id: string
├── title: string
├── description: string
├── category: string
├── level: "beginner" | "intermediate" | "advanced"
├── instructor: string (user ID)
├── instructorName: string
├── imageUrl: string
├── duration: number (hours)
├── students: array
├── createdAt: timestamp
├── updatedAt: timestamp
└── status: "active" | "archived"
```

#### `assignments` Collection
```
assignments/{assignmentId}
├── id: string
├── courseId: string
├── title: string
├── description: string
├── dueDate: timestamp
├── createdBy: string (instructor ID)
├── createdAt: timestamp
├── maxScore: number (100)
└── submissions/{studentId}
    ├── studentId: string
    ├── status: "submitted" | "graded" | "pending"
    ├── submittedAt: timestamp
    ├── score: number
    └── feedback: string
```

#### `grades` Collection
```
grades/{gradeId}
├── id: string
├── studentId: string
├── courseId: string
├── assignment: string (assignment title)
├── score: number
├── maxScore: number
├── percentage: number
├── feedback: string
├── gradedAt: timestamp
└── gradedBy: string (instructor ID)
```

---

## Rate Limiting

| Operation | Limit | Period |
|-----------|-------|--------|
| Login attempts | 10 | 10 minutes |
| API calls | 1000 | 1 minute |
| File uploads | 100 MB | Per request |
| Storage | 5 GB | Total |

---

## Error Handling

All API methods throw Firebase errors. Use try-catch:

```javascript
try {
    const result = await apiMethod(params);
} catch (error) {
    const userMessage = getErrorMessage(error.code);
    showMessage(userMessage, 'error');
    console.error('API Error:', error);
}
```

---

## Examples

### Complete Login Flow
```javascript
try {
    uiManager.showLoading();
    const { user, userData } = await authManager.loginWithEmail(
        email, 
        password
    );
    uiManager.updateAuthUI(user, userData);
    showMessage('Logged in successfully!', 'success');
} catch (error) {
    showMessage(getErrorMessage(error.code), 'error');
} finally {
    uiManager.hideLoading();
}
```

### Complete Course Enrollment
```javascript
try {
    uiManager.showLoading();
    const currentUser = auth.currentUser;
    
    await dataManager.enrollCourse(currentUser.uid, {
        id: courseId,
        title: courseName,
        instructor: instructorName
    });
    
    showMessage(`Enrolled in ${courseName}!`, 'success');
    
    // Refresh dashboard
    const stats = await dataManager.getDashboardStats();
    updateDashboardUI(stats);
} catch (error) {
    showMessage(getErrorMessage(error.code), 'error');
} finally {
    uiManager.hideLoading();
}
```

---

## Support

For issues or questions:
1. Check browser console (F12) for errors
2. Review Cloud Logging in Firebase Console
3. Check Firestore rules for permission issues
4. Verify user authentication status
5. Check network tab for failed requests

---

**API Version**: 1.0.0
**Last Updated**: December 15, 2025
