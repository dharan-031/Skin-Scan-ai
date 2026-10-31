import 'dotenv/config';
import express from 'express';

const app = express();
const port = Number(process.env.PORT) || 4000;
const ollamaUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const ollamaModel = process.env.OLLAMA_MODEL || 'medgemma:4b';

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.get('/api/quotes/random', async (_request, response) => {
  try {
    const ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        stream: false,
        messages: [
          {
            role: 'user',
            content:
              'Write one original, concise motivational reflection about focus, starting a task, or taking a small step. Do not quote or attribute it to a real person. Return only the reflection.',
          },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

    if (!ollamaResponse.ok) {
      response.status(502).json({ error: 'Ollama could not generate a reflection.' });
      return;
    }

    const result = (await ollamaResponse.json()) as {
      message?: { content?: string };
    };
    const quote = result.message?.content?.trim();
    if (!quote) {
      response.status(502).json({ error: 'Ollama returned an empty reflection.' });
      return;
    }

    response.json({
      id: `ollama-${Date.now()}`,
      quote: quote.replace(/^['"“”]+|['"“”]+$/g, ''),
      author: `Ollama · ${ollamaModel}`,
      theme: 'Focus',
    });
  } catch {
    response.status(503).json({ error: 'Unable to connect to the local Ollama service.' });
  }
});

app.listen(port, () => {
  console.log(`Focus Studio backend listening on port ${port}`);
});
