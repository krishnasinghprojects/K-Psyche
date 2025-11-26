# ChromaDB Setup Guide for K-Psyche

## Overview

ChromaDB is a local vector database that enables semantic search and memory retrieval. K-Psyche uses it to:
- Store user conversation history as embeddings
- Retrieve relevant past context for personalized analysis
- Implement RAG (Retrieval-Augmented Generation)

---

## Prerequisites

- Docker installed (recommended) OR Python 3.8+
- Ollama running locally
- Port 8000 available

---

## Option 1: Docker (Recommended)

### Install Docker

**Linux**:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Or download from**: https://docs.docker.com/get-docker/

### Run ChromaDB Container

```bash
# Pull and run ChromaDB
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  chromadb/chroma:latest
```

**Explanation**:
- `-d`: Run in background
- `--name chromadb`: Container name
- `-p 8000:8000`: Map port 8000
- `-v chroma-data:/chroma/chroma`: Persist data
- `chromadb/chroma:latest`: Latest ChromaDB image

### Verify ChromaDB is Running

```bash
# Check container status
docker ps | grep chromadb

# Test API
curl http://localhost:8000/api/v1/heartbeat
```

Expected response: `{"nanosecond heartbeat": ...}`

### Manage ChromaDB Container

```bash
# Stop ChromaDB
docker stop chromadb

# Start ChromaDB
docker start chromadb

# View logs
docker logs chromadb

# Remove container (data persists in volume)
docker rm chromadb

# Remove data volume (WARNING: deletes all data)
docker volume rm chroma-data
```

---

## Option 2: Python (Alternative)

### Install ChromaDB

```bash
pip3 install chromadb
```

### Run ChromaDB Server

```bash
# Start server on port 8000
chroma run --host 0.0.0.0 --port 8000
```

**Keep this terminal open** or run as a service.

### Run as Background Service (Linux)

Create systemd service:

```bash
sudo nano /etc/systemd/system/chromadb.service
```

Add:
```ini
[Unit]
Description=ChromaDB Vector Database
After=network.target

[Service]
Type=simple
User=your-username
ExecStart=/usr/local/bin/chroma run --host 0.0.0.0 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable chromadb
sudo systemctl start chromadb
sudo systemctl status chromadb
```

---

## Ollama Embedding Model Setup

### Pull Embedding Model

```bash
# Pull nomic-embed-text (recommended)
ollama pull nomic-embed-text
```

**Model Details**:
- Size: ~274MB
- Dimensions: 768
- Context: 8192 tokens
- Fast and accurate

### Verify Model

```bash
# List installed models
ollama list

# Test embedding
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "Hello world"
}'
```

Expected response: `{"embedding": [0.123, -0.456, ...]}`

### Alternative Embedding Models

```bash
# Smaller, faster
ollama pull all-minilm

# Larger, more accurate
ollama pull mxbai-embed-large
```

Update `.env`:
```env
EMBEDDING_MODEL=nomic-embed-text
```

---

## Configuration

### Environment Variables

Add to `.env`:

```env
# ChromaDB Configuration
CHROMADB_URL=http://localhost:8000
CHROMADB_COLLECTION=k_psyche_memories

# Ollama Embeddings
EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768

# RAG Settings
RAG_ENABLED=true
RAG_CONTEXT_LIMIT=3
RAG_SIMILARITY_THRESHOLD=0.7
```

### Verify Configuration

```bash
# Check ChromaDB
curl http://localhost:8000/api/v1/heartbeat

# Check Ollama
curl http://localhost:11434/api/tags

# Check embedding model
ollama list | grep nomic-embed-text
```

---

## Testing

### Test ChromaDB Connection

```bash
curl http://localhost:8000/api/v1/collections
```

Expected: `[]` (empty array initially)

### Test Embedding Generation

```bash
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "prompt": "This is a test"
  }'
```

### Test K-Psyche Integration

```bash
# Start K-Psyche server
npm start

# Check logs for ChromaDB connection
# Should see: [VectorService] ✅ ChromaDB connected successfully
```

---

## Data Structure

### ChromaDB Collection Schema

**Collection Name**: `k_psyche_memories`

**Document Structure**:
```javascript
{
  id: "user123_timestamp",
  embedding: [0.123, -0.456, ...],  // 768 dimensions
  metadata: {
    userId: "user123",
    text: "Original text",
    sentiment: "Positive",
    personality_traits: ["Optimistic"],
    timestamp: "2024-01-15T10:30:00.000Z",
    type: "analysis"
  }
}
```

### User Isolation

Each document includes `userId` in metadata. Queries are filtered:

```javascript
// Only returns memories for specific user
collection.query({
  queryEmbeddings: [embedding],
  where: { userId: "user123" },
  nResults: 3
});
```

---

## Performance

### Expected Response Times

| Operation | Time | Notes |
|-----------|------|-------|
| Generate embedding | 50-200ms | Depends on text length |
| Store vector | 10-50ms | ChromaDB write |
| Search vectors | 20-100ms | Depends on collection size |
| Total RAG overhead | 100-400ms | Per analysis request |

### Optimization Tips

1. **Batch Embeddings**: Generate multiple embeddings in parallel
2. **Cache Embeddings**: Cache frequently used embeddings
3. **Limit Context**: Use `RAG_CONTEXT_LIMIT=3` (default)
4. **Prune Old Data**: Periodically remove old memories

---

