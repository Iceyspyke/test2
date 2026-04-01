/* ══════════════════════════════════════════
   ARCHIVE.PS — MONOLITH_OS APPLICATION
   app.js

   BUGS FIXED:
   1. CSS-in-script-tag removed (moved to styles.css)
   2. Stray </style> mid-document removed
   3. Page show() now uses requestAnimationFrame for CSS transition
   4. stopAudio() now stores oscillator on element directly
   5. access-modal missing wrapper restored
   6. Duplicate .page CSS rule removed
   7. triggerForensicPing handles missing color gracefully
════════════════════════════════════════════ */

// ── PAGE ROUTER ──
const PAGE_MAP = {
  mandate: 'page-mandate', nakba: 'page-nakba', icj: 'page-icj', hr: 'page-hr',
  case: 'page-case', siege: 'page-siege', maps: 'page-maps', testimonies: 'page-testimonies',
  british: 'page-british', census: 'page-census', icc: 'page-icc', un: 'page-un',
  detention: 'page-detention', media: 'page-media', arms: 'page-arms', medical: 'page-medical',
  culture: 'page-culture', geneva: 'page-geneva', legal: 'page-legal',
  registry: 'page-registry', infrastructure: 'page-infrastructure',
  compliance: 'page-compliance', surveillance: 'page-surveillance', movement: 'page-movement'
};

const NAV_MAP = {
  mandate: 'nav-mandate', nakba: 'nav-nakba', icj: 'nav-icj', hr: 'nav-hr',
  case: 'nav-icj', icc: 'nav-icc'
};

function showPage(id) {
  executeSwitch(id);
}

function executeSwitch(id) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = ''; });
  document.querySelectorAll('.topnav-links a').forEach(a => a.classList.remove('active'));

  const pageEl = document.getElementById(PAGE_MAP[id] || 'page-' + id);
  const navEl  = document.getElementById(NAV_MAP[id] || 'nav-mandate');

  if (pageEl) { pageEl.classList.add('active'); window.scrollTo(0, 0); }
  if (navEl) navEl.classList.add('active');

  // UI State Reset
  const topnavWrap = document.querySelector('.topnav');
  if (topnavWrap) topnavWrap.classList.remove('expanded');
  document.querySelectorAll('.sidebar').forEach(s => { s.classList.remove('active'); const clone = s.querySelector('.mobile-topnav-clone'); if (clone) clone.remove(); });
  document.body.style.overflow = '';
  document.body.classList.remove('mobile-menu-open');

  document.title = `ARCHIVE.PS — ${id.toUpperCase()}_NODE`;
  syncSidebars();
  syncSidebarHighlight(id);
  
  // QOL: Live Telemetry Handshake
  if (typeof bindTfpData === 'function') bindTfpData();
  
  // ── CENTRALIZED API DISPATCHER ──
  const triggers = {
    'maps': () => initMapsApi(),
    'movement': () => initPresencesApi(1),
    'census': () => { initChildNamesApi(); initKilledNamesApi(1); },
    'media': () => initMediaApi(),
    'registry': () => fetchRegistryData('organizations'),
    'infrastructure': () => initInfrastructureApi(),
    'hr': () => initDailyCasualtiesApi(),
    'icj': () => { if (typeof bindTfpData === 'function') bindTfpData(); }
  };

  if (triggers[id]) setTimeout(triggers[id], 150);
}

function syncSidebarHighlight(id) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    const attr = a.getAttribute('onclick') || '';
    if (attr.includes(`'${id}'`) || attr.includes(`"${id}"`)) {
      a.classList.add('active');
    }
  });
}

// ── SYSTEM LOADER (no-op, kept for API) ──
function showLoader(id) {
  executeSwitch(id);
}

// ── TECH FOR PALESTINE (GLOBAL SUMMARY API) ──
let tfpSummaryData = null;

async function initTechForPalestineData() {
  try {
    // Attempt live fetch
    const response = await fetch('https://data.techforpalestine.org/api/v3/summary.json');
    if (!response.ok) throw new Error('API_UNREACHABLE');
    
    tfpSummaryData = await response.json();
    console.log("OS_STREAM: Live telemetry synchronized.");
  } catch (error) {
    console.warn('OS_STREAM: Connection refused. Utilizing local archival cache.');
    // Fallback data so the site is never blank (CORS/Offline protection)
    tfpSummaryData = {
      gaza: { killed: { total: 43900, children: 17400, medical: 1047, press: 188, civil_defence: 85 }, injured: { total: 103890 }, last_update: "2024-ARCHIVE-CACHE" },
      west_bank: { killed: { total: 780 }, injured: { total: 6300 }, settler_attacks: 1500 },
      known_press_killed_in_gaza: { records: 188 }
    };
  }
  bindTfpData();
}

function bindTfpData() {
  if (!tfpSummaryData) return;
  
  document.querySelectorAll('[data-tfp]').forEach(el => {
    const path = el.getAttribute('data-tfp').split('.');
    let val = tfpSummaryData;
    
    for (const key of path) {
      if (val && val[key] !== undefined) val = val[key];
      else { val = null; break; }
    }
    
    if (val !== null) {
      // If it's the date string, don't use toLocaleString
      el.innerText = (typeof val === 'number') ? val.toLocaleString() : val;
      el.classList.remove('status-pulse');
      el.setAttribute('data-tfp-bound', 'true'); 
    } else {
      el.innerText = "REF_NOT_FOUND";
      el.classList.remove('status-pulse');
    }
  });
}

