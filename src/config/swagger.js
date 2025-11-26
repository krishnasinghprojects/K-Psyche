const swaggerJsdoc = require('swagger-jsdoc');

/**
 * Swagger/OpenAPI Configuration
 */
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'K-Psyche Backend API',
      version: '1.0.0',
      description: `
# K-Psyche Backend API

A comprehensive Persona Intelligence Dashboard with AI-powered analysis, RAG memory, and secure authentication.

## Features

- **Audio Transcription**: Convert audio to text using faster-whisper
- **Text Analysis**: Sentiment and personality trait analysis using Ollama
- **Persona Management**: Manage multiple personas (people being analyzed)
- **RAG Memory**: Context-aware insights using ChromaDB vector search
- **Query Engine**: Ask questions about personas using natural language
- **Firebase Auth**: Secure authentication with Firebase ID tokens

## Authentication

Most endpoints require Firebase authentication. Include your Firebase ID token in the Authorization header:

\`\`\`
Authorization: Bearer YOUR_FIREBASE_ID_TOKEN
\`\`\`

To get an ID token:
1. Sign in to your Firebase app
2. Call: \`firebase.auth().currentUser.getIdToken()\`
3. Use the returned token in API requests

## Getting Started

1. Create a persona: \`POST /api/personas/create\`
2. Analyze text for that persona: \`POST /api/analysis/analyze\`
3. Query the persona: \`POST /api/personas/:personaId/ask\`
4. View statistics: \`GET /api/personas/:personaId/stats\`

## External Services

- **Firebase**: Authentication and Firestore database
- **Ollama**: LLM for analysis and embeddings (localhost:11434)
- **ChromaDB**: Vector database for RAG (localhost:8000)
- **Python**: faster-whisper for audio transcription
      `,
      contact: {
        name: 'K-Psyche API Support',
        email: 'support@k-psyche.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://api.k-psyche.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Firebase ID Token. Get it from: firebase.auth().currentUser.getIdToken()'
        }
      },
      schemas: {
        Persona: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Unique persona identifier',
              example: 'persona123abc'
            },
            name: {
              type: 'string',
              description: 'Persona name',
              example: 'John Doe'
            },
            relationship: {
              type: 'string',
              description: 'Relationship to user',
              example: 'Client'
            },
            summary: {
              type: 'string',
              description: 'Brief summary of persona',
              example: 'Tech startup founder, analytical personality'
            },
            notes: {
              type: 'string',
              description: 'Additional notes',
              example: 'Met at conference 2024'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization',
              example: ['client', 'tech', 'startup']
            },
            analysisCount: {
              type: 'number',
              description: 'Number of analyses performed',
              example: 15
            },
            lastAnalyzedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last analysis timestamp',
              example: '2024-01-15T14:30:00.000Z'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-10T10:00:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2024-01-15T14:30:00.000Z'
            }
          }
        },
        Analysis: {
          type: 'object',
          properties: {
            sentiment: {
              type: 'string',
              enum: ['Positive', 'Negative', 'Neutral', 'Anxious', 'Sad', 'Angry', 'Excited'],
              description: 'Detected sentiment',
              example: 'Positive'
            },
            personality_traits: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Assertive', 'Curious', 'Empathetic', 'Analytical', 'Creative', 'Cautious', 'Confident', 'Introverted', 'Extroverted', 'Optimistic', 'Pessimistic', 'Thoughtful', 'Impulsive', 'Reserved', 'Expressive']
              },
              description: 'Detected personality traits (2-4 traits)',
              example: ['Optimistic', 'Confident', 'Analytical']
            },
            confidence: {
              type: 'string',
              enum: ['low', 'medium', 'high'],
              description: 'Confidence level of analysis',
              example: 'high'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Invalid request'
            },
            details: {
              type: 'string',
              description: 'Additional error details (development only)'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Unauthorized',
                message: 'No authorization header provided. Include "Authorization: Bearer <token>"'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Persona not found'
              }
            }
          }
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                success: false,
                error: 'Internal server error'
              }
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'System',
        description: 'System health and status endpoints'
      },
      {
        name: 'Personas',
        description: 'Persona management operations'
      },
      {
        name: 'Analysis',
        description: 'Text analysis and RAG operations'
      },
      {
        name: 'Audio',
        description: 'Audio transcription operations'
      },
      {
        name: 'Query',
        description: 'Persona query engine (RAG-based Q&A)'
      }
    ]
  },
  apis: ['./src/routes/*.js', './server.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
