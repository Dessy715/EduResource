# EduLMS Environment Configuration

## Development Environment Setup

### 1. Node.js & NPM Setup

```bash
# Check versions
node --version  # Should be v14.0.0 or higher
npm --version   # Should be v6.0.0 or higher

# Install dependencies (if needed)
npm install -g firebase-tools
npm install -g http-server
```

### 2. Firebase Project Variables

Create a `.env` file in project root (for local development):

```env
# Firebase Configuration
FIREBASE_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxx
FIREBASE_AUTH_DOMAIN=edulms-xxxxx.firebaseapp.com
FIREBASE_PROJECT_ID=edulms-xxxxx
FIREBASE_STORAGE_BUCKET=edulms-xxxxx.appspot.com
FIREBASE_MESSAGING_SENDER_ID=xxxxxxxxxx

# Application Configuration
APP_ENV=development
APP_VERSION=1.0.0
APP_NAME=EduLMS

# Feature Flags
ENABLE_GOOGLE_OAUTH=true
ENABLE_EMAIL_AUTH=true
ENABLE_ANALYTICS=true
ENABLE_CRASH_REPORTING=true

# API Configuration
API_TIMEOUT=30000
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY=1000

# Cache Configuration
CACHE_ENABLED=true
CACHE_EXPIRY=3600000  # 1 hour in milliseconds

# Logging Configuration
LOG_LEVEL=info  # debug, info, warn, error
LOG_TO_CONSOLE=true
LOG_TO_FILE=false
```

### 3. Firebase Configuration File

File: `public/firebase-config.js`

```javascript
// This file is created during Firebase initialization
// Update with your project credentials

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// DO NOT SHARE API KEY - it's public
// These credentials are safe to expose as they're for web apps
// Real security comes from Firestore rules and Auth rules
```

### 4. Local Development Configuration

File: `.firebaserc`

```json
{
  "projects": {
    "default": "edulms-dev",
    "production": "edulms-prod"
  },
  "targets": {
    "edulms-dev": {
      "hosting": ["edulms-dev"]
    },
    "edulms-prod": {
      "hosting": ["edulms-prod"]
    }
  }
}
```

### 5. Firebase Hosting Configuration

File: `firebase.json`

```json
{
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      },
      {
        "source": "/js/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      },
      {
        "source": "/css/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      }
    ]
  }
}
```

---

## Development Server Setup

### Option 1: Firebase Emulator (Recommended)

```bash
# Install emulator
npm install -g firebase-tools

# Start emulator
firebase emulators:start

# Access at http://localhost:4400
```

**Emulator includes**:
- Firestore database
- Firebase Authentication
- Firebase Hosting
- Firebase Functions (if configured)

### Option 2: Python HTTP Server

```bash
# From project root
python -m http.server 8000

# Access at http://localhost:8000
```

### Option 3: Node.js HTTP Server

```bash
# Install globally
npm install -g http-server

# Run from project root
http-server -p 8000

# Access at http://localhost:8000
```

---

## Environment Variables by Stage

### Development

```env
NODE_ENV=development
FIREBASE_PROJECT_ID=edulms-dev
DEBUG=true
API_TIMEOUT=30000
CACHE_ENABLED=false
LOG_LEVEL=debug
```

### Staging

```env
NODE_ENV=staging
FIREBASE_PROJECT_ID=edulms-staging
DEBUG=false
API_TIMEOUT=10000
CACHE_ENABLED=true
LOG_LEVEL=info
```

### Production

```env
NODE_ENV=production
FIREBASE_PROJECT_ID=edulms-prod
DEBUG=false
API_TIMEOUT=5000
CACHE_ENABLED=true
LOG_LEVEL=warn
```

---

## Feature Flags

Toggle features without redeploying:

```javascript
// In app.js
const FEATURE_FLAGS = {
    ENABLE_GOOGLE_OAUTH: true,
    ENABLE_EMAIL_AUTH: true,
    ENABLE_ANALYTICS: true,
    ENABLE_ADVANCED_GRADING: false,
    ENABLE_MESSAGING: false,
    ENABLE_NOTIFICATIONS: true,
    MAINTENANCE_MODE: false
};

// Use in code
if (FEATURE_FLAGS.ENABLE_GOOGLE_OAUTH) {
    // Show Google login button
}
```

---

## Database Configuration

### Firestore Regions

Choose one based on user location:

```
us-central1       - United States (default)
europe-west1      - Belgium (EU)
asia-northeast1   - Tokyo, Japan
australia-southeast1 - Sydney, Australia
```

### Firestore Settings

```javascript
// In firebase-config.js
firebase.firestore().settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED,
    ignoreUndefinedProperties: true
});
```

---

## API Rate Limits

Configure rate limiting:

