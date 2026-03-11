/**
 * SIGMA PRO — Elite Master Management
 * Core Application Logic
 */

'use strict';

// ═══════════════════════════════════════════════════════════
//  SERVER DEFINITIONS
// ═══════════════════════════════════════════════════════════

const SERVERS = {
  main: [
    { id: 'primelux',  name: 'Primelux',  emoji: '👑', group: 'main'  },
    { id: 'allbox',    name: 'Allbox',    emoji: '📦', group: 'main'  },
    { id: 'starplay',  name: 'Starplay',  emoji: '⭐', group: 'main'  },
    { id: 'vision',    name: 'Vision',    emoji: '👁️', group: 'main'  },
    { id: 'ryzeen',    name: 'Ryzeen',    emoji: '⚡', group: 'main'  },
    { id: 'titan',     name: 'Titan',     emoji: '🔱', group: 'main'  },
  ],
  havok: [
    { id: 'havok-radeon',    name: 'Havok Radeon',    emoji: '🔴', group: 'havok' },
    { id: 'havok-kyros',     name: 'Havok Kyros',     emoji: '🌀', group: 'havok' },
    { id: 'havok-andromeda', name: 'Havok Andromeda', emoji: '🌌', group: 'havok' },
    { id: 'havok-neon',      name: 'Havok Neon',      emoji: '💜', group: 'havok' },
  ],
  blast: [
    { id: 'blast-elite', name: 'Blast Elite', emoji: '🔥', group: 'blast' },
    { id: 'blast-flash', name: 'Blast Flash', emoji: '⚡', group: 'blast' },
  ],
};

const ALL_SERVERS = [...SERVERS.main, ...SERVERS.havok, ...SERVERS.blast];

/** Servers that integrate with Casinhas */
const CASINHA_SERVERS = ['vision', 'starplay'];

// ═══════════════════════════════════════════════════════════
//  STATE — persisted in localStorage
// ═══════════════════════════════════════════════════════════

const STATE_KEY = 'sigma_pro_state_v2';

let state = {
  clientes:  [],   // { id, name, server, value, freq, date }
  parceiros: [],   // { id, name, handle, lote, valor, date1, val1, date2, val2 }
  paineis:   {},   // { serverId: costPerUnit }
  casinhas:  {},   // { clientId: bool }
};

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch (e) { console.warn('State load error:', e); }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) { console.warn('State save error:', e); }
}

// ═══════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9) + Math.random().toString(36).slice(2, 9);
}