// ── KILLED CHILDREN BY NAME API (CENSUS NODE) ──
async function initChildNamesApi() {
  const container = document.getElementById('child-names-api-container');
  if (!container) return;

  container.innerHTML = `<div style="padding: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase;"><span class="status-pulse red" style="margin-top:8px;"></span> Accessing Child Casualty Datastream...</div>`;

  try {
    const response = await fetch('https://data.techforpalestine.org/api/v2/killed-in-gaza/child-name-counts-en.json');
    if (!response.ok) throw new Error('API Error');
    
    const records = await response.json();
    if (!records || records.length === 0) return;

    let html = `
      <div class="table-header-ctrl">
        <div class="table-search-box">
          <input type="text" id="child-names-search" placeholder="FILTER BY NAME...">
        </div>
      </div>
      <table class="census-table"><thead><tr><th>First Name</th><th>Frequency (Children Killed)</th></tr></thead><tbody style="max-height: 400px; display: block; overflow-y: auto; width: 100%; border-bottom: 1px solid var(--border);">`;
    
    // The API returns an array, map it to rows
    records.slice(0, 100).forEach(rec => { // Limit to top 100 for performance
      html += `<tr style="display:table; width:100%; table-layout:fixed;">
        <td><strong style="color:var(--black); text-transform:uppercase;">${rec.name || rec[0] || 'Unknown'}</strong></td>
        <td style="color:var(--red); font-weight:bold;">${rec.count || rec[1] || 0}</td>
      </tr>`;
    });
    
    html += `</tbody></table><div class="hr-header-text" style="font-size:10px; margin-top:8px;">*Displaying top 100 derived name frequencies.</div>`;
    container.innerHTML = html;
    attachTableSearch('child-names-api-container', 'child-names-search');

  } catch (error) {
    console.error('Child Names API Error:', error);
    container.innerHTML = `<div class="terminal-alert" style="border-color:var(--amber); color:var(--amber);">WARNING: UNABLE TO ESTABLISH SECURE HANDSHAKE WITH CENSUS NODE.</div>`;
  }
}

// ── MODAL ENGINE (Cleaned) ──
function openModal(lines, color) {
  const modal = document.getElementById('access-modal');
  const content = document.getElementById('modal-content');
  content.innerHTML = '';
  modal.classList.add('active');
  
  lines.forEach(lineText => {
    const div = document.createElement('div');
    div.className = 'modal-line done';
    div.innerText = lineText;
    
    if (/DENIED|ERROR|WARNING|CRITICAL|BREACH/.test(lineText)) div.style.color = 'var(--red)';
    else if (/GRANTED|SUCCESS|VERIFIED|SYNCED/.test(lineText)) div.style.color = 'var(--green-light)';
    else if (color) div.style.color = color;
    
    content.appendChild(div);
  });
}

function closeModal() {
  document.getElementById('access-modal').classList.remove('active');
}

// ── GLOBAL CLICK DELEGATE ──
function handleGlobalClicks(e) {
  const btn = e.target.closest('.btn-request, .siege-card-action, .btn-view-register, .urgent-link, .proc-download, .tl-btn, .hr-btn, .evidence-item, .un-res-action, .detention-btn, .cyber-log-btn');
  if (!btn) return;

  // FIX: Prevent generic modal from overriding explicit routing clicks
  if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('showPage')) {
    if (btn.tagName === 'A' && btn.getAttribute('href') === '#') e.preventDefault();
    return;
  }

  e.preventDefault();

  if (btn.classList.contains('btn-request')) {
    return;
  }

  if (btn.classList.contains('evidence-item')) {
    const exId = btn.querySelector('.evidence-ex-id')?.innerText.replace('Exhibit ', '').trim() || 'NULL';
    const exTitle = btn.querySelector('.evidence-ex-title')?.innerText || '';
    const imgEl = btn.querySelector('.evidence-img');
    const imgSrc = imgEl ? imgEl.src : null;
    
    openLightbox(exId, exTitle, imgSrc);
    return;
  }
}

// ── MAP TOOLTIPS ──
function initMapTooltips() {
  document.querySelectorAll('.map-ping').forEach(ping => {
    const label = ping.querySelector('text');
    if (!label) return;
    ping.addEventListener('mouseenter', () => label.style.opacity = '1');
    ping.addEventListener('mouseleave', () => label.style.opacity = '0');
  });
}

// ── LIGHTBOX ──
function openLightbox(id, title, imgSrc) {
  const lb = document.getElementById('forensic-lightbox');
  const idEl = document.getElementById('lb-id');
  const descEl = document.getElementById('lb-desc');
  const imgEl = document.getElementById('lb-img');
  
  if (idEl) idEl.innerText = `EXHIBIT_ID: ${id}`;
  if (descEl) descEl.innerText = title;
  if (imgEl && imgSrc) imgEl.src = imgSrc;
  
  if (lb) lb.classList.add('active');
}

function closeLightbox() {
  const lb = document.getElementById('forensic-lightbox');
  if (lb) lb.classList.remove('active');
}

