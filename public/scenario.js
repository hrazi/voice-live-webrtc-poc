// Voice Live WebRTC — scenario runtime.
// Loads a specific use case (by ?id=) from scenarios-data.js, runs a themed
// call experience with only that scenario's system prompt/voice, and renders
// a structured end-of-call summary using function calling.

import { getUseCase, colorFor, ICONS, buildSummaryTool } from './scenarios-data.js';

const params = new URLSearchParams(location.search);
const scenarioId = params.get('id');
const uc = getUseCase(scenarioId);

if (!uc) {
  location.replace('gallery.html');
  throw new Error('Unknown scenario id: ' + scenarioId);
}

const color = colorFor(uc);
document.documentElement.style.setProperty('--scenario-color', color);
document.title = `${uc.title} · Voice Live`;

const els = {
  connect: document.getElementById('connectBtn'),
  hangup: document.getElementById('hangupBtn'),
  status: document.getElementById('status'),
  auth: document.getElementById('auth'),
  micMeter: document.getElementById('micMeter'),
  outMeter: document.getElementById('outMeter'),
  textForm: document.getElementById('textForm'),
  textInput: document.getElementById('textInput'),
  sendBtn: document.getElementById('sendBtn'),
  transcript: document.getElementById('transcript'),
  log: document.getElementById('log'),
  audio: document.getElementById('remoteAudio'),
  callCard: document.getElementById('callCard'),
  summaryCard: document.getElementById('summaryCard'),
  summaryIcon: document.getElementById('summaryIcon'),
  summaryTitle: document.getElementById('summaryTitle'),
  summaryFields: document.getElementById('summaryFields'),
  newCallBtn: document.getElementById('newCallBtn'),
  scenarioIcon: document.getElementById('scenarioIcon'),
  scenarioTag: document.getElementById('scenarioTag'),
  scenarioTitle: document.getElementById('scenarioTitle'),
  scenarioQuote: document.getElementById('scenarioQuote'),
  advancedLink: document.getElementById('advancedLink'),
};

// Populate the hero with this scenario's identity.
els.scenarioIcon.textContent = uc.quote.icon;
els.scenarioTag.textContent = uc.tag;
els.scenarioTag.style.color = color;
els.scenarioTitle.textContent = uc.title;
els.scenarioQuote.textContent = uc.quote.text;
els.summaryIcon.innerHTML = ICONS[uc.summary.icon] || ICONS.summary;
els.summaryTitle.textContent = uc.summary.title;

// Advanced/raw playground link, prefilled with this scenario's config.
{
  const p = new URLSearchParams();
  p.set('instructions', uc.pocConfig.instructions);
  p.set('voice', uc.pocConfig.voice);
  p.set('temperature', uc.pocConfig.temperature);
  els.advancedLink.href = `index.html?${p.toString()}`;
}

const SUMMARY_TOOL = buildSummaryTool(uc);

let pc = null;
let signalWs = null;
let dataChannel = null;
let micStream = null;
let isLive = false;
let summaryData = null; // args from the submit_call_summary tool call, once received

let audioCtx = null;
let micAnalyser = null;
let outAnalyser = null;
let meterRaf = null;

const partial = { user: null, assistant: null };
let modelId = 'gpt-realtime';
let authMode = 'entra';

async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    modelId = cfg.model || modelId;
    authMode = cfg.authMode || authMode;
    els.auth.textContent = authMode === 'entra' ? 'Microsoft Entra' : 'API key';
  } catch {
    els.auth.textContent = 'unknown';
  }
}

function makeAnalyser(stream) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  return analyser;
}

function levelOf(analyser, buf) {
  analyser.getByteTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  const rms = Math.sqrt(sum / buf.length);
  return Math.min(1, rms * 2.5);
}

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

function sendControl(obj) {
  const payload = JSON.stringify(obj);
  if (dataChannel && dataChannel.readyState === 'open') {
    dataChannel.send(payload);
    log(`sent: ${obj.type}`, 'evt');
  } else if (signalWs && signalWs.readyState === WebSocket.OPEN) {
    signalWs.send(payload);
    log(`sent (ws): ${obj.type}`, 'evt');
  } else {
    log(`send failed (no open channel): ${obj.type}`, 'err');
  }
}

