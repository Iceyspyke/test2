/* ══════════════════════════════════════════
   ISRAELI_VIOLENCE. — MONOLITH_OS APPLICATION
   app.js
════════════════════════════════════════════ */

const PAGE_MAP = {
  mandate: 'page-mandate', nakba: 'page-nakba', chronology: 'page-chronology', icj: 'page-icj', hr: 'page-hr',
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

const REDDIT_POLL_MS = 2 * 60 * 60 * 1000;

// Global State
let tfpSummaryData = null;

// Reusable UI state functions for API loading/errors
function renderPagination(currentPage, totalPages, callbackName) {
  const prevDisabled = currentPage <= 1 ? 'disabled' : '';
  const nextDisabled = currentPage >= totalPages ? 'disabled' : '';
  return `
    <button class="btn-outline" style="padding:8px 16px; border-color:var(--border); color:black;" onclick="${callbackName}(${currentPage - 1})" ${prevDisabled}>PREV</button>
    <span style="font-family:'IBM Plex Mono', monospace; font-size:10px; color:var(--muted); padding:0 10px;">PAGE ${currentPage} OF ${totalPages}</span>
    <button class="btn-outline" style="padding:8px 16px; border-color:var(--border); color:black;" onclick="${callbackName}(${currentPage + 1})" ${nextDisabled}>NEXT</button>
  `;
}

function setApiLoading(container, text = 'Fetching Node Data...') {
  if (container) container.innerHTML = `<div style="padding: 20px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--muted); text-transform: uppercase;"><span class="status-pulse red" style="margin-top:8px;"></span> ${text}</div>`;
}

function setApiError(container, msg = 'ERR_API_FAILURE<br>Unable to fetch datastream.') {
  if (container) container.innerHTML = `<div class="terminal-alert" style="margin:20px; border-radius:0; border-color:var(--red);">${msg}</div>`;
}
let audioContext;
let displacementMapsData = [];
let mapsApiInitialized = false;
let cachedInfraData = null; 
let cachedMartyrsData = null;
let filteredMartyrsData = null;
let martyrsCurrentPage = 1;
const martyrsPageSize = 100;
let martyrsSort = { col: null, dir: 'asc' };
let infraSortDir = 'desc';

/* ── 1. ROUTING & NAVIGATION ── */
function showPage(id) { executeSwitch(id); }

function executeSwitch(id) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = ''; });
  document.querySelectorAll('.topnav-links a').forEach(a => a.classList.remove('active'));

  const pageEl = document.getElementById(PAGE_MAP[id] || 'page-' + id);
  const navEl = NAV_MAP[id] ? document.getElementById(NAV_MAP[id]) : null;

  if (pageEl) { pageEl.classList.add('active'); window.scrollTo(0, 0); }
  if (navEl) navEl.classList.add('active');

  const topnavWrap = document.querySelector('.topnav');
  if (topnavWrap) topnavWrap.classList.remove('expanded');
  const topnavLinks = document.querySelector('.topnav-links');
  if (topnavLinks) topnavLinks.classList.remove('active');
  document.querySelectorAll('.sidebar').forEach(s => { 
    s.classList.remove('active'); 
    const clone = s.querySelector('.mobile-topnav-clone'); 
    if (clone) clone.remove(); 
  });
  document.body.style.overflow = '';
  document.body.classList.remove('mobile-menu-open');
  
  document.title = `ISRAELI_VIOLENCE. — ${id.toUpperCase()}_NODE`;
  syncSidebarHighlight(id);
  
  if (typeof bindTfpData === 'function') bindTfpData();
  
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
  
  setTimeout(() => {
    if (id === 'nakba' || id === 'chronology') initTimelineFilter();
    injectTableLabels();
    initAllStaticTables();
  }, 300);
}

function syncSidebarHighlight(id) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => {
    a.classList.remove('active');
    const attr = a.getAttribute('onclick') || '';
    if (attr.includes(`'${id}'`) || attr.includes(`"${id}"`)) a.classList.add('active');
  });
}

function switchMandateDoc(docId, element) {
  const activePage = element ? element.closest('.page') : document.querySelector('.page.active');
  if (activePage) {
    activePage.querySelectorAll('.bm-doc').forEach(doc => doc.classList.remove('active'));
    activePage.querySelectorAll('.bm-list-item').forEach(item => item.classList.remove('active'));
    const target = Array.from(activePage.querySelectorAll('.bm-doc')).find(doc => doc.id === 'doc-' + docId);
    if (target) target.classList.add('active');
    if (element) element.classList.add('active');
  }
}

/* ── 2. UI COMPONENTS & OVERLAYS ── */
function toggleHeaderLinks() {
  const topnav = document.querySelector('.topnav');
  if (topnav) topnav.classList.toggle('expanded');
  const links = document.querySelector('.topnav-links');
  if (links) links.classList.toggle('active');
}

function toggleMobileMenu() {
  const sidebar = document.querySelector('.page.active .sidebar');
  const isActive = document.body.classList.toggle('mobile-menu-open');
  if (sidebar) sidebar.classList.toggle('active', isActive);
  document.body.style.overflow = isActive ? 'hidden' : '';
}

function syncSidebars() {
  const tmpl = document.getElementById('sidebar-template');
  if (tmpl) {
    document.querySelectorAll('.sidebar').forEach(sb => {
      if (!sb.children.length) sb.appendChild(tmpl.content.cloneNode(true));
    });
  }
  const footerTmpl = document.getElementById('footer-template');
  if (footerTmpl) {
    document.querySelectorAll('.main').forEach(main => {
      const existingFooter = main.querySelector('footer');
      if (existingFooter && !existingFooter.classList.contains('unified-footer')) existingFooter.remove();
      if (!main.querySelector('.unified-footer')) main.appendChild(footerTmpl.content.cloneNode(true));
    });
  }
}

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

function closeModal() { document.getElementById('access-modal').classList.remove('active'); }

function openLightbox(id, title, imgSrc) {
  const lb = document.getElementById('forensic-lightbox');
  if (document.getElementById('lb-id')) document.getElementById('lb-id').innerText = `EXHIBIT_ID: ${id}`;
  if (document.getElementById('lb-desc')) document.getElementById('lb-desc').innerText = title;
  if (document.getElementById('lb-img') && imgSrc) document.getElementById('lb-img').src = imgSrc;
  if (lb) lb.classList.add('active');
}

