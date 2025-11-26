# Firebase Setup Guide for K-Psyche

## Overview

K-Psyche uses Firebase Admin SDK for:
- **Authentication**: Secure API endpoints with Firebase ID tokens
- **Firestore**: Store analysis results and user data
- **User Management**: Track user activity and history

## Prerequisites

1. Firebase project created
2. Firebase Auth enabled (Email/Password)
3. Firestore database created
4. Service account key downloaded

---

## Step 1: Firebase Console Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `k-psyche` (or your choice)
4. Follow the setup wizard

### 1.2 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in method
4. (Optional) Enable other providers (Google, GitHub, etc.)

### 1.3 Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode** (we'll set rules later)
4. Select a location (choose closest to your users)

### 1.4 Download Service Account Key

1. Go to **Project Settings** (gear icon)
2. Click **Service accounts** tab
3. Click **Generate new private key**
4. Save the JSON file as `serviceAccountKey.json`
5. **Move it to your project root directory**

```bash
# Your project structure should look like:
k-psyche-backend/
├── serviceAccountKey.json  ← Place here
├── server.js
├── package.json
└── ...
```

**⚠️ CRITICAL**: Never commit this file to Git! It's already in `.gitignore`.

---

## Step 2: Firestore Security Rules

### 2.1 Set Firestore Rules

Go to **Firestore Database** → **Rules** and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can only read/write their own data
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Analyses subcollection
      match /analyses/{analysisId} {
        // Users can only access their own analyses
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
    
    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click **Publish**.

### 2.2 Firestore Indexes (Optional)

For better query performance, create indexes:

1. Go to **Firestore Database** → **Indexes**
2. Add composite index:
   - Collection: `users/{userId}/analyses`
   - Fields: `timestamp` (Descending), `sentiment` (Ascending)

Or wait for Firebase to suggest indexes when you run queries.

---

## Step 3: Create Test Users

### 3.1 Via Firebase Console

1. Go to **Authentication** → **Users**
2. Click **Add user**
3. Enter email and password
4. Click **Add user**

### 3.2 Via Firebase CLI (Optional)

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Create user
firebase auth:import users.json --project your-project-id
```

---

## Step 4: Backend Configuration

### 4.1 Verify Service Account

Check that `serviceAccountKey.json` is in project root:

```bash
ls -la serviceAccountKey.json
```

### 4.2 Restart Server

```bash
npm start
```

You should see:
```
[Firebase] ✅ Firebase Admin SDK initialized successfully
[Firebase] Project ID: your-project-id
[Firebase] Firestore: Ready
[Firebase] Auth: Ready
```

---

## Step 5: Get Firebase ID Token

To use authenticated endpoints, you need a Firebase ID token.

### 5.1 Using Firebase Client SDK (Frontend)

```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
const userCredential = await signInWithEmailAndPassword(
  auth,
  'user@example.com',
  'password123'
);

const idToken = await userCredential.user.getIdToken();
console.log('ID Token:', idToken);
```

### 5.2 Using REST API (Testing)

```bash
# Get ID token via Firebase Auth REST API
curl -X POST 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "returnSecureToken": true
  }'
```

Response includes `idToken` field.

**Find your API key**: Firebase Console → Project Settings → General → Web API Key

### 5.3 Using Custom Script

Create `get-token.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createCustomToken(uid) {
  const customToken = await admin.auth().createCustomToken(uid);
  console.log('Custom Token:', customToken);
  console.log('\nUse this to get ID token via Firebase Auth');
}

// Replace with your user's UID
createCustomToken('user-uid-here');
```

Run:
```bash
node get-token.js
```

---

## Step 6: Test Authenticated Endpoints

### 6.1 Test Analysis Endpoint

```bash
# Replace YOUR_ID_TOKEN with actual token
curl -X POST http://localhost:3000/api/analysis/analyze \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I am feeling wonderful today!"
  }'
```

Expected response:
```json
{
  "success": true,
  "analysis": {
    "sentiment": "Positive",
    "personality_traits": ["Optimistic", "Expressive"]
  },
  "metadata": {
    "saved": true,
    "document_id": "abc123...",
    "user_id": "user-uid"
  }
}
```

### 6.2 Test History Endpoint

```bash
curl http://localhost:3000/api/analysis/history \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### 6.3 Test Without Token (Should Fail)

```bash
curl -X POST http://localhost:3000/api/analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Test"}'
```

Expected response:
```json
{
  "success": false,
  "error": "Unauthorized",
  "message": "No authorization header provided..."
}
```

---

## Firestore Data Structure

### Schema