// The Voice Live API does not allow changing turn_detection.type after the
// session is created (it errors and the *entire* session.update is rejected,
// silently dropping instructions/voice/tools too). Capture the server's
// default from session.created and only ever send that same type back.
let serverVadType = 'server_vad';

// Build the session.update payload for this scenario: fixed instructions,
// OpenAI voice (native-audio model), and the per-scenario summary tool.
//
// Note: manually forcing a response via response.create after hangup is not
// reliably honored by the Voice Live API in this session mode (verified
// empirically — client-issued response.create/conversation.item.create calls
// go unanswered outside of a VAD-triggered turn). So instead of forcing a
// summary at hangup time, we instruct the model to proactively call
// submit_call_summary *during* the natural conversation — updating it as
// the call progresses and especially near any goodbye/wrap-up cue — so a
// summary is very likely already captured by the time the user hangs up.
function sessionUpdate() {
  return {
    type: 'session.update',
    session: {
      instructions:
        `${uc.pocConfig.instructions}\n\n` +
        `Throughout this call, proactively call the submit_call_summary function to keep a structured recap up to date — call it again any time new important details emerge, not just once. ` +
        `Call it immediately (without waiting to be asked) whenever the conversation reaches a natural wrap-up point or the caller signals they are done (e.g. saying goodbye, thanks, that's all, etc.). ` +
        `It is fine to call submit_call_summary multiple times during the call; each call should reflect the fullest picture so far.`,
      voice: uc.pocConfig.voice,
      temperature: uc.pocConfig.temperature,
      input_audio_noise_reduction: { type: 'azure_deep_noise_suppression' },
      input_audio_echo_cancellation: { type: 'server_echo_cancellation' },
      turn_detection: { type: serverVadType, silence_duration_ms: 500 },
      tools: [SUMMARY_TOOL],
      tool_choice: 'auto',
    },
  };
}

// Resolved when a submit_call_summary tool call arrives.
let summaryWaiters = [];
function notifySummaryWaiters() {
  summaryWaiters.forEach((resolve) => resolve());
  summaryWaiters = [];
}

async function executeToolCall(item) {
  let args = {};
  try { args = JSON.parse(item.arguments || '{}'); } catch {}

  if (item.name === 'submit_call_summary') {
    summaryData = args;
    log('Received structured call summary', 'evt');
    notifySummaryWaiters();
  }

  sendControl({
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id: item.call_id,
      output: JSON.stringify({ status: 'ok' }),
    },
  });
}

function handleEvent(msg) {
  switch (msg.type) {
    case 'session.created':
      log('VoiceLive session created', 'evt');
      if (msg.session?.turn_detection?.type) serverVadType = msg.session.turn_detection.type;
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
      if (msg.item && msg.item.type === 'function_call') executeToolCall(msg.item);
      else log(`event: ${msg.type}`, 'evt');
      break;
    case 'response.done':
      if (isLive) setStatus('Live', 'live');
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

async function connect() {
  els.connect.disabled = true;
  setStatus('Connecting…', 'connecting');
  els.transcript.innerHTML = '';
  els.log.innerHTML = '';
  partial.user = partial.assistant = null;
  summaryData = null;
  els.summaryCard.classList.add('hidden');
  els.callCard.classList.remove('hidden');

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    log(`Microphone access denied: ${err.message}`, 'err');
    setStatus('Mic blocked', 'error');
    els.connect.disabled = false;
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
      if (!els.hangup.disabled) setStatus('Disconnected', 'error');
    }
  };

  dataChannel = pc.createDataChannel('voice-live-events');
  dataChannel.onopen = () => log('Data channel open', 'evt');
  dataChannel.onmessage = (e) => {
    try { handleEvent(JSON.parse(e.data)); } catch { log(`data: ${e.data}`); }
  };

  const wsProto = location.protocol === 'https:' ? 'wss' : 'ws';
  const model = encodeURIComponent(modelId);
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
      els.hangup.classList.remove('hidden');
      els.connect.classList.add('hidden');
      els.textInput.disabled = false;
      els.sendBtn.disabled = false;
      isLive = true;
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

// Wait for a submit_call_summary tool call, up to `timeoutMs`.
function waitForSummary(timeoutMs) {
  if (summaryData) return Promise.resolve();
  return new Promise((resolve) => {
    summaryWaiters.push(resolve);
    setTimeout(resolve, timeoutMs);
  });
}

function teardown() {
  stopMeters();
  if (dataChannel) { try { dataChannel.close(); } catch {} dataChannel = null; }
  if (pc) { try { pc.close(); } catch {} pc = null; }
  if (signalWs) { try { signalWs.close(); } catch {} signalWs = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  els.audio.srcObject = null;
  els.textInput.disabled = true;
  els.sendBtn.disabled = true;
  els.hangup.classList.add('hidden');
  els.connect.classList.remove('hidden');
  els.connect.disabled = false;
  els.hangup.disabled = true;
  isLive = false;
}

function requestSummary() {
  // Best-effort nudge: manually forcing a response via response.create is
  // not reliably honored by the Voice Live API outside of a natural
  // VAD-triggered turn, so this may go unanswered. That's fine — the model
  // is instructed to keep submit_call_summary up to date throughout the
  // call, so we usually already have a summary captured by hangup time.
  sendControl({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: 'The call is ending now. Call submit_call_summary with your best structured recap of the conversation so far.' }],
    },
  });
  sendControl({ type: 'response.create' });
}