function closeLightbox() {
  const lb = document.getElementById('forensic-lightbox');
  if (lb) lb.classList.remove('active');
}

function initQolFeatures() {
  if (!document.getElementById('back-to-top')) {
    const btt = document.createElement('div');
    btt.id = 'back-to-top';
    btt.innerHTML = '↑';
    document.body.appendChild(btt);
    window.addEventListener('scroll', () => { btt.classList.toggle('visible', window.scrollY > 500); }, { passive: true });
    btt.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.addEventListener('click', (e) => {
    const dp = e.target.closest('.data-point');
    if (dp && dp.dataset.id) {
      navigator.clipboard.writeText(dp.dataset.id).then(() => {
        if (!dp.dataset.originalText) dp.dataset.originalText = dp.innerText;
        dp.innerText = 'ID_COPIED';
        setTimeout(() => dp.innerText = dp.dataset.originalText, 1000);
      });
    }
  });
}

function injectRealImages() {
  const heroEl = document.getElementById('hero-real-bg');
  if (heroEl && typeof REAL_IMAGES !== 'undefined' && REAL_IMAGES.hero) {
    heroEl.style.backgroundImage = `url('${REAL_IMAGES.hero}')`;
  }
  document.querySelectorAll('[data-real-img]').forEach(el => {
    if(typeof REAL_IMAGES === 'undefined') return;
    const src = REAL_IMAGES[el.getAttribute('data-real-img')];
    if (src) {
      if (el.tagName === 'IMG') el.src = src;
      else el.style.backgroundImage = `url('${src}')`;
    }
  });
}

function initMapTooltips() {
  document.querySelectorAll('.map-ping').forEach(ping => {
    const label = ping.querySelector('text');
    if (!label) return;
    ping.addEventListener('mouseenter', () => label.style.opacity = '1');
    ping.addEventListener('mouseleave', () => label.style.opacity = '0');
  });
}

/* ── 3. SEARCH & FILTERING ── */
function initSearch() {
  const input = document.getElementById('global-search-input');
  const resultsBlock = document.getElementById('search-results');
  if (!input || !resultsBlock) return;

  input.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const results = Array.from(resultsBlock.querySelectorAll('.search-result-item'));
    
    if (term.length > 0) {
      let foundCount = 0;
      let firstMatch = null;
      
      results.forEach(item => {
        const title = item.querySelector('.sr-title')?.innerText.toLowerCase() || '';
        const desc = item.querySelector('.sr-desc')?.innerText.toLowerCase() || '';
        const meta = item.querySelector('.sr-meta')?.innerText.toLowerCase() || '';
        const isMatch = title.includes(term) || desc.includes(term) || meta.includes(term);
        
        item.style.display = isMatch ? 'block' : 'none';
        item.style.borderColor = '';
        
        if (isMatch) {
          foundCount++;
          if (!firstMatch) firstMatch = item;
        }
      });
      
      resultsBlock.classList.toggle('active', foundCount > 0);
      if (firstMatch) firstMatch.style.borderColor = 'var(--red)';
    } else {
      resultsBlock.classList.remove('active');
      results.forEach(item => { item.style.display = 'block'; item.style.borderColor = ''; });
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
  if (input) { input.value = ''; input.dispatchEvent(new Event('input')); }
}

function executeSearchRoute(pageId) { closeSearch(); showPage(pageId); }

function initTimelineFilter() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;

  const search = activePage.querySelector('input[id*="search"]');
  const decade = activePage.querySelector('select[id*="decade"]');
  const type   = activePage.querySelector('select[id*="type"]');
  const resetBtn = activePage.querySelector('button[id*="reset"]');

  function filterTimeline() {
    const q = search ? search.value.toLowerCase().trim() : '';
    const d = decade ? decade.value : 'all';
    const t = type ? type.value : 'all';
    let visible = 0;
    
    activePage.querySelectorAll('.timeline-item').forEach(item => {
      const text = item.innerText.toLowerCase();
      const itemYear = item.dataset.year;
      const itemDecade = itemYear ? (Math.floor(parseInt(itemYear) / 10) * 10).toString() : (item.dataset.decade || 'all');
      const itemType = item.dataset.type || 'all';
      
      const show = (!q || text.includes(q)) && (d === 'all' || itemDecade === d) && (t === 'all' || itemType === t);
      if (show) { 
        item.style.setProperty('display', '', ''); 
        visible++; 
      } else { 
        item.style.setProperty('display', 'none', 'important'); 
      }
    });
    
    const noResults = activePage.querySelector('[id*="no-results"]');
    if (noResults) noResults.style.setProperty('display', visible === 0 ? 'block' : 'none', 'important');
  }

  // Using assignments overrides previous listeners to prevent memory leaks during SPA navigation
  if (search) search.oninput = filterTimeline;
  if (decade) decade.onchange = filterTimeline;
  if (type) type.onchange = filterTimeline;
  if (resetBtn) resetBtn.onclick = () => {
    if (search) search.value = '';
    if (decade) decade.value = 'all';
    if (type) type.value = 'all';
    filterTimeline();
  };
}

function injectTableLabels() {
  document.querySelectorAll('table').forEach(table => {
    const headers = Array.from(table.querySelectorAll('th')).map(th => th.innerText);
    table.querySelectorAll('tbody tr').forEach(tr => {
      Array.from(tr.querySelectorAll('td')).forEach((td, i) => {
        if (headers[i] && !td.getAttribute('data-label')) td.setAttribute('data-label', headers[i]);
      });
    });
  });
}

function buildAdvancedFilters(table, inputId) {
  if (!table || table.dataset.filtersInjected) return;
  table.dataset.filtersInjected = "true";

  const pageNode = table.closest('.page');
  const containerNode = table.closest('div[id]');
  const pageId = pageNode ? pageNode.id : '';
  const containerId = containerNode ? containerNode.id : '';
  const tableId = table.id || '';
  const tableClass = table.className || '';

  const noRender = ['child-names-api-container', 'names-registry-container', 'child-names-search'];
  const noFilterPages = ['page-hr', 'page-movement', 'page-detention', 'page-infrastructure', 'page-surveillance', 'page-arms', 'page-registry'];
  const noFilterClasses = ['hr-table', 'checkpoint-table', 'detention-table'];
  const noFilterContainers = ['presences-api-container', 'infra-api-container', 'registry-api-container'];

  if (noRender.includes(containerId) || noRender.includes(inputId)) return;

  let allowFilters = true;
  let allowedColumns = null; 
  let disableSearch = false;

  if (tableId === 'census-master-table' || inputId === 'census-search') { 
    allowFilters = false; inputId = 'census-search'; 
  }
  if (pageId === 'page-hr' || noFilterClasses.some(c => tableClass.includes(c))) {
    allowFilters = false;
  }
  if (noFilterPages.includes(pageId) || noFilterContainers.includes(containerId)) {
    allowFilters = false; 
    // Hide search for specific registry pages and the static table on the Movement page
    // The API table on the Movement page uses the 'presences-api-container' ID and will keep its search bar
    disableSearch = ['page-arms', 'page-detention', 'page-surveillance', 'page-compliance'].includes(pageId) || 
                   (pageId === 'page-movement' && containerId !== 'presences-api-container');
  }
  if (containerId === 'media-api-container' || pageId === 'page-media') {
    allowedColumns = ['method of martyrdom', 'location'];
  }

  let ctrl = null, searchBox = null;
  if (inputId) { searchBox = document.getElementById(inputId); if (searchBox) ctrl = searchBox.closest('.table-header-ctrl'); }

  if (!ctrl) {
    if (table.previousElementSibling?.classList.contains('table-header-ctrl')) ctrl = table.previousElementSibling;
    else if (table.parentElement?.previousElementSibling?.classList.contains('table-header-ctrl')) ctrl = table.parentElement.previousElementSibling;
    else { const sibling = table.parentElement?.querySelector('.table-header-ctrl'); if (sibling) ctrl = sibling; }
  }
  
  if (ctrl && !searchBox) searchBox = ctrl.querySelector('input[type="text"], input[type="search"]');

  if (!allowFilters && disableSearch) {
    if (ctrl) ctrl.style.display = 'none';
    else if (searchBox) searchBox.style.display = 'none';
    return;
  }

  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText.trim());
  if (headers.length === 0) return;

  if (!ctrl && !disableSearch) {
    ctrl = document.createElement('div');
    ctrl.className = 'table-header-ctrl';
    ctrl.style.flexDirection = 'column';
    ctrl.style.alignItems = 'flex-start';
    
    const searchWrap = document.createElement('div');
    searchWrap.className = 'table-search-box';
    searchWrap.style.width = '100%';
    
    searchBox = document.createElement('input');
    searchBox.type = 'text';
    searchBox.placeholder = 'GLOBAL SEARCH...';
    searchBox.style.width = '100%';
    
    searchWrap.appendChild(searchBox);
    ctrl.appendChild(searchWrap);
    table.parentNode.insertBefore(ctrl, table);
  } else if (disableSearch && ctrl) {
    const searchWrap = ctrl.querySelector('.table-search-box');
    if (searchWrap) searchWrap.style.display = 'none';
    else if (searchBox) searchBox.style.display = 'none';
  }

  const filterWrap = document.createElement('div');
  filterWrap.className = 'advanced-filters';
  filterWrap.style.display = 'flex';
  filterWrap.style.flexWrap = 'wrap';
  filterWrap.style.gap = '10px';
  filterWrap.style.marginTop = (ctrl?.querySelector('.table-search-box')?.style.display !== 'none' && !disableSearch) ? '12px' : '0';
  filterWrap.style.width = '100%';

  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const colValues = headers.map(() => new Set());
  
  rows.forEach(tr => {
    const tds = tr.querySelectorAll('td');
    tds.forEach((td, i) => { 
      if (td && td.innerText && colValues[i]) colValues[i].add(td.innerText.trim()); 
    });
  });

  const selects = [];
  if (allowFilters) {
    headers.forEach((header, i) => {
      const hMatch = header.toLowerCase();
      if (hMatch.includes('source') || hMatch.includes('link') || hMatch.includes('access')) return;
      if (allowedColumns && !allowedColumns.some(c => hMatch.includes(c.toLowerCase()))) return;

      if (colValues[i].size > 1 && colValues[i].size <= 25) {
        const select = document.createElement('select');
        select.className = 'filter-select column-filter';
        select.dataset.colIndex = i;
        
        select.appendChild(new Option(`ALL ${header.toUpperCase()}`, ''));
        Array.from(colValues[i]).sort().forEach(val => select.appendChild(new Option(val.length > 30 ? val.substring(0, 30) + '...' : val, val)));

        filterWrap.appendChild(select);
        selects.push(select);
      }
    });
  }

  if (selects.length > 0) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-reset-filters';
    resetBtn.innerText = 'RESET FILTERS';
    resetBtn.onclick = () => { if (searchBox) searchBox.value = ''; selects.forEach(s => s.value = ''); applyFilters(); };
    filterWrap.appendChild(resetBtn);
    if (ctrl) ctrl.appendChild(filterWrap);
  }

  function applyFilters() {
    const globalTerm = (searchBox ? searchBox.value.toUpperCase() : '');
    rows.forEach(tr => {
      let match = true;
      const tds = tr.querySelectorAll('td');
      for (let select of selects) {
        if (select.value !== '' && tds[select.dataset.colIndex]?.innerText.trim() !== select.value) { match = false; break; }
      }
      if (match && globalTerm && !tr.innerText.toUpperCase().includes(globalTerm)) match = false;
      tr.style.setProperty('display', match ? '' : 'none', match ? '' : 'important');
    });
  }
  if (searchBox) searchBox.addEventListener('input', applyFilters);
  selects.forEach(s => s.addEventListener('change', applyFilters));
}