function fmt(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  if (!y || !m || !d) return dateStr;
  return `${d}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function getServer(id) {
  return ALL_SERVERS.find(s => s.id === id) || null;
}

function serverCost(serverId) {
  return parseFloat(state.paineis[serverId]) || 0;
}

const FREQ_COLORS = {
  mensal:      'badge-blue',
  bimestral:   'badge-purple',
  trimestral:  'badge-emerald',
  semestral:   'badge-amber',
  anual:       'badge-rose',
};

const FREQ_LABELS = {
  mensal:      'Mensal',
  bimestral:   'Bimestral',
  trimestral:  'Trimestral',
  semestral:   'Semestral',
  anual:       'Anual',
};

const SERVER_COLORS = ['#38bdf8','#34d399','#a78bfa','#fb7185','#fbbf24','#60a5fa','#f472b6','#4ade80','#818cf8','#f87171','#2dd4bf','#e879f9'];

// ═══════════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════════

const PAGE_META = {
  dashboard: { title: 'Dashboard',     subtitle: 'Visão geral do faturamento e operações' },
  motor:     { title: 'Motor Sigma',   subtitle: 'Automação de entrada — leitura de blocos de texto' },
  clientes:  { title: 'Clientes',      subtitle: 'Gestão completa da base de clientes' },
  parceiros: { title: 'Parceiros',     subtitle: 'Revenda Elite — gestão de revendedores e fechamentos' },
  casinhas:  { title: 'Casinhas',      subtitle: 'Controle de pagamentos Vision & Starplay' },
  paineis:   { title: 'Painéis',       subtitle: 'Configuração de custos por servidor' },
};

function navigateTo(tab) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.tab === tab));
  document.querySelectorAll('.tab-view').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));
  const meta = PAGE_META[tab] || {};
  document.getElementById('page-title').textContent   = meta.title   || tab;
  document.getElementById('page-subtitle').textContent = meta.subtitle || '';
  renderTopbarActions(tab);
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'clientes')  renderClientes();
  if (tab === 'parceiros') renderParceiros();
  if (tab === 'casinhas')  renderCasinhas();
  if (tab === 'paineis')   renderPaineis();
}

function renderTopbarActions(tab) {
  const container = document.getElementById('topbar-actions');
  container.innerHTML = '';
  if (tab === 'clientes') {
    container.innerHTML = `<button class="topbar-btn btn-primary" onclick="openClientModal()">＋ Novo Cliente</button>`;
  } else if (tab === 'parceiros') {
    container.innerHTML = `<button class="topbar-btn btn-primary" onclick="openPartnerModal()">＋ Novo Parceiro</button>`;
  } else if (tab === 'dashboard') {
    container.innerHTML = `<button class="topbar-btn btn-outline" onclick="exportCSV()">📥 Exportar CSV</button>`;
  }
}

// ═══════════════════════════════════════════════════════════
//  POPULATE SELECTS WITH SERVER LIST
// ═══════════════════════════════════════════════════════════

function populateServerSelects() {
  const selects = [
    'dash-filter-server',
    'cl-filter-server',
    'cl-form-server',
    'motor-server',
  ];

  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const isFilter = id.startsWith('dash-filter') || id.startsWith('cl-filter');
    el.innerHTML = isFilter ? '<option value="">Todos</option>' : '<option value="">— Selecione —</option>';

    ['main', 'havok', 'blast'].forEach(group => {
      const og = document.createElement('optgroup');
      og.label = group === 'main' ? '🖥️ Principais' : group === 'havok' ? '⚡ Havok' : '🚀 Blast';
      SERVERS[group].forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = `${s.emoji} ${s.name}`;
        og.appendChild(opt);
      });
      el.appendChild(og);
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════

let dashFilters = { server: '', freq: '', dateFrom: '', dateTo: '' };

function applyDashFilters() {
  dashFilters.server   = document.getElementById('dash-filter-server').value;
  dashFilters.freq     = document.getElementById('dash-filter-freq').value;
  dashFilters.dateFrom = document.getElementById('dash-filter-date-from').value;
  dashFilters.dateTo   = document.getElementById('dash-filter-date-to').value;
  renderDashboard();
}

function clearDashFilters() {
  document.getElementById('dash-filter-server').value    = '';
  document.getElementById('dash-filter-freq').value      = '';
  document.getElementById('dash-filter-date-from').value = '';
  document.getElementById('dash-filter-date-to').value   = '';
  dashFilters = { server: '', freq: '', dateFrom: '', dateTo: '' };
  renderDashboard();
}

function getFilteredClients() {
  return state.clientes.filter(c => {
    if (dashFilters.server   && c.server !== dashFilters.server) return false;
    if (dashFilters.freq     && c.freq   !== dashFilters.freq)   return false;
    if (dashFilters.dateFrom && c.date   <  dashFilters.dateFrom) return false;
    if (dashFilters.dateTo   && c.date   >  dashFilters.dateTo)   return false;
    return true;
  });
}

function renderDashboard() {
  const clients = getFilteredClients();

  let bruto = 0, custo = 0;
  clients.forEach(c => {
    bruto += parseFloat(c.value) || 0;
    custo += serverCost(c.server);
  });
  const liquido = bruto - custo;

  document.getElementById('kpi-bruto').textContent    = fmt(bruto);
  document.getElementById('kpi-liquido').textContent  = fmt(liquido);
  document.getElementById('kpi-custo').textContent    = fmt(custo);
  document.getElementById('kpi-clientes').textContent = clients.length;

  // Badge updates
  document.getElementById('badge-clientes').textContent  = state.clientes.length;
  document.getElementById('badge-parceiros').textContent = state.parceiros.length;

  renderServerBarChart(clients);
  renderFreqDonut(clients);
  renderProfitTable(clients);
}

function renderServerBarChart(clients) {
  const container = document.getElementById('chart-servers');

  // Aggregate revenue by server
  const serverRevenue = {};
  ALL_SERVERS.forEach(s => { serverRevenue[s.id] = 0; });
  clients.forEach(c => { serverRevenue[c.server] = (serverRevenue[c.server] || 0) + (parseFloat(c.value) || 0); });

  // Only servers with data
  const active = ALL_SERVERS.filter(s => serverRevenue[s.id] > 0);
  if (!active.length) {
    container.innerHTML = `<div class="empty-state" style="flex:1"><div class="empty-icon">📊</div><div class="empty-title">Sem dados</div></div>`;
    return;
  }

  const max = Math.max(...active.map(s => serverRevenue[s.id]), 1);

  container.innerHTML = active.map((s, i) => {
    const pct = Math.max((serverRevenue[s.id] / max) * 160, 4);
    const color = SERVER_COLORS[i % SERVER_COLORS.length];
    return `
      <div class="bar-item">
        <div class="bar-fill" style="height:${pct}px; background: ${color}; opacity:0.85;" data-value="${fmt(serverRevenue[s.id])}"></div>
        <span class="bar-label">${s.emoji} ${s.name}</span>
      </div>`;
  }).join('');
}

function renderFreqDonut(clients) {
  const freqMap = {};
  clients.forEach(c => { freqMap[c.freq] = (freqMap[c.freq] || 0) + 1; });

  const colors = { mensal:'#38bdf8', bimestral:'#a78bfa', trimestral:'#34d399', semestral:'#fbbf24', anual:'#fb7185' };
  const entries = Object.entries(freqMap).filter(([,v]) => v > 0);
  const total = entries.reduce((s, [,v]) => s + v, 0);

  const svg = document.getElementById('donut-svg');
  const legend = document.getElementById('donut-legend');

  // Remove old paths
  svg.querySelectorAll('path').forEach(p => p.remove());
  document.getElementById('donut-center').textContent = total;

  if (!total) {
    legend.innerHTML = `<span class="text-muted text-sm">Sem dados</span>`;
    return;
  }

  const r = 50, cx = 60, cy = 60, strokeW = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  entries.forEach(([freq, count]) => {
    const pct = count / total;
    const dash = pct * circ;
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', r);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', colors[freq] || '#64748b');
    circle.setAttribute('stroke-width', strokeW);
    circle.setAttribute('stroke-dasharray', `${dash} ${circ - dash}`);
    circle.setAttribute('stroke-dashoffset', circ * 0.25 - offset * circ);
    circle.setAttribute('transform', 'rotate(-90, 60, 60)');
    circle.style.strokeLinecap = 'round';
    svg.insertBefore(circle, svg.querySelector('text'));
    offset += pct;
  });

  legend.innerHTML = entries.map(([freq, count]) => `
    <div class="donut-legend-item">
      <div class="donut-dot" style="background:${colors[freq] || '#64748b'}"></div>
      <span class="donut-legend-name">${FREQ_LABELS[freq] || freq}</span>
      <span class="donut-legend-pct">${count}</span>
    </div>
  `).join('');
}

function renderProfitTable(clients) {
  const tbody = document.getElementById('profit-table-body');
  const serverData = {};

  clients.forEach(c => {
    if (!serverData[c.server]) serverData[c.server] = { clients: 0, bruto: 0, custo: 0 };
    serverData[c.server].clients++;
    serverData[c.server].bruto += parseFloat(c.value) || 0;
    serverData[c.server].custo += serverCost(c.server);
  });

  const rows = Object.entries(serverData)
    .map(([id, d]) => ({ server: getServer(id), ...d, liquido: d.bruto - d.custo }))
    .filter(r => r.server)
    .sort((a, b) => b.liquido - a.liquido);

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted); font-size:.82rem;">Sem dados para o período filtrado</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const margem = r.bruto > 0 ? ((r.liquido / r.bruto) * 100).toFixed(1) : '0.0';
    const margemColor = parseFloat(margem) >= 50 ? 'var(--emerald)' : parseFloat(margem) >= 20 ? 'var(--amber)' : 'var(--rose)';
    return `
      <tr>
        <td><span class="font-bold">${r.server.emoji} ${r.server.name}</span></td>
        <td><span class="badge badge-blue">${r.clients}</span></td>
        <td class="text-sky font-bold">${fmt(r.bruto)}</td>
        <td class="text-rose">${fmt(r.custo)}</td>
        <td class="font-bold" style="color:${r.liquido >= 0 ? 'var(--emerald)' : 'var(--rose)'}">${fmt(r.liquido)}</td>
        <td><span style="font-weight:700; color:${margemColor}">${margem}%</span></td>
      </tr>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
//  MOTOR SIGMA
// ═══════════════════════════════════════════════════════════

let motorParsed = [];

function runMotorSigma() {
  const text = document.getElementById('motor-input').value.trim();
  const server = document.getElementById('motor-server').value;

  if (!text) { showToast('Cole um bloco de texto primeiro!', 'error'); return; }

  motorParsed = [];
  document.getElementById('motor-preview-list').innerHTML = '';
  document.getElementById('motor-confirm-btn').style.display = 'none';
  document.getElementById('motor-count-badge').textContent = '0 detectados';

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const blocks = [];
  for (let i = 0; i < lines.length; i += 4) {
    const chunk = lines.slice(i, i + 4);
    if (chunk.length >= 3) blocks.push(chunk);
  }

  if (!blocks.length) {
    showToast('Nenhum bloco válido encontrado. Verifique o formato (4 linhas por cliente).', 'error');
    return;
  }

  // Show progress
  const progressEl = document.getElementById('motor-progress');
  progressEl.classList.add('visible');

  let processed = 0;

  function processBlock(idx) {
    if (idx >= blocks.length) {
      progressEl.classList.remove('visible');
      finalizeMotor(server);
      return;
    }

    const block = blocks[idx];
    const parsed = parseBlock(block, server);
    if (parsed) motorParsed.push(parsed);

    processed++;
    const pct = Math.round((processed / blocks.length) * 100);
    document.getElementById('motor-bar').style.width = pct + '%';
    document.getElementById('motor-pct').textContent = pct + '%';

    setTimeout(() => processBlock(idx + 1), 60);
  }

  processBlock(0);
}

function parseBlock(lines, defaultServer) {
  if (lines.length < 3) return null;

  const name  = lines[0];
  const date  = parseDate(lines[1]);
  const value = parseValue(lines[2]);
  const freq  = lines[3] ? parseFreq(lines[3]) : 'mensal';

  if (!name || value === null) return null;

  return {
    id:     uid(),
    name:   capitalizeWords(name),
    date:   date || today(),
    value:  value,
    freq:   freq,
    server: defaultServer || '',
  };
}

function parseDate(str) {
  str = str.trim();
  // DD/MM/YYYY
  const m1 = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? '20' + m1[3] : m1[3];
    return `${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  }
  // YYYY-MM-DD already
  const m2 = str.match(/^\d{4}-\d{2}-\d{2}$/);
  if (m2) return str;
  return null;
}

function parseValue(str) {
  str = str.trim().replace(/R\$\s*/i, '').trim();
  // Brazilian format: comma is decimal separator, dot is thousands separator
  // e.g. "1.200,50" → 1200.50
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // else US/plain format: dot is decimal, e.g. "35.50" → 35.50
  const val = parseFloat(str);
  return isNaN(val) ? null : val;
}

function parseFreq(str) {
  // Normalize to lowercase ASCII to handle Portuguese variations
  // e.g. 'Mensal', 'mênsal', 'MENSAL' all resolve correctly
  const s = str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (s.startsWith('bi'))  return 'bimestral';
  if (s.startsWith('tri')) return 'trimestral';
  if (s.startsWith('sem')) return 'semestral';
  if (s.startsWith('an'))  return 'anual';
  return 'mensal';
}

function capitalizeWords(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

function finalizeMotor(defaultServer) {
  const list = document.getElementById('motor-preview-list');
  document.getElementById('motor-count-badge').textContent = `${motorParsed.length} detectados`;

  if (!motorParsed.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Nenhum cliente detectado</div><div class="empty-sub">Verifique o formato do texto</div></div>`;
    showToast('Nenhum cliente detectado no texto.', 'error');
    return;
  }

  list.innerHTML = motorParsed.map((c, i) => {
    const srv = c.server ? getServer(c.server) : null;
    const freqClass = FREQ_COLORS[c.freq] || 'badge-gray';
    return `
      <div class="preview-card" id="pcard-${i}">
        <div class="preview-card-header">
          <span class="preview-name">${c.name}</span>
          <span class="badge ${freqClass}">${FREQ_LABELS[c.freq] || c.freq}</span>
        </div>
        <div class="preview-meta">
          <span class="preview-field">📅 <strong>${fmtDate(c.date)}</strong></span>
          <span class="preview-field">💰 <strong>${fmt(c.value)}</strong></span>
          ${srv ? `<span class="preview-field">🖥️ <strong>${srv.emoji} ${srv.name}</strong></span>` : `<span class="preview-field text-secondary">⚠️ Painel não selecionado</span>`}
        </div>
      </div>`;
  }).join('');

  document.getElementById('motor-confirm-btn').style.display = 'flex';
  showToast(`✅ ${motorParsed.length} clientes detectados com sucesso!`, 'success');
}

