// Galaxis Hub Reporting — core: state, routing, formatting and shared UI helpers.
// Every module is a classic script; functions called from inline handlers must be global.

const state = {
  ctx: null,              // null = agency ("My Workspace"); otherwise a workspace id
  page: 'reports',        // the only page in this prototype
  params: {},             // page-specific route params, e.g. { tab: 'sem' }
  flags: {},              // dev-toolbar scenario flags, owned by each module
  sorts: {},              // table sort state, keyed by table id
  pagers: {},             // pagination state, keyed by table id
  ui: {}                  // per-module transient UI state (search text, open tabs, filters)
};

const screens = {};
const devToggleRegistry = {};

// ---------- Context helpers ----------
function isAgency() { return state.ctx === null; }
function currentWs() { return state.ctx ? workspaces.find(w => w.id === state.ctx) : null; }
function wsById(id) { return workspaces.find(w => w.id === id); }
function activeWorkspaces() { return workspaces.filter(w => !w.archived); }
function memberById(id) { return members.find(m => m.id === id); }
function roleById(id) { return roles.find(r => r.id === id); }
// The client workspace's single Owner, or null.
function wsPrimaryContact(wsId) { return members.find(m => m.org === wsId && m.isPrimary && m.status !== 'deactivated') || null; }
function wsAdAccounts(wsId) { return adAccounts.filter(a => a.workspaceId === wsId); }
function wsPlatforms(wsId) { return ['google', 'meta'].filter(p => wsAdAccounts(wsId).some(a => a.platform === p)); }
// Organic social linked to a workspace (Facebook Page, Instagram account).
function wsSocialAccounts(wsId) { return socialAccounts.filter(a => a.workspaceId === wsId); }
function wsSocial(wsId) { return ['facebook', 'instagram'].filter(p => wsSocialAccounts(wsId).some(a => a.platform === p)); }

// ---------- Screens & routing ----------
// def: { contexts: ['agency','client'], title(), desc(), render() -> html, afterRender?(), key?() -> specs key }
function registerScreen(page, def) { screens[page] = def; }
function registerDevToggles(screenKey, fn) { devToggleRegistry[screenKey] = fn; }

function screenKey() {
  const def = screens[state.page];
  if (def && def.key) return def.key();
  return `${isAgency() ? 'agency' : 'client'}-${state.page}`;
}

function navigate(page, params = {}) {
  const def = screens[page];
  if (!def) return;
  state.page = page;
  state.params = params;
  closeAllPopovers();
  render();
  window.scrollTo(0, 0);
}

function switchWorkspace(wsId) {
  state.ctx = wsId;
  navigate('reports');
  showToast(wsId ? `Switched to ${wsById(wsId).name}` : 'Switched to My Workspace (Agency)', 'repeat');
}

function render() {
  const def = screens[state.page];
  renderShell();
  const root = document.getElementById('screen-root');
  root.innerHTML = def ? def.render() : '';
  if (def && def.afterRender) def.afterRender();
  renderDevBar();
  refreshIcons();
  syncUrl();
}

// ---------- Screen URLs ----------
// Every screen and state has its own link: #/<workspace id | agency>/<page>?<params>, plus state=… (the States
// toggles, see devToggleQuery). The hash follows each render; opening
// a link or using Back / Forward restores that screen and state.
function routeHash() {
  const q = new URLSearchParams();
  Object.entries(state.params || {}).forEach(([k, v]) => { if (v != null && v !== '' && typeof v !== 'object') q.set(k, v); });
  const toggles = devToggleQuery();
  if (toggles) q.set('state', toggles);
  const qs = q.toString();
  return `#/${state.ctx || 'agency'}/${state.page}${qs ? `?${qs}` : ''}`;
}
let urlReplace = true;   // replace (not push) while opening a link, so a corrected link doesn't add a Back step
function syncUrl() {
  const hash = routeHash();
  if (location.hash === hash) return;
  try { history[urlReplace ? 'replaceState' : 'pushState'](null, '', hash); } catch (e) { /* sandboxed frames may block history */ }
}
// Apply a link's hash. Returns false when there is no route in it.
function applyRoute(hash) {
  const m = /^#\/([^/?]+)\/([^/?]+)(?:\?(.*))?$/.exec(hash || '');
  if (!m) return false;
  const q = new URLSearchParams(m[3] || '');
  const ws = m[1] !== 'agency' ? wsById(decodeURIComponent(m[1])) : null;
  state.ctx = ws ? ws.id : null;
  const params = {};
  q.forEach((v, k) => { if (k !== 'state') params[k] = v; });
  const page = decodeURIComponent(m[2]);
  urlReplace = true;
  navigate(screens[page] ? page : 'reports', params);
  devApplyToggleQuery(q.get('state'));
  syncUrl();
  urlReplace = false;
  return true;
}
window.addEventListener('popstate', () => { if (location.hash !== routeHash()) applyRoute(location.hash); });

