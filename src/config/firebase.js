const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

/**
 * Firebase Admin SDK Configuration
 * Initializes Firebase Admin with service account credentials
 */

let db = null;
let auth = null;
let isInitialized = false;
let initializationError = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  if (isInitialized) {
    return { db, auth, isInitialized, error: initializationError };
  }

  try {
    // Path to service account key
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

    // Check if service account file exists
    if (!fs.existsSync(serviceAccountPath)) {
      const error = new Error(
        'Firebase service account key not found. Please add serviceAccountKey.json to project root.'
      );
      initializationError = error;
      console.warn('[Firebase] ⚠️  Service account key not found');
      console.warn('[Firebase] Authentication and Firestore features will be disabled');
      console.warn('[Firebase] To enable: Add serviceAccountKey.json from Firebase Console');
      return { db: null, auth: null, isInitialized: false, error };
    }

    // Load service account
    const serviceAccount = require(serviceAccountPath);

    // Validate service account structure
    if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
      const error = new Error('Invalid service account key format');
      initializationError = error;
      console.error('[Firebase] ❌ Invalid service account key format');
      return { db: null, auth: null, isInitialized: false, error };
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    // Initialize Firestore
    db = admin.firestore();
    db.settings({
      ignoreUndefinedProperties: true,
      timestampsInSnapshots: true
    });

    // Initialize Auth
    auth = admin.auth();

    isInitialized = true;

    console.log('[Firebase] ✅ Firebase Admin SDK initialized successfully');
    console.log(`[Firebase] Project ID: ${serviceAccount.project_id}`);
    console.log('[Firebase] Firestore: Ready');
    console.log('[Firebase] Auth: Ready');

    return { db, auth, isInitialized: true, error: null };

  } catch (error) {
    initializationError = error;
    console.error('[Firebase] ❌ Failed to initialize Firebase Admin SDK');
    console.error('[Firebase] Error:', error.message);
    
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('[Firebase] Service account key file not found');
    } else if (error.message.includes('private_key')) {
      console.error('[Firebase] Invalid private key in service account');
    }

    return { db: null, auth: null, isInitialized: false, error };
  }
}

// Initialize on module load
const firebaseInstance = initializeFirebase();

/**
 * Get Firestore instance
 * @returns {admin.firestore.Firestore|null}
 */
function getFirestore() {
  if (!isInitialized) {
    console.warn('[Firebase] Firestore not initialized. Check service account key.');
    return null;
  }
  return db;
}

/**
 * Get Auth instance
 * @returns {admin.auth.Auth|null}
 */
function getAuth() {
  if (!isInitialized) {
    console.warn('[Firebase] Auth not initialized. Check service account key.');
    return null;
  }
  return auth;
}

/**
 * Check if Firebase is initialized
 * @returns {boolean}
 */
function isFirebaseInitialized() {
  return isInitialized;
}

/**
 * Get initialization error if any
 * @returns {Error|null}
 */
function getInitializationError() {
  return initializationError;
}

/**
 * Save analysis result to Firestore
 * @param {string} uid - User ID
 * @param {Object} analysisData - Analysis data to save
 * @returns {Promise<string>} Document ID
 */
async function saveAnalysis(uid, analysisData) {
  if (!isInitialized || !db) {
    throw new Error('Firebase not initialized. Cannot save analysis.');
  }

  try {
    const analysisRef = db
      .collection('users')
      .doc(uid)
      .collection('analyses');

    const docRef = await analysisRef.add({
      ...analysisData,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString()
    });

    console.log(`[Firebase] Analysis saved for user ${uid}: ${docRef.id}`);
    return docRef.id;

  } catch (error) {
    console.error('[Firebase] Failed to save analysis:', error.message);
    throw new Error(`Failed to save analysis: ${error.message}`);
  }
}

/**
 * Get user's analysis history
 * @param {string} uid - User ID
 * @param {number} limit - Number of results to return
 * @returns {Promise<Array>} Array of analyses
 */
async function getUserAnalyses(uid, limit = 10) {
  if (!isInitialized || !db) {
    throw new Error('Firebase not initialized. Cannot retrieve analyses.');
  }

  try {
    const analysesRef = db
      .collection('users')
      .doc(uid)
      .collection('analyses')
      .orderBy('timestamp', 'desc')
      .limit(limit);

    const snapshot = await analysesRef.get();
    
    const analyses = [];
    snapshot.forEach(doc => {
      analyses.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return analyses;

  } catch (error) {
    console.error('[Firebase] Failed to retrieve analyses:', error.message);
    throw new Error(`Failed to retrieve analyses: ${error.message}`);
  }
}

/**
 * Delete an analysis
 * @param {string} uid - User ID
 * @param {string} analysisId - Analysis document ID
 * @returns {Promise<void>}
 */
async function deleteAnalysis(uid, analysisId) {
  if (!isInitialized || !db) {
    throw new Error('Firebase not initialized. Cannot delete analysis.');
  }

  try {
    await db
      .collection('users')
      .doc(uid)
      .collection('analyses')
      .doc(analysisId)
      .delete();

    console.log(`[Firebase] Analysis deleted: ${analysisId}`);

  } catch (error) {
    console.error('[Firebase] Failed to delete analysis:', error.message);
    throw new Error(`Failed to delete analysis: ${error.message}`);
  }
}

module.exports = {
  admin,
  db: getFirestore(),
  auth: getAuth(),
  getFirestore,
  getAuth,
  isFirebaseInitialized,
  getInitializationError,
  saveAnalysis,
  getUserAnalyses,
  deleteAnalysis
};