// ── SEARCH ENGINE ──
function initSearch() {
  const input = document.getElementById('global-search-input');
  const resultsBlock = document.getElementById('search-results');
  if (!input || !resultsBlock) return;

  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const results = Array.from(resultsBlock.querySelectorAll('.search-result-item'));
    
    if (term.length > 0) {
      let foundCount = 0;
      results.forEach(item => {
        const title = item.querySelector('.sr-title')?.innerText.toLowerCase() || '';
        const desc = item.querySelector('.sr-desc')?.innerText.toLowerCase() || '';
        const meta = item.querySelector('.sr-meta')?.innerText.toLowerCase() || '';
        
        const isMatch = title.includes(term) || desc.includes(term) || meta.includes(term);
        item.style.display = isMatch ? 'block' : 'none';
        if (isMatch) foundCount++;
      });
      
      resultsBlock.classList.toggle('active', foundCount > 0);
      
      // UI Polish: Highlight the first result
      results.forEach(r => r.style.borderColor = '');
      const first = results.find(r => r.style.display === 'block');
      if (first) first.style.borderColor = 'var(--red)';
    } else {
      resultsBlock.classList.remove('active');
      results.forEach(item => {
        item.style.display = 'block';
        item.style.borderColor = '';
      });
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const visible = Array.from(resultsBlock.querySelectorAll('.search-result-item')).filter(r => r.style.display !== 'none');
      if (visible.length > 0) visible[0].click();
    }
  });
}

function openSearch() {
  document.getElementById('search-overlay').classList.add('active');
  setTimeout(() => document.getElementById('global-search-input')?.focus(), 100);
}

function closeSearch() {
  document.getElementById('search-overlay').classList.remove('active');
  const input = document.getElementById('global-search-input');
  if (input) {
    input.value = '';
    input.dispatchEvent(new Event('input')); // Reset results list
  }
}

function executeSearchRoute(pageId) {
  closeSearch();
  showPage(pageId);
}

// ── SIDEBAR & FOOTER SYNC ──
// Injects template content into all .sidebar elements and appends footer to .main
function syncSidebars() {
  const tmpl = document.getElementById('sidebar-template');
  if (tmpl) {
    document.querySelectorAll('.sidebar').forEach(sb => {
      if (!sb.children.length) {
        sb.appendChild(tmpl.content.cloneNode(true));
      }
    });
  }
  
  const footerTmpl = document.getElementById('footer-template');
  if (footerTmpl) {
    document.querySelectorAll('.main').forEach(main => {
      const existingFooter = main.querySelector('footer');
      // Remove old, inconsistent footers
      if (existingFooter && !existingFooter.classList.contains('unified-footer')) {
        existingFooter.remove();
      }
      // Add the new unified footer
      if (!main.querySelector('.unified-footer')) {
        main.appendChild(footerTmpl.content.cloneNode(true));
      }
    });
  }
}

// ── TIMELINE FILTER ──
function initTimelineFilter() {
  const search = document.getElementById('tl-search');
  const decade = document.getElementById('tl-decade');
  const type   = document.getElementById('tl-type');
  if (!search) return;

  function filterTimeline() {
    const q = search.value.toLowerCase();
    const d = decade.value;
    const t = type.value;
    let visible = 0;
    document.querySelectorAll('.timeline-item').forEach(item => {
      const text = item.innerText.toLowerCase();
      const matchQ = !q || text.includes(q);
      const matchD = d === 'all' || item.dataset.decade === d;
      const matchT = t === 'all' || item.dataset.type === t;
      const show = matchQ && matchD && matchT;
      item.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const noResults = document.getElementById('tl-no-results');
    if (noResults) noResults.classList.toggle('visible', visible === 0);
  }

  search.addEventListener('input', filterTimeline);
  decade.addEventListener('change', filterTimeline);
  type.addEventListener('change', filterTimeline);
}

// ── GENERIC TABLE SEARCH ──
function attachTableSearch(containerId, inputId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);
  if (!input || !container) return;

  input.addEventListener('input', () => {
    const filter = input.value.toUpperCase();
    const table = container.querySelector('table');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(tr => {
      const text = tr.innerText.toUpperCase();
      tr.style.display = text.includes(filter) ? '' : 'none';
    });
  });
}

// ── MANDATE DOC SWITCHER ──
function switchMandateDoc(docId, element) {
  // Isolate the search strictly to the element's own page context to prevent duplicate ID collisions
  const activePage = element ? element.closest('.page') : document.querySelector('.page.active');
  
  if (activePage) {
    activePage.querySelectorAll('.bm-doc').forEach(doc => doc.classList.remove('active'));
    activePage.querySelectorAll('.bm-list-item').forEach(item => item.classList.remove('active'));
    
    // Find target safely bypassing duplicate ID browser quirks
    const target = Array.from(activePage.querySelectorAll('.bm-doc')).find(doc => doc.id === 'doc-' + docId);
    
    if (target) target.classList.add('active');
    if (element) element.classList.add('active');
  }
}

// ── AUDIO ENGINE (FIXED) ──
let audioContext;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playAudio(btn) {
  initAudio();
  const playerUi = btn.parentElement.querySelector('.audio-ui');
  if (!playerUi) return;
  const timerDisplay = playerUi.querySelector('.audio-timer');

  btn.style.display = 'none';
  playerUi.classList.add('active', 'playing');

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(40, audioContext.currentTime);
  filter.type = 'lowpass';
  filter.frequency.value = 400;

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0.015, audioContext.currentTime);
  oscillator.start();

  // FIX: Store oscillator directly on element, not in dataset
  playerUi._oscillator = oscillator;
  playerUi._gain = gainNode;

  let seconds = 0;
  const intervalId = setInterval(() => {
    seconds++;
    oscillator.frequency.linearRampToValueAtTime(
      Math.random() * 60 + 30,
      audioContext.currentTime + 0.5
    );
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    if (timerDisplay) timerDisplay.innerText = `${m}:${s}`;
    if (seconds >= 15) stopAudio(playerUi.querySelector('.audio-btn-stop'));
  }, 1000);

  playerUi._intervalId = intervalId;
}