// Re-render only the page body (keeps the shell). Use after state changes inside a screen.
function rerender() {
  const def = screens[state.page];
  const root = document.getElementById('screen-root');
  const y = window.scrollY;
  root.innerHTML = def ? def.render() : '';
  if (def && def.afterRender) def.afterRender();
  renderSidebar();
  renderDevBar();
  refreshIcons();
  syncUrl();
  window.scrollTo(0, y);
}

// Replace one region's HTML (keeps focus in inputs elsewhere on the page).
function renderRegion(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  refreshIcons();
}

function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }

// ---------- Formatting ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
// Quote a value for use inside an inline onclick="fn('…')" attribute.
function q(s) { return esc(String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")); }
function fmtMoney(n, dp = 0) { return '$' + Number(n || 0).toLocaleString('en-SG', { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
function fmtNum(n) { return Number(n || 0).toLocaleString('en-SG'); }
function fmtPct(n, dp = 2) { return `${Number(n || 0).toFixed(dp)}%`; }
// Dates follow the Figma copy: "02 Jan 2026" and "6 Sep 2026, 11:32" (day first, SGT).
// Fixed month names: en-GB renders September as "Sept", which Figma does not use.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function sgtParts(d) {
  const p = {};
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    .formatToParts(d).forEach(x => { p[x.type] = x.value; });
  return p;
}
function toDate(v) { return v instanceof Date ? v : new Date(v.length === 10 ? v + 'T00:00:00+08:00' : v); }
function fmtDate(v) {
  if (!v) return '—';
  const p = sgtParts(toDate(v));
  return `${p.day.padStart(2, '0')} ${MONTHS[p.month - 1]} ${p.year}`;
}
function fmtDateTime(v) {
  if (!v) return '—';
  const p = sgtParts(toDate(v));
  return `${Number(p.day)} ${MONTHS[p.month - 1]} ${p.year}, ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}
function initials(name) { return String(name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
function uid(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 8)}`; }
function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim()); }

function emptyState(icon, title, text) {
  return `<div class="empty"><i data-lucide="${icon}"></i><div class="empty-title">${esc(title)}</div><div class="t-caption">${esc(text || '')}</div></div>`;
}

// Platform marks (simplified, self-hosted).
const PLATFORM_SVG = {
  google: `<svg class="logo" viewBox="0 0 24 24" aria-label="Google Ads"><path fill="#FBBC04" d="M2.3 17.3 9 5.7a3.4 3.4 0 0 1 5.9 3.4L8.2 20.7a3.4 3.4 0 1 1-5.9-3.4z"/><path fill="#4285F4" d="M21.7 17.3 15 5.7a3.4 3.4 0 0 0-5.9 3.4l6.7 11.6a3.4 3.4 0 1 0 5.9-3.4z"/><circle fill="#34A853" cx="5.2" cy="19" r="3.4"/></svg>`,
  // Meta mark: the official symbol path (Simple Icons, CC0), in Meta blue.
  meta: `<svg class="logo" viewBox="0 0 24 24" aria-label="Meta"><path fill="#0866FF" d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z"/></svg>`,
  // Organic social: simple marks drawn here (Facebook "f" in a circle, Instagram camera).
  facebook: `<svg class="logo" viewBox="0 0 24 24" aria-label="Facebook"><circle cx="12" cy="12" r="11" fill="#0866FF"/><path fill="#fff" d="M13.3 23v-8.4h2.6l.4-3h-3V9.7c0-.9.3-1.5 1.5-1.5h1.6V5.5c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.6v3h2.6V23z"/></svg>`,
  instagram: `<svg class="logo" viewBox="0 0 24 24" aria-label="Instagram"><rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#D62976"/><rect x="5.5" y="5.5" width="13" height="13" rx="4" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="16.2" cy="7.8" r="1" fill="#fff"/></svg>`,
};
const PLATFORM_NAME = { google: 'Google', meta: 'Meta', facebook: 'Facebook', instagram: 'Instagram' };
function platformLogo(p) { return PLATFORM_SVG[p] || ''; }

// ---------- Toast ----------
let toastTimer;
function showToast(message, icon = 'check-circle') {
  const t = document.getElementById('toast');
  t.innerHTML = `<i data-lucide="${icon}"></i><span>${esc(message)}</span>`;
  t.classList.add('show');
  refreshIcons();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------- Modals ----------
// openModal({ title, desc, body, size: 'lg', actions: [{ label, kind: 'primary'|'outline'|'danger', onClick, close: true }] })
// onClick returning false keeps the modal open (e.g. validation failed).
let modalActions = [];
function openModal({ title, desc = '', body = '', actions = [], size = '', onOpen } = {}) {
  modalActions = actions;
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop open" onclick="if (event.target === this) closeModal()">
      <div class="modal ${size === 'lg' ? 'modal-lg' : ''}" role="dialog" aria-modal="true">
        ${title ? `<h3 class="modal-title">${esc(title)}</h3>` : ''}
        ${desc ? `<p class="modal-desc">${esc(desc)}</p>` : ''}
        <div class="modal-body">${body}</div>
        ${actions.length ? `<div class="modal-actions">${actions.map((a, i) => `<button type="button" class="btn btn-${a.kind || 'primary'}" id="modal-action-${i}" onclick="runModalAction(${i})">${a.icon ? `<i data-lucide="${a.icon}"></i>` : ''}${esc(a.label)}</button>`).join('')}</div>` : ''}
      </div>
    </div>`;
  refreshIcons();
  const first = root.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
  if (first) first.focus();
  if (onOpen) onOpen();
}
function runModalAction(i) {
  const a = modalActions[i];
  if (!a) return;
  const result = a.onClick ? a.onClick() : undefined;
  if (result !== false && a.close !== false) closeModal();
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; modalActions = []; }

// Centred confirmation modal (Figma: warning icon, title, grey text, Cancel + Confirm).
function confirmDialog({ title, text, confirmLabel = 'Confirm', danger = false, icon = 'triangle-alert', onConfirm }) {
  modalActions = [{ onClick: onConfirm }];
  document.getElementById('modal-root').innerHTML = `
    <div class="modal-backdrop open" onclick="if (event.target === this) closeModal()">
      <div class="modal modal-confirm" role="alertdialog" aria-modal="true">
        <div class="confirm-icon ${danger ? 'danger' : ''}"><i data-lucide="${icon}"></i></div>
        <h3 class="modal-title">${esc(title)}</h3>
        <p class="modal-desc">${esc(text)}</p>
        <div class="modal-actions center">
          <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
          <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" onclick="runModalAction(0)">${esc(confirmLabel)}</button>
        </div>
      </div>
    </div>`;
  refreshIcons();
}

// ---------- Menus & popovers ----------
// Markup: <div class="menu-anchor"><button onclick="toggleMenu('id', event)">…</button><div class="menu" id="id">…</div></div>
function toggleMenu(id, ev) {
  if (ev) ev.stopPropagation();
  const el = document.getElementById(id);
  if (!el) return;
  const wasOpen = el.classList.contains('open');
  closeAllPopovers();
  if (wasOpen) return;
  el.classList.add('open');
  el.closest('td, th')?.classList.add('menu-open-cell');
  // Menus inside scrollable tables would be clipped: pin them to the viewport next to their trigger.
  const trigger = ev && ev.currentTarget;
  if (trigger && el.closest('.table-wrap')) {
    const r = trigger.getBoundingClientRect();
    const h = el.offsetHeight, w = el.offsetWidth;
    const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - 6 - h) : r.bottom + 6;
    Object.assign(el.style, { position: 'fixed', top: `${top}px`, left: `${Math.max(8, r.right - w)}px`, right: 'auto', bottom: 'auto' });
  }
}
window.addEventListener('scroll', () => document.querySelectorAll('.table-wrap .menu.open').forEach(el => el.classList.remove('open')), true);
function closeAllPopovers() {
  document.querySelectorAll('.menu.open, .ws-panel.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.menu-open-cell').forEach(el => el.classList.remove('menu-open-cell'));
}
function rowMenu(id, items) {
  // items: [{ label, icon, onClick: "js string", danger, disabled }] or 'sep'
  return `<div class="menu-anchor"><button type="button" class="kebab" aria-label="Actions" onclick="toggleMenu('${id}', event)"><i data-lucide="more-vertical"></i></button>
    <div class="menu" id="${id}" onclick="event.stopPropagation()">${items.map(it => it === 'sep' ? '<div class="menu-sep"></div>' :
      `<button type="button" class="menu-item ${it.danger ? 'danger' : ''}" ${it.disabled ? 'disabled' : ''} onclick="closeAllPopovers(); ${it.onClick}">${it.icon ? `<i data-lucide="${it.icon}"></i>` : ''}${esc(it.label)}</button>`).join('')}</div></div>`;
}

// ---------- Sorting & pagination ----------
// sortHeader('tableId', 'col', 'Label', 'rerenderFn') -> clickable header; applySort(list, 'tableId', { col: item => value })
function sortHeader(table, col, label, fn) {
  const s = state.sorts[table] || {};
  const on = s.col === col;
  const ind = on ? (s.dir === 'asc' ? '↑' : '↓') : '↑↓';
  return `<button type="button" class="th-sort ${on ? 'sorted' : ''}" onclick="toggleSort('${table}','${col}','${fn}')">${thLabel(label)}<span class="sort-ind">${ind}</span></button>`;
}
// Header label split into two balanced lines. Shown on one line normally; in tables with .table-wrap-heads each
// line becomes a block that never wraps, so a header takes at most two rows (e.g. "Contract Days / Left").
function thLabel(label) {
  const words = String(label).split(' ');
  if (words.length < 2) return `<span class="th-label">${esc(label)}</span>`;
  let best = 1, bestLen = Infinity;
  for (let i = 1; i < words.length; i++) {
    const len = Math.max(words.slice(0, i).join(' ').length, words.slice(i).join(' ').length);
    if (len < bestLen) { best = i; bestLen = len; }
  }
  return `<span class="th-label"><span class="th-line">${esc(words.slice(0, best).join(' '))}</span> <span class="th-line">${esc(words.slice(best).join(' '))}</span></span>`;
}
function toggleSort(table, col, fn) {
  const s = state.sorts[table] || {};
  state.sorts[table] = { col, dir: s.col === col && s.dir === 'desc' ? 'asc' : 'desc' };
  if (state.pagers[table]) state.pagers[table].page = 1;
  window[fn]();
}
function applySort(list, table, accessors, fallback) {
  const s = state.sorts[table] || fallback;
  if (!s || !accessors[s.col]) return list;
  const get = accessors[s.col];
  return [...list].sort((a, b) => {
    const va = get(a), vb = get(b);
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return s.dir === 'asc' ? cmp : -cmp;
  });
}
function pager(table, perPage = 10) {
  return state.pagers[table] || (state.pagers[table] = { page: 1, perPage });
}
function paginate(list, table, perPage) {
  const p = pager(table, perPage);
  const pages = Math.max(1, Math.ceil(list.length / p.perPage));
  if (p.page > pages) p.page = pages;
  return list.slice((p.page - 1) * p.perPage, p.page * p.perPage);
}
// Figma pagination bar: "Showing Per Page: 10 ▾" + ‹ 1 2 … n ›
function paginationBar(table, total, fn) {
  const p = pager(table);
  const pages = Math.max(1, Math.ceil(total / p.perPage));
  const nums = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - p.page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const opts = [10, 20, 50].map(n => `<option value="${n}" ${n === p.perPage ? 'selected' : ''}>${n}</option>`).join('');
  return `<div class="pagination">
    <span class="per-page">Showing Per Page: <select onchange="setPerPage('${table}', this.value, '${fn}')">${opts}</select>
      <span class="t-muted">&nbsp;· ${total ? `${(p.page - 1) * p.perPage + 1}–${Math.min(total, p.page * p.perPage)} of ${total}` : '0 results'}</span></span>
    <span class="pages">
      <button type="button" class="page-btn" ${p.page <= 1 ? 'disabled' : ''} onclick="setPage('${table}', ${p.page - 1}, '${fn}')" aria-label="Previous"><i data-lucide="chevron-left"></i></button>
      ${nums.map(n => n === '…' ? '<span class="page-btn muted">…</span>' : `<button type="button" class="page-btn ${n === p.page ? 'active' : 'muted'}" onclick="setPage('${table}', ${n}, '${fn}')">${n}</button>`).join('')}
      <button type="button" class="page-btn" ${p.page >= pages ? 'disabled' : ''} onclick="setPage('${table}', ${p.page + 1}, '${fn}')" aria-label="Next"><i data-lucide="chevron-right"></i></button>
    </span></div>`;
}
function setPage(table, n, fn) { pager(table).page = n; window[fn](); }
function setPerPage(table, n, fn) { const p = pager(table); p.perPage = Number(n); p.page = 1; window[fn](); }

// ---------- Pinned first and action columns ----------
// The first column of every table is pinned by CSS; this marks action columns and the scroll state.
// A table's last column is pinned when it is an action column: its header says Action/Actions or carries an
// *action* class, or the header is blank/Remove/Manage and every body row's last cell holds a button or row menu.
function markActionColumns(root = document) {
  root.querySelectorAll('.table-wrap > .table').forEach(table => {
    const head = table.querySelector('thead tr:last-child > :last-child');   // the column-name row, not a group band row
    const rows = [...table.querySelectorAll('tbody tr')].filter(r => r.children.length > 1);
    const explicit = !!head && (/action/i.test(head.textContent) || /action/i.test(head.className));
    const implicit = !!head && /^(remove|manage|)$/i.test(head.textContent.trim()) && rows.length > 0 &&
      rows.every(r => r.lastElementChild.querySelector('button, .menu-anchor, a'));
    table.classList.toggle('has-action-col', explicit || implicit);
    markTableScroll(table.parentElement);
  });
}
// is-overflowing: columns are hidden horizontally; at-end: scrolled fully right, nothing left behind the action column;
// is-scrolled: scrolled away from the start, so columns are passing under the pinned first column.
function markTableScroll(wrap) {
  wrap.classList.toggle('is-overflowing', wrap.scrollWidth > wrap.clientWidth + 1);
  wrap.classList.toggle('at-end', wrap.scrollLeft + wrap.clientWidth >= wrap.scrollWidth - 1);
  wrap.classList.toggle('is-scrolled', wrap.scrollLeft > 1);
}
let actionColFrame;
new MutationObserver(() => { cancelAnimationFrame(actionColFrame); actionColFrame = requestAnimationFrame(() => markActionColumns()); })
  .observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('resize', () => markActionColumns());
document.addEventListener('scroll', e => { if (e.target.classList?.contains('table-wrap')) markTableScroll(e.target); }, true);

// ---------- Global listeners ----------
document.addEventListener('click', e => {
  if (!e.target.closest('.menu, .ws-panel, .menu-anchor, [data-popover-trigger]')) closeAllPopovers();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeAllPopovers();
  if (document.getElementById('modal-root').innerHTML) closeModal();
});
