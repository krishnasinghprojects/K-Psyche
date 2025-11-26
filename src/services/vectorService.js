const { ChromaClient } = require('chromadb');

/**
 * Vector Service - Handles ChromaDB operations for RAG
 * Stores and retrieves user memories using embeddings
 */
class VectorService {
  constructor() {
    this.client = null;
    this.collection = null;
    this.isInitialized = false;
    this.initializationError = null;

    // Configuration
    this.chromaUrl = process.env.CHROMADB_URL || 'http://localhost:8000';
    this.collectionName = process.env.CHROMADB_COLLECTION || 'k_psyche_memories';
    this.embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.ragEnabled = process.env.RAG_ENABLED !== 'false';
    this.contextLimit = parseInt(process.env.RAG_CONTEXT_LIMIT || '3', 10);
    this.similarityThreshold = parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7');

    // Initialize on construction
    this.initialize();
  }

  /**
   * Initialize ChromaDB connection
   */
  async initialize() {
    if (this.isInitialized) {
      return { success: true, collection: this.collection };
    }

    if (!this.ragEnabled) {
      console.log('[VectorService] RAG disabled via configuration');
      return { success: false, error: 'RAG disabled' };
    }

    try {
      console.log(`[VectorService] Connecting to ChromaDB at ${this.chromaUrl}`);

      // Create ChromaDB client
      this.client = new ChromaClient({ path: this.chromaUrl });

      // Test connection
      await this.client.heartbeat();

      // Get or create collection
      try {
        this.collection = await this.client.getCollection({
          name: this.collectionName
        });
        console.log(`[VectorService] Using existing collection: ${this.collectionName}`);
      } catch (error) {
        // Collection doesn't exist, create it
        this.collection = await this.client.createCollection({
          name: this.collectionName,
          metadata: {
            description: 'K-Psyche user memories and analysis history',
            'hnsw:space': 'cosine'
          }
        });
        console.log(`[VectorService] Created new collection: ${this.collectionName}`);
      }

      this.isInitialized = true;
      console.log('[VectorService] ✅ ChromaDB connected successfully');
      console.log(`[VectorService] Embedding model: ${this.embeddingModel}`);
      console.log(`[VectorService] Context limit: ${this.contextLimit}`);

      return { success: true, collection: this.collection };

    } catch (error) {
      this.initializationError = error;
      console.error('[VectorService] ❌ Failed to connect to ChromaDB');
      console.error('[VectorService] Error:', error.message);
      console.warn('[VectorService] RAG features will be disabled');
      console.warn('[VectorService] To enable: Start ChromaDB with "docker run -p 8000:8000 chromadb/chroma"');

      return { success: false, error: error.message };
    }
  }

