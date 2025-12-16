# EduLMS Troubleshooting Guide

## Common Issues & Solutions

---

## Authentication Issues

### Problem: "User not found" when logging in
**Symptoms**: Login fails with "User not found" error

**Root Causes**:
1. Email not registered in Firebase
2. User deleted from Authentication
3. Project switched between Firebase projects

**Solutions**:
```javascript
// 1. Check if user exists
firebase.auth().fetchSignInMethodsForEmail(email)
    .then(methods => {
        if (methods.length === 0) {
            console.log('User not registered');
        }
    });

// 2. Verify correct Firebase project
console.log(firebase.app().options.projectId);

// 3. Re-register user
// Use the registration form to create account
```

---

### Problem: Google login popup doesn't open
**Symptoms**: Google login button clicked but nothing happens

**Root Causes**:
1. Google OAuth not enabled in Firebase
2. Domain not in authorized list
3. Pop-up blocked by browser
4. CORS issues

**Solutions**:
```javascript
// 1. Verify Google provider is initialized
if (!googleProvider) {
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ 'prompt': 'select_account' });
}

// 2. Check browser console for errors
// Press F12 and look at Console tab

// 3. Add domain to authorized list:
// Firebase Console > Authentication > Settings > Authorized Domains

// 4. Allow pop-ups in browser settings

// 5. Check CORS in Network tab
// Should not see CORS errors
```

---

### Problem: Password reset email not received
**Symptoms**: User requests password reset but email never arrives

**Root Causes**:
1. Email in spam folder
2. Email not configured in Firebase
3. Sending quota exceeded
4. Incorrect email address

**Solutions**:
```javascript
// 1. Check spam/junk folder

// 2. Firebase Console > Authentication > Templates
//    Verify password reset email is configured

// 3. Check sending quota:
// Go to Firebase Console > Cloud Functions > Usage

// 4. Send password reset again:
firebase.auth().sendPasswordResetEmail(email)
    .then(() => console.log('Email sent'))
    .catch(error => console.log('Failed:', error.message));

// 5. Verify user entered correct email
```

---

## Database Issues

### Problem: "Permission denied" error when accessing database
**Symptoms**: Firestore operations fail with permission error

**Root Causes**:
1. Security rules deny access
2. User not authenticated
3. Wrong user role
4. Collection doesn't exist

**Solutions**:
```javascript
// 1. Check if user is authenticated
firebase.auth().currentUser
    ? console.log('User is authenticated')
    : console.log('User not authenticated');

// 2. Review Firestore security rules
// Firebase Console > Firestore > Rules
// Ensure rules allow user's operation

// 3. Check user role
const userData = await db.collection('users')
    .doc(userId)
    .get();
console.log('User role:', userData.data().role);

// 4. Create collection if missing:
// Firebase Console > Firestore > Collections > Create
```

**Example Firestore Rule Fix**:
```javascript
// Wrong (too restrictive)
match /{document=**} {
    allow read, write: if false;
}

// Correct (allows authenticated reads)
match /courses/{document=**} {
    allow read: if request.auth != null;
}
```

---

### Problem: Data not saving to Firestore
**Symptoms**: No errors, but data doesn't appear in Firestore

**Root Causes**:
1. Function returns before data is saved
2. Promise not awaited
3. Wrong collection path
4. Batch write limit exceeded

**Solutions**:
```javascript
// 1. Always await writes
// Wrong:
db.collection('users').doc(uid).set(data);
console.log('Saved'); // Logs before actually saving!

// Correct:
await db.collection('users').doc(uid).set(data);
console.log('Saved'); // Logs after saving

// 2. Check collection path
const docRef = db.collection('users').doc(userId);
const exists = (await docRef.get()).exists;
console.log('Document exists:', exists);

// 3. Verify data structure
const userData = {
    email: 'user@example.com',
    firstName: 'John',
    // All required fields
};

// 4. Check batch write limits
// Max 500 writes per batch
if (updates.length > 500) {
    // Split into multiple batches
}
```

---

### Problem: Queries too slow
**Symptoms**: Firestore queries take several seconds

**Root Causes**:
1. Missing indexes
2. Inefficient query structure
3. Large result set
4. No pagination

