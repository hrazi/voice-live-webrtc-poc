// Azure Voice Live API — WebRTC browser client (POC)
// Flow per Microsoft docs:
//  1. Open a WebSocket signaling channel (proxied by our server, which adds auth).
//  2. Create RTCPeerConnection, add mic track, create data channel.
//  3. Create SDP offer, gather ICE, send `rtc.call.sdp.create`.
//  4. Receive `rtc.call.sdp.created`, apply SDP answer -> audio flows.
//  5. Use session.update + data channel for control/transcripts.

const els = {
  connect: document.getElementById('connectBtn'),
  hangup: document.getElementById('hangupBtn'),
  status: document.getElementById('status'),
  modelSelect: document.getElementById('modelSelect'),
  voiceSelect: document.getElementById('voiceSelect'),
  vadSelect: document.getElementById('vadSelect'),
  silenceInput: document.getElementById('silenceInput'),
  tempInput: document.getElementById('tempInput'),
  tempValue: document.getElementById('tempValue'),
  instructionsInput: document.getElementById('instructionsInput'),
  manualControls: document.getElementById('manualControls'),
  respondBtn: document.getElementById('respondBtn'),
  interruptBtn: document.getElementById('interruptBtn'),
  micMeter: document.getElementById('micMeter'),
  outMeter: document.getElementById('outMeter'),
  textForm: document.getElementById('textForm'),
  textInput: document.getElementById('textInput'),
  sendBtn: document.getElementById('sendBtn'),
  auth: document.getElementById('auth'),
  transcript: document.getElementById('transcript'),
  log: document.getElementById('log'),
  audio: document.getElementById('remoteAudio'),
};

let pc = null;
let signalWs = null;
let dataChannel = null;
let micStream = null;

// Web Audio analysers for the level meters.
let audioCtx = null;
let micAnalyser = null;
let outAnalyser = null;
let meterRaf = null;

const partial = { user: null, assistant: null };
let isLive = false;
let serverVadType = 'server_vad'; // default; updated from session.created

// Attach an AnalyserNode to a MediaStream and return it.
function makeAnalyser(stream) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  return analyser;
}

// Compute normalized RMS (0..1) level from an analyser's time-domain data.
function levelOf(analyser, buf) {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buf.length);
  return Math.min(1, rms * 2.5); // scale up for visibility
}

// Animation loop that drives both meters while a call is live.
function startMeters() {
  const micBuf = micAnalyser ? new Uint8Array(micAnalyser.fftSize) : null;
  const outBuf = outAnalyser ? new Uint8Array(outAnalyser.fftSize) : null;
  const tick = () => {
    if (micAnalyser) els.micMeter.style.width = `${levelOf(micAnalyser, micBuf) * 100}%`;
    if (outAnalyser) els.outMeter.style.width = `${levelOf(outAnalyser, outBuf) * 100}%`;
    meterRaf = requestAnimationFrame(tick);
  };
  tick();
}

function stopMeters() {
  if (meterRaf) cancelAnimationFrame(meterRaf);
  meterRaf = null;
  micAnalyser = outAnalyser = null;
  els.micMeter.style.width = '0%';
  els.outMeter.style.width = '0%';
  if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
}

// Lock/unlock all session-config inputs while a call is active.
function setConfigDisabled(disabled) {
  for (const el of [
    els.modelSelect, els.voiceSelect, els.vadSelect,
    els.silenceInput, els.tempInput, els.instructionsInput,
  ]) el.disabled = disabled;
}

// Manual audio controls are only relevant when turn detection is "none".
// Buttons are enabled only during a live call in that mode.
function refreshManualUI() {
  const manual = els.vadSelect.value === 'none';
  els.manualControls.classList.toggle('hidden', !manual);
  els.respondBtn.disabled = !(manual && isLive);
  els.interruptBtn.disabled = !(manual && isLive);
}

function setStatus(text, cls) {
  els.status.textContent = text;
  els.status.className = `status ${cls}`;
}

