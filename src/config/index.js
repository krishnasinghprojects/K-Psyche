require('dotenv').config();

/**
 * Application Configuration
 */
module.exports = {
  // Server
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Python
  pythonPath: process.env.PYTHON_PATH || 'python3',

  // Whisper
  whisperModel: process.env.WHISPER_MODEL || 'small',

  // Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '50', 10),

  // Ollama
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10),

  // Paths
  uploadsDir: 'uploads',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*'
};
