# EduLearn - Modularized JavaScript Architecture

## Project Structure

```
public/
├── index.html           # Main HTML file
├── style.css           # Global styles
├── js/
│   ├── app.js         # Main application entry point
│   ├── config.js      # Configuration and Firebase setup
│   ├── utils.js       # Utility functions and helpers
│   ├── authManager.js # Authentication module
│   ├── dataManager.js # Data management and Firestore operations
│   ├── uiManager.js   # UI updates and interactions
│   └── eventHandler.js # Event listeners and handlers
```

## Module Descriptions

### 1. **app.js** (Main Entry Point)
- Orchestrates all modules
- Initializes the application on DOM load
- Contains main application class `EduLearnApp`
- Manages dashboard updates
- Handles course display

**Key Classes:**
- `EduLearnApp` - Main application controller
- `AuthManager` - Authentication operations
- `DataManager` - Data operations
- `UIManager` - UI management
- `EventHandler` - Event listeners

### 2. **config.js** (Configuration)
- Firebase configuration constants
- Firebase initialization function
- Application configuration settings

**Exports:**
- `APP_CONFIG` - Configuration object
- `initializeFirebase()` - Firebase setup function
- `auth` - Firebase Auth instance
- `db` - Firestore instance

### 3. **utils.js** (Utilities)
- Common helper functions
- Message notifications
- Email validation
- Error message mapping
- Date formatting utilities

**Exports:**
- `showMessage()` - Display toast notifications
- `getServerTimestamp()` - Firebase server timestamp
- `isValidEmail()` - Email validation
- `formatDate()` - Date formatting
- `daysUntil()` - Calculate days until date
- `getErrorMessage()` - Firebase error handling

### 4. **authManager.js** (Authentication)
- Email/Password login
- Email/Password registration
- Google authentication
- User document creation
- Session management

**Class: AuthManager**
- `checkAuthState(callback)` - Listen for auth changes
- `loginWithEmail(email, password)` - Email login
- `registerWithEmail(email, password, confirmPassword, userData)` - Registration
- `loginWithGoogle()` - Google sign-in
- `createUserDocument(user, userData)` - Create Firestore user doc
- `logout()` - Sign out user

### 5. **dataManager.js** (Data Management)
- User data loading/saving
- Course enrollment
- Assignment management
- Dashboard statistics
- Grades management

**Class: DataManager**
- `loadUserData(userId)` - Load user from Firestore
- `saveUserData(userId, userData)` - Save user to Firestore
- `enrollCourse(userId, course)` - Enroll in course
- `addAssignment(userId, assignment)` - Add assignment
- `updateAssignment(userId, assignmentId, updates)` - Update assignment
- `getDashboardStats()` - Get dashboard statistics
- `getUpcomingDeadlines(limit)` - Get upcoming deadlines
- `getCourses()` - Get user's courses
- `getAssignments(filter)` - Get user's assignments
- `getGrades()` - Get user's grades

### 6. **uiManager.js** (UI Management)
- Authentication UI updates
- Modal management
- Tab navigation
- Responsive layout handling
- Loading states
- Sidebar management

**Class: UIManager**
- `updateAuthUI(user, userData)` - Update login/logout UI
- `updateUserProfile(user, userData)` - Update profile display
- `showAuthModal(type)` - Show auth modal
- `hideAuthModal()` - Hide auth modal
- `initializeRoleSelection()` - Setup role selection
- `showLoading(text)` - Show loading overlay
- `hideLoading()` - Hide loading overlay
- `switchTab(tabId)` - Switch dashboard tab
- `toggleSidebar()` - Toggle sidebar
- `closeSidebarOnMobile()` - Close sidebar on mobile
- `updateResponsiveLayout(isLoggedIn)` - Update layout for responsiveness
- `setButtonLoading(buttonId, isLoading, loadingText)` - Set button state

### 7. **eventHandler.js** (Event Management)
- All event listener setup
- Form submissions
- Button clicks
- Modal interactions
- Navigation events
- Responsive event handling