## Troubleshooting

### Issue: "Connection refused" to ChromaDB

**Check**:
```bash
# Is ChromaDB running?
docker ps | grep chromadb
# OR
ps aux | grep chroma

# Is port 8000 available?
netstat -tuln | grep 8000
```

**Solution**:
```bash
# Docker
docker start chromadb

# Python
chroma run --host 0.0.0.0 --port 8000
```

### Issue: "Model not found" for embeddings

**Check**:
```bash
ollama list | grep nomic-embed-text
```

**Solution**:
```bash
ollama pull nomic-embed-text
```

### Issue: Slow embedding generation

**Causes**:
- Large text (>1000 tokens)
- CPU-only mode (no GPU)
- Ollama overloaded

**Solutions**:
1. Truncate text before embedding
2. Use smaller model: `all-minilm`
3. Ensure GPU is available

### Issue: ChromaDB data not persisting

**Docker**:
```bash
# Check volume exists
docker volume ls | grep chroma-data

# Recreate with volume
docker run -d \
  --name chromadb \
  -p 8000:8000 \
  -v chroma-data:/chroma/chroma \
  chromadb/chroma:latest
```

**Python**:
```bash
# Specify data directory
chroma run --path ./chroma-data
```

### Issue: "Collection not found"

**Cause**: Collection not created yet

**Solution**: Collection is auto-created on first use. Just run an analysis.

---

## Maintenance

### Backup ChromaDB Data

**Docker**:
```bash
# Backup volume
docker run --rm \
  -v chroma-data:/data \
  -v $(pwd):/backup \
  ubuntu tar czf /backup/chroma-backup.tar.gz /data
```

**Python**:
```bash
# Backup data directory
tar czf chroma-backup.tar.gz ./chroma-data
```

### Restore ChromaDB Data

**Docker**:
```bash
# Restore volume
docker run --rm \
  -v chroma-data:/data \
  -v $(pwd):/backup \
  ubuntu tar xzf /backup/chroma-backup.tar.gz -C /
```

### Clear All Data

**Docker**:
```bash
docker stop chromadb
docker rm chromadb
docker volume rm chroma-data
```

**Python**:
```bash
rm -rf ./chroma-data
```

### Monitor Usage

```bash
# Check collection size
curl http://localhost:8000/api/v1/collections

# Docker stats
docker stats chromadb

# Disk usage
docker system df
```

---

## Production Deployment

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  chromadb:
    image: chromadb/chroma:latest
    container_name: chromadb
    ports:
      - "8000:8000"
    volumes:
      - chroma-data:/chroma/chroma
    environment:
      - CHROMA_SERVER_AUTH_CREDENTIALS_PROVIDER=chromadb.auth.token.TokenConfigServerAuthCredentialsProvider
      - CHROMA_SERVER_AUTH_CREDENTIALS=your-secret-token
      - CHROMA_SERVER_AUTH_PROVIDER=chromadb.auth.token.TokenAuthServerProvider
    restart: unless-stopped

volumes:
  chroma-data:
    driver: local
```

Start:
```bash
docker-compose up -d
```

### Security

**Add Authentication** (Production):

```yaml
environment:
  - CHROMA_SERVER_AUTH_CREDENTIALS=your-secret-token
```

Update K-Psyche config:
```javascript
const client = new ChromaClient({
  path: process.env.CHROMADB_URL,
  auth: {
    provider: "token",
    credentials: process.env.CHROMADB_TOKEN
  }
});
```

### Scaling

For large deployments:
- Use persistent storage (not Docker volumes)
- Consider ChromaDB Cloud
- Implement connection pooling
- Add Redis cache for embeddings

---

## Architecture

### RAG Flow

```
User Input
  ↓
1. Generate Embedding (Ollama)
  ↓
2. Search ChromaDB (Vector Similarity)
  ↓
3. Retrieve Past Context
  ↓
4. Augment Prompt with Context
  ↓
5. Generate Analysis (Ollama)
  ↓
6. Store New Memory (ChromaDB)
  ↓
Response
```

### Data Flow

```
analysisController.js
  ↓
vectorService.searchMemory()
  ↓ [generates embedding]
  ↓ [queries ChromaDB]
  ↓ [returns relevant memories]
analysisService.analyzeText()
  ↓ [augmented with context]
vectorService.saveMemory()
  ↓ [stores new memory]
Response
```

---

## Quick Start Checklist

- [ ] Install Docker
- [ ] Run ChromaDB container
- [ ] Verify ChromaDB is running (port 8000)
- [ ] Pull Ollama embedding model
- [ ] Verify embedding model works
- [ ] Update `.env` configuration
- [ ] Restart K-Psyche server
- [ ] Test analysis with RAG
- [ ] Check logs for ChromaDB connection

---

## Resources

- **ChromaDB Docs**: https://docs.trychroma.com/
- **ChromaDB GitHub**: https://github.com/chroma-core/chroma
- **Ollama Embeddings**: https://ollama.com/blog/embedding-models
- **Nomic Embed**: https://ollama.com/library/nomic-embed-text
- **Docker Docs**: https://docs.docker.com/

---

## Next Steps

1. ✅ Run ChromaDB (Docker or Python)
2. ✅ Pull embedding model
3. ✅ Configure `.env`
4. ✅ Restart server
5. ✅ Test RAG-enhanced analysis
6. 🎉 Enjoy personalized AI insights!