function stopAudio(stopBtn) {
  const playerUi = stopBtn.closest('.audio-ui');
  if (!playerUi) return;

  clearInterval(playerUi._intervalId);

  // FIX: Use element property, not dataset
  if (playerUi._oscillator) {
    try { 
      playerUi._oscillator.stop(); 
      playerUi._oscillator.disconnect(); 
    } catch (e) {}
    playerUi._oscillator = null;
  }
  if (playerUi._gain) {
    try { playerUi._gain.disconnect(); } catch (e) {}
    playerUi._gain = null;
  }

  playerUi.classList.remove('playing', 'active');
  const playBtn = playerUi.parentElement?.querySelector('.btn-audio');
  if (playBtn) playBtn.style.display = 'inline-flex';
}

// ── HEADER LINKS TOGGLE ──
function toggleHeaderLinks() {
  const topnav = document.querySelector('.topnav');
  if (topnav) {
    topnav.classList.toggle('expanded');
  }
}

// ── MOBILE MENU ──
function toggleMobileMenu() {
  const sidebar = document.querySelector('.page.active .sidebar');
  const isActive = document.body.classList.contains('mobile-menu-open');
  
  if (isActive) {
    if (sidebar) sidebar.classList.remove('active');
    document.body.style.overflow = '';
    document.body.classList.remove('mobile-menu-open');
  } else {
    if (sidebar) {
      sidebar.classList.add('active');
    }
    document.body.style.overflow = 'hidden';
    document.body.classList.add('mobile-menu-open');
  }
}

// ── LOAD REAL IMAGES ──
function injectRealImages() {
  // Hero background
  const heroEl = document.getElementById('hero-real-bg');
  if (heroEl && REAL_IMAGES.hero) {
    heroEl.style.backgroundImage = `url('${REAL_IMAGES.hero}')`;
  }

  // Timeline images
  const tlImages = document.querySelectorAll('[data-real-img]');
  tlImages.forEach(el => {
    const key = el.getAttribute('data-real-img');
    const src = REAL_IMAGES[key];
    if (src) {
      if (el.tagName === 'IMG') {
        el.src = src;
      } else {
        el.style.backgroundImage = `url('${src}')`;
      }
    }
  });
}

// ── MAPS API INTEGRATION ──
let displacementMapsData = [];
let mapsApiInitialized = false;

async function initMapsApi() {
  if (mapsApiInitialized) return;
  const listEl = document.getElementById('map-order-list');
  if (!listEl) return;
  
  try {
    // Attempt fetch from Gazamaps public endpoint
    const response = await fetch('https://gazamaps.com/api/v1/displacement')
      .catch(() => fetch('/api/v1/displacement')); // Fallback if proxy is required
      
    if (!response || !response.ok) throw new Error('Network response was not ok');
    
    const data = await response.json();
    displacementMapsData = data;
    
    // Sort newest first
    displacementMapsData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    renderMapOrders();
    if (displacementMapsData.length > 0) {
      selectMapOrder(0);
    }
    mapsApiInitialized = true;
  } catch (error) {
    console.error('API Error:', error);
    listEl.innerHTML = `<div class="terminal-alert" style="margin:20px; border-radius:0;">ERR_CONNECTION_REFUSED<br>Unable to fetch displacement datastream.</div>`;
  }
}

function renderMapOrders() {
  const listEl = document.getElementById('map-order-list');
  if (!listEl) return;
  
  listEl.innerHTML = displacementMapsData.map((item, index) => `
    <div class="map-order-item" onclick="selectMapOrder(${index})" data-index="${index}">
      <div class="map-order-date">${item.date}</div>
      <div class="map-order-meta">ID: ${item.id} <br> Disp: ${item.area_sq_km_displacement} km²</div>
    </div>
  `).join('');
}

