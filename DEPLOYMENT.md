# EduLMS Deployment Guide

## Prerequisites Checklist

- [ ] Firebase account created
- [ ] Firebase project initialized
- [ ] Node.js 14+ installed
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Firestore database created
- [ ] Authentication methods enabled (Email/Password, Google)
- [ ] Custom domain registered (optional)

---

## Deployment Steps

### Step 1: Prepare Firestore Database

#### 1.1 Create Collections

```javascript
// In Firebase Console > Firestore > Start Collection

Collections to create:
- users
- courses
- assignments
- submissions
- grades
- announcements
- messages (optional)
- analytics (optional)
- settings
- system
```

#### 1.2 Create Initial Indexes

Go to Firebase Console > Firestore > Indexes and create:

```
Index 1: courses
- Collection: courses
- Fields: category (Ascending), createdAt (Descending)

Index 2: assignments
- Collection: assignments
- Fields: courseId (Ascending), dueDate (Ascending)

Index 3: grades
- Collection: grades
- Fields: studentId (Ascending), courseId (Ascending)
```

#### 1.3 Deploy Security Rules

```bash
# From project root
firebase deploy --only firestore:rules
```

Or manually in Firebase Console:
1. Firestore Database > Rules
2. Copy content from `firestore.rules`
3. Publish

---

### Step 2: Configure Authentication

#### 2.1 Enable Email/Password

1. Firebase Console > Authentication > Sign-in method
2. Enable "Email/Password"
3. Enable "Email link (passwordless sign-in)" (optional)

#### 2.2 Enable Google OAuth

1. Firebase Console > Authentication > Sign-in method
2. Enable "Google"
3. Configure OAuth consent screen:
   - App name: "EduLMS"
   - Support email: your@email.com
   - Developer contact: your@email.com

#### 2.3 Configure Custom Domain (Optional)

1. Firebase Console > Authentication > Settings
2. Authorized domains > Add domain
3. Add your custom domain

---

### Step 3: Configure Hosting

#### 3.1 Update firebase.json

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
        "source": "/js/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000"
          }
        ]
      },
      {
        "source": "index.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "no-cache, no-store, must-revalidate"
          }
        ]
      }
    ]
  }
}
```

#### 3.2 Test Locally

```bash
firebase serve
```

Then visit: http://localhost:5000

---

### Step 4: Environment Configuration

#### 4.1 Update Firebase Config

Edit `public/firebase-config.js`:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID"
};
```

#### 4.2 Verify All Config

```bash
firebase projects:list
firebase projects:describe
```

---

### Step 5: Pre-Deployment Testing

#### 5.1 Test Locally

```bash
# Start local server
python -m http.server 8000

# Or use Firebase hosting emulator
firebase emulators:start
```

#### 5.2 Test All Features

Checklist:
- [ ] User registration works
- [ ] Email login works
- [ ] Google login works
- [ ] Course enrollment works
- [ ] Dashboard displays correctly
- [ ] Mobile responsive
- [ ] No console errors
- [ ] No network errors

#### 5.3 Performance Check

```bash
# Check bundle size
ls -lh public/js/

# Lighthouse audit
# Open DevTools > Lighthouse > Analyze page load
```

---

### Step 6: Deploy to Firebase

#### 6.1 Optimize Build

```bash
# Minify JavaScript (optional)
npm install -g terser
terser public/js/*.js -o public/js/

# Minify CSS (optional)
npm install -g cssnano
cssnano public/style.css -o public/style.css
```

#### 6.2 Deploy Everything

```bash
# Deploy all
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only functions
```

#### 6.3 Verify Deployment

```bash
# Get hosting URL
firebase hosting:sites:list

# Test deployed site
# Visit: https://your-project-id.web.app
```

---

### Step 7: Post-Deployment Tasks

#### 7.1 Verify Site is Live

```bash
# Test connectivity
curl https://your-project-id.web.app

# Check security headers
curl -I https://your-project-id.web.app
```

