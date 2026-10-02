# Marvo AI v0.16

A lightweight, responsive AI assistant web app that supports multiple LLM engines: Google Gemini, Hugging Face, and local Ollama models. Built for free deployment on Render.com.

## Features

✨ **Multi-Engine Support**
- ☁️ Google Gemini 2.5 Flash (Cloud)
- 🤗 Hugging Face Inference API (Cloud)
- 💻 Local LLM 1 via Ollama
- 🧠 Local LLM 2 via Ollama

🛡️ **Token-Safe & Free-Tier Friendly**
- Automatic history trimming (last 4 turns only)
- Max output: 512 tokens per response
- Rate limiting: 15 requests/minute per IP
- Auto-fallback between engines on errors

📱 **Responsive Design**
- PC & mobile optimized
- Dark futuristic UI
- Voice input via Web Speech API
- Real-time token counter

⚙️ **Settings Modal**
- Custom API keys (fallback to Render env vars)
- Configurable Hugging Face models
- Local Ollama endpoint & model selection
- Browser-based settings persistence

## Quick Setup

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Create `.env` file:**
   ```
   GEMINI_API_KEY=your_api_key_here
   HF_API_KEY=your_hf_token_here
   PORT=3000
   ```

3. **Start server:**
   ```bash
   npm start
   ```

4. **Open browser:**
   ```
   http://localhost:3000
   ```

### Render.com Deployment

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Launch Project 0.16 Marvo AI"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/Marvo0.16.git
   git push -u origin main
   ```

2. **Connect on Render:**
   - Go to [render.com](https://render.com)
   - New > Web Service
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml`

3. **Add Environment Variables (Render Dashboard):**
   - `GEMINI_API_KEY` = Your Google Gemini API key
   - `HF_API_KEY` = Your Hugging Face token

4. **Deploy & Monitor:**
   - URL: `https://marvo-ai-0-16.onrender.com`
   - Logs: Dashboard > Service > Logs

## API Keys

### Google Gemini
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Create API key
3. Set in `.env` or Render dashboard

### Hugging Face
1. Go to [Hugging Face](https://huggingface.co/settings/tokens)
2. Create token with "Inference Providers" permission
3. Set in `.env` or Render dashboard

### Local Models (Ollama)
1. Install [Ollama](https://ollama.ai)
2. Run: `OLLAMA_ORIGINS="*" ollama serve`
3. Configure URL in Settings modal (default: `http://127.0.0.1:11434`)
4. Available models: `llama3.2:1b`, `deepseek-r1:1.5b`, `qwen2.5:7b`, etc.

## Architecture

```
server.js
├── Express server (PORT 3000)
├── /api/chat endpoint
│   ├── Gemini fallback
│   └── Hugging Face fallback
├── Rate limiting (15 RPM/IP)
└── Health check (/health)

public/index.html
├── UI (dark theme)
├── Engine switcher
├── Settings modal
├── Voice input
└── Chat history management
```

## Token Usage

- **Gemini**: ~20 tokens/prompt (SYSTEM_PROMPT) + message + history
- **Hugging Face**: Same (routed via OpenAI-compatible API)
- **Local Ollama**: Counted client-side, no cloud costs

Example session:
- 4 turns (8 messages) × ~100 tokens avg = ~800 tokens
- Capped output: 512 tokens max
- **Monthly free limit (Gemini): 1M tokens** = ~1200 sessions

## File Structure

```
marvo-ai-0.16/
├── package.json          # Node.js dependencies
├── render.yaml           # Render deployment config
├── .env.example          # Template for env vars
├── .gitignore            # Git ignore file
├── server.js             # Express backend
└── public/
    └── index.html        # Single-file frontend
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No API key set" | Add keys in Settings modal or Render env vars |
| Cooldown message | Wait 4 seconds between requests (rate limit) |
| Local LLM fails | Start Ollama with `OLLAMA_ORIGINS="*"` |
| Chat won't load | Check browser console (F12) for CORS errors |
| Token counter wrong | Refresh page to reset session tokens |

## Performance Tips

- Use Hugging Face models: faster inference than local on free tier
- Trim history: Last 4 turns only = fewer tokens
- Local models: Run on machine with ≥4GB RAM
- Free Render tier: Cold starts (30s), sleeps after 15 mins inactivity

## License

MIT License - Feel free to fork and modify!

---

**Made with ❤️ by Marvo AI Team**  
v0.16 | 2025
