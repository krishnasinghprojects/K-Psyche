# K-Psyche Backend - Complete Setup Guide

## Prerequisites

- **Node.js** v14 or higher
- **Python** 3.8+ with pip
- **CUDA Toolkit** (for GPU acceleration, optional)
- **NVIDIA GPU** with CUDA support (optional, for faster transcription)

## Installation Steps

### 1. Install Node.js Dependencies

```bash
npm install
```

This installs all required packages including:
- Express, CORS, dotenv
- Firebase Admin SDK
- Swagger UI and JSDoc
- Multer for file uploads
- Axios for HTTP requests

### 2. Install Python Dependencies

```bash
# Install pip (if not already installed)
sudo apt install python3-pip

# Install Python dependencies
pip3 install -r requirements.txt
```

Python dependencies include:
- `faster-whisper==1.0.3` - Audio transcription
- `torch>=2.0.0` - PyTorch with CUDA support

### 3. Setup External Services

#### Firebase (Required)

See `FIREBASE_SETUP.md` for detailed instructions.

**Quick steps:**
1. Create Firebase project at https://console.firebase.google.com
2. Enable Authentication and Firestore
3. Download service account key as `serviceAccountKey.json`
4. Add to project root

#### Ollama (Required)

See `OLLAMA_SETUP.md` for detailed instructions.

**Quick steps:**
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull required models
ollama pull llama3.2
ollama pull nomic-embed-text

# Verify
ollama list
```

#### ChromaDB (Required)

See `CHROMADB_SETUP.md` for detailed instructions.

**Quick steps:**
```bash
# Install ChromaDB
pip3 install chromadb

# Start ChromaDB server
chroma run --host localhost --port 8000
```

### 4. Configure Environment

Create or edit `.env` file in project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id

# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# ChromaDB Configuration
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=k_psyche_memories

# Python Configuration
PYTHON_PATH=python3
WHISPER_MODEL=small
MAX_FILE_SIZE=50

# RAG Configuration
RAG_CONTEXT_LIMIT=3
```

### 5. Verify CUDA Installation (Optional)

For GPU-accelerated transcription:

```bash
# Check if CUDA is available
python3 -c "import torch; print('CUDA Available:', torch.cuda.is_available())"

# Check CUDA version
nvcc --version
```

If CUDA is not available, transcription will use CPU (slower but functional).

### 6. Start the Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

You should see:
```
🚀 K-Psyche Backend running on port 3000
📚 API Documentation: http://localhost:3000/api-docs
💚 Health check: GET http://localhost:3000/api/health
[Firebase] ✅ Firebase Admin SDK initialized successfully
[VectorService] ✅ ChromaDB connected successfully
```

### 7. Test the Setup

#### Health Check
```bash
curl http://localhost:3000/api/health
```

#### Access API Documentation
Open browser to:
```
http://localhost:3000/api-docs
```

#### Test with Swagger UI
1. Go to http://localhost:3000/api-docs
2. Try the health check endpoint
3. Test other endpoints with "Try it out" button

## Troubleshooting

### Issue: Firebase initialization failed

**Solution:**
- Verify `serviceAccountKey.json` exists in project root
- Check Firebase project ID in `.env`
- See `FIREBASE_SETUP.md` for detailed setup

### Issue: Ollama connection failed

**Solution:**
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve

# Verify models are installed
ollama list
```

### Issue: ChromaDB connection failed

**Solution:**
```bash
# Start ChromaDB server
chroma run --host localhost --port 8000

# Or install if not installed
pip3 install chromadb
```

### Issue: Python module not found

**Solution:**
```bash
# Reinstall Python dependencies
pip3 install --upgrade -r requirements.txt

# Or install for user only
pip3 install --user -r requirements.txt
```

### Issue: CUDA out of memory

**Solution:**
- Use smaller Whisper model: `WHISPER_MODEL=base` in `.env`
- Close other GPU applications
- Restart the server to clear VRAM

### Issue: Port 3000 already in use

**Solution:**
```bash
# Change port in .env
PORT=3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

## Verification Checklist

Before using the API, verify:

- [ ] Node.js dependencies installed (`npm install`)
- [ ] Python dependencies installed (`pip3 install -r requirements.txt`)
- [ ] Firebase configured (`serviceAccountKey.json` exists)
- [ ] Ollama running with models (`ollama list`)
- [ ] ChromaDB running (`curl http://localhost:8000/api/v1/heartbeat`)
- [ ] `.env` file configured
- [ ] Server starts without errors (`npm start`)
- [ ] Health check passes (`curl http://localhost:3000/api/health`)
- [ ] Swagger UI accessible (`http://localhost:3000/api-docs`)

## Next Steps

1. **Test API**: Use Swagger UI at http://localhost:3000/api-docs
2. **Create Persona**: POST to `/api/personas/create`
3. **Analyze Text**: POST to `/api/analysis/analyze`
4. **Query Persona**: POST to `/api/personas/:id/ask`
5. **Integrate Frontend**: Use Firebase auth tokens

## Performance Tips

### For Audio Transcription
- First run downloads Whisper model (~500MB for small model)
- Use `small` model for best balance on RTX 3050
- Monitor VRAM usage: `nvidia-smi`

### For Text Analysis
- Ollama models are cached after first use
- Use `llama3.2` for faster responses
- Adjust `RAG_CONTEXT_LIMIT` for more/less context

### For Production
- Set `NODE_ENV=production` in `.env`
- Use process manager like PM2
- Enable HTTPS
- Configure CORS for your domain
- Set up monitoring and logging

## Additional Resources

- **Firebase Setup**: `FIREBASE_SETUP.md`
- **Ollama Setup**: `OLLAMA_SETUP.md`
- **ChromaDB Setup**: `CHROMADB_SETUP.md`
- **API Documentation**: http://localhost:3000/api-docs
- **Project README**: `README.md`

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review service-specific setup guides
3. Check server logs for error messages
4. Verify all external services are running

