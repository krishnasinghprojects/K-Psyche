const pythonExecutor = require('../utils/pythonExecutor');
const path = require('path');
const fs = require('fs');

/**
 * AI Service - Business logic for AI operations
 */
class AIService {
  constructor() {
    this.scriptPath = path.join(__dirname, '../../transcribe.py');
    this.availableModels = ['tiny', 'base', 'small', 'medium', 'large-v2', 'large-v3', 'distil-large-v3'];
  }

  /**
   * Transcribe audio file using faster-whisper
   * @param {string} filePath - Path to audio file
   * @param {Object} options - Transcription options
   * @param {string} options.language - Language code or 'auto'
   * @param {string} options.model - Model size
   * @returns {Promise<string>} Transcribed text
   */
  async transcribeAudio(filePath, options = {}) {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`Audio file not found: ${filePath}`);
    }

    // Validate script exists
    if (!fs.existsSync(this.scriptPath)) {
      throw new Error('Transcription script not found. Please ensure transcribe.py exists in project root.');
    }

    // Validate model
    const model = options.model || 'small';
    if (!this.availableModels.includes(model)) {
      throw new Error(`Invalid model: ${model}. Available models: ${this.availableModels.join(', ')}`);
    }

    // Build Python arguments
    const args = [this.scriptPath, filePath, '--model', model];
    
    if (options.language && options.language !== 'auto') {
      args.push('--language', options.language);
    }

    console.log(`[AIService] Starting transcription with model: ${model}`);

    try {
      // Execute Python script
      const result = await pythonExecutor.execute(args, {
        timeout: 5 * 60 * 1000 // 5 minutes
      });

      // Validate result
      if (!result || result.trim().length === 0) {
        throw new Error('Transcription returned empty result. No speech detected in audio.');
      }

      console.log(`[AIService] Transcription completed successfully`);
      return result.trim();

    } catch (error) {
      console.error(`[AIService] Transcription failed:`, error.message);
      throw new Error(`Transcription failed: ${error.message}`);
    }
  }

  /**
   * Get system information and available models
   * @returns {Promise<Object>} System info
   */
  async getSystemInfo() {
    try {
      const pythonVersion = await pythonExecutor.execute(['-c', 'import sys; print(sys.version)'], {
        timeout: 5000
      });

      // Check if CUDA is available
      let cudaAvailable = false;
      try {
        const cudaCheck = await pythonExecutor.execute([
          '-c',
          'import torch; print("yes" if torch.cuda.is_available() else "no")'
        ], { timeout: 10000 });
        cudaAvailable = cudaCheck.trim() === 'yes';
      } catch (error) {
        console.warn('[AIService] Could not check CUDA availability');
      }

      return {
        pythonVersion: pythonVersion.trim().split('\n')[0],
        cudaAvailable,
        availableModels: this.availableModels,
        recommendedModel: 'small',
        scriptPath: this.scriptPath
      };
    } catch (error) {
      throw new Error(`Failed to get system info: ${error.message}`);
    }
  }

  /**
   * Validate audio file format
   * @param {string} mimetype - File mimetype
   * @param {string} filename - File name
   * @returns {boolean} Is valid
   */
  isValidAudioFile(mimetype, filename) {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/wave',
      'audio/x-wav',
      'audio/mp4',
      'audio/m4a',
      'audio/ogg',
      'audio/webm',
      'video/mp4',
      'video/webm'
    ];

    const allowedExtensions = /\.(mp3|wav|m4a|mp4|ogg|webm|flac|aac)$/i;

    return allowedMimes.includes(mimetype) || allowedExtensions.test(filename);
  }
}

module.exports = new AIService();