window.selectMapOrder = function(index) {
  const item = displacementMapsData[index];
  if (!item) return;
  
  // Update Active State
  document.querySelectorAll('.map-order-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.querySelector(`.map-order-item[data-index="${index}"]`);
  if (activeEl) activeEl.classList.add('active');
  
  // Update UI Elements
  const titleEl = document.getElementById('map-ui-title');
  if (titleEl) titleEl.innerText = `ORDER REF: ${item.id}`;
  
  const dateEl = document.getElementById('map-val-date');
  if (dateEl) dateEl.innerText = item.date;
  
  const dispEl = document.getElementById('map-val-disp-area');
  if (dispEl) dispEl.innerText = `${item.area_sq_km_displacement} sq km`;
  
  const safeEl = document.getElementById('map-val-safe-area');
  if (safeEl) safeEl.innerText = `${item.area_sq_km_labeled_safe} sq km`;
  
  const blocksEl = document.getElementById('map-val-blocks');
  if (blocksEl) blocksEl.innerText = item.displacement_blocks || 'None Specified';
  
  // Button Routing
  const btnIdf = document.getElementById('map-btn-idf');
  const btnFull = document.getElementById('map-btn-full');
  
  if (btnIdf) {
    btnIdf.href = item.source || item.link || '#';
    btnIdf.style.display = (item.source || item.link) ? 'block' : 'none';
  }
  if (btnFull) {
    btnFull.href = item.map_full || item.map_zoom || '#';
    btnFull.style.display = (item.map_full || item.map_zoom) ? 'block' : 'none';
  }
  
  // Update Image Display (Priority: Zoom > Full > IDF Source)
  const imgEl = document.getElementById('active-map-img');
  if (imgEl) {
    const targetSrc = item.map_zoom || item.map_full || item.map_idf;
    if (targetSrc) {
      imgEl.src = targetSrc;
      imgEl.style.display = 'block';
    } else {
      imgEl.style.display = 'none';
    }
  }
  
  triggerForensicPing('maps', item.id);
};

// ── TRIGGER FORENSIC PING ──
function triggerForensicPing(type, siteId) {
  const base = FORENSIC_DATA[type];
  if (!base) return;
  const customized = [...base.lines];
  if (customized.length > 3) customized[3] = `> REPORT_FOR: ${siteId}`;
  openModal(customized, base.color || 'var(--green-light)');
}

// ── MAP PING HANDLER ──
function pingMapSite(type, siteId) {
  triggerForensicPing(type, siteId);
}

// ── PRESENCES API INTEGRATION ──
async function initPresencesApi(page = 1) {
  const container = document.getElementById('presences-api-container');
  const pagination = document.getElementById('presences-pagination');
  if (!container) return;

  container.innerHTML = `<div style="padding: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase;"><span class="status-pulse red" style="margin-top:8px;"></span> Fetching Node Data...</div>`;

  try {
    const response = await fetch(`https://movements.genocide.live/api/v1/presences?page=${page}`)
      .catch(() => fetch(`/api/v1/presences?page=${page}`));

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response ? response.status : 'Unknown'}: ${response ? response.statusText : 'Network Error'}`);
    }

    const rawData = await response.json();
    
    // FIX 1: Bulletproof data extraction regardless of API structure changes
    let pageData = rawData;
    let records = [];

    // Scenario A: API wraps the pagination in an array -> [ { current_page: 1, data: [...] } ]
    if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].data) {
      pageData = rawData[0];
      records = pageData.data;
    } 
    // Scenario B: Standard pagination object -> { current_page: 1, data: [...] }
    else if (rawData && rawData.data) {
      pageData = rawData;
      records = pageData.data;
    } 
    // Scenario C: Direct array of items -> [ { id: 1 }, { id: 2 } ]
    else if (Array.isArray(rawData)) {
      records = rawData;
    }

    // FAILSAFE: If the API returned an object dictionary instead of an array (e.g., { "0": {...}, "1": {...} })
    if (!Array.isArray(records)) {
      records = Object.values(records);
    }

    if (records.length === 0) {
      container.innerHTML = `<div class="terminal-alert">NO RECORDS FOUND ON THIS PAGE</div>`;
      if (pagination) pagination.innerHTML = '';
      return;
    }

    let html = `
      <div class="table-header-ctrl">
        <div class="table-search-box">
          <input type="text" id="presences-search" placeholder="FILTER DEPLOYMENTS...">
        </div>
      </div>
      <table class="census-table">
      <thead>
        <tr>
          <th>Date Entered</th>
          <th>Date Exited</th>
          <th>Military Unit</th>
          <th>Area / Location</th>
          <th>Verification Source</th>
        </tr>
      </thead>
      <tbody>`;

    records.forEach(rec => {
      // Safely access nested properties
      const dateEnter = rec.date_entered_display || '-';
      const dateExit = rec.date_exited_display || 'Present';
      const unitName = rec.unit ? (rec.unit.name || '-') : '-';
      const areaName = rec.area ? (rec.area.name || '-') : '-';
      const sourceLink = rec.enter_source 
        ? `<a href="${rec.enter_source}" target="_blank" style="color:var(--red); text-decoration:underline;">View Source</a>` 
        : '-';

      html += `<tr>
        <td>${dateEnter}</td>
        <td>${dateExit}</td>
        <td><strong style="color:var(--black);">${unitName}</strong></td>
        <td>${areaName}</td>
        <td>${sourceLink}</td>
      </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
    attachTableSearch('presences-api-container', 'presences-search');

    // Build Pagination Controls
    if (pagination) {
      const currentPage = pageData.current_page || page;
      // Handle missing last_page safely based on array length
      const lastPage = pageData.last_page || (records.length >= 100 ? currentPage + 1 : currentPage);
      
      let btnHtml = '';
      if (currentPage > 1) {
         btnHtml += `<button class="btn-outline" style="color:var(--black); border-color:var(--border); padding:8px 16px;" onclick="initPresencesApi(${currentPage - 1})">PREV PAGE</button>`;
      }
      
      btnHtml += `<span style="font-family:'IBM Plex Mono', monospace; font-size:10px; padding:10px; color:var(--muted); font-weight:600;">PAGE ${currentPage} ${pageData.last_page ? 'OF ' + lastPage : ''}</span>`;
      
      if (currentPage < lastPage) {
         btnHtml += `<button class="btn-outline" style="color:var(--black); border-color:var(--border); padding:8px 16px;" onclick="initPresencesApi(${currentPage + 1})">NEXT PAGE</button>`;
      }
      pagination.innerHTML = btnHtml;
    }

  } catch (error) {
    console.error('API Error:', error);
    container.innerHTML = `<div class="terminal-alert" style="margin:20px; border-radius:0; border-color:var(--red);">
      ERR_API_FAILURE<br>Unable to fetch presences datastream.<br>
      <span style="display:block; margin-top:8px; font-size:10px; color:var(--muted); text-transform:none;">SERVER OUTPUT: ${error.message}</span>
    </div>`;
    if (pagination) pagination.innerHTML = '';
  }
}

