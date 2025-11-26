const analysisService = require('../services/analysisService');
const vectorService = require('../services/vectorService');
const personaService = require('../services/personaService');
const { saveAnalysis, getUserAnalyses, deleteAnalysis } = require('../config/firebase');

/**
 * Analysis Controller - Handles text analysis requests with RAG
 */
class AnalysisController {
  /**
   * Analyze text for sentiment and personality traits with RAG
   * Requires authentication (req.user from verifyToken middleware)
   * 
   * RAG Flow:
   * 1. Retrieve relevant past context from ChromaDB
   * 2. Augment prompt with context
   * 3. Generate analysis with Ollama
   * 4. Store new memory in ChromaDB
   */
  async analyze(req, res) {
    try {
      // Validate request body
      const { text, saveToHistory = true, useRAG = true, personaId } = req.body;

      if (!text) {
        return res.status(400).json({
          success: false,
          error: 'Text is required in request body'
        });
      }

      if (typeof text !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Text must be a string'
        });
      }

      if (text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Text cannot be empty'
        });
      }

      // Get user ID from authenticated request
      const adminUid = req.user.uid;
      const userEmail = req.user.email;

      const logMsg = personaId 
        ? `Analyzing text for user: ${userEmail}, persona: ${personaId} (${text.length} chars)`
        : `Analyzing text for user: ${userEmail} (${text.length} chars)`;
      console.log(`[AnalysisController] ${logMsg}`);

      // STEP 1: RETRIEVAL - Get relevant past context from ChromaDB (persona-specific if provided)
      let relevantMemories = [];
      let contextUsed = false;

      if (useRAG && vectorService.isReady()) {
        try {
          const searchMsg = personaId
            ? `Retrieving relevant memories for user ${adminUid}, persona ${personaId}`
            : `Retrieving relevant memories for user ${adminUid}`;
          console.log(`[AnalysisController] ${searchMsg}`);
          
          relevantMemories = await vectorService.searchMemory(adminUid, text, null, personaId);
          
          if (relevantMemories.length > 0) {
            console.log(`[AnalysisController] Found ${relevantMemories.length} relevant memories`);
            contextUsed = true;
          } else {
            console.log(`[AnalysisController] No relevant memories found`);
          }
        } catch (ragError) {
          console.error('[AnalysisController] RAG retrieval failed:', ragError.message);
          // Continue without RAG context
        }
      }

      // STEP 2: AUGMENTATION - Format context for prompt
      const contextString = vectorService.formatMemoriesForContext(relevantMemories);

      // STEP 3: GENERATION - Call service layer for analysis with context
      const analysis = await analysisService.analyzeText(text, contextString);

      // STEP 4: STORAGE - Save to ChromaDB and Firestore
      let vectorDocId = null;
      let savedDocId = null;

      if (saveToHistory) {
        // Save to ChromaDB (with persona context if provided)
        if (vectorService.isReady()) {
          try {
            if (personaId) {
              vectorDocId = await vectorService.addMemory(adminUid, personaId, text, {
                sentiment: analysis.sentiment,
                personality_traits: analysis.personality_traits,
                confidence: analysis.confidence,
                user_email: userEmail,
                type: 'analysis'
              });
            } else {
              vectorDocId = await vectorService.saveMemory(adminUid, text, {
                sentiment: analysis.sentiment,
                personality_traits: analysis.personality_traits,
                confidence: analysis.confidence,
                user_email: userEmail
              });
            }
            console.log(`[AnalysisController] Memory saved to ChromaDB: ${vectorDocId}`);
          } catch (vectorError) {
            console.error('[AnalysisController] Failed to save to ChromaDB:', vectorError.message);
            // Don't fail the request
          }
        }

        // Save to Firestore (persona-specific or user-level)
        try {
          const analysisData = {
            inputText: text,
            sentiment: analysis.sentiment,
            personality_traits: analysis.personality_traits,
            confidence: analysis.confidence,
            model_used: process.env.OLLAMA_MODEL || 'llama3.1:8b',
            text_length: text.length,
            user_email: userEmail,
            rag_context_used: contextUsed,
            rag_memories_count: relevantMemories.length
          };

          if (personaId) {
            // Save to persona's subcollection
            savedDocId = await personaService.saveAnalysis(adminUid, personaId, analysisData);
            console.log(`[AnalysisController] Analysis saved to persona ${personaId}: ${savedDocId}`);
          } else {
            // Save to user's root collection (legacy)
            savedDocId = await saveAnalysis(adminUid, analysisData);
            console.log(`[AnalysisController] Analysis saved to Firestore: ${savedDocId}`);
          }
        } catch (saveError) {
          console.error('[AnalysisController] Failed to save to Firestore:', saveError.message);
          // Don't fail the request if save fails, just log it
        }
      }

      // Return successful response
      return res.status(200).json({
        success: true,
        analysis: {
          sentiment: analysis.sentiment,
          personality_traits: analysis.personality_traits,
          confidence: analysis.confidence
        },
        metadata: {
          text_length: text.length,
          analyzed_at: new Date().toISOString(),
          saved: !!savedDocId,
          document_id: savedDocId,
          vector_id: vectorDocId,
          user_id: adminUid,
          persona_id: personaId || null,
          rag_enabled: contextUsed,
          context_memories: relevantMemories.length
        },
        context: contextUsed ? {
          memories_used: relevantMemories.length,
          memories: relevantMemories.map(m => ({
            similarity: m.similarity,
            sentiment: m.metadata.sentiment,
            timestamp: m.metadata.timestamp,
            persona_id: m.metadata.personaId || null
          }))
        } : null
      });

    } catch (error) {
      console.error('[AnalysisController] Analysis error:', error.message);

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message.includes('timeout')) {
        statusCode = 504;
      } else if (error.message.includes('Cannot connect')) {
        statusCode = 503;
      } else if (error.message.includes('too long')) {
        statusCode = 400;
      }

      return res.status(statusCode).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Batch analyze multiple texts
   */
  async batchAnalyze(req, res) {
    try {
      const { texts } = req.body;

      if (!texts) {
        return res.status(400).json({
          success: false,
          error: 'Texts array is required in request body'
        });
      }

      if (!Array.isArray(texts)) {
        return res.status(400).json({
          success: false,
          error: 'Texts must be an array'
        });
      }

      if (texts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Texts array cannot be empty'
        });
      }

      console.log(`[AnalysisController] Batch analyzing ${texts.length} texts`);

      // Call service layer
      const results = await analysisService.batchAnalyze(texts);

      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      return res.status(200).json({
        success: true,
        results: results,
        summary: {
          total: texts.length,
          successful: successful,
          failed: failed
        }
      });

    } catch (error) {
      console.error('[AnalysisController] Batch analysis error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get Ollama status
   */
  async getStatus(req, res) {
    try {
      const status = await analysisService.checkOllamaStatus();

      if (!status.available) {
        return res.status(503).json({
          success: false,
          error: 'Ollama is not available',
          status: status
        });
      }

      return res.status(200).json({
        success: true,
        status: status
      });

    } catch (error) {
      console.error('[AnalysisController] Status check error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's analysis history
   * Requires authentication
   */
  async getHistory(req, res) {
    try {
      const userId = req.user.uid;
      const limit = parseInt(req.query.limit) || 10;

      console.log(`[AnalysisController] Fetching history for user: ${req.user.email}`);

      const analyses = await getUserAnalyses(userId, limit);

      return res.status(200).json({
        success: true,
        count: analyses.length,
        analyses: analyses
      });

    } catch (error) {
      console.error('[AnalysisController] Failed to get history:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get user's memory count from ChromaDB
   * Requires authentication
   */
  async getMemoryCount(req, res) {
    try {
      const userId = req.user.uid;

      if (!vectorService.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Vector service not available'
        });
      }

      const count = await vectorService.getMemoryCount(userId);

      return res.status(200).json({
        success: true,
        memory_count: count,
        user_id: userId
      });

    } catch (error) {
      console.error('[AnalysisController] Failed to get memory count:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete user's memories from ChromaDB
   * Requires authentication
   */
  async deleteMemories(req, res) {
    try {
      const userId = req.user.uid;
      const { memoryId } = req.body;

      if (!vectorService.isReady()) {
        return res.status(503).json({
          success: false,
          error: 'Vector service not available'
        });
      }

      const success = await vectorService.deleteMemory(userId, memoryId);

      if (success) {
        return res.status(200).json({
          success: true,
          message: memoryId ? 'Memory deleted successfully' : 'All memories deleted successfully'
        });
      } else {
        return res.status(500).json({
          success: false,
          error: 'Failed to delete memories'
        });
      }

    } catch (error) {
      console.error('[AnalysisController] Failed to delete memories:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get RAG status
   */
  async getRAGStatus(req, res) {
    try {
      const vectorStatus = vectorService.getStatus();
      const ollamaStatus = await analysisService.checkOllamaStatus();

      return res.status(200).json({
        success: true,
        rag: vectorStatus,
        ollama: ollamaStatus
      });

    } catch (error) {
      console.error('[AnalysisController] Failed to get RAG status:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete an analysis from history
   * Requires authentication
   */
  async deleteHistoryItem(req, res) {
    try {
      const userId = req.user.uid;
      const { analysisId } = req.params;

      if (!analysisId) {
        return res.status(400).json({
          success: false,
          error: 'Analysis ID is required'
        });
      }

      console.log(`[AnalysisController] Deleting analysis ${analysisId} for user: ${req.user.email}`);

      await deleteAnalysis(userId, analysisId);

      return res.status(200).json({
        success: true,
        message: 'Analysis deleted successfully'
      });

    } catch (error) {
      console.error('[AnalysisController] Failed to delete analysis:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Combined transcribe and analyze endpoint
   * (For future integration with audio transcription)
   */
  async transcribeAndAnalyze(req, res) {
    try {
      // This would integrate with aiService.transcribeAudio
      // For now, return not implemented
      return res.status(501).json({
        success: false,
        error: 'Transcribe and analyze endpoint not yet implemented',
        message: 'Use POST /api/ai/transcribe followed by POST /api/analysis/analyze'
      });

    } catch (error) {
      console.error('[AnalysisController] Transcribe and analyze error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new AnalysisController();
