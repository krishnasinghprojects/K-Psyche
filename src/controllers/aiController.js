const aiService = require('../services/aiService');
const fs = require('fs');

/**
 * AI Controller - Handles AI-related requests
 */
class AIController {
  /**
   * Handle audio transcription request
   */
  async transcribe(req, res) {
    let filePath = null;

    try {
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No audio file provided. Please upload a file with key "audio".'
        });
      }

      filePath = req.file.path;
      console.log(`[AIController] Processing transcription for: ${req.file.originalname}`);

      // Extract optional parameters
      const options = {
        language: req.body.language || 'auto',
        model: req.body.model || process.env.WHISPER_MODEL || 'small'
      };

      // Call service layer for transcription
      const transcription = await aiService.transcribeAudio(filePath, options);

      // Clean up uploaded file
      this._cleanupFile(filePath);

      // Return successful response
      return res.status(200).json({
        success: true,
        transcription: transcription,
        metadata: {
          filename: req.file.originalname,
          size: req.file.size,
          model: options.model,
          language: options.language,
          processedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('[AIController] Transcription error:', error.message);

      // Clean up file if it exists
      if (filePath) {
        this._cleanupFile(filePath);
      }

      // Determine appropriate status code
      const statusCode = error.message.includes('timeout') ? 504 : 500;

      // Return error response
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Transcription failed',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Get available models and system info
   */
  async getSystemInfo(req, res) {
    try {
      const info = await aiService.getSystemInfo();
      return res.status(200).json({
        success: true,
        ...info
      });
    } catch (error) {
      console.error('[AIController] System info error:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Clean up uploaded file
   * @private
   */
  _cleanupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[AIController] Cleaned up file: ${filePath}`);
      }
    } catch (error) {
      console.error(`[AIController] Failed to cleanup file: ${error.message}`);
    }
  }
}

module.exports = new AIController();