// ── MEDIA CASUALTIES API INTEGRATION ──
async function initMediaApi() {
  const container = document.getElementById('media-api-container');
  if (!container) return;

  container.innerHTML = `<div style="padding: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase;"><span class="status-pulse red" style="margin-top:8px;"></span> Fetching Node Data...</div>`;

  try {
    const response = await fetch('https://stopmurderingjournalists.com/api/v1/martyrs');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let records = await response.json();
    
    // Failsafe extraction in case the API wraps the array inside an object
    if (!Array.isArray(records)) {
      records = records.data || Object.values(records);
    }

    if (!records || records.length === 0) {
      container.innerHTML = `<div class="terminal-alert">NO RECORDS FOUND</div>`;
      return;
    }

    // Dynamically build headers based on whatever attributes the API provides (ignoring generic IDs)
    const keys = Object.keys(records[0]).filter(k => k !== 'id');

    let html = `
      <div class="table-header-ctrl">
        <div class="table-search-box">
          <input type="text" id="media-search" placeholder="FILTER JOURNALISTS...">
        </div>
      </div>
      <table class="census-table"><thead><tr>`;
    keys.forEach(k => { 
      // Clean up keys like 'date_killed' into 'Date Killed'
      let cleanKey = k.replace(/_/g, ' ');
      html += `<th style="text-transform: capitalize;">${cleanKey}</th>`; 
    });
    html += `</tr></thead><tbody>`;

    // Map rows dynamically to ensure compliance with API's no-hardcoding rule
    records.forEach(rec => {
      html += `<tr>`;
      keys.forEach(k => {
        let val = rec[k];
        
        // Handle nested arrays/objects gracefully
        if (Array.isArray(val)) {
          val = val.join(', ');
        } else if (typeof val === 'object' && val !== null) {
          val = val.name || val.title || JSON.stringify(val);
        }
        
        // Wrap hyperlinks and images automatically
        if (typeof val === 'string' && val.startsWith('http')) {
          if (val.match(/\.(jpeg|jpg|gif|png)$/i)) {
            val = `<img src="${val}" alt="Portrait" style="max-height:40px; border-radius:2px;">`;
          } else {
            val = `<a href="${val}" target="_blank" style="color:var(--red); text-decoration:underline;">View Source</a>`;
          }
        }
        
        html += `<td><span style="${k.includes('name') ? 'font-weight:bold; color:var(--black);' : ''}">${val !== undefined && val !== null && val !== '' ? val : '-'}</span></td>`;
      });
      html += `</tr>`;
    });
    html += `</tbody></table>`;

    container.innerHTML = html;
    attachTableSearch('media-api-container', 'media-search');

  } catch (error) {
    console.error('API Error:', error);
    container.innerHTML = `<div class="terminal-alert" style="margin:20px; border-radius:0; border-color:var(--red);">
      ERR_API_FAILURE<br>Unable to fetch media casualty datastream.<br>
      <span style="display:block; margin-top:8px; font-size:10px; color:var(--muted); text-transform:none;">SERVER OUTPUT: ${error.message}</span>
    </div>`;
  }
}

