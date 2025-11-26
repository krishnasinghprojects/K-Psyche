const multer = require('multer');

/**
 * Global error handling middleware
 */
const errorHandler = (error, req, res, next) => {
  console.error('[ErrorMiddleware]', error);

  // Handle Multer errors
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE || 50}MB`
      });
    }
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  // Handle custom errors
  if (error.message) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.path}`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