function confirmMotorImport() {
  const server = document.getElementById('motor-server').value;

  if (!server) {
    showToast('Selecione um painel antes de importar!', 'error');
    return;
  }

  // Assign server to all parsed (override if not set)
  motorParsed.forEach(c => {
    c.server = server || c.server;
    state.clientes.push(c);
  });

  saveState();
  renderDashboard();

  showToast(`🎉 ${motorParsed.length} clientes importados!`, 'success');

  // Reset
  motorParsed = [];
  document.getElementById('motor-input').value = '';
  document.getElementById('motor-preview-list').innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-title">Importação concluída</div><div class="empty-sub">${state.clientes.length} clientes na base</div></div>`;
  document.getElementById('motor-confirm-btn').style.display = 'none';
  document.getElementById('motor-count-badge').textContent = '0 detectados';
}

function clearMotor() {
  document.getElementById('motor-input').value = '';
  motorParsed = [];
  document.getElementById('motor-preview-list').innerHTML = `<div class="empty-state"><div class="empty-icon">⚙️</div><div class="empty-title">Motor aguardando</div><div class="empty-sub">Cole um bloco de texto e execute o Motor Sigma</div></div>`;
  document.getElementById('motor-confirm-btn').style.display = 'none';
  document.getElementById('motor-count-badge').textContent = '0 detectados';
  document.getElementById('motor-progress').classList.remove('visible');
  document.getElementById('motor-bar').style.width = '0%';
  document.getElementById('motor-pct').textContent = '0%';
}