function attachTableSearch(containerId, inputId) { 
  injectTableLabels(); 
  const container = document.getElementById(containerId);
  if (container) {
    const table = container.tagName === 'TABLE' ? container : container.querySelector('table');
    if (table) buildAdvancedFilters(table, inputId);
  }
}

function initAllStaticTables() {
  document.querySelectorAll('table').forEach(table => { if (!table.dataset.filtersInjected) buildAdvancedFilters(table, null); });
}

window.filterCensusTable = function() {}; 

/* ── 4. DATA STREAMS & APIS ── */

async function initTechForPalestineData() {
  try {
    const response = await fetch('https://data.techforpalestine.org/api/v3/summary.json');
    if (!response.ok) throw new Error('API_UNREACHABLE');
    tfpSummaryData = await response.json();
  } catch (error) {
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
      el.innerText = (typeof val === 'number') ? val.toLocaleString() : val;
      el.classList.remove('status-pulse');
      el.setAttribute('data-tfp-bound', 'true'); 
    } else {
      el.innerText = "REF_NOT_FOUND";
      el.classList.remove('status-pulse');
    }
  });
}

// RESTORED: Child Names API
async function initChildNamesApi() {
  const container = document.getElementById('child-names-api-container');
  if (!container) return;
  setApiLoading(container, 'Accessing Child Casualty Datastream...');

  try {
    const response = await fetch('https://data.techforpalestine.org/api/v2/killed-in-gaza/child-name-counts-en.json');
    if (!response.ok) throw new Error('API Error');
    const rawData = await response.json();
    let records = [];
    
    if (Array.isArray(rawData)) records = rawData;
    else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.boys) || Array.isArray(rawData.girls)) {
        if (Array.isArray(rawData.boys)) records = records.concat(rawData.boys);
        if (Array.isArray(rawData.girls)) records = records.concat(rawData.girls);
      } else if (Array.isArray(rawData.data)) records = rawData.data;
      else records = Object.entries(rawData).map(([key, val]) => { return { name: key, count: (typeof val === 'number' ? val : val.count || 0) }; });
    }

    records.sort((a, b) => {
      let countA = a.count !== undefined ? a.count : (a.value !== undefined ? a.value : a[1] || 0);
      let countB = b.count !== undefined ? b.count : (b.value !== undefined ? b.value : b[1] || 0);
      return countB - countA;
    });

    if (!records || records.length === 0) throw new Error("No data extracted.");

    const validRecords = records.filter(rec => {
      let n = rec.name || rec.en_name || rec[0];
      let c = rec.count || rec.value || rec[1];
      return n && c > 0 && String(n).trim() !== '';
    });

    const top100 = validRecords.slice(0, 100);
    const maxCount = Math.max(...top100.map(r => r.count || r.value || r[1] || 0));

    let html = `
      <div class="un-header" style="margin-top: 60px; text-align: left;">
        <h2 class="un-title" style="font-size: 24px; margin-bottom: 16px;">Child Victim Name Frequency</h2>
        <div class="hr-header-text" style="margin-bottom: 24px;">Statistical breakdown of the most common first names among documented child casualties.</div>
      </div>
      <div class="table-header-ctrl" style="margin-bottom: 16px;">
        <div class="table-search-box">
          <input type="text" id="child-names-search" placeholder="SEARCH BY NAME...">
        </div>
      </div>
      <div class="table-scroll-wrapper sm">
        <table class="census-table" style="margin-bottom: 0;">
          <thead>
            <tr>
              <th>First Name</th>
              <th>Frequency (Visualized)</th>
            </tr>
          </thead>
          <tbody>`;
    
    top100.forEach((rec, idx) => { 
      let rName = rec.name || rec.en_name || rec[0] || 'Unknown';
      let rCount = rec.count || rec.value || rec[1] || 0;
      let percentage = maxCount > 0 ? (rCount / maxCount) * 100 : 0;
      
      html += `
        <tr>
          <td style="width: 40%;"><strong style="text-transform:uppercase; letter-spacing: 0.02em;">${rName}</strong></td>
          <td style="width: 60%;">
            <div style="display: flex; align-items: center; width: 100%;">
              <div style="flex-grow: 1; background: rgba(0,0,0,0.04); height: 24px; margin-right: 12px; position: relative; max-width: 80%;">
                <div style="position: absolute; left: 0; top: 0; bottom: 0; width: ${percentage}%; background: var(--red);"></div>
              </div>
              <span style="font-weight:bold; font-family: 'IBM Plex Mono', monospace; min-width: 40px;">${Number(rCount).toLocaleString()}</span>
            </div>
          </td>
        </tr>`;
    });
    
    html += `</tbody></table></div><div class="hr-header-text" style="font-size:10px; margin-top:12px; text-align: left;">*Displaying top 40 derived name frequencies.</div>`;
    container.innerHTML = html;
    
    const searchInput = document.getElementById('child-names-search');
    const tbody = container.querySelector('tbody');
    if (searchInput && tbody) {
      searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toUpperCase();
        Array.from(tbody.querySelectorAll('tr')).forEach(tr => {
          tr.style.setProperty('display', tr.innerText.toUpperCase().includes(term) ? 'table-row' : 'none', 'important');
        });
      });
    }
  } catch (error) {
    container.innerHTML = `<div class="terminal-alert">ERR_CHILD_NAMES_STREAM: CONNECTION FAILED</div>`;
  }
}