**Solutions**:
```javascript
// 1. Create composite indexes
// Firebase Console > Firestore > Indexes
// Add index for frequently used query combinations

// 2. Use more specific queries
// Slow - reads all courses
const courses = await db.collection('courses').get();

// Fast - reads only active courses
const courses = await db.collection('courses')
    .where('status', '==', 'active')
    .get();

// 3. Limit results
const courses = await db.collection('courses')
    .limit(10)
    .get();

// 4. Implement pagination
const pageSize = 10;
let query = db.collection('courses').limit(pageSize + 1);

const docs = await query.get();
const hasMore = docs.size > pageSize;

// Next page
const lastDoc = docs.docs[pageSize - 1];
query = db.collection('courses')
    .startAfter(lastDoc)
    .limit(pageSize + 1);
```

---

## UI/Frontend Issues

### Problem: Page doesn't load or shows blank screen
**Symptoms**: Browser shows blank page, no error messages

**Root Causes**:
1. JavaScript errors preventing initialization
2. HTML file not found
3. CSS not loading
4. Firebase SDK not loading

**Solutions**:
```javascript
// 1. Check browser console for errors
// Press F12 > Console tab
// Look for red error messages

// 2. Check Network tab
// Look for failed requests (404, 500 status)

// 3. Verify files exist
// Should have:
// - index.html
// - style.css
// - firebase-config.js
// - js/app.js and other modules

// 4. Check Firebase SDK loaded
console.log('Firebase version:', firebase.SDK_VERSION);

// 5. Add initialization debugging
window.addEventListener('load', () => {
    console.log('Page loaded');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM ready');
    });
});
```

---

### Problem: Mobile layout broken
**Symptoms**: Page doesn't look right on phone, text too small/big

**Root Causes**:
1. Viewport meta tag missing
2. CSS not responsive
3. JavaScript breaking layout
4. Images too large

**Solutions**:
```html
<!-- Check index.html has viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- Check Tailwind responsive classes -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
    <!-- 1 column on mobile, 2 on tablet, 3 on desktop -->
</div>

<!-- Check JavaScript doesn't hide elements -->
<!-- In browser DevTools, check:
     - Computed styles
     - Display property
     - Visibility property
-->
```

---

### Problem: Button click does nothing
**Symptoms**: Click button but nothing happens, no error messages

**Root Causes**:
1. Event listener not attached
2. Element ID doesn't match
3. Function doesn't exist
4. Event preventDefault() blocking action

**Solutions**:
```javascript
// 1. Verify element exists
const button = document.getElementById('loginBtn');
if (!button) {
    console.log('Button not found! Check HTML id');
}

// 2. Verify event listener attached
// In browser DevTools > Elements
// Select element > Event Listeners panel
// Should see click event listed

// 3. Check element visible and clickable
console.log('Button visible:', button.offsetHeight > 0);
console.log('Button position:', button.getBoundingClientRect());

// 4. Test click directly
button.click();
console.log('Manual click executed');

// 5. Debug event handler
button.addEventListener('click', (e) => {
    console.log('Click detected');
    console.log('Event target:', e.target);
    console.log('Event prevented:', e.defaultPrevented);
});
```

---

### Problem: Modal won't close
**Symptoms**: Modal appears but can't close it

**Root Causes**:
1. Close button not working
2. CSS hiding close button
3. Overlay click not closing
4. Modal z-index issue

**Solutions**:
```javascript
// 1. Force close modal
const modal = document.getElementById('authModal');
modal.style.display = 'none';
// Or remove class
modal.classList.remove('show', 'active');

// 2. Check close button
const closeBtn = document.querySelector('.modal-close');
console.log('Close button exists:', !!closeBtn);

// 3. Re-attach event listeners
closeBtn?.addEventListener('click', () => {
    modal.style.display = 'none';
});

// 4. Allow overlay click to close
const overlay = document.querySelector('.modal-overlay');
overlay?.addEventListener('click', () => {
    modal.style.display = 'none';
});

// 5. Check z-index
console.log('Modal z-index:', 
    getComputedStyle(modal).zIndex);
```

---

## Deployment Issues

### Problem: Firebase deployment fails
**Symptoms**: `firebase deploy` command errors out

**Root Causes**:
1. Not logged in to Firebase
2. Wrong project selected
3. Public folder missing files
4. Invalid firebase.json

**Solutions**:
```bash
# 1. Check login status
firebase auth:list

# 2. Login again
firebase login

# 3. Select correct project
firebase projects:list
firebase use <project-id>

# 4. Verify public folder
ls -la public/
# Should have: index.html, style.css, js/ folder

# 5. Validate firebase.json
firebase projects:describe

# 6. Test locally first
firebase serve

# 7. Deploy specific parts
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

---

### Problem: Site shows old version after deployment
**Symptoms**: Deployed new code but browser shows old version

**Root Causes**:
1. Browser cache
2. Browser service worker
3. CDN cache
4. Deployment didn't complete

**Solutions**:
```javascript
// 1. Hard refresh browser
// Chrome: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
// Firefox: Ctrl+F5

