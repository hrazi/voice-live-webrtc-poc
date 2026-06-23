import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { DefaultAzureCredential } from '@azure/identity';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.AZURE_VOICELIVE_API_VERSION || '2026-01-01-preview';
const MODEL = process.env.AZURE_VOICELIVE_MODEL || 'gpt-realtime';
const ENDPOINT = process.env.AZURE_VOICELIVE_ENDPOINT; // e.g. https://<resource>.services.ai.azure.com
const API_KEY = process.env.AZURE_VOICELIVE_API_KEY;   // optional, used if no Entra credential

// Selectable models exposed to the client. The chosen model is validated
// against this allow-list before being used in the upstream URL.
const MODELS = [
  { id: 'gpt-realtime', label: 'GPT Realtime' },
  { id: 'gpt-realtime-mini', label: 'GPT Realtime Mini' },
  { id: 'gpt-4o-realtime-preview', label: 'GPT-4o Realtime (preview)' },
  { id: 'gpt-4o-mini-realtime-preview', label: 'GPT-4o Mini Realtime (preview)' },
  { id: 'phi4-mm-realtime', label: 'Phi-4 Multimodal Realtime' },
];
if (!MODELS.some((m) => m.id === MODEL)) MODELS.unshift({ id: MODEL, label: MODEL });

// Selectable Azure neural / HD voices applied via session.update.
const VOICES = [
  { name: 'en-US-Ava:DragonHDLatestNeural', label: 'Ava (HD, en-US)' },
  { name: 'en-US-Andrew:DragonHDLatestNeural', label: 'Andrew (HD, en-US)' },
  { name: 'en-US-Emma:DragonHDLatestNeural', label: 'Emma (HD, en-US)' },
  { name: 'en-US-Brian:DragonHDLatestNeural', label: 'Brian (HD, en-US)' },
  { name: 'en-US-AvaNeural', label: 'Ava (en-US)' },
  { name: 'en-US-JennyNeural', label: 'Jenny (en-US)' },
  { name: 'en-US-GuyNeural', label: 'Guy (en-US)' },
  { name: 'en-GB-SoniaNeural', label: 'Sonia (en-GB)' },
  { name: 'en-AU-NatashaNeural', label: 'Natasha (en-AU)' },
];

if (!ENDPOINT) {
  console.error('ERROR: Set AZURE_VOICELIVE_ENDPOINT (e.g. https://<resource>.services.ai.azure.com)');
  process.exit(1);
}

// Build the upstream Voice Live WebRTC "calls" signaling URL for a given model.
function buildUpstreamUrl(model) {
  const chosen = MODELS.some((m) => m.id === model) ? model : MODEL;
  const base = ENDPOINT.replace(/^http/, 'ws').replace(/\/+$/, '');
  return `${base}/voice-live/realtime/calls?api-version=${API_VERSION}&model=${encodeURIComponent(chosen)}`;
}

// Acquire auth headers for the upstream connection (server-side only).
const credential = API_KEY ? null : new DefaultAzureCredential();
async function getUpstreamHeaders() {
  if (API_KEY) return { 'api-key': API_KEY };
  const token = await credential.getToken('https://ai.azure.com/.default');
  return { Authorization: `Bearer ${token.token}` };
}

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Expose only non-secret config to the browser.
app.get('/api/config', (_req, res) => {
  res.json({
    model: MODEL,
    apiVersion: API_VERSION,
    authMode: API_KEY ? 'api-key' : 'entra',
    models: MODELS,
    voices: VOICES,
    defaultVoice: VOICES[0].name,
  });
});

const server = http.createServer(app);

// WebSocket signaling proxy: browser <-> this server <-> Azure Voice Live.
// Credentials are attached here and never reach the browser. WebRTC media
// (RTP audio + data channel) flows peer-to-peer directly with Azure.
const wss = new WebSocketServer({ server, path: '/signaling' });

wss.on('connection', async (client, req) => {
  // The client may request a specific model via ?model= on the signaling URL.
  const reqUrl = new URL(req.url, 'http://localhost');
  const upstreamUrl = buildUpstreamUrl(reqUrl.searchParams.get('model'));
  console.log(`[proxy] client connected -> ${upstreamUrl}`);

  let upstream;
  try {
    const headers = await getUpstreamHeaders();
    upstream = new WebSocket(upstreamUrl, { headers });
  } catch (err) {
    console.error('[proxy] failed to acquire credentials:', err.message);
    client.send(JSON.stringify({ type: 'proxy.error', message: `Auth failed: ${err.message}` }));
    client.close();
    return;
  }

  const pending = [];
  let upstreamOpen = false;

  upstream.on('open', () => {
    upstreamOpen = true;
    client.send(JSON.stringify({ type: 'proxy.ready' }));
    for (const msg of pending) upstream.send(msg);
    pending.length = 0;
  });

  upstream.on('message', (data) => {
    if (client.readyState === WebSocket.OPEN) client.send(data.toString());
  });

  upstream.on('close', (code, reason) => {
    console.log(`[proxy] upstream closed ${code} ${reason}`);
    if (client.readyState === WebSocket.OPEN) client.close();
  });

  upstream.on('error', (err) => {
    console.error('[proxy] upstream error:', err.message);
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'proxy.error', message: err.message }));
    }
  });

  client.on('message', (data) => {
    const msg = data.toString();
    if (upstreamOpen) upstream.send(msg);
    else pending.push(msg);
  });

  client.on('close', () => {
    if (upstream.readyState === WebSocket.OPEN || upstream.readyState === WebSocket.CONNECTING) {
      upstream.close();
    }
  });

  client.on('error', () => upstream.close());
});

server.listen(PORT, () => {
  console.log(`Voice Live WebRTC POC running at http://localhost:${PORT}`);
  console.log(`Auth mode: ${API_KEY ? 'api-key' : 'Microsoft Entra (DefaultAzureCredential)'}`);
  console.log(`Model: ${MODEL} | API version: ${API_VERSION}`);
});
