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

let pageSwitchTimeout = null;

function showPage(id) {
  if (pageSwitchTimeout) clearTimeout(pageSwitchTimeout);
  const data = FORENSIC_DATA[id];
  if (data) {
    openModal(data.lines, data.color);
    pageSwitchTimeout = setTimeout(() => {
      closeModal();
      executeSwitch(id);
      pageSwitchTimeout = null;
    }, data.lines.length * 900 + 400);
  } else {
    executeSwitch(id);
  }
}

function executeSwitch(id) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = '';
  });
  document.querySelectorAll('.topnav-links a').forEach(a => a.classList.remove('active'));

  const pageEl = document.getElementById(PAGE_MAP[id] || 'page-' + id);
  const navEl  = document.getElementById(NAV_MAP[id] || 'nav-mandate');

  if (pageEl) {
    pageEl.classList.add('active');
    window.scrollTo(0, 0);
  }
  if (navEl) navEl.classList.add('active');

  // FIX: Close mobile menu if open upon navigation
  document.querySelector('.topnav-links')?.classList.remove('active');

  document.title = `ARCHIVE.PS — ${id.toUpperCase()}_NODE`;
  updateSystemStatus(id);
  syncSidebarHighlight(id);
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

// ── MODAL ENGINE ──
let modalTimeouts = [];