#### 7.2 Set Up Custom Domain

1. Firebase Console > Hosting > Domains
2. Add custom domain
3. Update DNS records:
   - A record: Firebase IP
   - CNAME record: your-project-id.web.app
4. Verify ownership

#### 7.3 Enable Analytics

1. Firebase Console > Analytics
2. Create custom events for:
   - User registration
   - Course enrollment
   - Assignment submission
   - Login methods

#### 7.4 Configure Monitoring

1. Set up Cloud Logging
2. Create alerts for:
   - High error rate
   - Slow response times
   - Authentication failures

#### 7.5 Backup Configuration

```bash
# Schedule daily backups
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)

# Or use Firebase Backup and Restore
firebase:Backup
```

---

## Deployment Checklist

### Before Deployment
- [ ] All code reviewed and tested
- [ ] Security rules finalized
- [ ] Environment variables configured
- [ ] Firebase project setup complete
- [ ] Database indexes created
- [ ] Authentication methods enabled
- [ ] Hosting configuration updated
- [ ] SSL certificate generated
- [ ] Backups configured
- [ ] Monitoring setup complete

### During Deployment
- [ ] Run final tests
- [ ] Monitor deployment logs
- [ ] Verify all features work
- [ ] Check performance metrics
- [ ] Test on multiple devices

### After Deployment
- [ ] Send deployment notification
- [ ] Monitor error logs
- [ ] Verify analytics data
- [ ] Update documentation
- [ ] Communicate status to team
- [ ] Plan post-launch monitoring

---

## Rollback Plan

If issues occur after deployment:

### Option 1: Quick Rollback
```bash
# Rollback to previous version
firebase hosting:channels:list
firebase hosting:clone <source-site> <target-site>
```

### Option 2: Manual Rollback
```bash
# Deploy previous version from git
git checkout <previous-commit>
firebase deploy
```

### Option 3: Firebase Version Rollback
```bash
# View deployment history
firebase hosting:releases:list

# Rollback to previous release
firebase deploy --version <version-id>
```

---

## Production Monitoring

### Key Metrics to Monitor

1. **Performance**
   - Page load time
   - Time to First Contentful Paint (FCP)
   - Time to Interactive (TTI)

2. **Reliability**
   - Error rate
   - Firestore success rate
   - Authentication failures

3. **Usage**
   - Daily Active Users (DAU)
   - Monthly Active Users (MAU)
   - Feature adoption rate

4. **Security**
   - Failed login attempts
   - Unauthorized access attempts
   - Data access patterns

### Monitoring Commands

```bash
# View deployment logs
firebase deploy --debug

# Monitor functions
firebase functions:log

# View Firestore activity
gcloud firestore operations list

# Check hosting status
firebase hosting:sites:list
```

---

## Scaling Considerations

### When to Scale Up

- DAU exceeds 10,000
- Database size exceeds 100 GB
- Read/write operations exceed limits
- Response times exceed 2 seconds

### Scaling Options

1. **Upgrade Firebase Plan**
   - Move from Spark to Blaze plan
   - Set spending limits
   - Enable auto-scaling

2. **Optimize Database**
   - Add more indexes
   - Partition large collections
   - Implement pagination

3. **Optimize Frontend**
   - Implement code splitting
   - Lazy load modules
   - Cache aggressively

4. **Use CDN**
   - CloudFlare
   - Akamai
   - AWS CloudFront

---

## Support & Documentation

- **Firebase Docs**: https://firebase.google.com/docs
- **Deployment Guide**: https://firebase.google.com/docs/hosting/deploying
- **Security Rules**: https://firebase.google.com/docs/firestore/security
- **Performance**: https://firebase.google.com/docs/perf-mod

---

## Contact & Escalation

For deployment issues:
1. Check Firebase status page
2. Review Cloud Logging
3. Contact Firebase support
4. File GitHub issue if applicable

---

**Last Updated**: December 15, 2025
**Version**: 1.0.0
