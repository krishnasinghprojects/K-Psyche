/**
 * Analysis Service - Text sentiment and personality analysis using Ollama
 */
class AnalysisService {
  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.1:8b';
    this.timeout = parseInt(process.env.OLLAMA_TIMEOUT || '30000', 10);
  }

  /**
   * Analyze text for sentiment and personality traits with optional RAG context
   * @param {string} text - Text to analyze
   * @param {string} context - Optional RAG context from past memories
   * @returns {Promise<Object>} Analysis result with sentiment and personality_traits
   */
  async analyzeText(text, context = '') {
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Text is required and must be a non-empty string');
    }

    // Check if text is too long (Ollama context limit)
    const maxLength = 4000; // Conservative limit for context window
    if (text.length > maxLength) {
      throw new Error(`Text too long. Maximum ${maxLength} characters allowed.`);
    }

    const hasContext = context && context.trim().length > 0;
    console.log(`[AnalysisService] Analyzing text (${text.length} chars) with ${this.model}${hasContext ? ' [RAG enabled]' : ''}`);

    // Create prompt for structured JSON output (with optional context)
    const prompt = this._buildAnalysisPrompt(text, context);

    try {
      // Call Ollama API
      const response = await this._callOllama(prompt);

      // Parse and validate response
      const analysis = this._parseAnalysisResponse(response);

      console.log(`[AnalysisService] Analysis complete: ${analysis.sentiment}`);
      return analysis;

    } catch (error) {
      console.error(`[AnalysisService] Analysis failed:`, error.message);
      throw new Error(`Text analysis failed: ${error.message}`);
    }
  }

  /**
   * Build analysis prompt with strict JSON output instructions and optional RAG context
   * @private
   */
  _buildAnalysisPrompt(text, context = '') {
    const basePrompt = `You are a psychological text analyzer. Analyze the following text and respond ONLY with valid JSON (no markdown, no explanations).`;

    const contextSection = context ? `

${context}

Use the past context above to provide more personalized and consistent analysis. Consider patterns and changes over time.` : '';

    return `${basePrompt}${contextSection}

Text to analyze:
"""
${text}
"""

Respond with this exact JSON structure:
{
  "sentiment": "<one of: Positive, Negative, Neutral, Anxious, Sad, Angry, Excited>",
  "personality_traits": ["<trait1>", "<trait2>", "<trait3>"]
}

Personality traits should be from: Assertive, Curious, Empathetic, Analytical, Creative, Cautious, Confident, Introverted, Extroverted, Optimistic, Pessimistic, Thoughtful, Impulsive, Reserved, Expressive.

Select 2-4 most prominent traits. Respond ONLY with the JSON object, nothing else.`;
  }

  /**
   * Call Ollama API
   * @private
   */
  async _callOllama(prompt) {
    const url = `${this.ollamaUrl}/api/generate`;
    
    const payload = {
      model: this.model,
      prompt: prompt,
      stream: false,
      options: {
        temperature: 0.3, // Lower temperature for more consistent JSON
        top_p: 0.9,
        num_predict: 200 // Limit response length
      }
    };

    console.log(`[AnalysisService] Calling Ollama at ${url}`);

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

      return data.response;

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
   * Parse and validate Ollama response
   * @private
   */
  _parseAnalysisResponse(response) {
    // Clean response - remove markdown code blocks if present
    let cleaned = response.trim();
    
    // Remove markdown JSON blocks
    cleaned = cleaned.replace(/```json\s*/g, '');
    cleaned = cleaned.replace(/```\s*/g, '');
    
    // Extract JSON if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (error) {
      console.error('[AnalysisService] Failed to parse JSON:', cleaned);
      throw new Error('LLM did not return valid JSON. Please try again.');
    }

    // Validate structure
    if (!parsed.sentiment || !Array.isArray(parsed.personality_traits)) {
      throw new Error('Invalid analysis format. Missing required fields.');
    }

    // Validate sentiment
    const validSentiments = [
      'Positive', 'Negative', 'Neutral', 'Anxious', 
      'Sad', 'Angry', 'Excited'
    ];
    
    if (!validSentiments.includes(parsed.sentiment)) {
      console.warn(`[AnalysisService] Unexpected sentiment: ${parsed.sentiment}`);
      // Don't throw, just log warning
    }

    // Validate personality traits
    if (parsed.personality_traits.length === 0) {
      throw new Error('No personality traits detected');
    }

    return {
      sentiment: parsed.sentiment,
      personality_traits: parsed.personality_traits,
      confidence: parsed.confidence || 'medium' // Optional field
    };
  }

  /**
   * Check if Ollama is available
   * @returns {Promise<Object>} Ollama status
   */
  async checkOllamaStatus() {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        throw new Error(`Ollama returned status ${response.status}`);
      }

      const data = await response.json();
      const models = data.models || [];
      const modelAvailable = models.some(m => m.name.includes(this.model.split(':')[0]));

      return {
        available: true,
        url: this.ollamaUrl,
        model: this.model,
        modelLoaded: modelAvailable,
        installedModels: models.map(m => m.name)
      };

    } catch (error) {
      return {
        available: false,
        url: this.ollamaUrl,
        model: this.model,
        error: error.message
      };
    }
  }

  /**
   * Batch analyze multiple texts
   * @param {Array<string>} texts - Array of texts to analyze
   * @returns {Promise<Array<Object>>} Array of analysis results
   */
  async batchAnalyze(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts must be a non-empty array');
    }

    if (texts.length > 10) {
      throw new Error('Maximum 10 texts per batch');
    }

    console.log(`[AnalysisService] Batch analyzing ${texts.length} texts`);

    // Process sequentially to avoid overwhelming Ollama
    const results = [];
    for (let i = 0; i < texts.length; i++) {
      try {
        const result = await this.analyzeText(texts[i]);
        results.push({ success: true, index: i, ...result });
      } catch (error) {
        results.push({ success: false, index: i, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new AnalysisService();