function openModal(lines, color) {
  const modal = document.getElementById('access-modal');
  const content = document.getElementById('modal-content');
  
  // FIX: Clear pending line animations to prevent overlap on rapid clicks
  modalTimeouts.forEach(clearTimeout);
  modalTimeouts = [];
  
  content.innerHTML = '';
  modal.classList.add('active');
  
  lines.forEach((lineText, index) => {
    const t = setTimeout(() => {
      const prevLine = content.lastElementChild;
      if (prevLine) prevLine.classList.add('done');
      const div = document.createElement('div');
      div.className = 'modal-line';
      div.innerText = lineText;
      if (lineText.includes('DENIED') || lineText.includes('ERROR') || lineText.includes('WARNING')) {
        div.style.color = 'var(--red)';
      } else if (lineText.includes('GRANTED') || lineText.includes('SUCCESS')) {
        div.style.color = 'var(--green-light)';
      } else if (color) {
        div.style.color = color;
      }
      content.appendChild(div);
    }, index * 900);
    modalTimeouts.push(t);
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
    openModal(['> INITIATING SECURE HANDSHAKE...', '> VERIFYING NODE IDENTIFICATION...', '> NODE_ID: 0x' + Math.floor(Math.random() * 1000000).toString(16), '> ERROR: PERMISSION_SCOPE_INSUFFICIENT', '> ACCESS DENIED. ATTEMPT LOGGED.'], 'var(--red)');
    return;
  }

  if (btn.classList.contains('evidence-item')) {
    const exId = btn.querySelector('.evidence-ex-id')?.innerText.replace('Exhibit ', '').trim() || 'NULL';
    const exTitle = btn.querySelector('.evidence-ex-title')?.innerText || '';
    const imgEl = btn.querySelector('.evidence-img');
    const imgSrc = imgEl ? imgEl.src : null;
    
    const exScan = EXHIBIT_DATA[exId] || ['> INITIATING FORENSIC SCAN...', `> EXHIBIT_ID: ${exId}`, '> MATCH_FOUND: SOURCE_MEDIA_AUTHENTIC', '> DECRYPTING GEOSPATIAL MARKERS...'];
    btn.classList.add('scanning');
    openModal(exScan, 'var(--green-light)');
    setTimeout(() => {
      btn.classList.remove('scanning');
      closeModal();
      openLightbox(exId, exTitle, imgSrc);
    }, exScan.length * 900 + 200);
    return;
  }

  const reportId = btn.getAttribute('data-report-id');
  const currentPageId = document.querySelector('.page.active')?.id?.replace('page-', '') || 'mandate';
  const contextData = FORENSIC_DATA[reportId] || FORENSIC_DATA[currentPageId];

  if (contextData) {
    openModal(contextData.lines, contextData.color);
  } else {
    openModal(['> ESTABLISHING ENCRYPTED TUNNEL...', '> APPLYING DECRYPTION CIPHER...', '> WARNING: SOURCE_FILE REDACTED AT ORIGIN.', '> PARTIAL DATA RETRIEVED.']);
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
    const term = e.target.value.toLowerCase();
    const results = resultsBlock.querySelectorAll('.search-result-item');
    let found = false;
    if (term.length > 1) {
      results.forEach(item => {
        const textToSearch = item.innerText.toLowerCase();
        // Improve search feature: matching against route keywords as well
        const routeAttr = item.getAttribute('onclick') || '';
        const visible = textToSearch.includes(term) || routeAttr.toLowerCase().includes(term);
        item.style.display = visible ? 'block' : 'none';
        if (visible) found = true;
      });
      resultsBlock.classList.toggle('active', found);
    } else {
      resultsBlock.classList.remove('active');
      results.forEach(item => item.style.display = 'block');
    }
  });

  // Feature: Press Enter to select the first visible search result
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const firstVisible = Array.from(resultsBlock.querySelectorAll('.search-result-item')).find(item => item.style.display === 'block');
      if (firstVisible) {
        firstVisible.click();
      }
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

// ── SYSTEM CLOCK ──
function initSystemClock() {
  const update = () => {
    const now = new Date();
    const time = now.toISOString().split('T')[1].split('.')[0] + '_UTC';
    const el = document.getElementById('utc-clock');
    if (el) el.innerText = time;
  };
  update();
  setInterval(update, 1000);
}

// ── DATA STREAM ──
function initLandingDataStream() {
  const stream = document.getElementById('landing-data-stream');
  if (!stream) return;
  const logs = [
    '> PACKET_REC: GAZA_NORTH_FORENSICS', '> AUTH_SUCCESS: UN_OCHA_TRANSFER',
    '> ALERT: BUFFER_ZONE_INCREMENT +120m', '> SYNC: ICJ_EVIDENTIARY_DOCKET',
    '> PING: SATELLITE_NODE_7_ONLINE', '> LOG: EXIT_PERMIT_DENIAL_v99',
    '> UPLOAD: TESTIMONY_ID_8814...', '> DECRYPTING: COGAT_MEMO_88B...'
  ];
  setInterval(() => {
    const line = document.createElement('div');
    line.className = 'stream-line' + (Math.random() > 0.8 ? ' alert' : '');
    line.innerText = logs[Math.floor(Math.random() * logs.length)];
    stream.appendChild(line);
    if (stream.children.length > 8) stream.removeChild(stream.firstChild);
  }, 3000);
}

// ── INTEL FEED ──
function initIntelligenceFeed() {
  const intelLines = [
    '> SYNCING: ICJ_DOCKET_2024...', '> PACKET_REC: GAZA_NORTH_TLM...',
    '> UPLOAD: TESTIMONY_ID_8812...', '> SCANNING: AREA_C_SATELLITE...',
    '> WARNING: NODE_LATENCY...', '> SYNCING: GENEVA_PROTOCOL_V...',
    '> AUTH_SUCCESS: NGO_PIPE...', '> SEARCH_LOG: QUERIED_VILLAGE_044...'
  ];
  setInterval(() => {
    const scroll = document.getElementById('sidebar-intel');
    if (!scroll) return;
    const newLine = intelLines[Math.floor(Math.random() * intelLines.length)];
    const lines = scroll.innerHTML.split('<br>').filter(Boolean);
    lines.push(newLine);
    if (lines.length > 8) lines.shift();
    scroll.innerHTML = lines.join('<br>');
  }, 4000);
}

// ── SIDEBAR SYNC ──
// Injects template content into all .sidebar elements that are still empty
function syncSidebars() {
  const tmpl = document.getElementById('sidebar-template');
  if (!tmpl) return;
  document.querySelectorAll('.sidebar').forEach(sb => {
    if (!sb.children.length) {
      sb.appendChild(tmpl.content.cloneNode(true));
    }
  });
}

// ── STATUS BAR ──
function updateSystemStatus(id = 'mandate') {
  const entropy = (Math.random() * 100).toFixed(2);
  document.querySelectorAll('.sidebar-status').forEach(status => {
    status.innerHTML = `
      <div class="status-item"><div class="status-dot declassified"></div>Node: ${id.toUpperCase()}</div>
      <div class="status-item"><div class="status-dot"></div>Entropy: ${entropy}%</div>
      <div class="status-item" style="color:var(--amber); font-family:monospace; font-size:7px; margin-top:8px;">SIGNAL_STRENGTH: ▮▮▮▮▯</div>
    `;
  });
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

// ── CENSUS TABLE FILTER ──
function filterCensusTable() {
  const input = document.getElementById('census-search');
  if (!input) return;
  const filter = input.value.toUpperCase();
  const table = document.getElementById('census-master-table');
  if (!table) return;
  Array.from(table.getElementsByTagName('tr')).slice(1).forEach(tr => {
    const visible = Array.from(tr.getElementsByTagName('td')).some(td => td.innerText.toUpperCase().includes(filter));
    tr.style.display = visible ? '' : 'none';
  });
}

// ── MANDATE DOC SWITCHER ──
function switchMandateDoc(docId, element) {
  document.querySelectorAll('.bm-doc').forEach(doc => doc.classList.remove('active'));
  document.querySelectorAll('.bm-list-item').forEach(item => item.classList.remove('active'));
  const target = document.getElementById('doc-' + docId);
  if (target) target.classList.add('active');
  element.classList.add('active');
}

// ── AUDIO ENGINE (FIXED) ──
let audioContext;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
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

// ── MOBILE MENU ──
function toggleMobileMenu() {
  document.querySelector('.topnav-links')?.classList.toggle('active');
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

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  initSystemClock();
  initLandingDataStream();
  initIntelligenceFeed();
  syncSidebars();
  initTimelineFilter();
  initSearch();
  initMapTooltips();
  injectRealImages();
  updateSystemStatus('mandate');
  document.body.addEventListener('click', handleGlobalClicks);

  // Select Balfour Declaration by default on initialization
  const firstMandate = document.querySelector('.bm-list-item');
  if (firstMandate) firstMandate.click();

  // ESC closes modals/search
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSearch();
      closeLightbox();
    }
  });

  console.log('ARCHIVE.PS // MONOLITH_OS: OPERATIONAL');
});