function log(msg, cls = '') {
  const time = new Date().toLocaleTimeString();
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = `[${time}] ${msg}`;
  els.log.appendChild(line);
  els.log.scrollTop = els.log.scrollHeight;
}

function ensureBubble(who) {
  if (partial[who]) return partial[who];
  const bubble = document.createElement('div');
  bubble.className = `bubble ${who}`;
  const label = document.createElement('span');
  label.className = 'who';
  label.textContent = who === 'user' ? 'You' : 'Assistant';
  const body = document.createElement('span');
  body.className = 'body';
  bubble.append(label, body);
  els.transcript.appendChild(bubble);
  els.transcript.scrollTop = els.transcript.scrollHeight;
  partial[who] = body;
  return body;
}

function appendTranscript(who, text, { final = false } = {}) {
  const body = ensureBubble(who);
  body.textContent += text;
  els.transcript.scrollTop = els.transcript.scrollHeight;
  if (final) partial[who] = null;
}

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    els.auth.textContent = cfg.authMode === 'entra' ? 'Microsoft Entra' : 'API key';

    for (const m of cfg.models || [{ id: cfg.model, label: cfg.model }]) {
      const opt = new Option(m.label, m.id, false, m.id === cfg.model);
      els.modelSelect.add(opt);
    }
    for (const v of cfg.voices || []) {
      const opt = new Option(v.label, v.name, false, v.name === cfg.defaultVoice);
      els.voiceSelect.add(opt);
    }
  } catch {
    els.auth.textContent = 'unknown';
  }

  // Apply scenario config from query params (linked from gallery).
  const params = new URLSearchParams(location.search);
  if (params.has('instructions')) els.instructionsInput.value = params.get('instructions');
  if (params.has('voice')) {
    const v = params.get('voice');
    if ([...els.voiceSelect.options].some((o) => o.value === v)) els.voiceSelect.value = v;
  }
  if (params.has('temperature')) {
    const t = parseFloat(params.get('temperature'));
    if (Number.isFinite(t)) { els.tempInput.value = t; els.tempValue.textContent = t.toFixed(2); }
  }
}

// --- Function calling (tools) ----------------------------------------------
// Tool schemas advertised to the model in session.update.
const TOOLS = [
  {
    type: 'function',
    name: 'get_current_weather',
    description: 'Get the current weather for a city.',
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'City name, e.g. Seattle' },
        unit: { type: 'string', enum: ['celsius', 'fahrenheit'], description: 'Temperature unit' },
      },
      required: ['location'],
    },
  },
  {
    type: 'function',
    name: 'get_current_time',
    description: 'Get the current local date and time.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];

// Local implementations executed in the browser. Replace with real logic/APIs.
const toolHandlers = {
  get_current_weather: ({ location, unit = 'celsius' }) => {
    const tempC = 18 + Math.floor(Math.random() * 10);
    const temp = unit === 'fahrenheit' ? Math.round(tempC * 9 / 5 + 32) : tempC;
    const conditions = ['Sunny', 'Cloudy', 'Light rain', 'Windy'];
    return {
      location: location || 'unknown',
      temperature: temp,
      unit,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
    };
  },
  get_current_time: () => ({ time: new Date().toLocaleString() }),
};

// Execute a function_call item, return the result to the model, and ask it to
// continue the response so it can speak/announce the outcome.
async function executeToolCall(item) {
  let args = {};
  try { args = JSON.parse(item.arguments || '{}'); } catch {}
  const handler = toolHandlers[item.name];
  const result = handler ? await handler(args) : { error: `unknown tool: ${item.name}` };
  log(`tool ${item.name}(${JSON.stringify(args)}) -> ${JSON.stringify(result)}`, 'evt');

  sendControl({
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id: item.call_id,
      output: JSON.stringify(result),
    },
  });
  sendControl({ type: 'response.create' });
}