```
users (collection)
  └── {userId} (document)
      └── analyses (subcollection)
          └── {analysisId} (document)
              ├── timestamp: Timestamp
              ├── createdAt: String (ISO)
              ├── inputText: String
              ├── sentiment: String
              ├── personality_traits: Array<String>
              ├── confidence: String
              ├── model_used: String
              ├── text_length: Number
              └── user_email: String
```

### Example Document

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "inputText": "I am feeling wonderful today!",
  "sentiment": "Positive",
  "personality_traits": ["Optimistic", "Expressive"],
  "confidence": "high",
  "model_used": "llama3.1:8b",
  "text_length": 30,
  "user_email": "user@example.com"
}
```

---

## Troubleshooting

### Issue: "Firebase not initialized"

**Cause**: Service account key missing or invalid

**Solution**:
1. Check `serviceAccountKey.json` exists in project root
2. Verify JSON format is valid
3. Check file permissions: `chmod 600 serviceAccountKey.json`
4. Restart server

### Issue: "Unauthorized" on authenticated endpoints

**Cause**: Invalid or expired token

**Solution**:
1. Get fresh ID token
2. Check token format: `Bearer <token>`
3. Verify user exists in Firebase Auth
4. Check token hasn't expired (1 hour default)

### Issue: "Permission denied" in Firestore

**Cause**: Firestore security rules blocking access

**Solution**:
1. Check Firestore rules (see Step 2.1)
2. Verify user is authenticated
3. Check user UID matches document path

### Issue: "Service account key not found"

**Cause**: File in wrong location

**Solution**:
```bash
# Move to project root
mv ~/Downloads/serviceAccountKey.json ./

# Verify location
ls -la serviceAccountKey.json
```

### Issue: Server starts but Firebase warnings

**Cause**: Service account key missing (graceful degradation)

**Effect**: 
- Server runs but auth endpoints return 503
- Public endpoints still work

**Solution**: Add service account key and restart

---

## Security Best Practices

### 1. Never Commit Service Account Key

Already in `.gitignore`:
```
serviceAccountKey.json
*-firebase-adminsdk-*.json
```

### 2. Rotate Keys Regularly

1. Generate new key in Firebase Console
2. Replace old key
3. Delete old key from Firebase Console

### 3. Use Environment Variables (Production)

Instead of JSON file, use environment variables:

```javascript
// src/config/firebase.js
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  })
});
```

### 4. Limit Service Account Permissions

In Google Cloud Console:
1. Go to IAM & Admin
2. Find service account
3. Remove unnecessary roles
4. Keep only: Firebase Admin SDK Administrator Service Agent

### 5. Monitor Usage

Firebase Console → Usage and billing:
- Check authentication usage
- Monitor Firestore reads/writes
- Set up billing alerts

---

## Production Deployment

### Environment Variables

Set these in production:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Docker

```dockerfile
# Don't copy serviceAccountKey.json
# Use environment variables instead
ENV FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
ENV FIREBASE_CLIENT_EMAIL=${FIREBASE_CLIENT_EMAIL}
ENV FIREBASE_PRIVATE_KEY=${FIREBASE_PRIVATE_KEY}
```

### Heroku

```bash
heroku config:set FIREBASE_PROJECT_ID=your-project-id
heroku config:set FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
heroku config:set FIREBASE_PRIVATE_KEY="$(cat serviceAccountKey.json | jq -r .private_key)"
```

---

## Testing

### Test Script

Create `test-auth.sh`:

```bash
#!/bin/bash

# Get ID token (replace with your method)
ID_TOKEN="your-id-token-here"

# Test authenticated endpoint
curl -X POST http://localhost:3000/api/analysis/analyze \
  -H "Authorization: Bearer $ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "I am feeling great!"}'
```

### Integration Tests

```javascript
const admin = require('firebase-admin');

describe('Analysis with Auth', () => {
  let idToken;

  beforeAll(async () => {
    // Create custom token for testing
    const customToken = await admin.auth().createCustomToken('test-user');
    // Exchange for ID token (requires Firebase client SDK)
    idToken = await getIdTokenFromCustomToken(customToken);
  });

  it('should analyze text with valid token', async () => {
    const response = await request(app)
      .post('/api/analysis/analyze')
      .set('Authorization', `Bearer ${idToken}`)
      .send({ text: 'Test text' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

---

## Next Steps

1. ✅ Set up Firebase project
2. ✅ Download service account key
3. ✅ Configure Firestore rules
4. ✅ Create test users
5. ✅ Get ID token
6. ✅ Test authenticated endpoints
7. 🎉 Start building your frontend!

## Resources

- [Firebase Admin SDK Docs](https://firebase.google.com/docs/admin/setup)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth REST API](https://firebase.google.com/docs/reference/rest/auth)
- [Firebase Console](https://console.firebase.google.com/)