// 2. Clear browser cache
// Chrome > Settings > Privacy > Clear browsing data
// Select "Cached images and files"

// 3. Unregister service worker
navigator.serviceWorker.getRegistrations()
    .then(registrations => {
        registrations.forEach(reg => reg.unregister());
    });

// 4. Check deployment completed
firebase deploy --debug
# Look for "Deploy complete" message

// 5. Verify new version on CDN
curl -I https://your-project.web.app
# Check Cache-Control header
```

---

### Problem: Firebase Hosting URL doesn't work
**Symptoms**: Can't access deployed site

**Root Causes**:
1. Deployment failed silently
2. Wrong URL
3. Custom domain not configured
4. Firewall blocking access

**Solutions**:
```bash
# 1. Check deployment status
firebase hosting:sites:list

# 2. Get correct URL
firebase hosting:sites:list
# Look for "default" site

# 3. Test connectivity
curl https://your-project-id.web.app

# 4. Check if project exists
firebase projects:describe

# 5. Re-deploy
firebase deploy --debug

# 6. Check server logs
gcloud functions:log
gcloud logging read "resource.labels.function_name=your-function"
```

---

## Performance Issues

### Problem: Page loads slowly
**Symptoms**: Takes several seconds to see page content

**Root Causes**:
1. Large JavaScript files
2. Slow Firebase initialization
3. Inefficient database queries
4. Unoptimized images

**Solutions**:
```javascript
// 1. Check what's slow with DevTools
// Open DevTools > Performance tab
// Record page load
// Analyze timeline

// 2. Lazy load modules
// Instead of loading all at once:
// Load only needed modules on page start

// 3. Optimize database queries
// Add pagination instead of loading all data
const courses = await db.collection('courses')
    .limit(10)
    .get();

// 4. Optimize images
// Use smaller image sizes
// Use WebP format when possible
// Lazy load images

// 5. Enable caching headers
// In firebase.json:
"headers": [{
    "source": "/js/**",
    "headers": [{
        "key": "Cache-Control",
        "value": "public, max-age=3600"
    }]
}]
```

---

## Error Messages Reference

| Error Code | Meaning | Solution |
|-----------|---------|----------|
| `auth/invalid-email` | Email format wrong | Check email syntax |
| `auth/user-not-found` | No account with this email | Register new account |
| `auth/wrong-password` | Incorrect password | Re-enter password correctly |
| `auth/too-many-requests` | Too many failed attempts | Wait 15 minutes, try again |
| `permission-denied` | Access denied | Check Firestore rules |
| `not-found` | Document/collection doesn't exist | Create document first |
| `unavailable` | Service temporarily down | Wait and retry |
| `network-error` | Can't reach server | Check internet connection |
| `invalid-argument` | Wrong data type | Check data matches schema |
| `unauthenticated` | Not logged in | Login first |

---

## Debug Commands

### Browser Console Debugging

```javascript
// Check authentication status
firebase.auth().currentUser

// Get user data
const user = firebase.auth().currentUser;
const userData = await firebase.firestore()
    .collection('users')
    .doc(user.uid)
    .get();
console.log(userData.data());

// List all Firestore documents
const snapshot = await firebase.firestore()
    .collection('users')
    .get();
snapshot.docs.forEach(doc => {
    console.log(doc.id, doc.data());
});

// Test database write
await firebase.firestore()
    .collection('test')
    .add({ test: 'data' });

// Check Firebase SDK version
console.log(firebase.SDK_VERSION);

// Enable debug logging
firebase.database.enableLogging(true);
```

---

## Contact Support

If you can't fix the issue:

1. **Check Firebase Status**: https://status.firebase.google.com/
2. **Firebase Documentation**: https://firebase.google.com/docs
3. **Stack Overflow**: Tag `firebase`
4. **Firebase Community**: https://firebase.community
5. **GitHub Issues**: Report bugs with project code

---

## Support Information to Provide

When asking for help, include:
1. Full error message from browser console
2. Browser type and version
3. Steps to reproduce
4. Screenshots
5. Firebase project ID
6. Code snippet causing issue

---

**Last Updated**: December 15, 2025
**Version**: 1.0.0
