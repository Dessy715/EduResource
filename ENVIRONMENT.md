# EduLMS Environment Configuration

## Firebase Configuration
```
Project ID: learning-mgt-sys-ec11d
Region: us-central1
Database: Firestore
```

## Environment Variables

### Development
```
NODE_ENV=development
FIREBASE_API_KEY=AIzaSyABPIPlcodXrees7rMItdnEthzffKaqhCY
FIREBASE_AUTH_DOMAIN=learning-mgt-sys-ec11d.firebaseapp.com
FIREBASE_PROJECT_ID=learning-mgt-sys-ec11d
FIREBASE_MESSAGING_SENDER_ID=192661015638
```

### Production
```
NODE_ENV=production
FIREBASE_API_KEY=<production-api-key>
FIREBASE_AUTH_DOMAIN=learning-mgt-sys-ec11d.web.app
FIREBASE_PROJECT_ID=learning-mgt-sys-ec11d
FIREBASE_MESSAGING_SENDER_ID=192661015638
```

## Firebase Services Enabled

- ✅ Authentication
- ✅ Cloud Firestore
- ✅ Cloud Storage
- ✅ Cloud Functions (optional)
- ✅ Hosting

## Database Indexes

The following indexes should be created in Firestore:

### Courses Index
- Collection: `courses`
- Fields: `category` (Ascending), `createdAt` (Descending)

### Assignments Index
- Collection: `assignments`
- Fields: `courseId` (Ascending), `dueDate` (Ascending)

### Grades Index
- Collection: `grades`
- Fields: `studentId` (Ascending), `courseId` (Ascending)

## API Keys & Restrictions

Firebase API key has the following restrictions:
- **Application restrictions**: HTTP referrers
- **API restrictions**: Firebase services only

## Backup & Recovery

### Scheduled Backups
- Daily backups to Google Cloud Storage
- 30-day retention policy
- Automated restore points

### Manual Backup Command
```bash
gcloud firestore export gs://learning-mgt-sys-ec11d-backup/$(date +%s)
```

## Monitoring & Logging

### Firebase Console Metrics
- Monitor daily active users
- Track authentication methods
- Analyze Firestore usage
- Review storage metrics

### Error Tracking
- Errors logged in Cloud Logging
- Performance monitoring enabled
- Real User Monitoring (RUM) active

## Quotas & Limits

### Firestore Limits
- **Document size**: 1 MB max
- **Collection size**: Unlimited
- **Writes per second**: 500 concurrent
- **Reads per second**: Unlimited

### Authentication Limits
- **Session timeout**: 1 hour
- **Max login attempts**: 10 per 15 minutes
- **Password reset timeout**: 24 hours

### Storage Limits
- **File size**: 5 GB max per file
- **Total project storage**: Based on plan

## CDN & Caching

### Hosting CDN
- Global edge network
- Automatic GZIP compression
- Cache TTL: 3600 seconds (1 hour)

### Browser Caching
- HTML: No-cache
- JS/CSS: 1 year
- Images: 1 year
- API responses: 5 minutes

## HTTPS & SSL

- ✅ Automatic SSL certificates
- ✅ HSTS enabled
- ✅ TLS 1.2+ required
- ✅ Strong ciphers only

## Rate Limiting

### Authentication Rate Limits
- 50 requests per hour per IP
- 100 requests per day per user

### API Rate Limits
- Read: 1,000,000 per day (free tier)
- Write: 300,000 per day (free tier)

## Disaster Recovery Plan

### RTO (Recovery Time Objective): 4 hours
### RPO (Recovery Point Objective): 1 hour

### Recovery Steps
1. Access Firebase Console
2. Restore from latest backup
3. Verify data integrity
4. Notify users if needed

## Compliance & Security

- ✅ GDPR compliance enabled
- ✅ Data encryption at rest
- ✅ Data encryption in transit
- ✅ Regular security audits
- ✅ Firestore security rules enforced

## Support & Contact

- **Firebase Support**: https://firebase.google.com/support
- **Status Page**: https://status.firebase.io
- **Pricing**: https://firebase.google.com/pricing
