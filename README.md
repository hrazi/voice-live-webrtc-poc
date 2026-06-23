# Azure Voice Live · WebRTC POC

A minimal proof-of-concept web app for the [Azure AI Voice Live API over WebRTC](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live-webrtc). Talk to a real-time voice agent from your browser with low-latency, peer-to-peer audio.

## How it works

```
Browser  ──WebRTC media (RTP audio)──────────────►  Azure Voice Live
   │                                                       ▲
   │  WebSocket signaling (SDP) ──► Node proxy ──(auth)────┘
   │  ◄── data channel (transcripts/VAD/events) ───────────►
```

- **Node server** (`server.js`) serves the static client and proxies the signaling WebSocket to Azure, attaching credentials **server-side** (your API key / Entra token never reaches the browser).
- **Browser client** (`public/`) creates the `RTCPeerConnection`, captures the mic, exchanges SDP via the documented `rtc.call.sdp.create` / `rtc.call.sdp.created` events, and renders live transcripts from the `voice-live-events` data channel.
- **WebRTC media** flows peer-to-peer directly between the browser and Azure — only signaling is proxied.

## Prerequisites

- Node.js 18+
- A [Microsoft Foundry resource](https://learn.microsoft.com/en-us/azure/ai-services/multi-service-resource) with Voice Live access.
- Auth: either `az login` (Entra, recommended) **or** an API key from the resource.

## Setup

```bash
npm install
cp .env.example .env
# edit .env: set AZURE_VOICELIVE_ENDPOINT, and either run `az login` or set AZURE_VOICELIVE_API_KEY
npm start
```

Then open http://localhost:3000 and click **Start conversation**.

> For Entra auth, assign your account the **Cognitive Services User** and **Foundry User** roles on the resource.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `AZURE_VOICELIVE_ENDPOINT` | — (required) | `https://<resource>.services.ai.azure.com` |
| `AZURE_VOICELIVE_MODEL` | `gpt-realtime` | Model deployment |
| `AZURE_VOICELIVE_API_VERSION` | `2026-01-01-preview` | WebRTC `/calls` API version |
| `AZURE_VOICELIVE_API_KEY` | _(unset)_ | If set, uses API-key auth instead of Entra |
| `PORT` | `3000` | Local server port |

## Notes

- Model and voice are selectable in the UI. The dropdown lists are defined in `server.js` (`MODELS`, `VOICES`); `AZURE_VOICELIVE_MODEL` sets the default selection.
- The chosen model is validated server-side against the allow-list before being used in the upstream URL; the chosen voice is applied via `session.update`.
- Microphone access requires a secure context: `localhost` works; for other hosts use HTTPS.
- The Voice Live WebRTC API is in public preview.
- Other session behavior (instructions/system prompt, turn-detection type, silence threshold, and voice temperature) is editable directly in the UI. Noise suppression and echo cancellation are set in `sessionUpdate()` in `public/app.js`.
- Selecting **None** for turn detection reveals manual controls: **Respond now** (`input_audio_buffer.commit` + `response.create`) and **Interrupt** (`response.cancel`).
- Live **audio level meters** (mic input and assistant output) use the Web Audio API `AnalyserNode`.
- A **text input** box sends typed messages via `conversation.item.create` (`input_text`) + `response.create`, alongside voice.
