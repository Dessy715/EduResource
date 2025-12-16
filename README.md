# EduLMS - Student Learning Management System

A modern, modularized web application for managing online courses, assignments, and grades.

## 🚀 Features

- ✅ **User Authentication** - Email/Password & Google OAuth
- ✅ **Role-Based Access** - Student, Instructor, Admin roles
- ✅ **Course Management** - Enroll, view progress, access materials
- ✅ **Assignment Tracking** - Submit, grade, track deadlines
- ✅ **Grade Management** - View grades and performance analytics
- ✅ **Responsive Design** - Mobile-friendly interface
- ✅ **Real-time Data** - Firebase Firestore integration
- ✅ **Modular Architecture** - Clean, maintainable code

## 📋 Prerequisites

- Node.js 14+ (for Firebase CLI)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Firebase account with Firestore enabled
- Git for version control

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd EduLMS
```

### 2. Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 3. Login to Firebase
```bash
firebase login
```

### 4. Initialize Firebase (if not already done)
```bash
firebase init
```

### 5. Update Firebase Configuration
Edit `public/firebase-config.js` with your Firebase credentials:
```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID"
};
```

## 🏃 Running Locally

### Option 1: Python HTTP Server (Recommended)
```bash
cd public
python -m http.server 8000
```
Then open http://localhost:8000

### Option 2: Node.js http-server
```bash
npx http-server public -p 8000
```

### Option 3: Firebase Emulator (for testing)
```bash
firebase emulators:start
```

## 📦 Project Structure

```
EduLMS/
├── public/                    # Frontend files
│   ├── index.html            # Main HTML
│   ├── dashboard.html        # Student dashboard
│   ├── course.html           # Course view
│   ├── style.css             # Global styles
│   ├── firebase-config.js    # Firebase setup
│   ├── app.js                # Old app file (legacy)
│   ├── dashboard.js          # Old dashboard file (legacy)
│   └── js/                   # Modularized JavaScript
│       ├── app.js            # Main orchestrator
│       ├── config.js         # Configuration
│       ├── utils.js          # Utilities
│       ├── authManager.js    # Authentication
│       ├── dataManager.js    # Data operations
│       ├── uiManager.js      # UI management
│       ├── eventHandler.js   # Event listeners
│       └── README.md         # Module documentation
├── firebase.json             # Firebase config
├── .firebaserc              # Firebase project ID
├── .gitignore               # Git ignore rules
└── REFACTORING_SUMMARY.md   # Refactoring details
```

## 🔐 Firestore Security Rules

Deploy security rules to protect your data:

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      allow read: if request.auth.uid != null && 
                     get(/databases/$(database)/documents/users/$(userId)).data.role in ['admin', 'instructor'];
    }
    
    // Courses collection
    match /courses/{courseId} {
      allow read: if request.auth.uid != null;
      allow create, update, delete: if request.auth.uid != null && 
                                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'instructor';
    }
    
    // Assignments collection
    match /assignments/{assignmentId} {
      allow read: if request.auth.uid != null;
      allow create, update, delete: if request.auth.uid != null && 
                                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'instructor';
    }
  }
}
```

## 🗄️ Firestore Database Schema

### Users Collection
```json
{
  "uid": "string",
  "name": "string",
  "email": "string",
  "photoURL": "string",
  "role": "student|instructor|admin",
  "major": "string",
  "createdAt": "timestamp",
  "lastLogin": "timestamp",
  "courses": ["courseId1", "courseId2"],
  "assignments": ["assignmentId1", "assignmentId2"],
  "studyHours": 0,
  "studentData": {
    "enrollmentDate": "timestamp",
    "year": 1,
    "gpa": 0.0,
    "enrolledCourses": ["courseId"],
    "completedCourses": ["courseId"]
  }
}
```

### Courses Collection
```json
{
  "title": "string",
  "code": "string",
  "description": "string",
  "instructor": "string",
  "icon": "string",
  "category": "string",
  "rating": 4.5,
  "students": 45,
  "modules": 8,
  "createdAt": "timestamp",
  "createdBy": "userId"
}
```

### Assignments Collection
```json
{
  "title": "string",
  "course": "string",
  "description": "string",
  "dueDate": "timestamp",
  "completed": false,
  "grade": null,
  "submissions": ["submissionId"]
}
```

## 🚀 Deployment

### Deploy to Firebase Hosting

```bash
firebase deploy
```

This will deploy:
- Your frontend files to Firebase Hosting
- Firestore security rules
- Any Cloud Functions (if configured)

Your app will be live at: `https://<your-project-id>.web.app`

### Custom Domain (Optional)
1. Go to Firebase Console
2. Hosting > Domain > Add Custom Domain
3. Follow the DNS setup instructions

## 🔧 Configuration Files

### firebase.json
Configures Firebase Hosting and deployment:
```json
{
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### .firebaserc
Stores Firebase project configuration:
```json
{
  "projects": {
    "default": "learning-mgt-sys-ec11d"
  }
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration with email/password
- [ ] User login with email/password
- [ ] Google OAuth login
- [ ] Course enrollment
- [ ] Assignment submission
- [ ] Grade viewing
- [ ] Responsive design on mobile
- [ ] Logout functionality

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 📱 Mobile Responsiveness

The application is fully responsive with:
- Mobile-first design
- Touch-friendly buttons
- Optimized layout for small screens
- Collapsible sidebar navigation
- Bottom tab navigation for mobile

## 🎨 Styling

Uses **Tailwind CSS** for styling:
- Custom color scheme (primary, secondary, accent)
- Responsive grid system
- Smooth animations
- Dark mode support (planned)

## 🔒 Security Best Practices

- ✅ Firebase Authentication for user management
- ✅ Firestore security rules for data access control
- ✅ HTTPS encryption (Firebase Hosting)
- ✅ Environment variables for sensitive data
- ✅ Input validation on all forms
- ✅ XSS protection with innerHTML escaping

## 📊 Performance Optimization

- ✅ Modular code splitting
- ✅ Lazy loading of user data
- ✅ Efficient DOM queries
- ✅ CSS minification
- ✅ Firebase CDN for assets

## 🐛 Troubleshooting

### Firebase Not Initializing
1. Check API key in `firebase-config.js`
2. Verify Firebase project is active
3. Check browser console for errors

### User Data Not Loading
1. Check Firestore security rules
2. Verify user document exists
3. Check network connectivity

### UI Not Updating
1. Verify DOM element IDs match HTML
2. Check JavaScript console for errors
3. Clear browser cache

## 📚 Documentation

- [Refactoring Summary](REFACTORING_SUMMARY.md) - Code refactoring details
- [Module Documentation](public/js/README.md) - JavaScript modules guide
- [Firebase Docs](https://firebase.google.com/docs) - Official Firebase documentation

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Firebase documentation
3. Check browser console for errors
4. Create an issue in the repository

## 🎯 Roadmap

- [ ] PWA support with offline access
- [ ] Video content hosting
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Payment integration
- [ ] Mobile app (React Native)
- [ ] Live chat support
- [ ] Peer-to-peer study groups

## 👥 Team

Created with ❤️ by the EduLMS Team

---

**Last Updated:** December 15, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
