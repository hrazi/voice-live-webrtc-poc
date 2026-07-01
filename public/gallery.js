// Gallery UI: renders the overview nav cards and the detailed use-case
// sections from the shared scenario data module.
import { USE_CASES, ICONS, TAG_COLORS } from './scenarios-data.js';

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

    // Scenario runtime page renders a tailored call UX + end-of-call summary
    // for this specific use case (see scenario.html / scenario.js).
    const pocLink = `scenario.html?id=${encodeURIComponent(uc.id)}`;

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
