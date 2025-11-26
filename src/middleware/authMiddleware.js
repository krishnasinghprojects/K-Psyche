const { getAuth, isFirebaseInitialized } = require('../config/firebase');

/**
 * Authentication Middleware
 * Verifies Firebase ID tokens and attaches user info to request
 */

/**
 * Verify Firebase ID token from Authorization header
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function verifyToken(req, res, next) {
  try {
    // Check if Firebase is initialized
    if (!isFirebaseInitialized()) {
      console.error('[Auth] Firebase not initialized');
      return res.status(503).json({
        success: false,
        error: 'Authentication service unavailable',
        message: 'Firebase Admin SDK not initialized. Check service account configuration.'
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No authorization header provided. Include "Authorization: Bearer <token>"'
      });
    }

    // Check Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use "Bearer <token>"'
      });
    }

    // Extract token
    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken || idToken.trim().length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    // Verify token with Firebase Admin
    const auth = getAuth();
    if (!auth) {
      return res.status(503).json({
        success: false,
        error: 'Authentication service unavailable'
      });
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
      firebase: decodedToken
    };

    console.log(`[Auth] ✅ User authenticated: ${req.user.email} (${req.user.uid})`);

    // Continue to next middleware/controller
    next();

  } catch (error) {
    console.error('[Auth] Token verification failed:', error.message);

    // Handle specific Firebase Auth errors
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Your session has expired. Please sign in again.',
        code: 'TOKEN_EXPIRED'
      });
    }

    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        error: 'Token revoked',
        message: 'Your session has been revoked. Please sign in again.',
        code: 'TOKEN_REVOKED'
      });
    }

    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'The provided token is invalid.',
        code: 'INVALID_TOKEN'
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        message: 'The token format is invalid.',
        code: 'INVALID_FORMAT'
      });
    }

    // Generic error
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Token verification failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't block if missing
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      req.user = null;
      return next();
    }

    const idToken = authHeader.split('Bearer ')[1];
    const auth = getAuth();

    if (!auth) {
      req.user = null;
      return next();
    }

    const decodedToken = await auth.verifyIdToken(idToken);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified
    };

    next();

  } catch (error) {
    // Token invalid, continue without user
    req.user = null;
    next();
  }
}

/**
 * Check if user has specific role (for future use)
 */
function requireRole(role) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    // Get user's custom claims
    const auth = getAuth();
    const userRecord = await auth.getUser(req.user.uid);
    const customClaims = userRecord.customClaims || {};

    if (!customClaims.role || customClaims.role !== role) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `This endpoint requires ${role} role`
      });
    }

    next();
  };
}

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole
};
