// Use-case definitions for the Voice Live WebRTC gallery.
// Each use case has a hero, a customer quote, and feature capability cards.

const USE_CASES = [
  {
    id: 'real-estate',
    tag: 'Real Estate',
    title: 'A real estate agent on a live customer call',
    quote: {
      text: '"I\'m on a live call with my customer. They\'re aware the conversation is recorded — and the moment we hang up, the AI hands me the summary."',
      source: 'Orange Business',
      icon: '🎧',
    },
    features: [
      {
        icon: 'cc',
        title: 'Live transcription',
        description: 'The call is transcribed in real time as it happens.',
      },
      {
        icon: 'translate',
        title: 'Real-time translation',
        description: 'Speaker and listener converse across languages, live.',
      },
      {
        icon: 'shield',
        title: 'Consented recording',
        description: 'Recorded with the customer\'s awareness and consent.',
      },
      {
        icon: 'summary',
        title: 'End-of-call summary',
        description: 'AI delivers a structured recap the moment the call ends.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for a real estate agent. Help manage the live customer call by providing real-time transcription, flagging key property details mentioned, and preparing a structured summary when the call ends. Be professional and concise.',
      voice: 'ash',
      temperature: 0.7,
    },
  },
  {
    id: 'healthcare',
    tag: 'Healthcare',
    title: 'A nurse triaging patients over the phone',
    quote: {
      text: '"The AI listens alongside me, captures symptoms in real time, and pre-fills the intake form before I even finish the call."',
      source: 'Mercy Health',
      icon: '🩺',
    },
    features: [
      {
        icon: 'mic',
        title: 'Symptom capture',
        description: 'Automatically identifies and logs symptoms mentioned during the call.',
      },
      {
        icon: 'clipboard',
        title: 'Auto-fill intake',
        description: 'Pre-populates patient intake forms with structured data from the conversation.',
      },
      {
        icon: 'shield',
        title: 'HIPAA-aware',
        description: 'Designed for compliance with healthcare privacy regulations.',
      },
      {
        icon: 'priority',
        title: 'Triage priority',
        description: 'AI suggests urgency level based on reported symptoms.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for a healthcare triage nurse. Listen to the patient call, capture symptoms mentioned, and help organize the information into a structured intake format. Flag any urgent symptoms. Be empathetic and precise.',
      voice: 'coral',
      temperature: 0.5,
    },
  },
  {
    id: 'contact-center',
    tag: 'Contact Center',
    title: 'An agent handling high-volume support calls',
    quote: {
      text: '"When a frustrated customer calls, the AI whispers the right response in my ear. My resolution time dropped 40%."',
      source: 'TeleCom Solutions',
      icon: '📞',
    },
    features: [
      {
        icon: 'sentiment',
        title: 'Sentiment analysis',
        description: 'Detects caller emotion and alerts the agent in real time.',
      },
      {
        icon: 'lightbulb',
        title: 'Agent assist',
        description: 'Suggests responses, knowledge base articles, and next-best actions.',
      },
      {
        icon: 'cc',
        title: 'Live transcription',
        description: 'Full conversation transcript available during and after the call.',
      },
      {
        icon: 'chart',
        title: 'Call analytics',
        description: 'Aggregated insights on call patterns, topics, and resolution rates.',
      },
    ],
    pocConfig: {
      instructions: 'You are a real-time AI copilot for a customer support agent. Monitor the live call, detect customer sentiment, suggest helpful responses, and surface relevant knowledge base articles. Keep suggestions brief and actionable.',
      voice: 'alloy',
      temperature: 0.6,
    },
  },
  {
    id: 'sales-coaching',
    tag: 'Sales',
    title: 'A sales rep getting live coaching during a pitch',
    quote: {
      text: '"Mid-call, the AI nudged me to address the pricing objection differently. I closed the deal."',
      source: 'Velocity CRM',
      icon: '📈',
    },
    features: [
      {
        icon: 'lightbulb',
        title: 'Real-time prompts',
        description: 'AI suggests talking points and objection handlers as the conversation unfolds.',
      },
      {
        icon: 'chart',
        title: 'Talk-ratio tracking',
        description: 'Monitors speaking balance between rep and prospect.',
      },
      {
        icon: 'summary',
        title: 'Deal summary',
        description: 'Generates a structured deal recap with next steps after each call.',
      },
      {
        icon: 'target',
        title: 'Competitor mentions',
        description: 'Flags competitor names and preps counter-positioning in real time.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI sales coach providing live guidance during a sales call. Monitor the conversation for objection cues, suggest talking points, track talk-to-listen ratio, and prepare a deal summary. Be concise — the rep is on a live call.',
      voice: 'verse',
      temperature: 0.75,
    },
  },
  {
    id: 'education',
    tag: 'Education',
    title: 'A student practicing a language with an AI tutor',
    quote: {
      text: '"It feels like talking to a real tutor. It corrects my pronunciation mid-sentence and adapts to my level."',
      source: 'LinguaLeap',
      icon: '🎓',
    },
    features: [
      {
        icon: 'translate',
        title: 'Pronunciation feedback',
        description: 'Real-time correction and coaching on spoken language.',
      },
      {
        icon: 'mic',
        title: 'Adaptive difficulty',
        description: 'AI adjusts vocabulary and speed based on the learner\'s responses.',
      },
      {
        icon: 'cc',
        title: 'Bilingual transcript',
        description: 'Side-by-side transcript in both the native and target language.',
      },
      {
        icon: 'star',
        title: 'Progress tracking',
        description: 'Session-over-session metrics on fluency and vocabulary growth.',
      },
    ],
    pocConfig: {
      instructions: 'You are a patient and encouraging language tutor. Help the student practice conversational English. Speak clearly at a moderate pace. Gently correct grammar and pronunciation by naturally repeating the correct form. Adapt to the student\'s level.',
      voice: 'shimmer',
      temperature: 0.6,
    },
  },
  {
    id: 'legal',
    tag: 'Legal',
    title: 'A lawyer conducting a client intake interview',
    quote: {
      text: '"The AI captures every detail while I focus on the conversation. The draft engagement letter is ready before the client leaves."',
      source: 'Clarke & Partners LLP',
      icon: '⚖️',
    },
    features: [
      {
        icon: 'clipboard',
        title: 'Structured notes',
        description: 'AI extracts key facts, dates, parties, and claims from the conversation.',
      },
      {
        icon: 'shield',
        title: 'Privilege-aware',
        description: 'Designed with attorney-client privilege safeguards in mind.',
      },
      {
        icon: 'summary',
        title: 'Draft generation',
        description: 'Auto-generates engagement letters and case summaries post-call.',
      },
      {
        icon: 'search',
        title: 'Precedent lookup',
        description: 'Surfaces relevant case law and statutes mentioned during the interview.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for a lawyer conducting a client intake interview. Listen carefully, extract key facts (names, dates, events, claims), and organize them into a structured case summary. Flag any areas that need follow-up questions. Be precise and professional.',
      voice: 'echo',
      temperature: 0.5,
    },
  },
  {
    id: 'financial-advisory',
    tag: 'Finance',
    title: 'A financial advisor walking a client through their portfolio',
    quote: {
      text: '"While I explain market trends, the AI pulls up the exact charts and projections I need — before I even ask."',
      source: 'WealthBridge Advisors',
      icon: '💰',
    },
    features: [
      {
        icon: 'chart',
        title: 'Live market data',
        description: 'Surfaces real-time stock prices, fund performance, and benchmarks during the call.',
      },
      {
        icon: 'shield',
        title: 'Compliance guard',
        description: 'Flags potential compliance or suitability issues in real time.',
      },
      {
        icon: 'summary',
        title: 'Meeting minutes',
        description: 'Auto-generates a compliant record of advice given and decisions made.',
      },
      {
        icon: 'calculator',
        title: 'Scenario modeling',
        description: 'Runs retirement or investment projections mentioned during the conversation.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for a financial advisor. During client calls, surface relevant market data, flag compliance concerns, and prepare structured meeting minutes. Be precise with numbers and always note disclaimers.',
      voice: 'cedar',
      temperature: 0.5,
    },
  },
  {
    id: 'hospitality',
    tag: 'Hospitality',
    title: 'A hotel concierge handling guest requests by phone',
    quote: {
      text: '"A guest calls asking for restaurant reservations, spa bookings, and a late checkout — the AI queues all three before I hang up."',
      source: 'Meridian Hotels',
      icon: '🏨',
    },
    features: [
      {
        icon: 'clipboard',
        title: 'Request capture',
        description: 'Logs every guest request with room number, priority, and category.',
      },
      {
        icon: 'translate',
        title: 'Multilingual support',
        description: 'Real-time translation for international guests in 40+ languages.',
      },
      {
        icon: 'lightning',
        title: 'Instant dispatch',
        description: 'Automatically routes tasks to housekeeping, F&B, or maintenance.',
      },
      {
        icon: 'star',
        title: 'Guest preferences',
        description: 'Recalls returning guest history and preferences from the loyalty profile.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI concierge assistant at a luxury hotel. Help the front desk agent capture guest requests, look up availability for restaurants and spa, and log special preferences. Be warm, professional, and efficient.',
      voice: 'sage',
      temperature: 0.7,
    },
  },
  {
    id: 'insurance-claims',
    tag: 'Insurance',
    title: 'A claims adjuster taking a first notice of loss',
    quote: {
      text: '"The caller is stressed after an accident. The AI captures the details so I can focus on being human."',
      source: 'Apex Underwriters',
      icon: '🛡️',
    },
    features: [
      {
        icon: 'clipboard',
        title: 'Structured FNOL',
        description: 'Extracts date, location, parties, damages, and injuries into a claims form.',
      },
      {
        icon: 'sentiment',
        title: 'Empathy cues',
        description: 'Detects caller distress and suggests empathetic phrasing for the adjuster.',
      },
      {
        icon: 'search',
        title: 'Policy lookup',
        description: 'Pulls the caller\'s policy details and coverage limits in real time.',
      },
      {
        icon: 'summary',
        title: 'Claim draft',
        description: 'Generates a preliminary claim file ready for review after the call.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for an insurance claims adjuster taking a First Notice of Loss call. Capture all relevant details (date, location, parties, damages, injuries) and organize them into a structured claim form. Be empathetic — the caller may be distressed.',
      voice: 'coral',
      temperature: 0.5,
    },
  },
  {
    id: 'recruiting',
    tag: 'Recruiting',
    title: 'A recruiter screening candidates over a phone call',
    quote: {
      text: '"I used to spend 20 minutes writing up notes after each screen. Now the summary is ready the instant I hang up."',
      source: 'TalentForge',
      icon: '🤝',
    },
    features: [
      {
        icon: 'clipboard',
        title: 'Skill extraction',
        description: 'Identifies technologies, years of experience, and qualifications mentioned.',
      },
      {
        icon: 'chart',
        title: 'Scorecard auto-fill',
        description: 'Maps candidate responses to predefined evaluation criteria.',
      },
      {
        icon: 'cc',
        title: 'Full transcript',
        description: 'Searchable transcript for the hiring team to review later.',
      },
      {
        icon: 'summary',
        title: 'Candidate brief',
        description: 'One-page summary with strengths, concerns, and recommended next steps.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for a recruiter conducting phone screens. Listen for skills, experience, and qualifications. Map responses to the job requirements. Prepare a structured candidate brief with strengths, concerns, and a hire/no-hire recommendation.',
      voice: 'marin',
      temperature: 0.6,
    },
  },
  {
    id: 'telehealth',
    tag: 'Telehealth',
    title: 'A physician conducting a remote consultation',
    quote: {
      text: '"The AI drafts the clinical note while I talk to my patient. I review and sign — charting time cut in half."',
      source: 'CareConnect Health',
      icon: '🩻',
    },
    features: [
      {
        icon: 'mic',
        title: 'Ambient documentation',
        description: 'Generates clinical notes from natural doctor-patient conversation.',
      },
      {
        icon: 'clipboard',
        title: 'SOAP note drafting',
        description: 'Structures findings into Subjective, Objective, Assessment, and Plan.',
      },
      {
        icon: 'priority',
        title: 'Drug interaction alerts',
        description: 'Flags potential medication conflicts when prescriptions are discussed.',
      },
      {
        icon: 'summary',
        title: 'Patient summary',
        description: 'Produces a plain-language visit summary for the patient portal.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI scribe for a physician during a telehealth visit. Listen to the conversation and draft a SOAP-format clinical note. Flag any drug interactions if medications are discussed. Generate a patient-friendly visit summary. Be medically precise.',
      voice: 'echo',
      temperature: 0.4,
    },
  },
  {
    id: 'field-service',
    tag: 'Field Service',
    title: 'A technician troubleshooting equipment on a hands-free call',
    quote: {
      text: '"My hands are inside a machine. I describe what I see, and the AI walks me through the fix step by step."',
      source: 'IndusTech Services',
      icon: '🔧',
    },
    features: [
      {
        icon: 'lightbulb',
        title: 'Step-by-step guidance',
        description: 'AI provides sequential repair instructions based on the technician\'s description.',
      },
      {
        icon: 'search',
        title: 'Manual lookup',
        description: 'Surfaces relevant pages from equipment manuals and knowledge base.',
      },
      {
        icon: 'mic',
        title: 'Hands-free operation',
        description: 'Fully voice-driven — no screen interaction required in the field.',
      },
      {
        icon: 'summary',
        title: 'Work order update',
        description: 'Logs parts used, steps taken, and resolution into the service ticket.',
      },
    ],
    pocConfig: {
      instructions: 'You are an AI assistant for a field service technician. The technician will describe equipment issues verbally. Provide clear, step-by-step troubleshooting guidance. Reference relevant manual sections. Log the repair steps for the work order. Keep instructions concise — they\'re working hands-free.',
      voice: 'ballad',
      temperature: 0.6,
    },
  },
];

// SVG icons for feature cards
const ICONS = {
  cc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="M8 10a2 2 0 1 0 0 4"/><path d="M16 10a2 2 0 1 0 0 4"/></svg>',
  translate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 8l6 0"/><path d="M4 6h8"/><path d="M8 6V4"/><path d="M10 12l-2-2"/><path d="M13 18l2-5 2 5"/><path d="M14 16h2"/><path d="M12 12l-4 4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l7 4v5c0 5-3.5 9.7-7 11-3.5-1.3-7-6-7-11V6l7-4z"/></svg>',
  summary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8"/><path d="M8 11h8"/><path d="M8 15h5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3V1h6v2"/><path d="M9 11h6"/><path d="M9 15h4"/></svg>',
  priority: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v10"/><circle cx="12" cy="18" r="2"/></svg>',
  sentiment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1" fill="currentColor"/><circle cx="15" cy="9" r="1" fill="currentColor"/></svg>',
  lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><rect x="6" y="10" width="3" height="10"/><rect x="11" y="6" width="3" height="14"/><rect x="16" y="12" width="3" height="8"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
  calculator: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8"/><path d="M8 10h2"/><path d="M14 10h2"/><path d="M8 14h2"/><path d="M14 14h2"/><path d="M8 18h2"/><path d="M14 18h2"/></svg>',
  lightning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
};

// Tag colors for each vertical
const TAG_COLORS = {
  'Real Estate': '#f97316',
  'Healthcare': '#06b6d4',
  'Contact Center': '#8b5cf6',
  'Sales': '#f59e0b',
  'Education': '#10b981',
  'Legal': '#6366f1',
  'Finance': '#0ea5e9',
  'Hospitality': '#ec4899',
  'Insurance': '#14b8a6',
  'Recruiting': '#a855f7',
  'Telehealth': '#ef4444',
  'Field Service': '#78716c',
};

// Render the overview navigation cards
function renderOverview() {
  const grid = document.getElementById('overviewGrid');
  for (const uc of USE_CASES) {
    const color = TAG_COLORS[uc.tag] || '#f97316';
    const card = document.createElement('a');
    card.href = `#${uc.id}`;
    card.className = 'overview-card';
    card.style.setProperty('--tag-color', color);
    card.innerHTML = `
      <span class="overview-icon">${uc.quote.icon}</span>
      <span class="overview-tag" style="color:${color}">${uc.tag}</span>
      <span class="overview-title">${uc.title}</span>
    `;
    grid.appendChild(card);
  }
}

// Render the detailed use-case sections
function renderSections() {
  const container = document.getElementById('useCaseSections');
  for (const uc of USE_CASES) {
    const color = TAG_COLORS[uc.tag] || '#f97316';
    const section = document.createElement('section');
    section.className = 'use-case';
    section.id = uc.id;

    const featuresHtml = uc.features
      .map(
        (f) => `
      <div class="feature-card">
        <div class="feature-icon" style="--icon-color:${color}">
          ${ICONS[f.icon] || ''}
        </div>
        <h4>${f.title}</h4>
        <p>${f.description}</p>
      </div>`
      )
      .join('');

    // Build the POC link with config params
    const params = new URLSearchParams();
    if (uc.pocConfig.instructions) params.set('instructions', uc.pocConfig.instructions);
    if (uc.pocConfig.voice) params.set('voice', uc.pocConfig.voice);
    if (uc.pocConfig.temperature != null) params.set('temperature', uc.pocConfig.temperature);
    const pocLink = `index.html?${params.toString()}`;

    section.innerHTML = `
      <div class="container">
        <span class="section-tag" style="color:${color}">
          <span class="tag-dot" style="background:${color}"></span>
          THE USE CASE
        </span>
        <h2>${uc.title}</h2>

        <div class="quote-banner">
          <div class="quote-icon">${uc.quote.icon}</div>
          <blockquote>${uc.quote.text}</blockquote>
          <cite style="color:${color}">— ${uc.quote.source}</cite>
        </div>

        <div class="features-grid">${featuresHtml}</div>

        <a href="${pocLink}" class="try-btn" style="background:${color}">Try this scenario →</a>
      </div>
    `;

    container.appendChild(section);
  }
}

renderOverview();
renderSections();
