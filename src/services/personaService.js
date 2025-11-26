const { getFirestore } = require('../config/firebase');

/**
 * Persona Service - Manage personas (people being analyzed)
 */
class PersonaService {
  constructor() {
    this.db = getFirestore();
  }

  /**
   * Create a new persona
   * @param {string} adminUid - Admin user ID
   * @param {Object} data - Persona data
   * @returns {Promise<Object>} Created persona with ID
   */
  async createPersona(adminUid, data) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    // Validate required fields
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Persona name is required');
    }

    // Prepare persona data
    const personaData = {
      name: data.name.trim(),
      relationship: data.relationship || 'Unknown',
      summary: data.summary || '',
      notes: data.notes || '',
      tags: data.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      analysisCount: 0,
      lastAnalyzedAt: null
    };

    try {
      // Create persona document
      const personaRef = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc();

      await personaRef.set(personaData);

      console.log(`[PersonaService] Created persona ${personaRef.id} for user ${adminUid}`);

      return {
        id: personaRef.id,
        ...personaData
      };

    } catch (error) {
      console.error('[PersonaService] Failed to create persona:', error.message);
      throw new Error(`Failed to create persona: ${error.message}`);
    }
  }

  /**
   * Get all personas for a user
   * @param {string} adminUid - Admin user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of personas
   */
  async getPersonas(adminUid, options = {}) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    const { limit = 50, orderBy = 'createdAt', order = 'desc' } = options;

    try {
      let query = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .orderBy(orderBy, order)
        .limit(limit);

      const snapshot = await query.get();

      const personas = [];
      snapshot.forEach(doc => {
        personas.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`[PersonaService] Retrieved ${personas.length} personas for user ${adminUid}`);
      return personas;

    } catch (error) {
      console.error('[PersonaService] Failed to get personas:', error.message);
      throw new Error(`Failed to get personas: ${error.message}`);
    }
  }

  /**
   * Get persona details by ID
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @returns {Promise<Object>} Persona details
   */
  async getPersonaDetails(adminUid, personaId) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const personaDoc = await this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc(personaId)
        .get();

      if (!personaDoc.exists) {
        throw new Error('Persona not found');
      }

      return {
        id: personaDoc.id,
        ...personaDoc.data()
      };

    } catch (error) {
      console.error('[PersonaService] Failed to get persona details:', error.message);
      throw new Error(`Failed to get persona details: ${error.message}`);
    }
  }

  /**
   * Update persona
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated persona
   */
  async updatePersona(adminUid, personaId, updates) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const personaRef = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc(personaId);

      // Check if persona exists
      const personaDoc = await personaRef.get();
      if (!personaDoc.exists) {
        throw new Error('Persona not found');
      }

      // Prepare updates
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.createdAt;
      delete updateData.analysisCount;

      await personaRef.update(updateData);

      console.log(`[PersonaService] Updated persona ${personaId}`);

      return {
        id: personaId,
        ...personaDoc.data(),
        ...updateData
      };

    } catch (error) {
      console.error('[PersonaService] Failed to update persona:', error.message);
      throw new Error(`Failed to update persona: ${error.message}`);
    }
  }

  /**
   * Delete persona
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @returns {Promise<boolean>} Success status
   */
  async deletePersona(adminUid, personaId) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const personaRef = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc(personaId);

      // Check if persona exists
      const personaDoc = await personaRef.get();
      if (!personaDoc.exists) {
        throw new Error('Persona not found');
      }

      // Delete persona document
      await personaRef.delete();

      // Note: Analyses subcollection will need to be deleted separately
      // or use a Cloud Function for cascading deletes

      console.log(`[PersonaService] Deleted persona ${personaId}`);
      return true;

    } catch (error) {
      console.error('[PersonaService] Failed to delete persona:', error.message);
      throw new Error(`Failed to delete persona: ${error.message}`);
    }
  }

  /**
   * Save analysis to persona's subcollection
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @param {Object} analysisData - Analysis data
   * @returns {Promise<string>} Analysis document ID
   */
  async saveAnalysis(adminUid, personaId, analysisData) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      // Add analysis to persona's subcollection
      const analysisRef = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc(personaId)
        .collection('analyses')
        .doc();

      const analysisDoc = {
        ...analysisData,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      await analysisRef.set(analysisDoc);

      // Update persona's analysis count and last analyzed time
      const personaRef = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc(personaId);

      await personaRef.update({
        analysisCount: (await personaRef.get()).data().analysisCount + 1,
        lastAnalyzedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      console.log(`[PersonaService] Saved analysis ${analysisRef.id} for persona ${personaId}`);
      return analysisRef.id;

    } catch (error) {
      console.error('[PersonaService] Failed to save analysis:', error.message);
      throw new Error(`Failed to save analysis: ${error.message}`);
    }
  }

  /**
   * Get persona's analyses
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @param {number} limit - Number of analyses to retrieve
   * @returns {Promise<Array>} List of analyses
   */
  async getPersonaAnalyses(adminUid, personaId, limit = 10) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const analysesRef = this.db
        .collection('users')
        .doc(adminUid)
        .collection('personas')
        .doc(personaId)
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
      console.error('[PersonaService] Failed to get persona analyses:', error.message);
      throw new Error(`Failed to get persona analyses: ${error.message}`);
    }
  }

  /**
   * Get persona statistics
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @returns {Promise<Object>} Statistics
   */
  async getPersonaStats(adminUid, personaId) {
    if (!this.db) {
      throw new Error('Firestore not initialized');
    }

    try {
      const analyses = await this.getPersonaAnalyses(adminUid, personaId, 100);

      // Calculate statistics
      const sentiments = {};
      const traits = {};

      analyses.forEach(analysis => {
        // Count sentiments
        if (analysis.sentiment) {
          sentiments[analysis.sentiment] = (sentiments[analysis.sentiment] || 0) + 1;
        }

        // Count personality traits
        if (analysis.personality_traits) {
          analysis.personality_traits.forEach(trait => {
            traits[trait] = (traits[trait] || 0) + 1;
          });
        }
      });

      return {
        totalAnalyses: analyses.length,
        sentimentDistribution: sentiments,
        topTraits: Object.entries(traits)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([trait, count]) => ({ trait, count })),
        recentAnalyses: analyses.slice(0, 5)
      };

    } catch (error) {
      console.error('[PersonaService] Failed to get persona stats:', error.message);
      throw new Error(`Failed to get persona stats: ${error.message}`);
    }
  }
}

module.exports = new PersonaService();