// ── QOL: SCROLL & NAVIGATION UTILITIES ──
function initQolFeatures() {
  // Create Back to Top Button
  if (!document.getElementById('back-to-top')) {
    const btt = document.createElement('div');
    btt.id = 'back-to-top';
    btt.innerHTML = '↑';
    document.body.appendChild(btt);
    
    window.addEventListener('scroll', () => {
      btt.classList.toggle('visible', window.scrollY > 500);
    }, { passive: true });
    
    btt.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Data Point Hash Copying
  document.addEventListener('click', (e) => {
    const dp = e.target.closest('.data-point');
    if (dp && dp.dataset.id) {
      navigator.clipboard.writeText(dp.dataset.id).then(() => {
        const originalText = dp.innerText;
        dp.innerText = 'ID_COPIED';
        setTimeout(() => dp.innerText = originalText, 1000);
      });
    }
  });
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  syncSidebars();
  initQolFeatures();
  initTechForPalestineData(); // Fetch global live statistics
  initTimelineFilter();
  initSearch();
  initMapTooltips();
  injectRealImages();
  document.body.addEventListener('click', handleGlobalClicks);

  // Select Balfour Declaration by default on initialization
  const firstMandate = document.querySelector('.bm-list-item');
  if (firstMandate) firstMandate.click();

  // Click outside mobile menu to close
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('mobile-menu-open')) {
      const isClickInsideMenu = e.target.closest('.topnav-links') || e.target.closest('.sidebar') || e.target.closest('.mobile-menu-btn');
      if (!isClickInsideMenu) {
        toggleMobileMenu();
      }
    }
  });

  // Hotkeys & Listeners
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSearch();
      closeLightbox();
    }
    // 'S' key for Search
    if ((e.key === 's' || e.key === 'S') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      openSearch();
    }
  });

  console.log('ARCHIVE.PS // MONOLITH_OS: OPERATIONAL');
  });
  
  // ── INFRASTRUCTURE DAMAGE API (PAGINATED) ──
  let cachedInfraData = null; // Store data to avoid refetching on page change
  
  async function initInfrastructureApi(page = 1) {
    const container = document.getElementById('infra-api-container');
    const pagination = document.getElementById('infra-pagination');
    const pageSize = 20;
  
    if (!container) return;
    if (page === 1) {
      container.innerHTML = `<div class="skeleton-wrap"><div class="skeleton-row"></div><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;
    }
  
    try {
      if (!cachedInfraData) {
        const response = await fetch('https://data.techforpalestine.org/api/v3/infrastructure-damaged.json');
        if (!response.ok) throw new Error('OFFLINE');
        const rawData = await response.json();
        
        // Filter for unique significant updates only
        const uniqueData = [];
        let lastHash = "";
        for (let i = rawData.length - 1; i >= 0; i--) {
          const d = rawData[i];
          const hash = `${d.residential?.ext_destroyed}|${d.educational_buildings?.ext_damaged}|${d.places_of_worship?.ext_mosques_destroyed}`;
          if (hash !== lastHash) {
            uniqueData.push(d);
            lastHash = hash;
          }
        }
        cachedInfraData = uniqueData;
      }
  
      const totalPages = Math.ceil(cachedInfraData.length / pageSize);
      const start = (page - 1) * pageSize;
      const pagedData = cachedInfraData.slice(start, start + pageSize);
  
      let html = `
        <div class="table-header-ctrl">
          <div class="table-search-box">
            <input type="text" id="infra-search" placeholder="FILTER BY DATE OR SECTOR...">
          </div>
        </div>
        <div style="overflow-x:auto;">
          <table class="census-table">
            <thead>
              <tr>
                <th>Report Date</th>
                <th>Residential (Destroyed)</th>
                <th>Educational Units</th>
                <th>Places of Worship</th>
              </tr>
            </thead>
            <tbody>`;
      
      pagedData.forEach(day => {
        html += `<tr>
          <td><span style="font-family:mono; font-size:11px;">${day.report_date}</span></td>
          <td style="color:var(--red); font-weight:bold;">${(day.residential?.ext_destroyed || 0).toLocaleString()}</td>
          <td>${(day.educational_buildings?.ext_damaged || 0).toLocaleString()}</td>
          <td>${(day.places_of_worship?.ext_mosques_destroyed || 0).toLocaleString()}</td>
        </tr>`;
      });
      
      html += `</tbody></table></div>`;
      container.innerHTML = html;
      attachTableSearch('infra-api-container', 'infra-search');
  
      // Pagination UI
      if (pagination) {
        pagination.innerHTML = `
          <button class="btn-outline" style="padding:8px 16px; border-color:var(--border);" onclick="initInfrastructureApi(${page - 1})" ${page <= 1 ? 'disabled' : ''}>PREV</button>
          <span style="font-family:mono; font-size:10px; color:var(--muted);">PAGE ${page} OF ${totalPages}</span>
          <button class="btn-outline" style="padding:8px 16px; border-color:var(--border);" onclick="initInfrastructureApi(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>NEXT</button>
        `;
      }
  
    } catch (e) { 
      container.innerHTML = `<div class="terminal-alert">ERR_INFRA_STREAM_OFFLINE: UNABLE TO SYNC SATELLITE TELEMETRY</div>`; 
    }
  }
  
  // ── MARTYRS NAMES REGISTRY (Killed in Gaza) ──
  async function initKilledNamesApi(page = 1) {
    const container = document.getElementById('names-registry-container');
    const pagination = document.getElementById('names-pagination');
    if (!container) return;
    container.innerHTML = `<div class="status-pulse red" style="padding:20px; font-family:mono; font-size:10px;">ACCESSING ARCHIVAL NAMES LIST...</div>`;
    try {
      const response = await fetch(`https://data.techforpalestine.org/api/v2/killed-in-gaza/page-${page}.json`);
      const records = await response.json();
      let html = `
        <div class="table-header-ctrl">
          <div class="table-search-box">
            <input type="text" id="martyrs-search" placeholder="FILTER BY NAME...">
          </div>
        </div>
        <table class="census-table"><thead><tr><th>Name (Arabic)</th><th>English Translation</th><th>Age</th><th>Sex</th></tr></thead><tbody>`;
      records.forEach(rec => {
        const sex = rec.sex ? rec.sex.toUpperCase() : 'N/A';
        html += `<tr><td>${rec.name}</td><td><strong>${rec.en_name}</strong></td><td>${rec.age || 'N/A'}</td><td>${sex}</td></tr>`;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
      attachTableSearch('names-registry-container', 'martyrs-search');
      pagination.innerHTML = `
        <button class="btn-outline" style="padding:8px 16px; border-color:var(--border);" onclick="initKilledNamesApi(${page - 1})" ${page <= 1 ? 'disabled' : ''}>PREV</button>
        <span style="font-family:mono; font-size:10px; color:var(--muted); padding:0 10px;">PAGE ${page}</span>
        <button class="btn-outline" style="padding:8px 16px; border-color:var(--border);" onclick="initKilledNamesApi(${page + 1})">NEXT</button>`;
    } catch (e) { container.innerHTML = `<div class="terminal-alert">ERR_NAMES_STREAM_OFFLINE</div>`; }
  }
  
  // ── DAILY CASUALTY LOGS (Gaza & West Bank) ──
  async function initDailyCasualtiesApi() {
    const container = document.getElementById('daily-log-container');
    if (!container) return;
    container.innerHTML = `<div class="status-pulse red" style="padding:20px; font-family:mono; font-size:10px;">SYNCING DAILY LOGS...</div>`;
    try {
      const response = await fetch('https://data.techforpalestine.org/api/v2/casualties_daily.json');
      const data = await response.json();
      const recent = data.slice(-15).reverse();
      let html = `<table class="census-table"><thead><tr><th>Report Date</th><th>Killed (Cum)</th><th>Injured (Cum)</th><th>Children</th></tr></thead><tbody>`;
      recent.forEach(day => {
        html += `<tr><td>${day.report_date}</td><td style="color:var(--red); font-weight:bold;">${day.killed_cum.toLocaleString()}</td><td>${day.injured_cum.toLocaleString()}</td><td>${day.killed_children_cum?.toLocaleString() || '--'}</td></tr>`;
      });
      html += `</tbody></table>`;
      container.innerHTML = html;
    } catch (e) { container.innerHTML = `<div class="terminal-alert">ERR_CASUALTY_STREAM_OFFLINE</div>`; }
  }
  
  // ── ARCHIVE REGISTRY (Culture & Resources) ──
  async function fetchRegistryData(category, btnEl) {
    const container = document.getElementById('registry-api-container');
    if (!container) return;
    if (btnEl) {
      document.querySelectorAll('.timeline-filters .btn-outline').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    container.innerHTML = `<div class="status-pulse red" style="padding:20px; font-family:mono; font-size:10px;">QUERYING ${category.toUpperCase()} NODE...</div>`;
    try {
      const response = await fetch(`https://palestine-api.viethere.com/api/v1/${category}`).catch(() => null);
      let records = [];
      if (response && response.ok) {
        const rawData = await response.json();
        records = Array.isArray(rawData) ? rawData : (rawData.data || Object.values(rawData));
      } else {
        // CONNECTION FAILED FALLBACK
        const cache = {
          organizations: [
            { name: "PCRF", description: "Palestine Children's Relief Fund.", type: "Medical", link: "https://www.pcrf.net" },
            { name: "Al-Haq", description: "Independent human rights organization.", type: "Human Rights", link: "https://www.alhaq.org" },
            { name: "BDS Movement", description: "Boycott, Divestment, Sanctions campaign.", type: "Advocacy", link: "https://bdsmovement.net" }
          ],
          books: [
            { title: "The Hundred Years' War on Palestine", author: "Rashid Khalidi", link: "#" },
            { title: "The Ethnic Cleansing of Palestine", author: "Ilan Pappé", link: "#" }
          ],
          movies: [
            { title: "Farha", director: "Darin J. Sallam", link: "https://www.netflix.com" },
            { title: "Born in Gaza", director: "Hernán Zin", link: "#" }
          ]
        };
        records = cache[category] || [];
      }
      let html = `<table class="census-table"><thead><tr>`;
      if (category === 'organizations') {
        html += `<th>Organization</th><th>Description</th><th>Focus</th><th>Access</th></tr></thead><tbody>`;
        records.forEach(rec => { html += `<tr><td><strong style="color:var(--black);">${rec.name}</strong></td><td>${rec.description || '-'}</td><td><span class="exhibit-tag">${rec.type || 'NGO'}</span></td><td><a href="${rec.link}" target="_blank" class="detention-btn">Link</a></td></tr>`; });
      } else {
        html += `<th>Title</th><th>Creator</th><th>Access</th></tr></thead><tbody>`;
        records.forEach(rec => { html += `<tr><td><strong style="color:var(--black);">${rec.title}</strong></td><td>${rec.author || rec.director || '-'}</td><td><a href="${rec.link}" target="_blank" class="detention-btn">View</a></td></tr>`; });
      }
      container.innerHTML = html + `</tbody></table>`;
    } catch (e) { container.innerHTML = `<div class="terminal-alert">ERR_REGISTRY_HANDSHAKE_FAILED</div>`; }
  }