async function hangup() {
  els.hangup.disabled = true;

  if (isLive) {
    setStatus('Wrapping up…', 'wrapping');
    if (!summaryData) {
      // Give the model one best-effort chance to finalize a summary, but
      // don't block long since this often goes unanswered (see note above).
      requestSummary();
      await waitForSummary(3000);
    }
  }

  teardown();
  setStatus('Idle', 'idle');
  log('Conversation ended');
  renderSummary();
}

function fieldValueHtml(field, value) {
  if (field.type === 'list') {
    const items = Array.isArray(value) ? value.filter(Boolean) : [];
    if (!items.length) return `<span class="field-value empty">Not discussed</span>`;
    return `<ul class="field-value">${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
  }
  if (field.type === 'badge') {
    if (!value) return `<span class="field-value empty">Not set</span>`;
    return `<span class="field-badge">${escapeHtml(value)}</span>`;
  }
  if (!value || !String(value).trim()) return `<span class="field-value empty">Not discussed</span>`;
  return `<span class="field-value">${escapeHtml(value)}</span>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Render the end-of-call summary card. Falls back to a friendly empty state
// if the model never produced a structured summary within the timeout.
function renderSummary() {
  els.callCard.classList.add('hidden');
  els.summaryCard.classList.remove('hidden');

  if (!summaryData) {
    els.summaryFields.innerHTML = `
      <div class="summary-field" style="grid-column: 1 / -1">
        <span class="field-label">No structured summary</span>
        <span class="field-value empty">The call ended before a summary could be generated. Check the transcript above for details.</span>
      </div>`;
    return;
  }

  els.summaryFields.innerHTML = uc.summary.fields
    .map(
      (f) => `
      <div class="summary-field">
        <span class="field-label">${escapeHtml(f.label)}</span>
        ${fieldValueHtml(f, summaryData[f.key])}
      </div>`
    )
    .join('');
}

els.connect.addEventListener('click', connect);
els.hangup.addEventListener('click', hangup);

els.textForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = els.textInput.value.trim();
  if (!text || !isLive) return;
  sendControl({
    type: 'conversation.item.create',
    item: { type: 'message', role: 'user', content: [{ type: 'input_text', text }] },
  });
  sendControl({ type: 'response.create' });
  appendTranscript('user', text, { final: true });
  setStatus('Thinking…', 'live');
  log('Sent typed message', 'evt');
  els.textInput.value = '';
});

els.newCallBtn.addEventListener('click', () => {
  els.summaryCard.classList.add('hidden');
  els.callCard.classList.remove('hidden');
  els.transcript.innerHTML = '';
  els.log.innerHTML = '';
  setStatus('Idle', 'idle');
});

loadConfig();