// The session configuration sent once the VoiceLive session is established.
// NOTE: The Voice Live API does not allow changing turn_detection.type after
// session creation. We only send turn_detection params (silence, filler words)
// when the selected type matches the server default; otherwise we omit it.
function sessionUpdate() {
  const vadType = els.vadSelect.value;
  const silence = parseInt(els.silenceInput.value, 10);

  const session = {
    instructions:
      els.instructionsInput.value.trim() ||
      'You are a helpful, friendly AI assistant. Respond in natural, concise, engaging spoken language.',
    input_audio_noise_reduction: { type: 'azure_deep_noise_suppression' },
    input_audio_echo_cancellation: { type: 'server_echo_cancellation' },
    voice: {
      name: els.voiceSelect.value || 'en-US-Ava:DragonHDLatestNeural',
      type: 'azure-standard',
      temperature: parseFloat(els.tempInput.value),
    },
    tools: TOOLS,
    tool_choice: 'auto',
  };

  // Only include turn_detection when the type matches the server default
  // (server_vad), or omit it entirely to avoid the "type change not allowed" error.
  if (vadType === serverVadType && vadType !== 'none') {
    const td = { type: vadType };
    if (Number.isFinite(silence)) td.silence_duration_ms = silence;
    if (vadType.startsWith('azure_semantic_vad')) td.remove_filler_words = true;
    session.turn_detection = td;
  }

  return { type: 'session.update', session };
}

// Route an incoming event (from data channel or control WS) to UI handlers.
function handleEvent(msg) {
  switch (msg.type) {
    case 'session.created':
      log('VoiceLive session created', 'evt');
      // Capture the server's default turn detection type (cannot be changed).
      if (msg.session?.turn_detection?.type) {
        serverVadType = msg.session.turn_detection.type;
        els.vadSelect.value = serverVadType;
        refreshManualUI();
      }
      sendControl(sessionUpdate());
      break;
    case 'session.updated':
      log('Session configured', 'evt');
      break;
    case 'input_audio_buffer.speech_started':
      setStatus('Listening…', 'live');
      break;
    case 'input_audio_buffer.speech_stopped':
      setStatus('Thinking…', 'live');
      break;
    case 'conversation.item.input_audio_transcription.delta':
      appendTranscript('user', msg.delta || '');
      break;
    case 'conversation.item.input_audio_transcription.completed':
      if (msg.transcript && !partial.user) appendTranscript('user', msg.transcript);
      partial.user = null;
      break;
    case 'response.audio_transcript.delta':
      setStatus('Speaking…', 'live');
      appendTranscript('assistant', msg.delta || '');
      break;
    case 'response.audio_transcript.done':
      partial.assistant = null;
      break;
    case 'response.output_item.done':
      // A completed function/tool call arrives as an output item.
      if (msg.item && msg.item.type === 'function_call') executeToolCall(msg.item);
      else log(`event: ${msg.type}`, 'evt');
      break;
    case 'response.done':
      setStatus('Live', 'live');
      break;
    case 'error':
    case 'rtc.call.error':
    case 'proxy.error':
      log(`Error: ${JSON.stringify(msg.error || msg.message || msg)}`, 'err');
      break;
    default:
      log(`event: ${msg.type}`, 'evt');
  }
}

// Send a control/session event. Prefer the data channel once it is open,
// otherwise fall back to the signaling WebSocket.
function sendControl(obj) {
  const payload = JSON.stringify(obj);
  if (dataChannel && dataChannel.readyState === 'open') dataChannel.send(payload);
  else if (signalWs && signalWs.readyState === WebSocket.OPEN) signalWs.send(payload);
}