  /**
   * Generate embedding for text using Ollama
   * @param {string} text - Text to embed
   * @returns {Promise<Array<number>>} Embedding vector
   */
  async generateEmbedding(text) {
    if (!text || text.trim().length === 0) {
      throw new Error('Text is required for embedding generation');
    }

    try {
      const url = `${this.ollamaUrl}/api/embeddings`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: text.substring(0, 2000) // Limit to 2000 chars for embedding
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embeddings API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }

      return data.embedding;

    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.ollamaUrl}. Is Ollama running?`);
      }
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Save memory to ChromaDB (supports persona-specific memories)
   * @param {string} userId - User ID (admin)
   * @param {string} text - Text to store
   * @param {Object} metadata - Additional metadata
   * @param {string} metadata.personaId - Optional persona ID for filtering
   * @returns {Promise<string>} Document ID
   */
  async saveMemory(userId, text, metadata = {}) {
    if (!this.isInitialized) {
      console.warn('[VectorService] ChromaDB not initialized, skipping memory save');
      return null;
    }

    if (!userId || !text) {
      throw new Error('userId and text are required');
    }

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(text);

      // Create unique document ID
      const personaPrefix = metadata.personaId ? `${metadata.personaId}_` : '';
      const docId = `${userId}_${personaPrefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Prepare metadata
      const docMetadata = {
        userId: userId,
        personaId: metadata.personaId || null, // CRITICAL: For persona filtering
        text: text.substring(0, 1000), // Store first 1000 chars
        timestamp: new Date().toISOString(),
        type: metadata.type || 'analysis',
        ...metadata
      };

      // Add to collection
      await this.collection.add({
        ids: [docId],
        embeddings: [embedding],
        metadatas: [docMetadata],
        documents: [text.substring(0, 1000)]
      });

      const logMsg = metadata.personaId 
        ? `Memory saved for user ${userId}, persona ${metadata.personaId}: ${docId}`
        : `Memory saved for user ${userId}: ${docId}`;
      console.log(`[VectorService] ${logMsg}`);
      
      return docId;

    } catch (error) {
      console.error('[VectorService] Failed to save memory:', error.message);
      // Don't throw - gracefully degrade
      return null;
    }
  }

  /**
   * Add memory with persona context (alias for saveMemory)
   * @param {string} adminUid - Admin user ID
   * @param {string} personaId - Persona ID
   * @param {string} text - Text to store
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Document ID
   */
  async addMemory(adminUid, personaId, text, metadata = {}) {
    return this.saveMemory(adminUid, text, {
      ...metadata,
      personaId: personaId
    });
  }

  /**
   * Search for relevant memories (supports persona filtering)
   * @param {string} userId - User ID
   * @param {string} queryText - Query text
   * @param {number} limit - Number of results
   * @param {string} personaId - Optional persona ID to filter by
   * @returns {Promise<Array>} Relevant memories
   */
  async searchMemory(userId, queryText, limit = null, personaId = null) {
    if (!this.isInitialized) {
      console.warn('[VectorService] ChromaDB not initialized, returning empty context');
      return [];
    }

    if (!userId || !queryText) {
      throw new Error('userId and queryText are required');
    }

    const resultLimit = limit || this.contextLimit;

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(queryText);

      // Build where clause with optional persona filter
      const whereClause = personaId 
        ? { userId: userId, personaId: personaId } // CRITICAL: Filter by user AND persona
        : { userId: userId }; // Filter by user only

      // Query collection
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: resultLimit,
        where: whereClause
      });

      // Process results
      const memories = [];
      
      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances[0][i];
          const similarity = 1 - distance; // Convert distance to similarity

          // Filter by similarity threshold
          if (similarity >= this.similarityThreshold) {
            memories.push({
              id: results.ids[0][i],
              text: results.documents[0][i],
              metadata: results.metadatas[0][i],
              similarity: similarity,
              distance: distance
            });
          }
        }
      }

      const logMsg = personaId
        ? `Found ${memories.length} relevant memories for user ${userId}, persona ${personaId}`
        : `Found ${memories.length} relevant memories for user ${userId}`;
      console.log(`[VectorService] ${logMsg}`);
      
      return memories;

    } catch (error) {
      console.error('[VectorService] Failed to search memories:', error.message);
      // Don't throw - gracefully degrade
      return [];
    }
  }

  /**
   * Delete user's memories (supports persona filtering)
   * @param {string} userId - User ID
   * @param {string} memoryId - Optional specific memory ID
   * @param {string} personaId - Optional persona ID to filter by
   * @returns {Promise<boolean>} Success status
   */
  async deleteMemory(userId, memoryId = null, personaId = null) {
    if (!this.isInitialized) {
      console.warn('[VectorService] ChromaDB not initialized');
      return false;
    }

    try {
      if (memoryId) {
        // Delete specific memory
        await this.collection.delete({
          ids: [memoryId],
          where: { userId: userId } // Ensure user owns this memory
        });
        console.log(`[VectorService] Deleted memory ${memoryId} for user ${userId}`);
      } else if (personaId) {
        // Delete all memories for specific persona
        await this.collection.delete({
          where: { userId: userId, personaId: personaId }
        });
        console.log(`[VectorService] Deleted all memories for user ${userId}, persona ${personaId}`);
      } else {
        // Delete all user memories
        await this.collection.delete({
          where: { userId: userId }
        });
        console.log(`[VectorService] Deleted all memories for user ${userId}`);
      }

      return true;

    } catch (error) {
      console.error('[VectorService] Failed to delete memory:', error.message);
      return false;
    }
  }

  /**
   * Get user's memory count
   * @param {string} userId - User ID
   * @returns {Promise<number>} Number of memories
   */
  async getMemoryCount(userId) {
    if (!this.isInitialized) {
      return 0;
    }

    try {
      const results = await this.collection.get({
        where: { userId: userId }
      });

      return results.ids ? results.ids.length : 0;

    } catch (error) {
      console.error('[VectorService] Failed to get memory count:', error.message);
      return 0;
    }
  }

  /**
   * Check if ChromaDB is initialized
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Get service status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      ragEnabled: this.ragEnabled,
      chromaUrl: this.chromaUrl,
      collectionName: this.collectionName,
      embeddingModel: this.embeddingModel,
      contextLimit: this.contextLimit,
      similarityThreshold: this.similarityThreshold,
      error: this.initializationError ? this.initializationError.message : null
    };
  }

  /**
   * Format memories for prompt context
   * @param {Array} memories - Array of memory objects
   * @returns {string} Formatted context string
   */
  formatMemoriesForContext(memories) {
    if (!memories || memories.length === 0) {
      return '';
    }

    const contextParts = memories.map((memory, index) => {
      const sentiment = memory.metadata.sentiment || 'Unknown';
      const traits = memory.metadata.personality_traits || [];
      const timestamp = memory.metadata.timestamp || '';
      
      return `[Past Context ${index + 1}]
Text: "${memory.text}"
Previous Sentiment: ${sentiment}
Previous Traits: ${traits.join(', ')}
Date: ${new Date(timestamp).toLocaleDateString()}
Similarity: ${(memory.similarity * 100).toFixed(1)}%`;
    });

    return `\n\nRELEVANT PAST CONTEXT:\n${contextParts.join('\n\n')}`;
  }
}

module.exports = new VectorService();