// RESTORED: Maps API
async function initMapsApi() {
  if (mapsApiInitialized) return;
  const listEl = document.getElementById('map-order-list');
  if (!listEl) return;
  try {
    const response = await fetch('https://gazamaps.com/api/v1/displacement').catch(() => fetch('/api/v1/displacement'));
    if (!response || !response.ok) throw new Error('Network response was not ok');
    displacementMapsData = await response.json();
    displacementMapsData.sort((a, b) => new Date(b.date) - new Date(a.date));
    renderMapOrders();
    if (displacementMapsData.length > 0) selectMapOrder(0);
    mapsApiInitialized = true;
  } catch (error) {
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
  document.querySelectorAll('.map-order-item').forEach(el => el.classList.remove('active'));
  const activeEl = document.querySelector(`.map-order-item[data-index="${index}"]`);
  if (activeEl) activeEl.classList.add('active');
  
  if (document.getElementById('map-ui-title')) document.getElementById('map-ui-title').innerText = `ORDER REF: ${item.id}`;
  if (document.getElementById('map-val-date')) document.getElementById('map-val-date').innerText = item.date;
  if (document.getElementById('map-val-disp-area')) document.getElementById('map-val-disp-area').innerText = `${item.area_sq_km_displacement} sq km`;
  if (document.getElementById('map-val-safe-area')) document.getElementById('map-val-safe-area').innerText = `${item.area_sq_km_labeled_safe} sq km`;
  if (document.getElementById('map-val-blocks')) document.getElementById('map-val-blocks').innerText = item.displacement_blocks || 'None Specified';
  
  const btnIdf = document.getElementById('map-btn-idf');
  const btnFull = document.getElementById('map-btn-full');
  if (btnIdf) { btnIdf.href = item.source || item.link || '#'; btnIdf.style.display = (item.source || item.link) ? 'block' : 'none'; }
  if (btnFull) { btnFull.href = item.map_full || item.map_zoom || '#'; btnFull.style.display = (item.map_full || item.map_zoom) ? 'block' : 'none'; }
  
  const imgEl = document.getElementById('active-map-img');
  if (imgEl) {
    const targetSrc = item.map_zoom || item.map_full || item.map_idf;
    if (targetSrc) { imgEl.src = targetSrc; imgEl.style.display = 'block'; } 
    else { imgEl.style.display = 'none'; }
  }
};

// RESTORED: Military Presences
async function initPresencesApi(page = 1) {
  const container = document.getElementById('presences-api-container');
  const pagination = document.getElementById('presences-pagination');
  if (!container) return;
  setApiLoading(container, 'Fetching Node Data...');

  try {
    const response = await fetch(`https://movements.genocide.live/api/v1/presences?page=${page}`).catch(() => fetch(`/api/v1/presences?page=${page}`));
    if (!response || !response.ok) throw new Error('Network Error');
    const rawData = await response.json();
    
    let pageData = rawData;
    let records = [];
    if (Array.isArray(rawData) && rawData.length > 0 && rawData[0].data) { pageData = rawData[0]; records = pageData.data; } 
    else if (rawData && rawData.data) { pageData = rawData; records = pageData.data; } 
    else if (Array.isArray(rawData)) { records = rawData; }
    if (!Array.isArray(records)) records = Object.values(records);

    if (records.length === 0) {
      container.innerHTML = `<div class="terminal-alert">NO RECORDS FOUND ON THIS PAGE</div>`;
      if (pagination) pagination.innerHTML = '';
      return;
    }

    let html = `<table class="census-table"><thead><tr><th>Date Entered</th><th>Date Exited</th><th>Military Unit</th><th>Area / Location</th><th>Verification Source</th></tr></thead><tbody>`;

    records.forEach(rec => {
      const dateEnter = rec.date_entered_display || '-';
      const dateExit = rec.date_exited_display || 'Present';
      const unitName = rec.unit ? (rec.unit.name || '-') : '-';
      const areaName = rec.area ? (rec.area.name || '-') : '-';
      const sourceLink = rec.enter_source ? `<a href="${rec.enter_source}" target="_blank" style="color:var(--red); text-decoration:underline;">View Source</a>` : '-';
      html += `<tr><td>${dateEnter}</td><td>${dateExit}</td><td><strong style="color:var(--black);">${unitName}</strong></td><td>${areaName}</td><td>${sourceLink}</td></tr>`;
    });
    
    container.innerHTML = html + `</tbody></table>`;
    attachTableSearch('presences-api-container', 'presences-search');

    if (pagination) {
      const currentPage = pageData.current_page || page;
      const lastPage = pageData.last_page || (records.length >= 100 ? currentPage + 1 : currentPage);
      pagination.innerHTML = renderPagination(currentPage, lastPage, 'initPresencesApi');
    }
  } catch (error) {
    setApiError(container, `ERR_API_FAILURE<br>Unable to fetch presences datastream.<br><span style="display:block; margin-top:8px; font-size:10px; color:var(--muted); text-transform:none;">SERVER OUTPUT: ${error.message}</span>`);
    if (pagination) pagination.innerHTML = '';
  }
}

// RESTORED: Media Casualties
async function initMediaApi() {
  const container = document.getElementById('media-api-container');
  if (!container) return;
  setApiLoading(container, 'Fetching Node Data...');

  try {
    const response = await fetch('https://stopmurderingjournalists.com/api/v1/martyrs');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    let records = await response.json();
    if (!Array.isArray(records)) records = records.data || Object.values(records);
    if (!records || records.length === 0) { container.innerHTML = `<div class="terminal-alert">NO RECORDS FOUND</div>`; return; }

    const keys = Object.keys(records[0]).filter(k => k !== 'id' && k !== 'date_of_martyrdom_sql');
    let html = `<div class="table-header-ctrl"><div class="table-search-box"><input type="text" id="media-search" placeholder="FILTER JOURNALISTS..."></div></div><table class="census-table"><thead><tr>`;
    keys.forEach(k => { html += `<th style="text-transform: capitalize;">${k.replace(/_/g, ' ')}</th>`; });
    html += `</tr></thead><tbody>`;

    records.forEach(rec => {
      html += `<tr>`;
      keys.forEach(k => {
        let val = rec[k];
        if (Array.isArray(val)) val = val.join(', ');
        else if (typeof val === 'object' && val !== null) val = val.name || val.title || JSON.stringify(val);
        
        if (typeof val === 'string' && val.startsWith('http')) {
          if (val.match(/\.(jpeg|jpg|gif|png)$/i)) val = `<img src="${val}" alt="Portrait" style="max-height:40px; border-radius:2px;">`;
          else val = `<a href="${val}" target="_blank" style="color:var(--red); text-decoration:underline;">View Source</a>`;
        }
        html += `<td><span style="${k.includes('name') ? 'font-weight:bold; color:var(--black);' : ''}">${val !== undefined && val !== null && val !== '' ? val : '-'}</span></td>`;
      });
      html += `</tr>`;
    });
    container.innerHTML = html + `</tbody></table>`;
    attachTableSearch('media-api-container', 'media-search');
  } catch (error) {
    setApiError(container, 'ERR_API_FAILURE<br>Unable to fetch media casualty datastream.');
  }
}

// RESTORED: Infrastructure Damage
window.sortInfraTable = function() {
  infraSortDir = infraSortDir === 'desc' ? 'asc' : 'desc';
  initInfrastructureApi(1);
};

async function initInfrastructureApi(page = 1) {
  const container = document.getElementById('infra-api-container');
  const pagination = document.getElementById('infra-pagination');
  const pageSize = 20;
  if (!container) return;
  if (page === 1 && !cachedInfraData) container.innerHTML = `<div class="skeleton-wrap"><div class="skeleton-row"></div><div class="skeleton-row"></div></div>`;

  try {
    if (!cachedInfraData) {
      const response = await fetch('https://data.techforpalestine.org/api/v3/infrastructure-damaged.json');
      if (!response.ok) throw new Error('OFFLINE');
      const rawData = await response.json();
      if (!Array.isArray(rawData)) throw new Error('Invalid Data Structure');
      const uniqueData = [];
      let lastHash = "";
      for (let i = rawData.length - 1; i >= 0; i--) {
        const d = rawData[i];
        const hash = `${d.residential?.ext_destroyed}|${d.educational_buildings?.ext_damaged}|${d.places_of_worship?.ext_mosques_destroyed}`;
        if (hash !== lastHash) { uniqueData.push(d); lastHash = hash; }
      }
      cachedInfraData = uniqueData;
    }

    cachedInfraData.sort((a, b) => {
      let dateA = new Date(a.report_date).getTime() || 0;
      let dateB = new Date(b.report_date).getTime() || 0;
      return infraSortDir === 'asc' ? dateA - dateB : dateB - dateA;
    });

    const totalPages = Math.ceil(cachedInfraData.length / pageSize) || 1;
    if (page > totalPages) page = totalPages;
    const start = (page - 1) * pageSize;
    const pagedData = cachedInfraData.slice(start, start + pageSize);

    const sortIcon = infraSortDir === 'asc' ? ' ▲' : ' ▼';
    let html = `<div class="table-scroll-wrapper"><table class="census-table" style="margin-bottom:0;"><thead><tr>
      <th class="sortable-header" onclick="sortInfraTable()">Report Date${sortIcon}</th>
      <th>Residential (Destroyed)</th><th>Educational Units</th><th>Places of Worship</th></tr></thead><tbody>`;
    
    pagedData.forEach(day => {
      html += `<tr><td><span style="font-family:'IBM Plex Mono', monospace; font-size:11px;">${day.report_date}</span></td>
        <td style="color:var(--red); font-weight:bold;">${(day.residential?.ext_destroyed || 0).toLocaleString()}</td>
        <td>${(day.educational_buildings?.ext_damaged || 0).toLocaleString()}</td>
        <td>${(day.places_of_worship?.ext_mosques_destroyed || 0).toLocaleString()}</td></tr>`;
    });
    
    container.innerHTML = html + `</tbody></table></div>`;
    attachTableSearch('infra-api-container', 'infra-search');

    if (pagination) {
      pagination.innerHTML = renderPagination(page, totalPages, 'initInfrastructureApi');
    }
  } catch (e) { container.innerHTML = `<div class="terminal-alert">ERR_INFRA_STREAM_OFFLINE: UNABLE TO SYNC SATELLITE TELEMETRY</div>`; }
}

// RESTORED: Martyrs Names Registry
async function initKilledNamesApi(page = 1) {
  const container = document.getElementById('names-registry-container');
  if (!container) return;
  
  if (!cachedMartyrsData) {
    setApiLoading(container, `ACCESSING FULL ARCHIVAL NAMES LIST...<br><span style="opacity:0.7;">(Downloading complete ledger, this may take a moment)</span>`);
    try {
      const response = await fetch(`https://data.techforpalestine.org/api/v2/killed-in-gaza.json`);
      if (!response.ok) throw new Error('API Offline');
      cachedMartyrsData = await response.json();
      filteredMartyrsData = [...cachedMartyrsData];
    } catch (e) { 
      container.innerHTML = `<div class="terminal-alert">ERR_NAMES_STREAM_OFFLINE<br><span style="font-size:10px;">${e.message}</span></div>`; 
      return;
    }
  }
  martyrsCurrentPage = page;
  renderMartyrsTable();
}

function renderMartyrsTable() {
  const container = document.getElementById('names-registry-container');
  const pagination = document.getElementById('names-pagination');
  if (!container || !filteredMartyrsData) return;

  const totalPages = Math.ceil(filteredMartyrsData.length / martyrsPageSize) || 1;
  if (martyrsCurrentPage > totalPages) martyrsCurrentPage = totalPages;
  if (martyrsCurrentPage < 1) martyrsCurrentPage = 1;

  const start = (martyrsCurrentPage - 1) * martyrsPageSize;
  const pagedData = filteredMartyrsData.slice(start, start + martyrsPageSize);

  const sortIcon = (col) => martyrsSort.col === col ? (martyrsSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕';

  let html = `
    <table class="census-table">
      <thead style="position: sticky; top: 0; background: var(--bg); z-index: 10;">
        <tr>
          <th style="cursor:pointer; user-select:none; transition: color 0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color=''" onclick="sortMartyrs('name')">Name (Arabic)${sortIcon('name')}</th>
          <th style="cursor:pointer; user-select:none; transition: color 0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color=''" onclick="sortMartyrs('en_name')">English Translation${sortIcon('en_name')}</th>
          <th style="cursor:pointer; user-select:none; transition: color 0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color=''" onclick="sortMartyrs('age')">Age${sortIcon('age')}</th>
          <th style="cursor:pointer; user-select:none; transition: color 0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color=''" onclick="sortMartyrs('sex')">Sex${sortIcon('sex')}</th>
        </tr>
      </thead>
      <tbody>`;

  if (pagedData.length === 0) {
    html += `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">NO MATCHING RECORDS FOUND</td></tr>`;
  } else {
    pagedData.forEach(rec => {
      const sex = rec.sex ? rec.sex.toUpperCase() : 'N/A';
      const age = rec.age !== null && rec.age !== undefined ? rec.age : 'N/A';
      html += `<tr><td>${rec.name}</td><td><strong style="color:var(--black);">${rec.en_name}</strong></td><td>${age}</td><td>${sex}</td></tr>`;
    });
  }
  html += `</tbody></table>`;

  const existingSearch = document.getElementById('martyrs-search');
  const currentSearchVal = existingSearch ? existingSearch.value : '';

  const searchHtml = `
    <div class="table-header-ctrl">
      <div class="table-search-box">
        <input type="text" id="martyrs-search" placeholder="GLOBAL SEARCH..." oninput="handleMartyrsSearch(this.value)" value="${currentSearchVal}">
      </div>
    </div>`;

  container.innerHTML = searchHtml + `<div class="table-scroll-wrapper">` + html + `</div>`;
  
  const newSearch = document.getElementById('martyrs-search');
  if (newSearch && currentSearchVal) {
    newSearch.focus();
    const len = newSearch.value.length;
    newSearch.setSelectionRange(len, len);
  }

  if (pagination) {
    pagination.innerHTML = `
      <button class="btn-outline" style="padding:8px 16px; border-color:var(--border) ;color: black;" onclick="initKilledNamesApi(${martyrsCurrentPage - 1})" ${martyrsCurrentPage <= 1 ? 'disabled' : ''}>PREV</button>
      <span style="font-family:mono; font-size:10px; color:var(--muted); padding:0 10px;">PAGE ${martyrsCurrentPage} OF ${totalPages}</span>
      <button class="btn-outline" style="padding:8px 16px; border-color:var(--border); color: black;" onclick="initKilledNamesApi(${martyrsCurrentPage + 1})" ${martyrsCurrentPage >= totalPages ? 'disabled' : ''}>NEXT</button>`;
  }
}

window.handleMartyrsSearch = function(val) {
  const term = val.toLowerCase();
  filteredMartyrsData = cachedMartyrsData.filter(rec => {
    return (rec.name && String(rec.name).toLowerCase().includes(term)) || 
           (rec.en_name && String(rec.en_name).toLowerCase().includes(term)) ||
           (rec.sex && String(rec.sex).toLowerCase() === term) ||
           (rec.age !== null && String(rec.age) === term);
  });
  martyrsCurrentPage = 1;
  if (martyrsSort.col) sortMartyrs(martyrsSort.col, true);
  else renderMartyrsTable();
};

window.sortMartyrs = function(col, preserveDir = false) {
  if (!preserveDir) {
    if (martyrsSort.col === col) martyrsSort.dir = martyrsSort.dir === 'asc' ? 'desc' : 'asc';
    else { martyrsSort.col = col; martyrsSort.dir = 'asc'; }
  }

  filteredMartyrsData.sort((a, b) => {
    let valA = a[col]; let valB = b[col];
    if (col === 'age') {
      valA = valA !== null && valA !== undefined && valA !== '' ? Number(valA) : -1;
      valB = valB !== null && valB !== undefined && valB !== '' ? Number(valB) : -1;
      return martyrsSort.dir === 'asc' ? valA - valB : valB - valA;
    } else {
      valA = valA ? String(valA).toLowerCase() : ''; valB = valB ? String(valB).toLowerCase() : '';
      if (valA < valB) return martyrsSort.dir === 'asc' ? -1 : 1;
      if (valA > valB) return martyrsSort.dir === 'asc' ? 1 : -1;
      return 0;
    }
  });
  renderMartyrsTable();
};

// RESTORED: Daily Casualty Logs
async function initDailyCasualtiesApi() {
  const container = document.getElementById('daily-log-container');
  if (!container) return;
  setApiLoading(container, 'SYNCING DAILY LOGS...');
  try {
    const response = await fetch('https://data.techforpalestine.org/api/v2/casualties_daily.json');
    const data = await response.json();
    
    // Display all historical data, reversed so newest is at the top
    const allDays = data.reverse(); 
    
    let html = `<div class="table-scroll-wrapper"><table class="census-table" style="margin-bottom:0;"><thead><tr><th>Report Date</th><th>Killed (Cum)</th><th>Injured (Cum)</th><th>Children</th></tr></thead><tbody>`;
    
    allDays.forEach(day => {
      // Add safe fallbacks in case older JSON entries are missing data fields
      const killed = day.killed_cum ? day.killed_cum.toLocaleString() : '--';
      const injured = day.injured_cum ? day.injured_cum.toLocaleString() : '--';
      const children = day.killed_children_cum ? day.killed_children_cum.toLocaleString() : '--';
      
      html += `<tr><td><span style="font-family:'IBM Plex Mono', monospace; font-size:11px;">${day.report_date || '--'}</span></td><td style="color:var(--red); font-weight:bold;">${killed}</td><td>${injured}</td><td>${children}</td></tr>`;
    });
    
    container.innerHTML = html + `</tbody></table></div>`;
    
    // Attach the search and filter functions to the newly rendered table
    attachTableSearch('daily-log-container');
  } catch (e) { 
    setApiError(container, 'ERR_CASUALTY_STREAM_OFFLINE'); 
  }
}

// RESTORED: Archive Registry
async function fetchRegistryData(category, btnEl) {
  const container = document.getElementById('registry-api-container');
  if (!container) return;
  if (btnEl) {
    document.querySelectorAll('.timeline-filters .btn-outline').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
  }
  setApiLoading(container, `QUERYING ${category.toUpperCase()} NODE...`);
  try {
    const response = await fetch(`https://palestine-api.viethere.com/api/v1/${category}`).catch(() => null);
    let records = [];
    if (response && response.ok) {
      const rawData = await response.json();
      records = Array.isArray(rawData) ? rawData : (rawData.data || Object.values(rawData));
    } else {
      const cache = {
        organizations: [
          { name: "PCRF", description: "Palestine Children's Relief Fund.", type: "Medical", link: "https://www.pcrf.net" },
          { name: "Al-Haq", description: "Independent human rights organization.", type: "Human Rights", link: "https://www.alhaq.org" }
        ],
        books: [{ title: "The Hundred Years' War on Palestine", author: "Rashid Khalidi", link: "#" }],
        movies: [{ title: "Farha", director: "Darin J. Sallam", link: "https://www.netflix.com" }]
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
  } catch (e) { setApiError(container, 'ERR_REGISTRY_HANDSHAKE_FAILED'); }
}

// RESTORED: Reddit Intelligence Stream
function fetchWithTimeout(url, options = {}, timeout = 8000) {
  return Promise.race([fetch(url, options), new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), timeout))]);
}

async function fetchRedditData() {
  const container = document.getElementById('reddit-uploads-container');
  try {
    const response = await fetchWithTimeout('https://blackened-worker.hadi-nashat.workers.dev', {}, 8000);
    if (!response.ok) throw new Error('NETWORK_FAILURE');
    
    const posts = await response.json();
    if (!Array.isArray(posts)) throw new Error('INVALID_DATA_STRUCTURE');
    const limitedPosts = posts.slice(0, 3);
    
    localStorage.setItem('reddit_cache', JSON.stringify(limitedPosts));
    localStorage.setItem('reddit_last_fetch', Date.now());
    renderRedditCards(limitedPosts);
  } catch (err) {
    if (container && !container.querySelector('.reddit-card')) {
      const errorType = err.message === 'TIMEOUT' ? 'ERR_STREAM_TIMEOUT' : 'ERR_NEWS_STREAM_OFFLINE';
      container.innerHTML = `<div class="terminal-alert" style="grid-column: span 3;">${errorType}: CONNECTION_FAILURE</div>`;
    }
  }
}

async function initRedditStream() {
  const container = document.getElementById('reddit-uploads-container');
  if (!container) return;

  const lastFetch = localStorage.getItem('reddit_last_fetch');
  const cachedData = localStorage.getItem('reddit_cache');

  if (lastFetch && cachedData && (Date.now() - lastFetch < REDDIT_POLL_MS)) {
    renderRedditCards(JSON.parse(cachedData));
  } else {
    fetchRedditData();
  }
  setInterval(fetchRedditData, REDDIT_POLL_MS);
}

function renderRedditCards(posts) {
  const container = document.getElementById('reddit-uploads-container');
  if (!container) return;
  let html = '';
  const themes = ['var(--red)', 'var(--amber)', 'var(--green-light)'];

  posts.forEach((post, i) => {
    const date = new Date(post.created);
    const timeStr = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}_UTC`;
    const color = themes[i % themes.length];
    
    const thumbHtml = post.thumbnail 
      ? `<div style="width:100%; height:220px; background:url('${post.thumbnail}') center/cover no-repeat; margin-bottom:12px; border:1px solid var(--border); opacity:0.9;"></div>`
      : `<div style="width:100%; height:220px; background:var(--border); display:flex; align-items:center; justify-content:center; margin-bottom:12px; border:1px solid var(--border); font-family:mono; font-size:10px; color:var(--muted); opacity:0.5;">NO_VISUAL_FEED</div>`;

    html += `
      <a href="${post.url}" target="_blank" class="reddit-card" style="text-decoration:none; color:inherit;">
        <div class="reddit-card-inner" style="transition: border-color 0.2s; border-color: var(--border);" 
             onmouseover="this.style.borderColor='${color}'" onmouseout="this.style.borderColor='var(--border)'">
          <div class="reddit-log-tag" style="color:${color};">[ REDDIT_LOG: ${timeStr} ]</div>
          ${thumbHtml}
          <div class="reddit-title">
            ${post.title}
          </div>
          <div class="reddit-footer">
            <span>SOURCE: r/ISRAELI_VIOLENCE</span>
            <span class="score" style="color:${color};">SCORE: ${post.score}</span>
          </div>
        </div>
      </a>`;
  });
  container.innerHTML = html;
}


/* ── 5. AUDIO & TELEMETRY UTILITIES ── */
async function initAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') await audioContext.resume();
}

async function playAudio(btn) {
  await initAudio();
  const playerUi = btn.parentElement.querySelector('.audio-ui');
  if (!playerUi) return;
  
  btn.style.display = 'none';
  playerUi.classList.add('active', 'playing');

  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = 'sawtooth';
  oscillator.frequency.setValueAtTime(40, audioContext.currentTime);
  filter.type = 'lowpass'; filter.frequency.value = 400;

  oscillator.connect(filter); filter.connect(gainNode); gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0.015, audioContext.currentTime);
  oscillator.start();

  playerUi._oscillator = oscillator; playerUi._gain = gainNode;
  
  let seconds = 0;
  playerUi._intervalId = setInterval(() => {
    seconds++;
    oscillator.frequency.linearRampToValueAtTime(Math.random() * 60 + 30, audioContext.currentTime + 0.5);
    const timerDisplay = playerUi.querySelector('.audio-timer');
    if (timerDisplay) timerDisplay.innerText = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
    if (seconds >= 15) stopAudio(playerUi.querySelector('.audio-btn-stop'));
  }, 1000);
}

function stopAudio(stopBtn) {
  const playerUi = stopBtn.closest('.audio-ui');
  if (!playerUi) return;
  clearInterval(playerUi._intervalId);
  if (playerUi._oscillator) { try { playerUi._oscillator.stop(); playerUi._oscillator.disconnect(); } catch (e) {} }
  if (playerUi._gain) { try { playerUi._gain.disconnect(); } catch (e) {} }
  playerUi.classList.remove('playing', 'active');
  const playBtn = playerUi.parentElement?.querySelector('.btn-audio');
  if (playBtn) playBtn.style.display = 'inline-flex';
}

function triggerForensicPing(type, siteId) {
  if(typeof FORENSIC_DATA === 'undefined') return;
  const base = FORENSIC_DATA[type];
  if (!base) return;
  const customized = [...base.lines];
  if (customized.length > 3) customized[3] = `> REPORT_FOR: ${siteId}`;
  openModal(customized, base.color || 'var(--green-light)');
}

function pingMapSite(type, siteId) {
  console.log(`OS_TELEMETRY: Site Ping [${type}] - ID: ${siteId}`);
}

/* ── 6. INITIALIZATION & EVENTS ── */
function handleGlobalClicks(e) {
  const spaLink = e.target.closest('a[href^="#"]');
  if (spaLink) {
    const targetId = spaLink.getAttribute('href').substring(1);
    if (PAGE_MAP[targetId]) { e.preventDefault(); showPage(targetId); return; }
  }

  // Added .infra-btn so Civilian Infrastructure Damage buttons fire correctly
  const btn = e.target.closest('.btn-primary, .btn-outline, .btn-green, .btn-request, .siege-card-action, .btn-view-register, .infra-btn, .urgent-link, .proc-download, .tl-btn, .hr-btn, .evidence-item, .un-res-action, .detention-btn, .cyber-log-btn');
  if (!btn) return;

  if (btn.getAttribute('onclick')?.includes('showPage')) {
    e.preventDefault();
    return;
  }
  if (btn.tagName !== 'A' || btn.getAttribute('href') === '#' || !btn.getAttribute('href')) {
    e.preventDefault();
  }
  
  if (btn.classList.contains('evidence-item')) {
    openLightbox(
        btn.querySelector('.evidence-ex-id')?.innerText.replace('Exhibit ', '').trim() || 'NULL', 
        btn.querySelector('.evidence-ex-title')?.innerText || '', 
        btn.querySelector('.evidence-img')?.src
    );
  }
}

document.addEventListener('DOMContentLoaded', () => {
  syncSidebars(); initQolFeatures(); initTechForPalestineData(); initRedditStream(); initTimelineFilter(); initSearch(); initMapTooltips(); injectRealImages();
  document.body.addEventListener('click', handleGlobalClicks);

  const firstMandate = document.querySelector('.bm-list-item');
  if (firstMandate) firstMandate.click();

  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('mobile-menu-open') && !e.target.closest('.topnav-links') && !e.target.closest('.sidebar') && !e.target.closest('.mobile-menu-btn')) toggleMobileMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeSearch(); closeLightbox(); }
    if ((e.key === 's' || e.key === 'S') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
  });
});