```javascript
// src/api/rateLimiter.js
const RATE_LIMITS = {
    LOGIN: {
        maxAttempts: 5,
        windowMs: 15 * 60 * 1000  // 15 minutes
    },
    API_CALL: {
        maxRequests: 100,
        windowMs: 60 * 1000  // 1 minute
    },
    FILE_UPLOAD: {
        maxSize: 100 * 1024 * 1024,  // 100 MB
        maxAttempts: 3
    }
};
```

---

## Logging Configuration

### Log Levels

```
debug   - Detailed debug information
info    - General informational messages
warn    - Warning messages for potential issues
error   - Error messages for serious problems
```

### Log Output

```javascript
// Configure where logs go
const LOG_CONFIG = {
    console: true,      // Log to browser console
    file: false,        // Log to file (server-side)
    cloud: true,        // Log to Cloud Logging
    service: 'analytics'  // Google Analytics
};
```

---

## Security Configuration

### CORS Policy

```javascript
// Allowed origins for API calls
const CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://edulms-dev.web.app',
    'https://edulms-prod.web.app',
    'https://your-custom-domain.com'
];
```

### CSP Headers

```javascript
// Content Security Policy in firebase.json
"headers": [
    {
        "key": "Content-Security-Policy",
        "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com; style-src 'self' 'unsafe-inline'"
    }
]
```

### API Key Restrictions

In Firebase Console > Project Settings:

1. **HTTP referrer restrictions**:
   - localhost:*
   - *.web.app
   - your-domain.com

2. **API restrictions**:
   - Cloud Firestore API
   - Firebase Authentication API

---

## Performance Tuning

### Caching Strategy

```javascript
// Cache configuration
const CACHE_CONFIG = {
    USER_DATA: {
        ttl: 5 * 60 * 1000,      // 5 minutes
        enabled: true
    },
    COURSES: {
        ttl: 30 * 60 * 1000,     // 30 minutes
        enabled: true
    },
    ASSIGNMENTS: {
        ttl: 10 * 60 * 1000,     // 10 minutes
        enabled: true
    }
};
```

### Database Query Optimization

```javascript
// Create indexes for frequently used queries
// In Firestore Console > Indexes

// Example: Get courses by category, ordered by creation date
db.collection('courses')
    .where('category', '==', 'web-development')
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get()
```

---

## Monitoring & Analytics

### Custom Events to Track

```javascript
// Google Analytics custom events
gtag('event', 'user_registered', {
    method: 'email'  // or 'google'
});

gtag('event', 'course_enrolled', {
    course_id: courseId,
    course_title: courseTitle
});

gtag('event', 'assignment_submitted', {
    course_id: courseId,
    assignment_id: assignmentId
});
```

### Error Tracking

```javascript
// Send errors to Cloud Logging
function logError(error, context) {
    console.error(error);
    
    // Send to Cloud Logging
    firebase.functions().httpsCallable('logError')({
        message: error.message,
        stack: error.stack,
        context: context,
        timestamp: new Date()
    });
}
```

---

## Backup & Recovery

### Automatic Backups

```bash
# Schedule daily backups
gcloud firestore export gs://edulms-backups/$(date +%Y%m%d)

# Or use Cloud Functions to schedule backups
# See DEPLOYMENT.md for details
```

### Backup Verification

```bash
# List backups
gsutil ls gs://edulms-backups/

# Restore from backup
gcloud firestore restore <backup-id> --collection-ids=users,courses
```

---

## CI/CD Configuration

### GitHub Actions (Optional)

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Firebase CLI
        run: npm install -g firebase-tools
      
      - name: Deploy to Firebase
        run: firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

### Environment Secrets

Add to GitHub Repository > Settings > Secrets:

```
FIREBASE_TOKEN=<your-firebase-token>
FIREBASE_PROJECT_ID=edulms-prod
```

---

## Troubleshooting Configuration

### Common Configuration Issues

1. **Wrong Firebase Project**
   ```bash
   firebase use <project-id>
   firebase projects:list
   ```

2. **Missing Environment Variables**
   ```bash
   # Check .env file exists
   # Run: source .env (Linux/Mac) or Set .env (Windows)
   ```

3. **Cache Issues**
   ```bash
   # Clear browser cache
   # Ctrl+Shift+Delete (Chrome)
   # Or disable cache in DevTools
   ```

---

## Configuration Checklist

- [ ] Firebase project created
- [ ] `.firebaserc` configured with project ID
- [ ] `firebase.json` updated with hosting rules
- [ ] `public/firebase-config.js` has correct credentials
- [ ] `.env` file created with environment variables
- [ ] Firestore database initialized
- [ ] Authentication methods enabled
- [ ] Security rules deployed
- [ ] Database indexes created
- [ ] Hosting configured for SPA routing
- [ ] Cache headers set correctly
- [ ] CORS origins configured
- [ ] API key restrictions applied
- [ ] Monitoring & analytics configured
- [ ] Backups scheduled

---

**Configuration Version**: 1.0.0
**Last Updated**: December 15, 2025
