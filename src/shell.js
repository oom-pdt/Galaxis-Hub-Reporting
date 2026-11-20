// Galaxis Hub Reporting — app shell: sidebar navigation, page header and workspace switcher.
// The prototype covers Monthly Reports only: the other Galaxis pages are listed in the sidebar for context, disabled.

const CURRENT_USER_ID = 'm-a1';

// disabled: shown for context only, not part of this prototype.
const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', disabled: true },
  // agencyOnly: client users never see the page, so inside a client workspace it is tagged "Agency only".
  { page: 'reports', label: 'Reports', icon: 'file-chart-column', agencyOnly: true },
  { page: 'organisation', label: 'Organisation', icon: 'building-2', disabled: true },
  { page: 'team', label: 'Team & Access', icon: 'users', disabled: true },
  // In the agency workspace the page is called Ad Accounts, with its own icon (blocks means Integrations).
  { page: 'integrations', label: 'Integrations', agencyLabel: 'Ad Accounts', agencyIcon: 'cable', icon: 'blocks', disabled: true }
];

function renderShell() {
  renderSidebar();
  renderHeader();
}

function renderSidebar() {
  const nav = NAV_ITEMS.map(n => ({ ...n, label: isAgency() && n.agencyLabel ? n.agencyLabel : n.label, icon: isAgency() && n.agencyIcon ? n.agencyIcon : n.icon })).map(n => n.disabled
    ? `<button type="button" class="nav-item is-disabled" disabled title="${esc(n.label)}: not part of this prototype"><i data-lucide="${n.icon}"></i><span>${esc(n.label)}</span></button>`
    : `<button type="button" class="nav-item ${state.page === n.page ? 'active' : ''}" onclick="navigate('${n.page}')" title="${esc(n.label)}${n.agencyOnly && !isAgency() ? ': agency only, client users can’t see this page' : ''}"><i data-lucide="${n.icon}"></i><span>${esc(n.label)}</span>${n.agencyOnly && !isAgency() ? '<span class="nav-tag"><i data-lucide="eye-off"></i>Agency only</span>' : ''}</button>`).join('');
  document.getElementById('sidebar').innerHTML = `
    <div class="sidebar-logo">g<span class="logo-text">alaxis</span></div>
    <nav class="sidebar-nav" aria-label="Main">${nav}</nav>
    <div class="sidebar-note">Reports prototype: the other pages are not included.</div>`;
}

function renderHeader() {
  const def = screens[state.page] || {};
  const ws = currentWs();
  const title = def.title ? def.title() : '';
  const desc = def.desc ? def.desc() : '';
  const user = memberById(CURRENT_USER_ID);
  document.getElementById('page-header').innerHTML = `
    <div>
      <h1 class="h-page">${esc(title)}</h1>
      ${desc ? `<div class="page-desc">${esc(desc)}</div>` : ''}
    </div>
    <div class="page-header-right">
      <div class="menu-anchor">
        <button type="button" class="ws-trigger" data-popover-trigger onclick="toggleWsPanel(event)" aria-haspopup="listbox">
          <span class="dot ${ws ? 'dot-green' : 'dot-blue'}" style="width:10px;height:10px"></span>
          <span>${esc(ws ? ws.name : 'My Workspace')}</span>
          <i data-lucide="chevron-down" class="chev"></i>
        </button>
        <div class="ws-panel" id="ws-panel" onclick="event.stopPropagation()"></div>
      </div>
      <div class="menu-anchor">
        <button type="button" class="avatar-btn" onclick="toggleMenu('user-menu', event)" aria-label="Account"><i data-lucide="user"></i></button>
        <div class="menu" id="user-menu" onclick="event.stopPropagation()">
          <div style="padding:10px"><div class="t-bold">${esc(user.name)}</div><div class="t-caption t-muted">${esc(user.email)}</div><div class="t-caption t-muted" style="margin-top:4px">${esc(roleById(user.roleId).name)} · ${esc(AGENCY_ORG.name)}</div></div>
          <div class="menu-sep"></div>
          <button type="button" class="menu-item" onclick="closeAllPopovers(); switchWorkspace(null)"><i data-lucide="home"></i>Go to My Workspace</button>
        </div>
      </div>
    </div>`;
}

// ---------- Workspace switcher (Figma "Workspace Dropdown") ----------
state.ui.wsSearch = '';

// Workspaces the signed-in agency user can see: assignment decides what appears in the switcher.
function visibleWorkspaces() {
  const me = memberById(CURRENT_USER_ID);
  const all = activeWorkspaces();
  return me.workspaces.includes('*') ? all : all.filter(w => me.workspaces.includes(w.id));
}

function toggleWsPanel(ev) {
  ev.stopPropagation();
  const panel = document.getElementById('ws-panel');
  const open = !panel.classList.contains('open');
  closeAllPopovers();
  if (!open) return;
  state.ui.wsSearch = '';
  panel.innerHTML = `
    <div class="h-card" style="margin-bottom:12px">Select Workspace</div>
    <div class="search"><input class="input" id="ws-search" placeholder="Search" oninput="state.ui.wsSearch = this.value; renderWsList()"><i data-lucide="search"></i></div>
    <div id="ws-list"></div>`;
  panel.classList.add('open');
  renderWsList();
  document.getElementById('ws-search').focus();
}

function renderWsList() {
  const term = state.ui.wsSearch.trim().toLowerCase();
  const list = visibleWorkspaces().filter(w => !term || w.name.toLowerCase().includes(term));
  const agencyMatch = !term || 'my workspace agency'.includes(term);
  const tick = '<i data-lucide="check" style="margin-left:auto;color:var(--primary)"></i>';
  const agencyRow = agencyMatch ? `
    <div class="ws-section-label">Agency</div>
    <button type="button" class="ws-option ${isAgency() ? 'current' : ''}" onclick="pickWorkspace(null)">
      <span class="avatar" style="background:var(--primary);color:#fff"><i data-lucide="building-2"></i></span>
      <span><div class="ws-name">My Workspace</div><div class="ws-meta">Agency · ${activeWorkspaces().length} Client Workspaces</div></span>
      ${isAgency() ? tick : ''}
    </button>` : '';
  const rows = list.map(w => {
    const n = wsPlatforms(w.id).length + wsSocial(w.id).length;
    return `<button type="button" class="ws-option ${state.ctx === w.id ? 'current' : ''}" onclick="pickWorkspace('${w.id}')">
      <span class="avatar">${esc(initials(w.name))}</span>
      <span><div class="ws-name">${esc(w.name)}</div><div class="ws-meta">${n} linked account${n === 1 ? '' : 's'}</div></span>
      ${state.ctx === w.id ? tick : ''}
    </button>`;
  }).join('');
  renderRegion('ws-list', `${agencyRow}
    <div class="ws-section-label">Client (${list.length})</div>
    <div class="ws-list">${rows || `<div class="empty" style="padding:20px">No client workspace found matching “${esc(state.ui.wsSearch)}”.</div>`}</div>`);
}

function pickWorkspace(id) {
  closeAllPopovers();
  if (id === state.ctx) return;
  switchWorkspace(id);
}

// Jump into a client workspace from anywhere (e.g. a row of the agency's client list).
function openWorkspace(id, page = 'reports', params = {}) {
  state.ctx = id;
  navigate(page, params);
}
