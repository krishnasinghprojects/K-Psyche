const personaService = require('../services/personaService');
const vectorService = require('../services/vectorService');
const queryService = require('../services/queryService');

/**
 * Persona Controller - Handles persona management requests
 */
class PersonaController {
  /**
   * Create a new persona
   */
  async createPersona(req, res) {
    try {
      const adminUid = req.user.uid;
      const { name, relationship, summary, notes, tags } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Persona name is required'
        });
      }

      console.log(`[PersonaController] Creating persona for user: ${req.user.email}`);

      const persona = await personaService.createPersona(adminUid, {
        name,
        relationship,
        summary,
        notes,
        tags
      });

      return res.status(201).json({
        success: true,
        persona: persona
      });

    } catch (error) {
      console.error('[PersonaController] Create persona error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get all personas
   */
  async getPersonas(req, res) {
    try {
      const adminUid = req.user.uid;
      const { limit, orderBy, order } = req.query;

      const personas = await personaService.getPersonas(adminUid, {
        limit: limit ? parseInt(limit) : undefined,
        orderBy,
        order
      });

      return res.status(200).json({
        success: true,
        count: personas.length,
        personas: personas
      });

    } catch (error) {
      console.error('[PersonaController] Get personas error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get persona details
   */
  async getPersonaDetails(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      const persona = await personaService.getPersonaDetails(adminUid, personaId);

      return res.status(200).json({
        success: true,
        persona: persona
      });

    } catch (error) {
      console.error('[PersonaController] Get persona details error:', error.message);

      const statusCode = error.message.includes('not found') ? 404 : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update persona
   */
  async updatePersona(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;
      const updates = req.body;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      const persona = await personaService.updatePersona(adminUid, personaId, updates);

      return res.status(200).json({
        success: true,
        persona: persona
      });

    } catch (error) {
      console.error('[PersonaController] Update persona error:', error.message);

      const statusCode = error.message.includes('not found') ? 404 : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete persona
   */
  async deletePersona(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      // Delete persona from Firestore
      await personaService.deletePersona(adminUid, personaId);

      // Delete persona's memories from ChromaDB
      if (vectorService.isReady()) {
        await vectorService.deleteMemory(adminUid, null, personaId);
      }

      return res.status(200).json({
        success: true,
        message: 'Persona deleted successfully'
      });

    } catch (error) {
      console.error('[PersonaController] Delete persona error:', error.message);

      const statusCode = error.message.includes('not found') ? 404 : 500;

      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get persona's analyses
   */
  async getPersonaAnalyses(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      const analyses = await personaService.getPersonaAnalyses(adminUid, personaId, limit);

      return res.status(200).json({
        success: true,
        count: analyses.length,
        analyses: analyses
      });

    } catch (error) {
      console.error('[PersonaController] Get persona analyses error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get persona statistics
   */
  async getPersonaStats(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      const stats = await personaService.getPersonaStats(adminUid, personaId);

      return res.status(200).json({
        success: true,
        stats: stats
      });

    } catch (error) {
      console.error('[PersonaController] Get persona stats error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Ask a question about a persona (RAG-based query)
   */
  async askQuestion(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;
      const { question } = req.body;

      // Validate inputs
      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      if (!question) {
        return res.status(400).json({
          success: false,
          error: 'Question is required in request body'
        });
      }

      if (typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Question must be a non-empty string'
        });
      }

      if (question.length > 500) {
        return res.status(400).json({
          success: false,
          error: 'Question too long. Maximum 500 characters.'
        });
      }

      console.log(`[PersonaController] User ${req.user.email} asking about persona ${personaId}: "${question.substring(0, 50)}..."`);

      // Query the persona using RAG
      const result = await queryService.queryPersona(adminUid, personaId, question);

      return res.status(200).json({
        success: true,
        question: question,
        answer: result.answer,
        context_used: result.context_used,
        persona: result.persona,
        metadata: result.metadata
      });

    } catch (error) {
      console.error('[PersonaController] Ask question error:', error.message);

      // Determine appropriate status code
      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('not available')) {
        statusCode = 503;
      } else if (error.message.includes('timeout')) {
        statusCode = 504;
      }

      return res.status(statusCode).json({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * Batch ask multiple questions about a persona
   */
  async batchAskQuestions(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;
      const { questions } = req.body;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      if (!questions || !Array.isArray(questions)) {
        return res.status(400).json({
          success: false,
          error: 'Questions must be an array'
        });
      }

      console.log(`[PersonaController] Batch asking ${questions.length} questions for persona ${personaId}`);

      const results = await queryService.batchQueryPersona(adminUid, personaId, questions);

      return res.status(200).json({
        success: true,
        results: results,
        summary: {
          total: questions.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });

    } catch (error) {
      console.error('[PersonaController] Batch ask questions error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get suggested questions for a persona
   */
  async getSuggestedQuestions(req, res) {
    try {
      const adminUid = req.user.uid;
      const { personaId } = req.params;

      if (!personaId) {
        return res.status(400).json({
          success: false,
          error: 'Persona ID is required'
        });
      }

      const suggestions = await queryService.getSuggestedQuestions(adminUid, personaId);

      return res.status(200).json({
        success: true,
        suggestions: suggestions
      });

    } catch (error) {
      console.error('[PersonaController] Get suggested questions error:', error.message);

      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new PersonaController();
