const express = require('express');
const analysisController = require('../controllers/analysisController');
const { verifyToken, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route   POST /api/analysis/analyze
 * @desc    Analyze text for sentiment and personality traits
 * @access  Private (requires authentication)
 * @body    { text: string, saveToHistory?: boolean }
 */
router.post(
  '/analyze',
  verifyToken,
  (req, res) => analysisController.analyze(req, res)
);

/**
 * @route   POST /api/analysis/batch
 * @desc    Batch analyze multiple texts
 * @access  Private (requires authentication)
 * @body    { texts: string[] }
 */
router.post(
  '/batch',
  verifyToken,
  (req, res) => analysisController.batchAnalyze(req, res)
);

/**
 * @route   GET /api/analysis/history
 * @desc    Get user's analysis history
 * @access  Private (requires authentication)
 * @query   limit: number (default: 10)
 */
router.get(
  '/history',
  verifyToken,
  (req, res) => analysisController.getHistory(req, res)
);

/**
 * @route   DELETE /api/analysis/history/:analysisId
 * @desc    Delete an analysis from history
 * @access  Private (requires authentication)
 */
router.delete(
  '/history/:analysisId',
  verifyToken,
  (req, res) => analysisController.deleteHistoryItem(req, res)
);

/**
 * @route   GET /api/analysis/status
 * @desc    Check Ollama service status
 * @access  Public
 */
router.get(
  '/status',
  (req, res) => analysisController.getStatus(req, res)
);

/**
 * @route   GET /api/analysis/rag-status
 * @desc    Check RAG (ChromaDB + Ollama embeddings) status
 * @access  Public
 */
router.get(
  '/rag-status',
  (req, res) => analysisController.getRAGStatus(req, res)
);

/**
 * @route   GET /api/analysis/memory-count
 * @desc    Get user's memory count from ChromaDB
 * @access  Private (requires authentication)
 */
router.get(
  '/memory-count',
  verifyToken,
  (req, res) => analysisController.getMemoryCount(req, res)
);

/**
 * @route   DELETE /api/analysis/memories
 * @desc    Delete user's memories from ChromaDB
 * @access  Private (requires authentication)
 * @body    { memoryId?: string } - Optional specific memory ID
 */
router.delete(
  '/memories',
  verifyToken,
  (req, res) => analysisController.deleteMemories(req, res)
);

/**
 * @route   POST /api/analysis/transcribe-and-analyze
 * @desc    Transcribe audio and analyze text (future feature)
 * @access  Private (requires authentication)
 */
router.post(
  '/transcribe-and-analyze',
  verifyToken,
  (req, res) => analysisController.transcribeAndAnalyze(req, res)
);

module.exports = router;
