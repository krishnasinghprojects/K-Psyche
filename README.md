# K-Psyche Backend

Production-ready Persona Intelligence Dashboard with AI-powered analysis, RAG memory, and secure authentication.

## Features

- **Audio Transcription**: Convert audio to text using faster-whisper with CUDA acceleration
- **Text Analysis**: Sentiment and personality trait analysis using Ollama
- **Persona Management**: Manage multiple personas (people being analyzed)
- **RAG Memory**: Context-aware insights using ChromaDB vector search
- **Query Engine**: Ask questions about personas using natural language
- **Firebase Auth**: Secure authentication with Firebase ID tokens
- **Interactive API Docs**: Swagger UI for testing and documentation

## Quick Start

### 1. Install Dependencies

```bash
npm install
pip install -r requirements.txt
```

### 2. Setup External Services

- **Firebase**: See `FIREBASE_SETUP.md`
- **Ollama**: See `OLLAMA_SETUP.md`
- **ChromaDB**: See `CHROMADB_SETUP.md`

### 3. Configure Environment

Edit `.env` file with your credentials:

```env
PORT=3000
FIREBASE_PROJECT_ID=your-project-id
OLLAMA_BASE_URL=http://localhost:11434
CHROMA_URL=http://localhost:8000
```

### 4. Start the Server

```bash
npm start
```

### 5. Access API Documentation

Open your browser to:
```
http://localhost:3000/api-docs
```

## Architecture

This backend follows a strict **MVC (Model-View-Controller)** pattern:

- **Routes** (`src/routes/`): Define API endpoints with Swagger documentation
- **Controllers** (`src/controllers/`): Handle requests and responses
- **Services** (`src/services/`): Business logic (AI, analysis, personas, RAG)
- **Config** (`src/config/`): Firebase, Swagger, and app configuration
- **Middleware** (`src/middleware/`): Authentication, uploads, error handling
- **Utilities** (`src/utils/`): Python executor for transcription

## API Documentation

All endpoints are documented with **Swagger/OpenAPI 3.0**. Access the interactive documentation at:

```
http://localhost:3000/api-docs
```

### Key Endpoints

#### System
- `GET /api/health` - Health check
- `GET /api-docs` - Interactive API documentation

#### Personas (Authentication Required)
- `POST /api/personas/create` - Create a new persona
- `GET /api/personas/list` - List all personas for user
- `GET /api/personas/:id` - Get persona details
- `GET /api/personas/:id/stats` - Get persona statistics
- `POST /api/personas/:id/ask` - Ask questions about persona

#### Analysis (Authentication Required)
- `POST /api/analysis/analyze` - Analyze text with sentiment and traits
- `GET /api/analysis/rag-status` - Check RAG system status

#### Audio
- `POST /api/ai/transcribe` - Transcribe audio to text

### Authentication

Most endpoints require Firebase authentication. Include your Firebase ID token:

```bash
curl -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN" \
  http://localhost:3000/api/personas/list
```

Get your token in the frontend:
```javascript
const idToken = await firebase.auth().currentUser.getIdToken();
```

## Technology Stack

### Backend
- **Node.js + Express**: REST API server
- **Firebase**: Authentication and Firestore database
- **Swagger**: Interactive API documentation

### AI/ML
- **Ollama**: LLM for text analysis and embeddings (llama3.2, nomic-embed-text)
- **faster-whisper**: Audio transcription with CUDA acceleration
- **ChromaDB**: Vector database for RAG memory

### Supported Features
- Audio formats: MP3, WAV, M4A, MP4, OGG, WEBM, FLAC, AAC
- Whisper models: tiny, base, small, medium, large-v3, distil-large-v3
- Analysis: Sentiment, personality traits, context-aware insights

## Project Structure

```
k-psyche-backend/
├── src/
│   ├── config/          # Firebase, Swagger configuration
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic (AI, analysis, personas, RAG)
│   ├── routes/          # API endpoints with Swagger docs
│   ├── middleware/      # Auth, uploads, error handling
│   └── utils/           # Python executor
├── server.js            # Express app entry point
├── transcribe.py        # Python transcription script
└── package.json         # Dependencies
```

## Development

### Testing Endpoints

Use the Swagger UI at `http://localhost:3000/api-docs` to test all endpoints interactively.

### Adding New Endpoints

1. Add route in `src/routes/`
2. Add controller in `src/controllers/`
3. Add service logic in `src/services/`
4. Document with JSDoc for Swagger

## Troubleshooting

See setup guides for specific services:
- Firebase issues: `FIREBASE_SETUP.md`
- Ollama issues: `OLLAMA_SETUP.md`
- ChromaDB issues: `CHROMADB_SETUP.md`
- General setup: `SETUP.md`

## License

MIT
