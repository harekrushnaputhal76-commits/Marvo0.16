require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Compact system prompt (~20 tokens)
const SYSTEM_PROMPT = "You are Marvo AI v0.16. Be concise, direct and helpful.";
const MAX_OUT = 512;
const MAX_MSGS = 8; // last 4 turns (user + assistant)
const DEFAULT_HF_MODEL = 'Qwen/Qwen2.5-7B-Instruct';

// ---- Rate limit guard: 15 requests/min per IP (sliding window) ----
const hits = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  if (arr.length >= 15) {
    const wait = Math.ceil((60000 - (now - arr[0])) / 1000);
    return res.status(429).json({ error: `Rate guard: wait ${wait}s (15 requests/min cap).` });
  }
  arr.push(now);
  hits.set(ip, arr);
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, arr] of hits) {
    const f = arr.filter(t => now - t < 60000);
    f.length ? hits.set(ip, f) : hits.delete(ip);
  }
}, 60000).unref();

// ---- Helpers ----
function cleanHistory(history) {
  let h = (Array.isArray(history) ? history : [])
    .filter(m => m && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MSGS)
    .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content.slice(0, 1200) }));
  while (h.length && h[0].role !== 'user') h.shift(); // must start with user
  return h;
}

class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function callGemini(key, history, message) {
  const contents = [
    ...history.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
    { role: 'user', parts: [{ text: message }] }
  ];
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: { maxOutputTokens: MAX_OUT, temperature: 0.7 }
    })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(d.error?.message || 'Gemini error', r.status);
  const reply = d.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || 'No response generated.';
  return { reply, usedTokens: d.usageMetadata?.totalTokenCount || 0, model: 'gemini-2.5-flash' };
}

async function callHF(token, model, history, message) {
  const r = await fetch('https://router.huggingface.co/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: message }],
      max_tokens: MAX_OUT,
      temperature: 0.7,
      stream: false
    })
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(d.error?.message || d.error || 'Hugging Face error', r.status);
  return {
    reply: d.choices?.[0]?.message?.content || 'No response generated.',
    usedTokens: d.usage?.total_tokens || 0,
    model: `hf:${model}`
  };
}

// ---- Cloud route: Gemini <-> Hugging Face with automatic fallback ----
app.post('/api/chat', rateLimit, async (req, res) => {
  try {
    const { engine = 'gemini', message, history, geminiKey, hfKey, hfModel } = req.body || {};
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'Empty message.' });

    const gKey = geminiKey || process.env.GEMINI_API_KEY;
    const hKey = hfKey || process.env.HF_API_KEY;
    const hModel = (hfModel || DEFAULT_HF_MODEL).trim();
    const msg = message.slice(0, 1500);
    const hist = cleanHistory(history);

    const runners = {
      gemini: gKey ? () => callGemini(gKey, hist, msg) : null,
      hf: hKey ? () => callHF(hKey, hModel, hist, msg) : null
    };
    const order = engine === 'hf' ? ['hf', 'gemini'] : ['gemini', 'hf'];
    const available = order.filter(k => runners[k]);

    if (!available.length) {
      return res.status(400).json({ error: 'No API key set. Add GEMINI_API_KEY / HF_API_KEY on Render or in Settings.' });
    }

    let lastErr;
    for (let i = 0; i < available.length; i++) {
      try {
        const out = await runners[available[i]]();
        if (i > 0) out.model += ' (fallback)';
        return res.json(out);
      } catch (e) {
        lastErr = e;
        // fallback only on rate-limit / server errors
        if (!(e.status === 429 || e.status >= 500)) break;
      }
    }
    res.status(lastErr?.status || 500).json({ error: lastErr?.message || 'Server error' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

app.get('/health', (req, res) => res.status(200).send('Marvo AI 0.16 Online'));

app.listen(PORT, () => console.log(`Marvo AI v0.16 running on http://localhost:${PORT}`));
