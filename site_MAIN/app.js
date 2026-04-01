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

  // FIX: Close mobile menus if open upon navigation
  const topnavWrap = document.querySelector('.topnav');
  if (topnavWrap) topnavWrap.classList.remove('expanded');
  
  const topnavLinks = document.querySelector('.topnav-links');
  if (topnavLinks) {
    topnavLinks.classList.remove('active');
    topnavLinks.style.removeProperty('display');
  }
  document.querySelectorAll('.sidebar').forEach(s => {
    s.classList.remove('active');
    s.style.removeProperty('top');
    s.style.removeProperty('height');
    // Remove cloned mobile navs so they regenerate with correct active states
    const clone = s.querySelector('.mobile-topnav-clone');
    if (clone) clone.remove();
  });
  document.body.style.overflow = '';
  document.body.classList.remove('mobile-menu-open');

  document.title = `ARCHIVE.PS — ${id.toUpperCase()}_NODE`;
  syncSidebarHighlight(id);
  syncSidebars(); // Ensure all sidebars and footers are consistently updated on routing
  
  // Trigger Map API if user opens the Geospatial Node
  if (id === 'maps') {
    setTimeout(initMapsApi, 100);
  }
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
  
  triggerForensicPing('GEO', item.id);
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

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  syncSidebars();
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