// ═══════════════════════════════════════════════════════════
//  CLIENTS
// ═══════════════════════════════════════════════════════════

function renderClientes() {
  const search    = (document.getElementById('cl-search')?.value || '').toLowerCase();
  const serverF   = document.getElementById('cl-filter-server')?.value || '';
  const freqF     = document.getElementById('cl-filter-freq')?.value || '';

  let list = state.clientes.filter(c => {
    if (search) {
      // Normalize both strings to allow accent-insensitive search (e.g. 'Jose' matches 'José')
      const normalizedName   = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedSearch = search.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!normalizedName.includes(normalizedSearch)) return false;
    }
    if (serverF  && c.server !== serverF) return false;
    if (freqF    && c.freq   !== freqF)   return false;
    return true;
  });

  const tbody = document.getElementById('clientes-table-body');
  const emptyEl = document.getElementById('clientes-empty');
  document.getElementById('cl-count-label').textContent = `${list.length} cliente${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'flex';
    return;
  }

  emptyEl.style.display = 'none';

  tbody.innerHTML = list.map((c, idx) => {
    const srv = getServer(c.server);
    const freqClass = FREQ_COLORS[c.freq] || 'badge-gray';
    return `
      <tr>
        <td class="td-muted">${idx + 1}</td>
        <td><span class="font-bold">${c.name}</span></td>
        <td>${srv ? `<span class="badge badge-blue"><span class="server-dot" style="background:#38bdf8"></span>${srv.emoji} ${srv.name}</span>` : '<span class="text-muted">—</span>'}</td>
        <td class="font-bold text-sky">${fmt(c.value)}</td>
        <td><span class="badge ${freqClass}">${FREQ_LABELS[c.freq] || c.freq}</span></td>
        <td class="td-muted">${fmtDate(c.date)}</td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit" onclick="openClientModal('${c.id}')" title="Editar">✏️</button>
            <button class="action-btn delete" onclick="confirmDelete('client','${c.id}','${c.name}')" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function openClientModal(id) {
  const modal = document.getElementById('modal-client');
  const title = document.getElementById('modal-client-title');

  if (id) {
    const c = state.clientes.find(x => x.id === id);
    if (!c) return;
    title.textContent = '✏️ Editar Cliente';
    document.getElementById('cl-form-id').value     = c.id;
    document.getElementById('cl-form-name').value   = c.name;
    document.getElementById('cl-form-server').value = c.server;
    document.getElementById('cl-form-valor').value  = c.value;
    document.getElementById('cl-form-freq').value   = c.freq;
    document.getElementById('cl-form-date').value   = c.date;
  } else {
    title.textContent = '➕ Novo Cliente';
    document.getElementById('cl-form-id').value     = '';
    document.getElementById('cl-form-name').value   = '';
    document.getElementById('cl-form-server').value = '';
    document.getElementById('cl-form-valor').value  = '';
    document.getElementById('cl-form-freq').value   = 'mensal';
    document.getElementById('cl-form-date').value   = today();
  }

  openModal('modal-client');
}

