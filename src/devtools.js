// Galaxis Hub demo — developer toolbar: screen selector and scenario toggles.

const devScreens = [];

// group: 'Agency' | 'Client workspace'. go() must put the app on that screen.
function registerDevScreen(group, key, label, go) { devScreens.push({ group, key, label, go }); }

function devJump(key) {
  const s = devScreens.find(d => d.key === key);
  if (s) s.go();
}

// Default client workspace used when jumping to a client screen from the agency context.
function devClientCtx() { return state.ctx || 'ws-visual'; }

function renderDevBar() {
  const key = screenKey();
  const groups = ['Agency', 'Client workspace'];
  const options = groups.map(g => `<optgroup label="${g}">${devScreens.filter(s => s.group === g).map(s =>
    `<option value="${s.key}" ${s.key === key ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</optgroup>`).join('');

  // Every option is one button: on/off toggles (highlighted when on), cycle buttons for 3+ states
  // ({ cycle: true }, label "Name: value"), and one-shot actions ({ action: true }).
  const toggles = devToggleRegistry[key] ? devToggleRegistry[key]() : [];
  window.__devToggles = toggles;

  document.getElementById('devbar').innerHTML = `
    <span class="devbar-title">Galaxis Hub Reporting <span class="tag">DEV</span></span>
    <select aria-label="Jump to screen" onchange="devJump(this.value)">${options}</select>
    <div class="devbar-toggles">
      <span class="lbl">States:</span>
      ${toggles.length ? toggles.map((t, i) => t === 'sep' ? '<span class="lbl">|</span>' :
        `<button type="button" class="dev-toggle ${t.cycle ? 'dev-cycle' : t.action ? 'dev-action' : t.active ? 'active' : ''}" ${t.cycle || t.action ? '' : `aria-pressed="${!!t.active}"`} title="${t.cycle ? 'Click to cycle' : t.action ? 'Run once' : 'Click to turn on / off'}" onclick="window.__devToggles[${i}].run()">${t.cycle ? '<span aria-hidden="true">↻ </span>' : t.action ? '<span aria-hidden="true">▶ </span>' : ''}${esc(t.label)}</button>`).join('') : '<span class="lbl">Default state only</span>'}
    </div>`;
}

// ---------- Toggle states in screen links ----------
// A screen link carries its States toggles as ?state=<slug>,…: a slug for an on/off toggle turned on, <slug>-off for one
// turned off, and the full slug of a cycle button's current label ("seo-status-critical"). Only toggles that differ
// from a fresh load are listed, so each state has one link.
const devToggleDefaults = {};
// Flags a viewer's own saved preferences can change at start-up; links measure toggles against these values instead.
const devLinkBaseline = {};
function devSlug(label) { return String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function devCycleName(label) { return devSlug(String(label).split(':')[0]); }
function devScreenToggles() {
  const fn = devToggleRegistry[screenKey()];
  return (fn ? fn() : []).filter(t => t !== 'sep' && !t.action);
}
// Record every screen's toggle defaults at start-up (per workspace), before anything is toggled.
function devRecordToggleDefaults() {
  const saved = { ctx: state.ctx, page: state.page, params: state.params, flags: state.flags };
  state.flags = { ...state.flags, ...devLinkBaseline };
  [null, ...workspaces.map(w => w.id)].forEach(ctx => {
    Object.entries(devToggleRegistry).forEach(([key, fn]) => {
      if (key.startsWith('agency-') !== (ctx === null)) return;
      state.ctx = ctx;
      try {
        fn().filter(t => t !== 'sep' && !t.action).forEach(t => {
          devToggleDefaults[`${key}|${ctx}|${t.cycle ? devCycleName(t.label) : devSlug(t.label)}`] = t.cycle ? devSlug(t.label) : !!t.active;
        });
      } catch (e) { /* toggles that need a screen's own state are recorded on first sight */ }
    });
  });
  Object.assign(state, saved);
}
function devToggleDefault(t) {
  const k = `${screenKey()}|${state.ctx}|${t.cycle ? devCycleName(t.label) : devSlug(t.label)}`;
  if (!(k in devToggleDefaults)) devToggleDefaults[k] = t.cycle ? devSlug(t.label) : !!t.active;
  return devToggleDefaults[k];
}
function devToggleQuery() {
  return devScreenToggles().map(t => {
    const def = devToggleDefault(t);
    if (t.cycle) return devSlug(t.label) === def ? null : devSlug(t.label);
    return !!t.active === def ? null : `${devSlug(t.label)}${t.active ? '' : '-off'}`;
  }).filter(Boolean).join(',');
}
// Set the current screen's toggles to a link's ?state= value. One change at a time: a toggle can add or remove others.
function devApplyToggleQuery(value) {
  const want = new Set((value || '').split(',').filter(Boolean));
  for (let n = 0; n < 20; n++) {
    const t = devScreenToggles().find(t => {
      if (t.cycle) { const hit = [...want].find(w => w.startsWith(devCycleName(t.label) + '-')); return hit && hit !== devSlug(t.label); }
      const s = devSlug(t.label);
      const on = want.has(s) ? true : want.has(`${s}-off`) ? false : devToggleDefault(t);
      return !!t.active !== on;
    });
    if (!t) return;
    t.run();
  }
}

