# Ollama Setup Guide for K-Psyche

## What is Ollama?

Ollama is a local LLM runtime that keeps models loaded in memory for fast inference. It's perfect for K-Psyche because:

- **Fast**: No model loading overhead (2-4 second responses)
- **Private**: All processing happens locally
- **Efficient**: Better than spawning Python processes
- **Simple**: Easy HTTP API

## Installation

### Step 1: Install Ollama

**Linux**:
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Manual Download**:
Visit https://ollama.com/download

### Step 2: Start Ollama Service

```bash
ollama serve
```

This starts Ollama on `http://localhost:11434`

**Note**: Keep this terminal open or run as a service.

### Step 3: Pull the Model

In a new terminal:

```bash
ollama pull llama3.1:8b
```

This downloads ~4.7GB. First time only.

### Step 4: Verify Installation

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Test the model
ollama run llama3.1:8b "Hello, how are you?"
```

## Quick Start

Once Ollama is running with the model:

```bash
# Test the analysis endpoint
curl -X POST http://localhost:3000/api/analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "I am feeling great today!"}'
```

Expected response:
```json
{
  "success": true,
  "analysis": {
    "sentiment": "Positive",
    "personality_traits": ["Optimistic", "Expressive"]
  }
}
```

## Model Options

### Recommended for RTX 3050

| Model | Size | VRAM | Speed | Accuracy |
|-------|------|------|-------|----------|
| **llama3.1:8b** | 4.7GB | ~5GB | Fast | High |
| llama3.1:7b | 4.1GB | ~4GB | Faster | Good |
| mistral:7b | 4.1GB | ~4GB | Fastest | Good |

### Installation Commands

```bash
# Recommended (best balance)
ollama pull llama3.1:8b

# Faster alternative
ollama pull llama3.1:7b

# Smallest/fastest
ollama pull mistral:7b
```

### Switching Models

Edit `.env`:
```env
OLLAMA_MODEL=llama3.1:7b
```

Then restart the server:
```bash
npm start
```

## Running as a Service (Linux)

### Option 1: systemd (Recommended)

Create service file:
```bash
sudo nano /etc/systemd/system/ollama.service
```

Add:
```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=your-username
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

### Option 2: Screen/tmux

```bash
# Using screen
screen -S ollama
ollama serve
# Press Ctrl+A, then D to detach

# Reattach later
screen -r ollama
```

## Troubleshooting

### Issue: "Connection refused"

**Cause**: Ollama not running

**Solution**:
```bash
ollama serve
```

### Issue: "Model not found"

**Cause**: Model not downloaded

**Solution**:
```bash
ollama pull llama3.1:8b
```

### Issue: "Out of memory"

**Cause**: Model too large for GPU

**Solutions**:
1. Use smaller model:
   ```bash
   ollama pull llama3.1:7b
   ```

2. Use CPU mode (slower):
   ```bash
   OLLAMA_NUM_GPU=0 ollama serve
   ```

### Issue: Slow responses (>10 seconds)

**Causes**:
- Running on CPU instead of GPU
- Other GPU processes running
- Model too large

**Solutions**:
1. Check GPU usage:
   ```bash
   nvidia-smi
   ```

2. Close other GPU applications

3. Use smaller model

### Issue: "Invalid JSON response"

**Cause**: Model not following instructions

**Solution**: Retry the request. The service has robust JSON parsing.

## Performance Optimization

### 1. GPU Acceleration

Ensure CUDA is available:
```bash
nvidia-smi
```

Ollama will automatically use GPU if available.

### 2. Model Selection

For RTX 3050 (4GB VRAM):
- ✅ Use: 7B or 8B models
- ❌ Avoid: 13B+ models (won't fit in VRAM)

### 3. Concurrent Requests

Ollama handles one request at a time. For multiple users:
- Use batch endpoint: `POST /api/analysis/batch`
- Or implement request queuing

### 4. Keep Ollama Running

Don't restart Ollama between requests. Model stays in memory.

## Monitoring

### Check Ollama Status

```bash
# From K-Psyche API
curl http://localhost:3000/api/analysis/status

# Direct Ollama API
curl http://localhost:11434/api/tags
```

### Monitor GPU Usage

```bash
# Real-time monitoring
watch -n 1 nvidia-smi

# Or
nvidia-smi -l 1
```

### Check Ollama Logs

```bash
# If running as systemd service
sudo journalctl -u ollama -f

# If running in terminal
# Logs appear in the terminal where you ran 'ollama serve'
```

## Security

### Default Configuration (Secure)

- Ollama listens on `localhost:11434` only
- Not accessible from network
- No authentication required (local only)

### Network Access (Optional)

To allow network access:

```bash
# Set environment variable
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

**Warning**: Only do this on trusted networks!

## Uninstallation

### Remove Ollama

```bash
# Stop service
sudo systemctl stop ollama
sudo systemctl disable ollama

# Remove binary
sudo rm /usr/local/bin/ollama

# Remove models (optional)
rm -rf ~/.ollama
```

## Alternative: Using Different LLM Backends

If you prefer not to use Ollama, you can modify `analysisService.js` to use:

1. **OpenAI API** (requires API key, costs money)
2. **Local Python LLM** (slower, requires loading model each time)
3. **Hugging Face Inference API** (requires API key)

The current Ollama implementation is recommended for:
- Speed (2-4 seconds)
- Privacy (local processing)
- Cost (free)
- Simplicity (no API keys)

## Next Steps

1. ✅ Install Ollama
2. ✅ Start Ollama service
3. ✅ Pull llama3.1:8b model
4. ✅ Test analysis endpoint
5. 🎉 Start analyzing text!

## Resources

- Ollama Website: https://ollama.com
- Ollama GitHub: https://github.com/ollama/ollama
- Model Library: https://ollama.com/library
- K-Psyche Analysis API Docs: `ANALYSIS_API.md`
