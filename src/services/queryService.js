const vectorService = require('./vectorService');
const personaService = require('./personaService');

/**
 * Query Service - RAG-based persona question answering
 */
class QueryService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10);
    this.contextLimit = parseInt(process.env.RAG_QUERY_CONTEXT_LIMIT || '5', 10);
  }

  /**
   * Query a persona with a question using RAG
   * @param {string} userId - User ID (admin)
   * @param {string} personaId - Persona ID
   * @param {string} question - User's question
   * @returns {Promise<Object>} Answer and context
   */
  async queryPersona(userId, personaId, question) {
    if (!userId || !personaId || !question) {
      throw new Error('userId, personaId, and question are required');
    }

    if (typeof question !== 'string' || question.trim().length === 0) {
      throw new Error('Question must be a non-empty string');
    }

    console.log(`[QueryService] Querying persona ${personaId} with question: "${question.substring(0, 50)}..."`);

    try {
      // STEP 1: CONTEXT RETRIEVAL - Get relevant memories from ChromaDB
      let relevantMemories = [];
      let contextUsed = false;

      if (vectorService.isReady()) {
        try {
          relevantMemories = await vectorService.searchMemory(
            userId,
            question,
            this.contextLimit,
            personaId
          );
          
          if (relevantMemories.length > 0) {
            console.log(`[QueryService] Found ${relevantMemories.length} relevant memories`);
            contextUsed = true;
          } else {
            console.log(`[QueryService] No relevant memories found for persona ${personaId}`);
          }
        } catch (error) {
          console.error('[QueryService] Failed to retrieve memories:', error.message);
          // Continue without context
        }
      } else {
        throw new Error('Vector service not available. Cannot query persona without RAG context.');
      }

      // STEP 2: PROFILE FETCH - Get persona details
      let persona = null;
      try {
        persona = await personaService.getPersonaDetails(userId, personaId);
        console.log(`[QueryService] Retrieved persona: ${persona.name}`);
      } catch (error) {
        console.error('[QueryService] Failed to fetch persona:', error.message);
        throw new Error(`Persona not found: ${error.message}`);
      }

      // STEP 3: PROMPT ENGINEERING - Construct RAG prompt
      const prompt = this._buildQueryPrompt(persona, relevantMemories, question);

      // STEP 4: GENERATION - Call Ollama
      const answer = await this._callOllama(prompt);

      console.log(`[QueryService] Generated answer (${answer.length} chars)`);

      return {
        answer: answer,
        context_used: relevantMemories.map(m => ({
          text: m.text,
          sentiment: m.metadata.sentiment,
          traits: m.metadata.personality_traits,
          timestamp: m.metadata.timestamp,
          similarity: m.similarity
        })),
        persona: {
          id: persona.id,
          name: persona.name,
          relationship: persona.relationship
        },
        metadata: {
          memories_used: relevantMemories.length,
          has_context: contextUsed,
          model_used: this.model
        }
      };

    } catch (error) {
      console.error('[QueryService] Query failed:', error.message);
      throw new Error(`Failed to query persona: ${error.message}`);
    }
  }

  /**
   * Build RAG prompt for persona query
   * @private
   */
  _buildQueryPrompt(persona, memories, question) {
    const personaName = persona.name || 'Unknown';
    const personaSummary = persona.summary || 'No summary available';
    const personaRelationship = persona.relationship || 'Unknown';

    // Format context from memories
    let contextSection = '';
    if (memories && memories.length > 0) {
      const contextParts = memories.map((memory, index) => {
        const sentiment = memory.metadata.sentiment || 'Unknown';
        const traits = memory.metadata.personality_traits || [];
        const timestamp = memory.metadata.timestamp || '';
        const similarity = (memory.similarity * 100).toFixed(1);

        return `[Context ${index + 1}] (Relevance: ${similarity}%)
Text: "${memory.text}"
Sentiment: ${sentiment}
Personality Traits: ${traits.join(', ')}
Date: ${new Date(timestamp).toLocaleDateString()}`;
      });

      contextSection = `\n\nRELEVANT BEHAVIORAL CONTEXT:\n${contextParts.join('\n\n')}`;
    } else {
      contextSection = '\n\nRELEVANT BEHAVIORAL CONTEXT:\nNo previous analyses available for this persona.';
    }

    const prompt = `You are an expert Behavioral Analyst with deep expertise in psychology and personality assessment.

TARGET SUBJECT:
Name: ${personaName}
Relationship: ${personaRelationship}
Summary: ${personaSummary}
${contextSection}

USER QUESTION:
"${question}"

INSTRUCTIONS:
1. Answer the question using ONLY the behavioral context provided above.
2. Cite specific traits, sentiments, or patterns from the context when possible.
3. If the context doesn't contain enough information to answer the question, clearly state that.
4. Be specific and reference the actual data points from the context.
5. Maintain a professional, analytical tone.
6. Do NOT make assumptions beyond what the context shows.

ANSWER:`;

    return prompt;
  }

  /**
   * Call Ollama API for generation
   * @private
   */
  async _callOllama(prompt) {
    const url = `${this.ollamaUrl}/api/generate`;

    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower for more factual responses
        top_p: 0.9,
        num_predict: 500 // Allow longer responses for detailed answers
      }
    };

    console.log(`[QueryService] Calling Ollama at ${url}`);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.response) {
        throw new Error('Ollama returned empty response');
      }

      return data.response.trim();

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Ollama request timeout (${this.timeout}ms exceeded)`);
      }

      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Ollama at ${this.ollamaUrl}. Is Ollama running?`);
      }

      throw error;
    }
  }

  /**
   * Batch query multiple questions for a persona
   * @param {string} userId - User ID
   * @param {string} personaId - Persona ID
   * @param {Array<string>} questions - Array of questions
   * @returns {Promise<Array>} Array of answers
   */
  async batchQueryPersona(userId, personaId, questions) {
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Questions must be a non-empty array');
    }

    if (questions.length > 5) {
      throw new Error('Maximum 5 questions per batch');
    }

    console.log(`[QueryService] Batch querying ${questions.length} questions for persona ${personaId}`);

    const results = [];
    for (let i = 0; i < questions.length; i++) {
      try {
        const result = await this.queryPersona(userId, personaId, questions[i]);
        results.push({
          success: true,
          question: questions[i],
          ...result
        });
      } catch (error) {
        results.push({
          success: false,
          question: questions[i],
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get suggested questions for a persona based on their data
   * @param {string} userId - User ID
   * @param {string} personaId - Persona ID
   * @returns {Promise<Array<string>>} Suggested questions
   */
  async getSuggestedQuestions(userId, personaId) {
    try {
      const persona = await personaService.getPersonaDetails(userId, personaId);
      const stats = await personaService.getPersonaStats(userId, personaId);

      const suggestions = [
        `What are ${persona.name}'s dominant personality traits?`,
        `How has ${persona.name}'s sentiment changed over time?`,
        `What patterns do you see in ${persona.name}'s behavior?`
      ];

      // Add sentiment-specific questions
      if (stats.sentimentDistribution) {
        const topSentiment = Object.keys(stats.sentimentDistribution)[0];
        if (topSentiment) {
          suggestions.push(`Why does ${persona.name} often feel ${topSentiment.toLowerCase()}?`);
        }
      }

      // Add trait-specific questions
      if (stats.topTraits && stats.topTraits.length > 0) {
        const topTrait = stats.topTraits[0].trait;
        suggestions.push(`How does ${persona.name}'s ${topTrait.toLowerCase()} trait manifest?`);
      }

      return suggestions;

    } catch (error) {
      console.error('[QueryService] Failed to generate suggestions:', error.message);
      return [
        'What are the dominant personality traits?',
        'How has the sentiment changed over time?',
        'What behavioral patterns are evident?'
      ];
    }
  }
}

module.exports = new QueryService();