async function connect() {
  els.connect.disabled = true;
  setConfigDisabled(true);
  setStatus('Connecting…', 'connecting');
  els.transcript.innerHTML = '';
  partial.user = partial.assistant = null;

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    log(`Microphone access denied: ${err.message}`, 'err');
    setStatus('Mic blocked', 'error');
    els.connect.disabled = false;
    setConfigDisabled(false);
    return;
  }

  pc = new RTCPeerConnection();
  micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));
  micAnalyser = makeAnalyser(micStream);

  pc.ontrack = (event) => {
    els.audio.srcObject = event.streams[0];
    outAnalyser = makeAnalyser(event.streams[0]);
    startMeters();
    log('Remote audio track received', 'evt');
  };

  pc.onconnectionstatechange = () => {
    log(`pc state: ${pc.connectionState}`);
    if (pc.connectionState === 'connected') setStatus('Live', 'live');
    if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
      if (els.hangup.disabled === false) setStatus('Disconnected', 'error');
    }
  };

  // Data channel for non-audio events (VAD, transcripts, response lifecycle).
  dataChannel = pc.createDataChannel('voice-live-events');
  dataChannel.onopen = () => log('Data channel open', 'evt');
  dataChannel.onmessage = (e) => {
    try { handleEvent(JSON.parse(e.data)); } catch { log(`data: ${e.data}`); }
  };

  // Open signaling WebSocket (proxied through our server, which adds auth).
  // The selected model is forwarded as a query param to the proxy.
  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
  const model = encodeURIComponent(els.modelSelect.value || '');
  signalWs = new WebSocket(`${wsProto}://${location.host}/signaling?model=${model}`);

  signalWs.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'proxy.ready') {
      log('Signaling channel ready', 'evt');
      await startNegotiation();
      return;
    }
    if (msg.type === 'rtc.call.sdp.created' && msg.sdp_answer) {
      log('SDP answer received — activating WebRTC', 'evt');
      await pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp_answer });
      els.hangup.disabled = false;
      els.textInput.disabled = false;
      els.sendBtn.disabled = false;
      isLive = true;
      refreshManualUI();
      return;
    }
    handleEvent(msg);
  };

  signalWs.onerror = () => log('Signaling WebSocket error', 'err');
  signalWs.onclose = () => log('Signaling WebSocket closed');
}

async function startNegotiation() {
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Wait for ICE gathering to complete so the SDP includes all candidates.
  await new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
  });

  log('Sending SDP offer', 'evt');
  signalWs.send(JSON.stringify({
    type: 'rtc.call.sdp.create',
    sdp_offer: pc.localDescription.sdp,
  }));
}

function hangup() {
  els.hangup.disabled = true;
  setStatus('Idle', 'idle');
  stopMeters();
  if (dataChannel) { try { dataChannel.close(); } catch {} dataChannel = null; }
  if (pc) { try { pc.close(); } catch {} pc = null; }
  if (signalWs) { try { signalWs.close(); } catch {} signalWs = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  els.audio.srcObject = null;
  els.textInput.disabled = true;
  els.sendBtn.disabled = true;
  els.connect.disabled = false;
  setConfigDisabled(false);
  isLive = false;
  refreshManualUI();
  log('Conversation ended');
}

els.connect.addEventListener('click', connect);
els.hangup.addEventListener('click', hangup);
els.vadSelect.addEventListener('change', () => {
  els.silenceInput.disabled = els.vadSelect.value === 'none';
  refreshManualUI();
});
els.tempInput.addEventListener('input', () => {
  els.tempValue.textContent = parseFloat(els.tempInput.value).toFixed(2);
});

// Manual mode: commit the buffered input audio, then ask for a response.
els.respondBtn.addEventListener('click', () => {
  sendControl({ type: 'input_audio_buffer.commit' });
  sendControl({ type: 'response.create' });
  setStatus('Thinking…', 'live');
  log('Manual: commit audio + response.create', 'evt');
});

// Manual mode: cancel the in-progress response (barge-in).
els.interruptBtn.addEventListener('click', () => {
  sendControl({ type: 'response.cancel' });
  log('Manual: response.cancel', 'evt');
});

// Send a typed message: create a conversation item, then request a response.
els.textForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = els.textInput.value.trim();
  if (!text || !isLive) return;
  sendControl({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text }],
    },
  });
  sendControl({ type: 'response.create' });
  appendTranscript('user', text, { final: true });
  setStatus('Thinking…', 'live');
  log('Sent typed message', 'evt');
  els.textInput.value = '';
});

refreshManualUI();
loadConfig();