**Class: EventHandler**
- `setupEventListeners()` - Initialize all listeners
- `setupAuthButtons()` - Auth button setup
- `setupModalEvents()` - Modal event setup
- `setupFormEvents()` - Form event setup
- `setupNavigationEvents()` - Navigation setup
- `setupResponsiveEvents()` - Responsive event setup
- `handleLogin(e)` - Email login handler
- `handleRegister(e)` - Registration handler
- `handleGoogleLogin()` - Google login handler
- `handleLogout()` - Logout handler
- `handleJoinCourse()` - Course enrollment handler

## Authentication Flow

1. User clicks login/register button
2. `EventHandler` triggers `UIManager.showAuthModal()`
3. User fills form and submits
4. `EventHandler.handleLogin/Register()` calls `AuthManager` methods
5. `AuthManager` creates Firebase auth and user document
6. `DataManager` loads user data from Firestore
7. `UIManager` updates UI to show dashboard
8. `EventHandler` sets up all event listeners for dashboard

## Data Flow

```
User Input
    ↓
EventHandler (captures events)
    ↓
AuthManager (auth operations) / DataManager (data operations)
    ↓
Firebase (Auth & Firestore)
    ↓
UIManager (updates UI)
    ↓
User sees changes
```

## Initialization Sequence

1. HTML loads Firebase SDK
2. HTML loads `app.js`
3. DOM loads, `app.js` initializes
4. `EduLearnApp` instance created
5. `EduLearnApp.initialize()` called:
   - Firebase initialized
   - Managers created
   - Event listeners setup
   - Auth state listener registered
6. When user logs in:
   - User data loaded
   - UI updated
   - Dashboard displayed

## Usage Example

```javascript
// The app initializes automatically when DOM loads
// Access global instance for debugging
const app = window.EduLearnAppInstance;

// Update dashboard
app.updateDashboard();

// Display courses
app.displayCourses(statsObject);
```

## Firebase Firestore Schema

### Users Collection
```javascript
{
  uid: string,
  name: string,
  email: string,
  photoURL: string,
  role: 'student' | 'instructor' | 'admin',
  major: string,
  createdAt: timestamp,
  lastLogin: timestamp,
  courses: [courseObjects],
  assignments: [assignmentObjects],
  studyHours: number,
  studentData?: {
    enrollmentDate: timestamp,
    year: number,
    gpa: number,
    enrolledCourses: [courseIds],
    completedCourses: [courseIds]
  },
  instructorData?: {
    department: string,
    createdCourses: [courseIds]
  }
}
```

## Environment Variables

All configuration is in `app.js`. Update Firebase config:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID"
};
```

## Features Implemented

✅ Email/Password Authentication
✅ Google OAuth
✅ User Profiles
✅ Course Enrollment
✅ Dashboard Statistics
✅ Responsive Design
✅ Role-based UI
✅ Assignment Tracking
✅ Grade Management
✅ Mobile Navigation
✅ Error Handling
✅ Loading States

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Dependencies

- Firebase v9+ (loaded from CDN)
- Tailwind CSS (loaded from CDN)
- Font Awesome (loaded from CDN)

## Performance Optimizations

- Lazy loading of user data
- Efficient DOM queries
- Event delegation for dynamic elements
- Responsive image handling
- CSS animations for smooth UX

## Future Improvements

- [ ] Service Worker for offline support
- [ ] IndexedDB caching
- [ ] Progressive Web App (PWA)
- [ ] Real-time notifications
- [ ] Video content support
- [ ] Advanced analytics
- [ ] Payment integration

## Troubleshooting

**Issue:** Firebase not initializing
- Check API key in `app.js`
- Verify Firebase project settings
- Check browser console for errors

**Issue:** User data not loading
- Check Firestore rules allow read access
- Verify user document exists in collection
- Check network connectivity

**Issue:** UI not updating
- Verify DOM element IDs match HTML
- Check browser console for JavaScript errors
- Ensure event listeners are attached

## Support

For issues or questions, check the browser console for detailed error messages.
