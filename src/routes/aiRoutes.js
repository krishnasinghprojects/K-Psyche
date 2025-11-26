const express = require('express');
const aiController = require('../controllers/aiController');
const uploadMiddleware = require('../middleware/uploadMiddleware');

const router = express.Router();

/**
 * @route   POST /api/ai/transcribe
 * @desc    Transcribe audio file to text
 * @access  Public
 */
router.post(
  '/transcribe',
  uploadMiddleware.single('audio'),
  (req, res) => aiController.transcribe(req, res)
);

/**
 * @route   GET /api/ai/system-info
 * @desc    Get system information and available models
 * @access  Public
 */
router.get(
  '/system-info',
  (req, res) => aiController.getSystemInfo(req, res)
);

module.exports = router;