function saveClient() {
  const id     = document.getElementById('cl-form-id').value;
  const name   = document.getElementById('cl-form-name').value.trim();
  const server = document.getElementById('cl-form-server').value;
  const value  = parseFloat(document.getElementById('cl-form-valor').value);
  const freq   = document.getElementById('cl-form-freq').value;
  const date   = document.getElementById('cl-form-date').value || today();

  if (!name)   { showToast('Informe o nome do cliente.', 'error'); return; }
  if (!server) { showToast('Selecione um painel.', 'error'); return; }
  if (isNaN(value) || value < 0) { showToast('Informe um valor válido.', 'error'); return; }

  if (id) {
    const idx = state.clientes.findIndex(c => c.id === id);
    if (idx >= 0) state.clientes[idx] = { id, name, server, value, freq, date };
  } else {
    state.clientes.push({ id: uid(), name, server, value, freq, date });
  }

  saveState();
  closeModal('modal-client');
  renderClientes();
  renderDashboard();
  showToast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!', 'success');
}

// ═══════════════════════════════════════════════════════════
//  PARCEIROS (PARTNERS)
// ═══════════════════════════════════════════════════════════

function renderParceiros() {
  const list = state.parceiros;
  const container = document.getElementById('parceiros-list');
  const emptyEl = document.getElementById('parceiros-empty');
  document.getElementById('badge-parceiros').textContent = list.length;

  if (!list.length) {
    container.style.display = 'none';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  container.style.display = 'grid';

  container.innerHTML = list.map(p => {
    const pago = (parseFloat(p.val1) || 0) + (parseFloat(p.val2) || 0);
    const totalStr = fmt(parseFloat(p.valor) || 0);
    const pagoStr = fmt(pago);
    return `
      <div class="partner-card">
        <div class="partner-header">
          <div>
            <div class="partner-name">${p.name}</div>
            <div class="partner-handle">${p.handle || '—'}</div>
          </div>
          <div class="action-btns">
            <button class="action-btn edit" onclick="openPartnerModal('${p.id}')" title="Editar">✏️</button>
            <button class="action-btn delete" onclick="confirmDelete('partner','${p.id}','${p.name}')" title="Excluir">🗑️</button>
          </div>
        </div>
        <div class="partner-stats">
          <div class="partner-stat">
            <div class="partner-stat-value">${p.lote || 0}</div>
            <div class="partner-stat-label">Créditos</div>
          </div>
          <div class="partner-stat">
            <div class="partner-stat-value" style="font-size:.85rem">${totalStr}</div>
            <div class="partner-stat-label">Total</div>
          </div>
          <div class="partner-stat">
            <div class="partner-stat-value" style="font-size:.85rem; color:var(--emerald)">${pagoStr}</div>
            <div class="partner-stat-label">Receber</div>
          </div>
        </div>
        <div class="partner-closings">
          <div class="closing-item">
            <span class="closing-label">📅 Fechamento 1</span>
            <div style="text-align:right">
              <div class="closing-value">${fmt(p.val1)}</div>
              <div class="closing-date">${fmtDate(p.date1) || '—'}</div>
            </div>
          </div>
          <div class="closing-item">
            <span class="closing-label">📅 Fechamento 2</span>
            <div style="text-align:right">
              <div class="closing-value">${fmt(p.val2)}</div>
              <div class="closing-date">${fmtDate(p.date2) || '—'}</div>
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
}

function openPartnerModal(id) {
  const title = document.getElementById('modal-partner-title');

  if (id) {
    const p = state.parceiros.find(x => x.id === id);
    if (!p) return;
    title.textContent = '✏️ Editar Parceiro';
    document.getElementById('pt-form-id').value     = p.id;
    document.getElementById('pt-form-name').value   = p.name;
    document.getElementById('pt-form-handle').value = p.handle || '';
    document.getElementById('pt-form-lote').value   = p.lote || '';
    document.getElementById('pt-form-valor').value  = p.valor || '';
    document.getElementById('pt-form-date1').value  = p.date1 || '';
    document.getElementById('pt-form-val1').value   = p.val1 || '';
    document.getElementById('pt-form-date2').value  = p.date2 || '';
    document.getElementById('pt-form-val2').value   = p.val2 || '';
  } else {
    title.textContent = '➕ Novo Parceiro';
    ['pt-form-id','pt-form-name','pt-form-handle','pt-form-lote','pt-form-valor',
     'pt-form-date1','pt-form-val1','pt-form-date2','pt-form-val2'].forEach(id => {
      document.getElementById(id).value = '';
    });
  }

  openModal('modal-partner');
}

function calcPartnerClosings() {
  const total = parseFloat(document.getElementById('pt-form-valor').value) || 0;
  const half = (total / 2).toFixed(2);
  document.getElementById('pt-form-val1').value = half;
  document.getElementById('pt-form-val2').value = half;
}

function savePartner() {
  const id     = document.getElementById('pt-form-id').value;
  const name   = document.getElementById('pt-form-name').value.trim();
  const handle = document.getElementById('pt-form-handle').value.trim();
  const lote   = parseInt(document.getElementById('pt-form-lote').value) || 0;
  const valor  = parseFloat(document.getElementById('pt-form-valor').value) || 0;
  const date1  = document.getElementById('pt-form-date1').value;
  const val1   = parseFloat(document.getElementById('pt-form-val1').value) || 0;
  const date2  = document.getElementById('pt-form-date2').value;
  const val2   = parseFloat(document.getElementById('pt-form-val2').value) || 0;

  if (!name) { showToast('Informe o nome do parceiro.', 'error'); return; }

  const entry = { id: id || uid(), name, handle, lote, valor, date1, val1, date2, val2 };

  if (id) {
    const idx = state.parceiros.findIndex(p => p.id === id);
    if (idx >= 0) state.parceiros[idx] = entry;
  } else {
    state.parceiros.push(entry);
  }

  saveState();
  closeModal('modal-partner');
  renderParceiros();
  showToast(id ? 'Parceiro atualizado!' : 'Parceiro cadastrado!', 'success');
}

// ═══════════════════════════════════════════════════════════
//  CASINHAS
// ═══════════════════════════════════════════════════════════

function renderCasinhas() {
  const container = document.getElementById('casinhas-grid');
  const groups = CASINHA_SERVERS.map(serverId => {
    const srv = getServer(serverId);
    const clients = state.clientes.filter(c => c.server === serverId);
    return { srv, clients };
  }).filter(g => g.srv);

  // Also create "other servers" groups for all servers that have clients
  const otherIds = ALL_SERVERS
    .filter(s => !CASINHA_SERVERS.includes(s.id))
    .filter(s => state.clientes.some(c => c.server === s.id));

  const allGroups = [
    ...groups,
    ...otherIds.map(s => ({ srv: s, clients: state.clientes.filter(c => c.server === s.id) })),
  ];

  let totalPaid = 0, totalPending = 0, totalPaidVal = 0, totalPendingVal = 0;

  state.clientes.forEach(c => {
    if (state.casinhas[c.id]) {
      totalPaid++;
      totalPaidVal += parseFloat(c.value) || 0;
    } else {
      totalPending++;
      totalPendingVal += parseFloat(c.value) || 0;
    }
  });

  document.getElementById('casa-paid-count').textContent    = totalPaid;
  document.getElementById('casa-pending-count').textContent = totalPending;
  document.getElementById('casa-paid-value').textContent    = fmt(totalPaidVal);
  document.getElementById('casa-pending-value').textContent = fmt(totalPendingVal);

  if (!allGroups.length || !state.clientes.length) {
    container.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state"><div class="empty-icon">🏠</div><div class="empty-title">Nenhum cliente cadastrado</div><div class="empty-sub">Cadastre clientes para usar as Casinhas</div></div></div>`;
    return;
  }

  container.innerHTML = allGroups.filter(g => g.clients.length > 0).map(g => {
    const isCasinha = CASINHA_SERVERS.includes(g.srv.id);
    // Vision and Starplay have dedicated color themes; all other servers use the default (starplay/blue) style
    const cssClass  = g.srv.id === 'vision' ? 'vision' : 'starplay';
    const titleClass = g.srv.id === 'vision' ? 'vision' : 'starplay';

    const paidClients = g.clients.filter(c => state.casinhas[c.id]);
    const totalVal = g.clients.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);
    const paidVal  = paidClients.reduce((s, c) => s + (parseFloat(c.value) || 0), 0);

    const items = g.clients.map(c => {
      const checked = !!state.casinhas[c.id];
      return `
        <div class="casinha-item ${checked ? 'checked' : ''}" onclick="toggleCasinha('${c.id}')">
          <div class="casinha-item-left">
            <div class="casinha-checkbox">${checked ? '✓' : ''}</div>
            <div>
              <div class="casinha-client-name">${c.name}</div>
              <div class="casinha-client-plan">${FREQ_LABELS[c.freq] || c.freq}</div>
            </div>
          </div>
          <div class="casinha-value">${fmt(c.value)}</div>
        </div>`;
    }).join('');

    return `
      <div class="casinha-card">
        <div class="casinha-header ${cssClass}">
          <span class="casinha-title ${titleClass}">${g.srv.emoji} ${g.srv.name}</span>
          <span class="casinha-progress-text">${paidClients.length}/${g.clients.length} pagos</span>
        </div>
        <div class="casinha-list">${items}</div>
        <div class="casinha-footer">
          <span class="casinha-total-label">Total pago:</span>
          <span class="casinha-total-value">${fmt(paidVal)} / ${fmt(totalVal)}</span>
        </div>
      </div>`;
  }).join('');
}

function toggleCasinha(clientId) {
  state.casinhas[clientId] = !state.casinhas[clientId];
  saveState();
  renderCasinhas();
}

// ═══════════════════════════════════════════════════════════
//  PAINÉIS (SERVER COST CONFIG)
// ═══════════════════════════════════════════════════════════

function renderPaineis() {
  ['main', 'havok', 'blast'].forEach(group => {
    const grid = document.getElementById(`servers-${group}-grid`);
    grid.innerHTML = SERVERS[group].map(s => {
      const cost = state.paineis[s.id] || '';
      const groupTag = { main: 'main', havok: 'havok', blast: 'blast' }[s.group];
      return `
        <div class="server-config-card">
          <div class="server-config-header">
            <div class="server-config-name">
              <span class="server-config-emoji">${s.emoji}</span>
              ${s.name}
            </div>
            <span class="server-group-tag ${groupTag}">${group === 'main' ? 'Principal' : group === 'havok' ? 'Havok' : 'Blast'}</span>
          </div>
          <div class="server-cost-wrapper">
            <span class="cost-currency">R$</span>
            <input
              type="number"
              class="cost-input"
              id="cost-${s.id}"
              value="${cost}"
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            <span class="text-muted text-xs">/mês</span>
          </div>
          <div class="server-config-meta mt-1">
            <span class="text-xs text-secondary">${state.clientes.filter(c => c.server === s.id).length} clientes</span>
          </div>
        </div>`;
    }).join('');
  });
}

function savePaineis() {
  ALL_SERVERS.forEach(s => {
    const el = document.getElementById(`cost-${s.id}`);
    if (el) {
      const val = parseFloat(el.value);
      state.paineis[s.id] = isNaN(val) ? 0 : val;
    }
  });

  saveState();
  renderDashboard();
  showToast('Configurações salvas com sucesso!', 'success');
}

// ═══════════════════════════════════════════════════════════
//  DELETE (CONFIRM)
// ═══════════════════════════════════════════════════════════

function confirmDelete(type, id, name) {
  document.getElementById('confirm-message').textContent = `Deseja excluir "${name}"? Esta ação não pode ser desfeita.`;
  document.getElementById('confirm-btn').onclick = () => {
    if (type === 'client') {
      state.clientes = state.clientes.filter(c => c.id !== id);
      delete state.casinhas[id];
      saveState();
      renderClientes();
      renderDashboard();
      showToast('Cliente excluído.', 'info');
    } else if (type === 'partner') {
      state.parceiros = state.parceiros.filter(p => p.id !== id);
      saveState();
      renderParceiros();
      showToast('Parceiro excluído.', 'info');
    }
    closeModal('modal-confirm');
  };
  openModal('modal-confirm');
}

// ═══════════════════════════════════════════════════════════
//  EXPORT CSV
// ═══════════════════════════════════════════════════════════

function exportCSV() {
  const clients = getFilteredClients();
  if (!clients.length) { showToast('Nenhum dado para exportar.', 'error'); return; }

  const headers = ['Nome', 'Painel', 'Valor (R$)', 'Frequência', 'Custo Licença', 'Lucro Líquido', 'Data Cadastro'];
  const rows = clients.map(c => {
    const srv  = getServer(c.server);
    const val  = parseFloat(c.value) || 0;
    const cost = serverCost(c.server);
    return [
      `"${c.name}"`,
      `"${srv ? srv.name : c.server}"`,
      val.toFixed(2),
      c.freq,
      cost.toFixed(2),
      (val - cost).toFixed(2),
      fmtDate(c.date),
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `sigma_pro_${today()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exportado com sucesso!', 'success');
}

// ═══════════════════════════════════════════════════════════
//  MODAL HELPERS
// ═══════════════════════════════════════════════════════════

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ESC to close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// ═══════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════

function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

// ═══════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════

function init() {
  loadState();
  populateServerSelects();

  // Navigation click handlers
  document.querySelectorAll('.nav-item[data-tab]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.tab));
  });

  // Render initial tab
  navigateTo('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
