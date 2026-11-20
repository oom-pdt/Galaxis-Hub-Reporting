// Galaxis Hub Reporting — Monthly Reports: account managers choose the tables and charts in each client's monthly
// PDF report, when it is sent and who receives it. Agency only: client users never see this page, only the PDF.
// Owns src/reports.js + src/reports.css. Every global here is prefixed `rep`.

// =====================================================================
// Catalogue: report categories (Google campaign types, Meta objectives), default columns, charts
// =====================================================================
// rows: the level a table lists. Performance Max has no individual ads, so it lists asset groups.
const REP_CATEGORIES = {
  google: [
    { id: 'search', label: 'Search', campType: 'Search', hint: 'Responsive search ads on Google Search.' },
    { id: 'pmax', label: 'Performance Max', campType: 'Performance Max', rows: 'adgroup', hint: 'One row per asset group: Performance Max builds its ads automatically, so there are no individual ads.' },
    { id: 'demandgen', label: 'Demand Gen', campType: 'Demand Gen', hint: 'Image, video and carousel ads on YouTube, Discover and Gmail.' },
    { id: 'youtube', label: 'YouTube', campType: 'Video', hint: 'Video campaigns on YouTube.' },
    { id: 'display', label: 'Display', campType: 'Display', hint: 'Responsive display ads on the Google Display Network.' },
    { id: 'shopping', label: 'Shopping', campType: 'Shopping', hint: 'Product ads from the Merchant Center feed.' },
    { id: 'app', label: 'App installs', campType: 'App', hint: 'App campaigns.' }
  ],
  meta: [
    { id: 'awareness', label: 'Awareness', campType: 'Awareness', hint: 'Campaigns with the Awareness objective.' },
    { id: 'traffic', label: 'Traffic', campType: 'Traffic', hint: 'Campaigns with the Traffic objective.' },
    { id: 'engagement', label: 'Engagement', campType: 'Engagement', hint: 'Campaigns with the Engagement objective.' },
    { id: 'leads', label: 'Lead generation', campType: 'Leads', hint: 'Campaigns with the Leads objective.' },
    { id: 'app', label: 'App installs', campType: 'App promotion', hint: 'Campaigns with the App promotion objective.' },
    { id: 'sales', label: 'Sales', campType: 'Sales', hint: 'Campaigns with the Sales objective.' }
  ]
};
const REP_PLATFORM = { google: 'Google Ads', meta: 'Meta Ads' };
const REP_MAX_COLS = 8;   // metric columns that fit a landscape A4 page next to the ad column
// Suggested columns when a table is added (the AM can change them).
const REP_DEFAULT_COLS = {
  google: {
    search: ['impressions', 'clicks', 'ctr', 'cpc', 'spend', 'conversions', 'cpa'],
    pmax: ['impressions', 'clicks', 'spend', 'conversions', 'cpa', 'convValue'],
    demandgen: ['impressions', 'clicks', 'ctr', 'spend', 'conversions', 'cpa'],
    youtube: ['impressions', 'vViews', 'v25r', 'v100r', 'cpm', 'spend'],
    display: ['impressions', 'clicks', 'ctr', 'cpm', 'spend', 'conversions'],
    shopping: ['impressions', 'clicks', 'spend', 'conversions', 'convValue', 'pRoas'],
    app: ['impressions', 'clicks', 'spend', 'conversions', 'cpa']
  },
  meta: {
    awareness: ['spend', 'reach', 'impressions', 'freq', 'cpm'],
    traffic: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'lpv'],
    engagement: ['spend', 'impressions', 'engagements', 'engRate', 'cpe', 'shares'],
    leads: ['spend', 'impressions', 'clicks', 'ctr', 'pLeads', 'cpLead'],
    app: ['spend', 'impressions', 'clicks', 'conversions', 'cpa'],
    sales: ['spend', 'purchases', 'cpp', 'convValue', 'pRoas']
  }
};
// metric: the chart has a metric to choose. both: the chart compares the two platforms (no platform to choose).
const REP_CHARTS = [
  { id: 'summary', label: 'Monthly summary', desc: 'Headline numbers for the month, with the change from the month before.' },
  { id: 'trend', label: 'Daily trend', desc: 'One metric, day by day, through the month.', metric: true },
  { id: 'types', label: 'By campaign type', metaLabel: 'By objective', desc: 'One metric split by campaign type (Google) or objective (Meta).', metric: true },
  { id: 'topAds', label: 'Top 10 ads', desc: 'The ten ads with the highest value of one metric.', metric: true },
  { id: 'device', label: 'Device', desc: 'One metric split by device.', metric: true },
  { id: 'demo', label: 'Age and gender', desc: 'One metric split by age group, for women and men.', metric: true },
  { id: 'placement', label: 'Network', metaLabel: 'Placement', desc: 'Where the ads ran: Google networks, or Facebook and Instagram placements.', metric: true },
  { id: 'location', label: 'Location', desc: 'One metric split by region.', metric: true },
  { id: 'video', label: 'Video drop-off', desc: 'How much of the video ads people watched (25%, 50%, 75%, 100%).' },
  { id: 'platforms', label: 'Spend by platform', desc: 'Google Ads and Meta Ads spend side by side.', both: true }
];
const REP_CHART_METRICS = ['spend', 'impressions', 'clicks', 'conversions'];
// Breakdown values as each platform reports them (mock shares are generated per workspace and month).
const REP_DIMS = {
  device: { google: ['Mobile phones', 'Computers', 'Tablets', 'TV screens'], meta: ['Mobile app', 'Mobile web', 'Desktop'] },
  age: { google: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'], meta: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'] },
  placement: { google: ['Google Search', 'Search partners', 'YouTube', 'Display Network'], meta: ['Facebook Feed', 'Instagram Feed', 'Instagram Reels', 'Instagram Stories', 'Facebook Reels', 'Audience Network'] },
  location: { google: ['Central', 'East', 'North', 'North-East', 'West'], meta: ['Central', 'East', 'North', 'North-East', 'West'] }
};
function repChartDef(id) { return REP_CHARTS.find(c => c.id === id); }
function repChartLabel(b) { const d = repChartDef(b.chart); return b.platform === 'meta' && d.metaLabel ? d.metaLabel : d.label; }
function repCategory(p, id) { return (REP_CATEGORIES[p] || []).find(c => c.id === id); }
function repCol(p, key) { return DASH_PF_COLS[p].find(c => c.key === key); }
function repColLabel(p, key) { return repCol(p, key)?.label || key; }
// Columns a table can show: the platform's own metrics at that level (no settings columns, no CRM columns).
function repColumns(p, rows = 'ad') { return DASH_PF_COLS[p].filter(c => c.group !== 'attr' && (!c.levels || c.levels.includes(rows))); }
function repGroupLabel(p, g) { return (DASH_PF_GROUPS[p].find(x => x[0] === g) || [g, g])[1]; }
function repFmt(p, key, v) { const c = repCol(p, key); return c ? DASH_PF_FMT[c.t](v) : fmtNum(v); }

// =====================================================================
// Months
// =====================================================================
function repToday() { return new Date(); }
function repMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function repAddMonths(month, n) { const [y, m] = month.split('-').map(Number); return repMonthKey(new Date(y, m - 1 + n, 1)); }
function repMonthDays(month) { const [y, m] = month.split('-').map(Number); return new Date(y, m, 0).getDate(); }
function repMonthLabel(month) { const [y, m] = month.split('-').map(Number); return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`; }
function repLastMonth() { return repAddMonths(repMonthKey(repToday()), -1); }
// The report for `month` is sent on `day` of the following month at 9:00 (Singapore time).
function repSendDate(month, day) { const [y, m] = month.split('-').map(Number); return new Date(y, m, day, 9, 0); }
function repOrdinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
// The next report to go out: last month's if its send date is still ahead, otherwise this month's.
function repNextMonth(cfg) {
  const last = repLastMonth();
  return repSendDate(last, cfg.day) > repToday() ? last : repAddMonths(last, 1);
}

// =====================================================================
// Month data (mock): the platform reports at ad / asset group level, scaled to the month's days
// =====================================================================
function repData(wsId, p, month) { return dashPfData(wsId, p, repMonthDays(month)); }
// "Ran in the month" = at least one impression. Neither API keeps a status history, so delivery decides.
// Mock: about half the paused ads did not deliver in a given month.
function repDelivered(row, month) { return row.impressions > 0 && !(row.pfStatus === 'Paused' && dashRng(`${row.id}:${month}:delivered`)() < 0.55); }
function repRows(wsId, b, month) {
  const cat = repCategory(b.platform, b.category);
  if (!cat || !wsPlatforms(wsId).includes(b.platform)) return [];
  const rows = repData(wsId, b.platform, month)[cat.rows || 'ad'].filter(r => r.campType === cat.campType && repDelivered(r, month));
  const key = b.sort || 'spend';
  return [...rows].sort((a, c) => (c[key] || 0) - (a[key] || 0));
}
function repTotals(wsId, p, month) {
  const d = repData(wsId, p, month);
  return dashPfSum(d.ad.filter(r => repDelivered(r, month)));
}
// Deterministic shares for a breakdown, adding up to 1.
function repShares(key, n, skew = 1) {
  const r = dashRng(key);
  const w = Array.from({ length: n }, (_, i) => (0.35 + r()) / Math.pow(i + 1, skew * 0.35));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}
function repBreakdown(wsId, p, dim, month, metric) {
  const total = repTotals(wsId, p, month)[metric] || 0;
  const labels = REP_DIMS[dim][p];
  const shares = repShares(`${wsId}:${p}:${dim}:${month}`, labels.length, dim === 'device' || dim === 'placement' ? 2 : 1);
  return labels.map((label, i) => ({ label, value: total * shares[i] }));
}
// Age × gender: each age group's value split into women, men and unknown.
function repDemo(wsId, p, month, metric) {
  return repBreakdown(wsId, p, 'age', month, metric).map(a => {
    const r = dashRng(`${wsId}:${p}:${a.label}:${month}:gender`);
    const f = 0.4 + r() * 0.25, u = 0.02 + r() * 0.04;
    return { label: a.label, female: a.value * f * (1 - u), male: a.value * (1 - f) * (1 - u) };
  });
}
// Daily values adding up to the month's total (weekends a little lower).
function repDaily(wsId, p, month, metric) {
  const days = repMonthDays(month), total = repTotals(wsId, p, month)[metric] || 0;
  const r = dashRng(`${wsId}:${p}:${month}:${metric}:daily`);
  const [y, m] = month.split('-').map(Number);
  const w = Array.from({ length: days }, (_, i) => {
    const dow = new Date(y, m - 1, i + 1).getDay();
    return (dow === 0 || dow === 6 ? 0.78 : 1) * (0.8 + r() * 0.4) * (1 + 0.15 * Math.sin(i / 4));
  });
  const s = w.reduce((a, b) => a + b, 0);
  return w.map((x, i) => ({ day: i + 1, value: total * x / s }));
}
function repByType(wsId, p, month, metric) {
  const d = repData(wsId, p, month);
  const by = {};
  d.ad.filter(r => repDelivered(r, month)).forEach(r => { by[r.campType] = (by[r.campType] || 0) + (r[metric] || 0); });
  return Object.entries(by).map(([label, value]) => ({ label: p === 'google' && label === 'Video' ? 'YouTube' : label, value })).sort((a, b) => b.value - a.value);
}

// =====================================================================
// Report set-up per client workspace (in memory, like the rest of the demo)
// =====================================================================
// cfg: { auto, day, owner (agency member: "Prepared by" and reply-to), subject, message, to: [{ id, name, email }],
//        cc: [agency member ids], blocks: [{ id, kind: 'table', platform, category, title, columns, sort }
//        | { id, kind: 'chart', chart, platform: 'google' | 'meta' | 'both', metric }], createdAt }
const repConfigs = {};
const repHistories = {};
const REP_SUBJECT = 'Your {month} ads report: {client}';
const REP_MESSAGE = 'Hi,\n\nAttached is your ads report for {month}. It covers your Google Ads and Meta Ads results, with every ad that ran during the month.\n\nReply to this email if you have any questions.\n\n{am}';

// Suggested content: a summary and a trend per platform, the platform comparison, then one table per category
// that ran last month.
function repSuggestedBlocks(wsId) {
  const plats = wsPlatforms(wsId), month = repLastMonth(), blocks = [];
  plats.forEach(p => blocks.push({ id: uid('rb'), kind: 'chart', chart: 'summary', platform: p }));
  if (plats.length > 1) blocks.push({ id: uid('rb'), kind: 'chart', chart: 'platforms', platform: 'both' });
  plats.forEach(p => blocks.push({ id: uid('rb'), kind: 'chart', chart: 'trend', platform: p, metric: 'spend' }));
  plats.forEach(p => REP_CATEGORIES[p].forEach(cat => {
    const b = repNewTable(p, cat.id);
    if (repRows(wsId, b, month).length) blocks.push(b);
  }));
  return blocks;
}
function repNewTable(p, category) {
  return { id: uid('rb'), kind: 'table', platform: p, category, title: '', columns: [...REP_DEFAULT_COLS[p][category]], sort: 'spend' };
}
function repNewConfig(wsId, o = {}) {
  const owner = wsPrimaryContact(wsId);
  const ws = wsById(wsId);
  return {
    auto: true, day: 5, owner: CURRENT_USER_ID, subject: REP_SUBJECT, message: REP_MESSAGE,
    to: [...(owner ? [{ id: uid('rr'), name: owner.name, email: owner.email }] : []), { id: uid('rr'), name: 'Marketing Team', email: `marketing@${ws.site || 'example.com'}` }],
    cc: [CURRENT_USER_ID], blocks: repSuggestedBlocks(wsId), createdAt: repToday().toISOString(), ...o
  };
}
// Seed: two in three client workspaces with linked ad accounts already have a report (created in June 2026).
function repSeed(wsId) {
  const list = activeWorkspaces().filter(w => wsPlatforms(w.id).length);
  const i = list.findIndex(w => w.id === wsId);
  if (i < 0 || i % 3 === 2) return null;
  const cfg = repNewConfig(wsId, { auto: i % 4 !== 3, day: [5, 3, 7][i % 3], createdAt: '2026-06-20T10:00:00+08:00' });
  // Past reports: every month from July (the first full month) until the last one whose send date has passed.
  const hist = [];
  for (let m = '2026-07'; repSendDate(m, cfg.day) <= repToday(); m = repAddMonths(m, 1)) {
    if (!cfg.auto && m >= '2026-09') break;   // paused accounts stopped in September
    hist.unshift({ id: uid('rh'), month: m, sentAt: new Date(repSendDate(m, cfg.day).getTime() + 3 * 60000).toISOString(), to: cfg.to.map(r => r.email), status: 'sent' });
  }
  // One account's latest report failed: the Meta connection expired before it was generated.
  if (i === 1 && hist.length && wsPlatforms(wsId).includes('meta')) Object.assign(hist[0], { status: 'failed', sentAt: null, reason: 'Meta Ads data could not be fetched because the Meta connection has expired. Tried again 3 times over 3 days.' });
  repHistories[wsId] = hist;
  return cfg;
}
function repConfig(wsId) {
  if (state.flags.repEmpty) return null;
  if (!(wsId in repConfigs)) repConfigs[wsId] = repSeed(wsId);
  return repConfigs[wsId];
}
function repHistory(wsId) {
  repConfig(wsId);
  const list = repHistories[wsId] || (repHistories[wsId] = []);
  // Dev toggle "Last report failed": show the latest report as failed.
  if (state.flags.repFailed && list.length && list[0].status !== 'failed') return [{ ...list[0], status: 'failed', sentAt: null, reason: 'Google Ads data could not be fetched: Google returned a temporary error. Tried again 3 times over 3 days.' }, ...list.slice(1)];
  return list;
}
// Status of a workspace's report: none | paused | failed | scheduled.
function repStatus(wsId) {
  const cfg = repConfig(wsId);
  if (!cfg) return 'none';
  if (repHistory(wsId)[0]?.status === 'failed') return 'failed';
  return cfg.auto && cfg.to.length ? 'scheduled' : 'paused';
}
// The dot carries the colour; the text stays dark for contrast, except failures (red text passes AA).
const REP_STATUS = { scheduled: ['Scheduled', 'dot-green-strong', ''], paused: ['Paused', 'dot-grey', ''], failed: ['Last report failed', 'dot-red-strong', 't-error'], none: ['Not set up', 'dot-orange-strong', ''] };
function repStatusDot(s) { const [l, d, c] = REP_STATUS[s]; return `<span class="dot-label ${c}"><span class="dot ${d}"></span>${esc(l)}</span>`; }
function repFill(text, wsId, month) {
  const cfg = repConfig(wsId), am = memberById(cfg?.owner);
  return String(text).replace(/\{client\}/g, wsById(wsId).name).replace(/\{month\}/g, repMonthLabel(month)).replace(/\{am\}/g, am ? am.name : '');
}
function repFileName(wsId, month) { return `${wsById(wsId).name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}_Ads-Report_${month}.pdf`; }
function repBlockTitle(b) {
  if (b.kind === 'chart') return b.platform === 'both' ? repChartLabel(b) : `${REP_PLATFORM[b.platform]} · ${repChartLabel(b)}`;
  return b.title || `${REP_PLATFORM[b.platform]} · ${repCategory(b.platform, b.category)?.label || b.category}`;
}

// =====================================================================
// PDF: pages (A4 landscape, 1123 × 794 px at 96 dpi), charts as inline SVG
// =====================================================================
const REP_INK = { google: '#398FF7', meta: '#225694', female: '#398FF7', male: '#F59E1B', grid: '#EAEAEA', text: '#656565' };
function repShort(v, key, p) {
  const c = repCol(p || 'google', key);
  if (c && /^money/.test(c.t)) return v >= 10000 ? `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k` : fmtMoney(v);
  return v >= 10000 ? `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k` : fmtNum(Math.round(v));
}
// Line chart (daily trend). W × H in SVG units, scaled to the slot width.
function repSvgLine(points, p, key) {
  const W = 1000, H = 230, L = 60, B = 26, T = 10;
  const max = Math.max(...points.map(x => x.value), 1) * 1.1;
  const x = i => L + (W - L - 10) * (points.length > 1 ? i / (points.length - 1) : 0);
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => max * f);
  const path = points.map((pt, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pt.value).toFixed(1)}`).join('');
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(repColLabel(p, key))} by day">
    ${ticks.map(t => `<line x1="${L}" x2="${W - 10}" y1="${y(t)}" y2="${y(t)}" stroke="${REP_INK.grid}"/><text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="${REP_INK.text}">${esc(repShort(t, key, p))}</text>`).join('')}
    ${points.map((pt, i) => (i % 5 === 0 || i === points.length - 1) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="middle" font-size="11" fill="${REP_INK.text}">${pt.day}</text>` : '').join('')}
    <path d="${path} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)}Z" fill="${REP_INK[p]}" opacity=".10"/>
    <path d="${path}" fill="none" stroke="${REP_INK[p]}" stroke-width="2.5"/>
  </svg>`;
}
// Horizontal bars, largest first. items: [{ label, value }].
function repSvgBars(items, p, key, color) {
  const W = 1000, row = 24, L = 210, H = items.length * row + 4;
  const max = Math.max(...items.map(i => i.value), 1);
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(repColLabel(p, key))} breakdown">
    ${items.map((it, i) => {
      const w = (W - L - 110) * it.value / max, yy = i * row + 2;
      return `<text x="${L - 10}" y="${yy + 16}" text-anchor="end" font-size="12" fill="#2B2B2B">${esc(it.label.length > 30 ? it.label.slice(0, 29) + '…' : it.label)}</text>
        <rect x="${L}" y="${yy + 4}" width="${Math.max(2, w).toFixed(1)}" height="${row - 9}" rx="3" fill="${color || REP_INK[p]}"/>
        <text x="${L + w + 8}" y="${yy + 16}" font-size="12" fill="${REP_INK.text}">${esc(repFmt(p, key, it.value))}</text>`;
    }).join('')}
  </svg>`;
}
// Age groups with a bar for women and one for men.
function repSvgDemo(rows, p, key) {
  const W = 1000, H = 230, L = 60, B = 40, T = 10;
  const max = Math.max(...rows.flatMap(r => [r.female, r.male]), 1) * 1.1;
  const gw = (W - L - 10) / rows.length, bw = Math.min(34, gw / 3);
  const y = v => T + (H - T - B) * (1 - v / max);
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(repColLabel(p, key))} by age and gender">
    ${[0, 0.5, 1].map(f => `<line x1="${L}" x2="${W - 10}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="${REP_INK.grid}"/><text x="${L - 8}" y="${y(max * f) + 4}" text-anchor="end" font-size="11" fill="${REP_INK.text}">${esc(repShort(max * f, key, p))}</text>`).join('')}
    ${rows.map((r, i) => {
      const cx = L + gw * i + gw / 2;
      return `<rect x="${cx - bw - 2}" y="${y(r.female)}" width="${bw}" height="${y(0) - y(r.female)}" fill="${REP_INK.female}" rx="2"/>
        <rect x="${cx + 2}" y="${y(r.male)}" width="${bw}" height="${y(0) - y(r.male)}" fill="${REP_INK.male}" rx="2"/>
        <text x="${cx}" y="${H - 22}" text-anchor="middle" font-size="12" fill="#2B2B2B">${esc(r.label)}</text>`;
    }).join('')}
    <rect x="${L}" y="${H - 12}" width="10" height="10" fill="${REP_INK.female}"/><text x="${L + 16}" y="${H - 3}" font-size="11" fill="${REP_INK.text}">Women</text>
    <rect x="${L + 80}" y="${H - 12}" width="10" height="10" fill="${REP_INK.male}"/><text x="${L + 96}" y="${H - 3}" font-size="11" fill="${REP_INK.text}">Men</text>
  </svg>`;
}
function repChange(now, before) {
  if (!before) return '<span class="rep-kpi-chg">No data the month before</span>';
  const pct = (now - before) / before * 100;
  return `<span class="rep-kpi-chg">${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct).toFixed(1)}% vs last month</span>`;
}
const REP_SUMMARY_KEYS = { google: ['spend', 'impressions', 'clicks', 'ctr', 'conversions', 'cpa'], meta: ['spend', 'reach', 'impressions', 'clicks', 'conversions', 'cpa'] };
function repChartBody(wsId, b, month) {
  const p = b.platform, key = b.metric || 'spend';
  const empty = text => `<div class="rep-chart-empty">${esc(text)}</div>`;
  switch (b.chart) {
    case 'summary': {
      const now = repTotals(wsId, p, month), before = repTotals(wsId, p, repAddMonths(month, -1));
      return `<div class="rep-kpis">${REP_SUMMARY_KEYS[p].map(k => `<div class="rep-kpi"><div class="rep-kpi-label">${esc(repColLabel(p, k))}</div><div class="rep-kpi-val">${esc(repFmt(p, k, now[k]))}</div>${repChange(now[k], before[k])}</div>`).join('')}</div>`;
    }
    case 'trend': return repSvgLine(repDaily(wsId, p, month, key), p, key);
    case 'types': { const items = repByType(wsId, p, month, key); return items.length ? repSvgBars(items, p, key) : empty('No campaigns ran this month.'); }
    case 'topAds': {
      const items = repData(wsId, p, month).ad.filter(r => repDelivered(r, month)).sort((a, c) => (c[key] || 0) - (a[key] || 0)).slice(0, 10).map(r => ({ label: r.name, value: r[key] || 0 }));
      return items.length ? repSvgBars(items, p, key) : empty('No ads ran this month.');
    }
    case 'device': case 'placement': case 'location': return repSvgBars(repBreakdown(wsId, p, b.chart, month, key).sort((a, c) => c.value - a.value), p, key);
    case 'demo': return repSvgDemo(repDemo(wsId, p, month, key), p, key);
    case 'video': {
      const t = repTotals(wsId, p, month);
      if (!t.vImpr) return empty('No video ads ran this month.');
      return repSvgBars([25, 50, 75, 100].map(n => ({ label: `Watched ${n}%`, value: t[`v${n}`] / t.vImpr * 100 })), p, 'ctr');
    }
    case 'platforms': {
      const items = wsPlatforms(wsId).map(x => ({ label: REP_PLATFORM[x], value: repTotals(wsId, x, month).spend }));
      return `<svg class="rep-svg" viewBox="0 0 1000 ${items.length * 24 + 4}">${items.map((it, i) => {
        const max = Math.max(...items.map(z => z.value), 1), w = 680 * it.value / max;
        return `<text x="200" y="${i * 24 + 18}" text-anchor="end" font-size="12" fill="#2B2B2B">${it.label}</text><rect x="210" y="${i * 24 + 6}" width="${w}" height="15" rx="3" fill="${REP_INK[wsPlatforms(wsId)[i]]}"/><text x="${218 + w}" y="${i * 24 + 18}" font-size="12" fill="${REP_INK.text}">${fmtMoney(it.value, 2)}</text>`;
      }).join('')}</svg>`;
    }
  }
  return '';
}
function repChartSub(b, month) {
  const m = repMonthLabel(month);
  const metric = b.metric ? repColLabel(b.platform === 'both' ? 'google' : b.platform, b.metric) : '';
  return { summary: `${m}, compared with ${repMonthLabel(repAddMonths(month, -1))}`, trend: `${metric} by day, ${m}`, types: `${metric} by ${b.platform === 'meta' ? 'objective' : 'campaign type'}, ${m}`,
    topAds: `Top 10 ads by ${metric}, ${m}`, device: `${metric} by device, ${m}`, demo: `${metric} by age and gender, ${m}. Unknown gender not shown.`,
    placement: `${metric} by ${b.platform === 'meta' ? 'placement' : 'network'}, ${m}`, location: `${metric} by region, ${m}`, video: `Share of video impressions watched to each point, ${m}`,
    platforms: `Amount spent on each platform, ${m}` }[b.chart] || m;
}

// Ad thumbnail: drawn from the ad's format (the product stores the creative's image when the PDF is generated).
function repThumb(row, p, cat) {
  const h = dashHash(row.id) % 360, bg = `hsl(${h} 55% 88%)`, fg = `hsl(${h} 45% 32%)`;
  const fmt = cat.id === 'search' ? 'text' : cat.id === 'pmax' ? 'pmax' : cat.id === 'youtube' ? 'Video' : row.format || 'Image';
  const glyph = {
    text: `<text x="20" y="25" text-anchor="middle" font-size="12" font-weight="700" fill="${fg}">Ad</text>`,
    pmax: `<rect x="9" y="9" width="10" height="10" rx="2" fill="${fg}"/><rect x="21" y="9" width="10" height="10" rx="2" fill="${fg}" opacity=".6"/><rect x="9" y="21" width="10" height="10" rx="2" fill="${fg}" opacity=".6"/><rect x="21" y="21" width="10" height="10" rx="2" fill="${fg}"/>`,
    Video: `<path d="M16 12 L28 20 L16 28 Z" fill="${fg}"/>`,
    Carousel: `<rect x="13" y="9" width="18" height="20" rx="2" fill="${fg}" opacity=".45"/><rect x="9" y="12" width="18" height="20" rx="2" fill="${fg}"/>`,
    Image: `<circle cx="27" cy="13" r="3.5" fill="${fg}"/><path d="M7 31 L16 19 L22 26 L26 22 L33 31 Z" fill="${fg}"/>`
  }[fmt] || '';
  return `<svg class="rep-thumb" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="6" fill="${bg}"/>${glyph}</svg>`;
}
const REP_ROWS_PER_PAGE = 8;
function repTablePages(wsId, b, month) {
  const cat = repCategory(b.platform, b.category), p = b.platform;
  const rows = repRows(wsId, b, month);
  const title = repBlockTitle(b);
  const noun = (cat.rows || 'ad') === 'adgroup' ? ['asset group', 'asset groups'] : ['ad', 'ads'];
  const sub = `${rows.length} ${rows.length === 1 ? noun[0] : noun[1]} ran in ${repMonthLabel(month)} · Sorted by ${repColLabel(p, b.sort || 'spend')}, highest first`;
  if (!rows.length) return [`<h2 class="rep-h2">${esc(title)}</h2><div class="rep-sub">${esc(cat.hint)}</div><div class="rep-chart-empty">No ${noun[1]} in this category ran in ${repMonthLabel(month)}.</div>`];
  const cols = b.columns.map(k => repCol(p, k)).filter(Boolean);
  const cell = (r, c) => c.needs && !r[c.needs] ? '—' : esc(DASH_PF_FMT[c.t](r[c.key]));
  const head = `<thead><tr><th>${noun[0] === 'ad' ? (p === 'meta' ? 'Ad' : 'Ad') : 'Asset group'}</th>${cols.map(c => `<th class="num">${esc(c.label)}</th>`).join('')}</tr></thead>`;
  const total = dashPfSum(rows);
  const pages = [];
  for (let i = 0; i < rows.length; i += REP_ROWS_PER_PAGE) {
    const chunk = rows.slice(i, i + REP_ROWS_PER_PAGE), last = i + REP_ROWS_PER_PAGE >= rows.length;
    pages.push(`<h2 class="rep-h2">${esc(title)}${i ? ' <span class="rep-cont">(continued)</span>' : ''}</h2><div class="rep-sub">${esc(sub)}</div>
      <table class="rep-table">${head}<tbody>${chunk.map(r => `<tr><td><div class="rep-ad">${repThumb(r, p, cat)}<div class="rep-ad-text"><div class="rep-ad-name">${esc(r.name)}</div><div class="rep-ad-sub">${esc(noun[0] === 'ad' ? `${r.campaignName} › ${r.adGroupName}` : r.parents?.[0] || '')}</div></div></div></td>${cols.map(c => `<td class="num">${cell(r, c)}</td>`).join('')}</tr>`).join('')}
      ${last ? `<tr class="rep-total"><td>Total</td>${cols.map(c => `<td class="num">${cell(total, c)}</td>`).join('')}</tr>` : ''}</tbody></table>`);
  }
  return pages;
}
// Every block that can go in the PDF (blocks for platforms that are no longer linked are left out).
function repLiveBlocks(wsId, cfg) {
  const plats = wsPlatforms(wsId);
  return cfg.blocks.filter(b => b.platform === 'both' ? plats.length > 1 : plats.includes(b.platform));
}
function repDefinitions(wsId, cfg) {
  const out = [];
  ['google', 'meta'].forEach(p => {
    const keys = new Set();
    repLiveBlocks(wsId, cfg).filter(b => b.platform === p).forEach(b => { (b.columns || []).forEach(k => keys.add(k)); if (b.metric) keys.add(b.metric); if (b.chart === 'summary') REP_SUMMARY_KEYS[p].forEach(k => keys.add(k)); });
    keys.forEach(k => { const c = repCol(p, k); if (c) out.push({ p, label: c.label, tip: c.tip }); });
  });
  return out;
}
function repPages(wsId, month) {
  const cfg = repConfig(wsId), ws = wsById(wsId), am = memberById(cfg.owner);
  const pages = [];
  pages.push({ cover: true, html: `<div class="rep-cover">
      <div class="rep-cover-brand">galaxis</div>
      <div class="rep-cover-main"><div class="rep-cover-kicker">Monthly Ads Report</div><div class="rep-cover-client">${esc(ws.name)}</div><div class="rep-cover-month">${esc(repMonthLabel(month))}</div>
        <div class="rep-cover-plats">${wsPlatforms(wsId).map(p => `<span class="rep-cover-plat">${platformLogo(p)}${REP_PLATFORM[p]}</span>`).join('')}</div></div>
      <div class="rep-cover-foot">Prepared by ${esc(am ? am.name : AGENCY_ORG.name)}, ${esc(AGENCY_ORG.name)} · Generated ${esc(fmtDate(repSendDate(month, cfg.day)))}</div>
    </div>` });
  const blocks = repLiveBlocks(wsId, cfg);
  let slots = [];
  const flush = () => { if (slots.length) pages.push({ html: slots.join('') }); slots = []; };
  blocks.forEach(b => {
    if (b.kind === 'chart') {
      slots.push(`<section class="rep-slot"><h2 class="rep-h2">${esc(repBlockTitle(b))}</h2><div class="rep-sub">${esc(repChartSub(b, month))}</div><div class="rep-chart">${repChartBody(wsId, b, month)}</div></section>`);
      if (slots.length === 2) flush();
    } else { flush(); repTablePages(wsId, b, month).forEach(html => pages.push({ html })); }
  });
  flush();
  const defs = repDefinitions(wsId, cfg);
  const notes = `<ul class="rep-notes">
      <li>Every ad with at least one impression in ${esc(repMonthLabel(month))} is listed, including ads that are paused now.</li>
      <li>Figures are as reported by Google Ads and Meta when this report was generated. The platforms can still update them afterwards, mostly conversions.</li>
      ${wsPlatforms(wsId).includes('meta') ? `<li>Meta Ads results use each campaign's attribution setting (${esc(DASH_M_ATTRIBUTION)} unless set otherwise).</li>` : ''}
      ${wsPlatforms(wsId).includes('google') ? '<li>Google Ads conversions follow the conversion actions and attribution set in the Google Ads account.</li>' : ''}
    </ul>`;
  for (let i = 0; i < Math.max(1, defs.length); i += 16) {
    pages.push({ html: `<h2 class="rep-h2">About this report${i ? ' <span class="rep-cont">(continued)</span>' : ''}</h2>${i ? '' : notes}
      ${defs.length ? `<div class="rep-defs">${defs.slice(i, i + 16).map(d => `<div class="rep-def"><b>${esc(REP_PLATFORM[d.p])} · ${esc(d.label)}</b><span>${esc(d.tip)}</span></div>`).join('')}</div>` : ''}` });
  }
  const n = pages.length;
  return pages.map((pg, i) => pg.cover ? `<div class="rep-page rep-page-cover">${pg.html}</div>` : `<div class="rep-page">
      <div class="rep-page-head"><span>${esc(ws.name)} · Monthly Ads Report</span><span>${esc(repMonthLabel(month))}</span></div>
      <div class="rep-page-body">${pg.html}</div>
      <div class="rep-page-foot"><span>galaxis</span><span>Page ${i + 1} of ${n}</span></div>
    </div>`);
}

// =====================================================================
// Agency: every client's report at a glance
// =====================================================================
state.ui.repSearch = '';
function repAgencyRows() {
  const s = state.ui.repSearch.trim().toLowerCase();
  return dashAgencyWorkspaces().filter(w => !s || w.name.toLowerCase().includes(s)).map(w => {
    const cfg = repConfig(w.id), last = repHistory(w.id)[0], status = repStatus(w.id);
    const next = cfg && status !== 'paused' ? repNextMonth(cfg) : null;
    return { w, cfg, last, status, next, sendAt: next ? repSendDate(next, cfg.day) : null };
  });
}
function repAgencyBody() {
  const rows = applySort(repAgencyRows(), 'rep-agency', { name: r => r.w.name, status: r => ['failed', 'none', 'paused', 'scheduled'].indexOf(r.status), next: r => r.sendAt ? r.sendAt.getTime() : Infinity, to: r => r.cfg ? r.cfg.to.length : -1 }, { col: 'status', dir: 'asc' });
  const page = paginate(rows, 'rep-agency');
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>${sortHeader('rep-agency', 'name', 'Client Workspace', 'repRefreshAgency')}</th><th>Ad Platforms</th><th>${sortHeader('rep-agency', 'status', 'Report', 'repRefreshAgency')}</th><th>${sortHeader('rep-agency', 'next', 'Next Report', 'repRefreshAgency')}</th><th>Last Report</th><th class="num">${sortHeader('rep-agency', 'to', 'Recipients', 'repRefreshAgency')}</th></tr></thead>
    <tbody>${page.length ? page.map(r => `<tr class="clickable" onclick="openWorkspace('${q(r.w.id)}', 'reports')">
      <td><div class="rep-wrap-text t-bold">${esc(r.w.name)}</div></td>
      <td>${wsPlatforms(r.w.id).length ? `<span class="row" style="gap:6px">${wsPlatforms(r.w.id).map(p => platformLogo(p)).join('')}</span>` : '<span class="t-muted">No ad accounts linked</span>'}</td>
      <td>${repStatusDot(r.status)}</td>
      <td>${r.next ? `${esc(repMonthLabel(r.next))}<div class="cell-sub">Sends ${esc(fmtDateTime(r.sendAt))}</div>` : '<span class="t-muted">—</span>'}</td>
      <td>${r.last ? `${esc(repMonthLabel(r.last.month))}<div class="cell-sub">${r.last.status === 'failed' ? 'Failed' : `Sent ${esc(fmtDate(r.last.sentAt))}`}</div>` : '<span class="t-muted">—</span>'}</td>
      <td class="num">${r.cfg ? r.cfg.to.length : '<span class="t-muted">—</span>'}</td>
    </tr>`).join('') : '<tr><td colspan="6" class="table-empty">No client workspaces match your search.</td></tr>'}</tbody>
  </table></div>${paginationBar('rep-agency', rows.length, 'repRefreshAgency')}`;
}
function repRefreshAgency() { renderRegion('rep-agency-body', repAgencyBody()); }
function repAgencySearch(v) { state.ui.repSearch = v; pager('rep-agency').page = 1; repRefreshAgency(); }
function repRenderAgency() {
  const all = dashAgencyWorkspaces().map(w => repStatus(w.id));
  const count = s => all.filter(x => x === s).length;
  return `<div class="grid-4 rep-agency-kpis">
      ${[['scheduled', 'Scheduled'], ['failed', 'Last report failed'], ['paused', 'Paused'], ['none', 'Not set up']].map(([s, l]) => `<div class="kpi-card"><div class="kpi-title">${repStatusDot(s).replace(esc(REP_STATUS[s][0]), esc(l))}</div><div class="kpi-value">${count(s)}</div><div class="kpi-sub">Client workspaces</div></div>`).join('')}
    </div>
    <section class="card"><div class="card-header"><div><h2 class="h-card">Client Reports</h2><div class="card-sub">Each client’s monthly PDF report. Select a client to change its content, schedule or recipients.</div></div></div>
      <div class="table-toolbar"><div class="search"><input class="input" placeholder="Search client workspaces" value="${esc(state.ui.repSearch)}" oninput="repAgencySearch(this.value)" aria-label="Search client workspaces"><i data-lucide="search"></i></div></div>
      <div id="rep-agency-body">${repAgencyBody()}</div></section>`;
}

// =====================================================================
// Client workspace: Content · Schedule & Recipients · Sent Reports
// =====================================================================
const REP_TABS = [{ id: 'content', label: 'Report Content', icon: 'layout-template' }, { id: 'delivery', label: 'Schedule & Recipients', icon: 'send' }, { id: 'history', label: 'Sent Reports', icon: 'history' }];
function repTab() { return REP_TABS.some(t => t.id === state.params.tab) ? state.params.tab : 'content'; }
function repGo(tab) { navigate('reports', { tab }); }
function repRenderClient() {
  const ws = currentWs();
  if (!wsPlatforms(ws.id).length) return `<section class="card">${emptyState('file-chart-column', 'No ad accounts linked', 'Monthly reports use Google Ads and Meta Ads data. Link an ad account to this workspace in Ad Accounts first.')}</section>`;
  const cfg = repConfig(ws.id);
  if (!cfg) return `<section class="card rep-setup">${emptyState('file-chart-column', 'No monthly report yet', `Set up a monthly PDF report for ${ws.name}. We’ll suggest tables and charts from the campaigns that ran last month; you can change everything afterwards.`)}
    <div class="row" style="justify-content:center"><button type="button" class="btn btn-primary" onclick="repSetUp()"><i data-lucide="plus"></i>Set up monthly report</button></div></section>`;
  const tab = repTab();
  const body = tab === 'delivery' ? repDeliveryHTML(ws, cfg) : tab === 'history' ? repHistoryHTML(ws, cfg) : repContentHTML(ws, cfg);
  return `${repSummaryCard(ws, cfg)}
    <div class="page-tabs" role="tablist">${REP_TABS.map(t => `<button type="button" role="tab" aria-selected="${t.id === tab}" class="page-tab ${t.id === tab ? 'active' : ''}" onclick="repGo('${t.id}')"><i data-lucide="${t.icon}"></i>${esc(t.label)}</button>`).join('')}</div>
    <div class="stack">${body}</div>
    ${state.params.preview ? repViewerHTML(ws, cfg) : ''}`;
}
function repSummaryCard(ws, cfg) {
  const status = repStatus(ws.id), next = repNextMonth(cfg), last = repHistory(ws.id)[0];
  const line = status === 'paused'
    ? (cfg.auto ? 'Add at least one recipient to start sending.' : 'Automatic sending is off. No report will be sent until you turn it on.')
    : `The ${repMonthLabel(next)} report will be sent on ${fmtDateTime(repSendDate(next, cfg.day))} to ${cfg.to.length} ${cfg.to.length === 1 ? 'recipient' : 'recipients'}.`;
  const failed = status === 'failed' ? `<div class="banner banner-error rep-banner"><i data-lucide="circle-alert"></i><div class="grow"><div class="banner-title">The ${esc(repMonthLabel(last.month))} report was not sent</div><div class="banner-text">${esc(last.reason)}</div></div><button type="button" class="banner-action" onclick="repResend('${q(last.id)}')">Try again now</button></div>` : '';
  return `${failed}<section class="card rep-summary">
    <div class="grow"><div class="row wrap" style="gap:12px"><h2 class="h-card">Monthly Ads Report</h2>${repStatusDot(status)}</div><div class="rep-summary-line">${esc(line)}</div></div>
    <div class="row wrap rep-summary-actions">
      <button type="button" class="btn btn-outline" onclick="repSendTest()"><i data-lucide="send"></i>Send test to me</button>
      <button type="button" class="btn btn-primary" onclick="repOpenPreview('${repLastMonth()}')"><i data-lucide="eye"></i>Preview PDF</button>
    </div></section>`;
}

// ---------- Content ----------
function repBlockMeta(ws, b) {
  if (!(b.platform === 'both' ? wsPlatforms(ws.id).length > 1 : wsPlatforms(ws.id).includes(b.platform))) return `<span class="rep-warn"><i data-lucide="triangle-alert"></i>${b.platform === 'both' ? 'Needs both Google Ads and Meta Ads linked' : `${REP_PLATFORM[b.platform]} isn’t linked to this workspace`}. Left out of the PDF.</span>`;
  if (b.kind === 'chart') return esc(`${repChartDef(b.chart).desc}${b.metric ? ` Metric: ${repColLabel(b.platform, b.metric)}.` : ''}`);
  const n = repRows(ws.id, b, repLastMonth()).length, cat = repCategory(b.platform, b.category);
  const noun = (cat.rows || 'ad') === 'adgroup' ? 'asset group' : 'ad';
  return `${esc(b.columns.map(k => repColLabel(b.platform, k)).join(', '))}<span class="rep-meta-sep"> · </span>${esc(`Last month: ${n} ${noun}${n === 1 ? '' : 's'}`)}`;
}
function repContentHTML(ws, cfg) {
  const fixed = (title, text) => `<li class="rep-block rep-block-fixed"><span class="rep-block-icon"><i data-lucide="lock"></i></span><div class="grow"><div class="rep-block-title">${esc(title)}</div><div class="rep-block-meta">${esc(text)}</div></div></li>`;
  const n = cfg.blocks.length;
  return `<section class="card"><div class="card-header"><div><h2 class="h-card">Report Content</h2><div class="card-sub">The PDF follows this order. Charts sit two to a page; each table starts on a new page and lists every ad that ran in the month.</div></div>
      <div class="row wrap"><button type="button" class="btn btn-outline" onclick="repEditChart()"><i data-lucide="plus"></i>Add chart</button><button type="button" class="btn btn-primary" onclick="repEditTable()"><i data-lucide="plus"></i>Add table</button></div></div>
    <ol class="rep-blocks">
      ${fixed('Cover page', `${ws.name}, the report month and “Prepared by” ${memberById(cfg.owner)?.name || ''}.`)}
      ${cfg.blocks.map((b, i) => `<li class="rep-block">
        <span class="rep-block-icon ${b.kind}"><i data-lucide="${b.kind === 'table' ? 'table-2' : 'chart-spline'}"></i></span>
        <div class="grow"><div class="rep-block-title">${b.platform !== 'both' ? platformLogo(b.platform) : ''}<span>${esc(repBlockTitle(b))}</span><span class="chip">${b.kind === 'table' ? 'Table' : 'Chart'}</span></div><div class="rep-block-meta">${repBlockMeta(ws, b)}</div></div>
        <div class="rep-block-actions">
          <button type="button" class="kebab" aria-label="Move up" title="Move up" ${i === 0 ? 'disabled' : ''} onclick="repMove('${b.id}', -1)"><i data-lucide="arrow-up"></i></button>
          <button type="button" class="kebab" aria-label="Move down" title="Move down" ${i === n - 1 ? 'disabled' : ''} onclick="repMove('${b.id}', 1)"><i data-lucide="arrow-down"></i></button>
          ${rowMenu(`rep-menu-${b.id}`, [{ label: 'Edit', icon: 'pencil', onClick: b.kind === 'table' ? `repEditTable('${b.id}')` : `repEditChart('${b.id}')` }, 'sep', { label: 'Remove', icon: 'trash-2', danger: true, onClick: `repRemove('${b.id}')` }])}
        </div></li>`).join('')}
      ${n ? '' : `<li class="rep-block rep-block-empty">No tables or charts yet. Add at least one, or the report will only have a cover page.</li>`}
      ${fixed('About this report', 'Notes on the data and a definition of every column and metric used.')}
    </ol></section>`;
}
function repMove(id, step) {
  const bl = repConfig(state.ctx).blocks, i = bl.findIndex(b => b.id === id), j = i + step;
  if (i < 0 || j < 0 || j >= bl.length) return;
  [bl[i], bl[j]] = [bl[j], bl[i]];
  rerender();
}
function repRemove(id) {
  const cfg = repConfig(state.ctx), b = cfg.blocks.find(x => x.id === id);
  confirmDialog({ title: `Remove ${b.kind}?`, text: `“${repBlockTitle(b)}” will no longer be in ${wsById(state.ctx).name}’s monthly report.`, confirmLabel: 'Remove', danger: true, icon: 'trash-2',
    onConfirm: () => { cfg.blocks = cfg.blocks.filter(x => x.id !== id); rerender(); showToast(`${b.kind === 'table' ? 'Table' : 'Chart'} removed`, 'trash-2'); } });
}

// ---------- Table and chart editors (modal; the draft lives in state.ui.repDraft) ----------
function repEditTable(id) {
  const cfg = repConfig(state.ctx), b = id && cfg.blocks.find(x => x.id === id);
  const p = b ? b.platform : wsPlatforms(state.ctx)[0];
  // A new table starts on the first category that ran last month.
  const first = REP_CATEGORIES[p].find(c => repRows(state.ctx, { platform: p, category: c.id }, repLastMonth()).length) || REP_CATEGORIES[p][0];
  state.ui.repDraft = b ? JSON.parse(JSON.stringify(b)) : repNewTable(p, first.id);
  state.ui.repErr = '';
  openModal({ title: b ? 'Edit table' : 'Add table', desc: 'A table lists every ad in one campaign type or objective that ran during the month, one platform per table.', size: 'lg',
    body: `<div id="rep-form">${repTableForm()}</div>`,
    actions: [{ label: 'Cancel', kind: 'outline' }, { label: b ? 'Save table' : 'Add table', onClick: () => repSaveDraft(!!b) }] });
}
function repTableForm() {
  const d = state.ui.repDraft, ws = state.ctx, cat = repCategory(d.platform, d.category), rows = cat.rows || 'ad';
  const month = repLastMonth();
  const groups = [...new Set(repColumns(d.platform, rows).map(c => c.group))];
  const full = d.columns.length >= REP_MAX_COLS;
  return `<div class="stack-sm rep-form">
    <div class="field"><span class="field-label">Platform</span><div class="seg">${['google', 'meta'].map(p => `<button type="button" class="${d.platform === p ? 'active' : ''}" ${wsPlatforms(ws).includes(p) ? '' : 'disabled title="Not linked to this workspace"'} onclick="repDraftPlatform('${p}')">${REP_PLATFORM[p]}</button>`).join('')}</div></div>
    <div class="field"><label class="field-label" for="rep-cat">${d.platform === 'meta' ? 'Campaign objective' : 'Campaign type'}</label>
      <select class="select" id="rep-cat" onchange="repDraftCategory(this.value)">${REP_CATEGORIES[d.platform].map(c => {
        const n = repRows(ws, { ...d, category: c.id }, month).length;
        return `<option value="${c.id}" ${c.id === d.category ? 'selected' : ''}>${esc(c.label)} (${n} ${(c.rows || 'ad') === 'adgroup' ? 'asset group' : 'ad'}${n === 1 ? '' : 's'} last month)</option>`;
      }).join('')}</select><div class="field-hint">${esc(cat.hint)}</div></div>
    <div class="field"><label class="field-label" for="rep-title">Table title</label><input class="input" id="rep-title" value="${esc(d.title)}" placeholder="${esc(repBlockTitle({ ...d, title: '' }))}" oninput="state.ui.repDraft.title = this.value"><div class="field-hint">Leave empty to use “${esc(repBlockTitle({ ...d, title: '' }))}”.</div></div>
    <div class="field"><div class="row-between"><span class="field-label">Columns</span><span class="field-hint">${d.columns.length} of ${REP_MAX_COLS} selected${full ? '. Remove one to add another' : ''}</span></div>
      <div class="rep-cols">${groups.map(g => `<div class="rep-col-group"><div class="rep-col-group-title">${esc(repGroupLabel(d.platform, g))}</div>
        ${repColumns(d.platform, rows).filter(c => c.group === g).map(c => { const on = d.columns.includes(c.key); return `<label class="check ${!on && full ? 'is-disabled' : ''}"><input type="checkbox" ${on ? 'checked' : ''} ${!on && full ? 'disabled' : ''} onchange="repDraftCol('${c.key}', this.checked)"><span>${esc(c.label)}</span></label>`; }).join('')}</div>`).join('')}</div>
      <div class="field-hint">The ad name, a thumbnail, the campaign and the ${d.platform === 'meta' ? 'ad set' : 'ad group'} are always shown. Each table fits up to ${REP_MAX_COLS} metric columns on an A4 landscape page.</div></div>
    <div class="field"><label class="field-label" for="rep-sort">Sort ads by (highest first)</label><select class="select" id="rep-sort" onchange="state.ui.repDraft.sort = this.value">${d.columns.map(k => `<option value="${k}" ${k === d.sort ? 'selected' : ''}>${esc(repColLabel(d.platform, k))}</option>`).join('')}</select></div>
    ${state.ui.repErr ? `<div class="field-error">${esc(state.ui.repErr)}</div>` : ''}
  </div>`;
}
function repRefreshForm() { const t = document.getElementById('rep-title'); if (t) state.ui.repDraft.title = t.value; renderRegion('rep-form', state.ui.repDraft.kind === 'table' ? repTableForm() : repChartForm()); }
function repDraftPlatform(p) {
  const d = state.ui.repDraft;
  if (d.kind === 'table') Object.assign(d, { platform: p, category: REP_CATEGORIES[p][0].id, columns: [...REP_DEFAULT_COLS[p][REP_CATEGORIES[p][0].id]], sort: 'spend' });
  else d.platform = p;
  repRefreshForm();
}
function repDraftCategory(id) {
  const d = state.ui.repDraft;
  // Keep a hand-picked set of columns; swap the suggested set for the new category's.
  const untouched = JSON.stringify(d.columns) === JSON.stringify(REP_DEFAULT_COLS[d.platform][d.category]);
  d.category = id;
  const allowed = repColumns(d.platform, repCategory(d.platform, id).rows || 'ad').map(c => c.key);
  d.columns = untouched ? [...REP_DEFAULT_COLS[d.platform][id]] : d.columns.filter(k => allowed.includes(k));
  if (!d.columns.includes(d.sort)) d.sort = d.columns[0] || 'spend';
  repRefreshForm();
}
function repDraftCol(key, on) {
  const d = state.ui.repDraft;
  if (on && !d.columns.includes(key) && d.columns.length < REP_MAX_COLS) {
    // Keep the platform's column order.
    const order = DASH_PF_COLS[d.platform].map(c => c.key);
    d.columns = [...d.columns, key].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
  if (!on) d.columns = d.columns.filter(k => k !== key);
  if (!d.columns.includes(d.sort)) d.sort = d.columns[0] || 'spend';
  state.ui.repErr = '';
  repRefreshForm();
}
function repEditChart(id) {
  const cfg = repConfig(state.ctx), b = id && cfg.blocks.find(x => x.id === id);
  state.ui.repDraft = b ? { ...b } : { id: uid('rb'), kind: 'chart', chart: 'trend', platform: wsPlatforms(state.ctx)[0], metric: 'spend' };
  state.ui.repErr = '';
  openModal({ title: b ? 'Edit chart' : 'Add chart', desc: 'Charts are drawn from Google Ads and Meta Ads data for the report month, two to a page.', size: 'lg',
    body: `<div id="rep-form">${repChartForm()}</div>`,
    actions: [{ label: 'Cancel', kind: 'outline' }, { label: b ? 'Save chart' : 'Add chart', onClick: () => repSaveDraft(!!b) }] });
}
function repChartForm() {
  const d = state.ui.repDraft, plats = wsPlatforms(state.ctx), def = repChartDef(d.chart);
  const charts = REP_CHARTS.filter(c => !c.both || plats.length > 1);
  return `<div class="stack-sm rep-form">
    <div class="field"><span class="field-label">Chart</span><div class="rep-chart-pick" role="radiogroup">${charts.map(c => `<label class="rep-chart-opt ${d.chart === c.id ? 'on' : ''}"><input type="radio" name="rep-chart" ${d.chart === c.id ? 'checked' : ''} onchange="repDraftChart('${c.id}')"><span class="rep-chart-opt-title">${esc(d.platform === 'meta' && c.metaLabel ? c.metaLabel : c.label)}</span><span class="rep-chart-opt-desc">${esc(c.desc)}</span></label>`).join('')}</div></div>
    ${def.both ? '' : `<div class="field"><span class="field-label">Platform</span><div class="seg">${['google', 'meta'].map(p => `<button type="button" class="${d.platform === p ? 'active' : ''}" ${plats.includes(p) ? '' : 'disabled title="Not linked to this workspace"'} onclick="repDraftPlatform('${p}')">${REP_PLATFORM[p]}</button>`).join('')}</div></div>`}
    ${def.metric ? `<div class="field"><label class="field-label" for="rep-metric">Metric</label><select class="select" id="rep-metric" onchange="state.ui.repDraft.metric = this.value">${REP_CHART_METRICS.map(k => `<option value="${k}" ${k === d.metric ? 'selected' : ''}>${esc(repColLabel(d.platform === 'both' ? 'google' : d.platform, k))}</option>`).join('')}</select></div>` : ''}
  </div>`;
}
function repDraftChart(id) {
  const d = state.ui.repDraft, def = repChartDef(id);
  d.chart = id;
  if (def.both) d.platform = 'both';
  else if (d.platform === 'both') d.platform = wsPlatforms(state.ctx)[0];
  d.metric = def.metric ? d.metric || 'spend' : undefined;
  repRefreshForm();
}
function repSaveDraft(editing) {
  const cfg = repConfig(state.ctx), d = state.ui.repDraft;
  if (d.kind === 'table') {
    d.title = (document.getElementById('rep-title')?.value || '').trim();
    if (!d.columns.length) { state.ui.repErr = 'Choose at least one column.'; repRefreshForm(); return false; }
  }
  if (editing) cfg.blocks = cfg.blocks.map(b => b.id === d.id ? d : b);
  else cfg.blocks.push(d);
  state.ui.repDraft = null;
  rerender();
  showToast(`${d.kind === 'table' ? 'Table' : 'Chart'} ${editing ? 'saved' : 'added'}: ${repBlockTitle(d)}`);
}
function repSetUp() {
  state.flags.repEmpty = false;
  repConfigs[state.ctx] = repNewConfig(state.ctx);
  repHistories[state.ctx] = [];
  navigate('reports', { tab: 'content' });
  showToast('Monthly report set up with suggested tables and charts');
}

// ---------- Schedule & Recipients (changes save as you make them) ----------
function repSet(field, value) {
  const cfg = repConfig(state.ctx);
  cfg[field] = value;
  rerender();
}
function repDeliveryHTML(ws, cfg) {
  const next = repNextMonth(cfg);
  const agency = members.filter(m => m.org === 'agency' && m.status === 'active' && (m.workspaces.includes('*') || m.workspaces.includes(ws.id)));
  const clientMembers = members.filter(m => m.org === ws.id && m.status === 'active' && !cfg.to.some(r => r.email.toLowerCase() === m.email.toLowerCase()));
  const err = state.ui.repToErr || '';
  return `<section class="card"><div class="card-header"><div><h2 class="h-card">Schedule</h2><div class="card-sub">Changes save automatically.</div></div></div>
      <div class="stack-sm">
        <label class="row rep-switch"><span class="toggle"><input type="checkbox" ${cfg.auto ? 'checked' : ''} onchange="repSet('auto', this.checked)"><span></span></span><span><b>Send automatically every month</b><span class="field-hint rep-block-line">Each report covers the previous calendar month (1st to last day).</span></span></label>
        <div class="grid-2 rep-grid">
          <div class="field"><label class="field-label" for="rep-day">Send on</label><select class="select" id="rep-day" ${cfg.auto ? '' : 'disabled'} onchange="repSet('day', Number(this.value))">${Array.from({ length: 28 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === cfg.day ? 'selected' : ''}>The ${repOrdinal(n)} of each month</option>`).join('')}</select>
            <div class="field-hint">${cfg.day < 3 ? 'Conversions keep arriving for a few days after a month ends, so the numbers will be less complete. The 3rd or later is better.' : 'Up to the 28th, so every month has the date.'}</div></div>
          <div class="field"><span class="field-label">Time</span><div class="input rep-static">9:00 am, Singapore time</div><div class="field-hint">The PDF is generated just before it is sent, and the numbers in it are kept as they were then.</div></div>
        </div>
        <div class="rep-next ${cfg.auto ? '' : 'is-off'}"><i data-lucide="calendar-clock"></i><span>${cfg.auto ? esc(`Next: the ${repMonthLabel(next)} report, on ${fmtDateTime(repSendDate(next, cfg.day))}.`) : 'Automatic sending is off.'}</span></div>
      </div></section>
    <section class="card"><div class="card-header"><div><h2 class="h-card">Recipients</h2><div class="card-sub">The client contacts who receive the PDF, and the agency members copied in. Up to 20 recipients.</div></div></div>
      <div class="form-section-title rep-first">To</div>
      ${cfg.to.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th>Email</th><th></th></tr></thead><tbody>${cfg.to.map(r => `<tr><td><div class="rep-wrap-text">${esc(r.name || '—')}</div></td><td><div class="rep-wrap-text">${esc(r.email)}</div></td><td class="num"><button type="button" class="kebab" aria-label="Remove ${esc(r.email)}" title="Remove" onclick="repRemoveTo('${r.id}')"><i data-lucide="trash-2"></i></button></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="banner banner-warning"><i data-lucide="triangle-alert"></i><div><div class="banner-title">No recipients</div><div class="banner-text">Add at least one, or the report won’t be sent.</div></div></div>`}
      <div class="rep-add">
        <div class="field"><label class="field-label" for="rep-to-name">Name</label><input class="input" id="rep-to-name" placeholder="Optional"></div>
        <div class="field"><label class="field-label" for="rep-to-email">Email<span class="req">*</span></label><input class="input ${err ? 'invalid' : ''}" id="rep-to-email" type="email" placeholder="name@company.com" onkeydown="if (event.key === 'Enter') repAddTo()"></div>
        <button type="button" class="btn btn-outline" onclick="repAddTo()" ${cfg.to.length >= 20 ? 'disabled' : ''}><i data-lucide="plus"></i>Add</button>
      </div>
      ${err ? `<div class="field-error">${esc(err)}</div>` : ''}
      ${clientMembers.length ? `<div class="field rep-from-members"><label class="field-label" for="rep-member">Or add a member of this workspace</label><select class="select" id="rep-member" onchange="repAddMember(this.value)"><option value="">Choose a member</option>${clientMembers.map(m => `<option value="${m.id}">${esc(m.name)} (${esc(m.email)})</option>`).join('')}</select></div>` : ''}
      <div class="form-section-title">CC (agency)</div>
      <div class="row wrap">${cfg.cc.map(id => memberById(id)).filter(Boolean).map(m => `<span class="chip chip-outline rep-wrap-text">${esc(m.name)}<button type="button" class="chip-remove" aria-label="Remove ${esc(m.name)}" onclick="repSet('cc', repConfig(state.ctx).cc.filter(x => x !== '${m.id}'))"><i data-lucide="x"></i></button></span>`).join('') || '<span class="t-muted">No one is copied in.</span>'}
        ${agency.filter(m => !cfg.cc.includes(m.id)).length ? `<select class="select rep-cc-add" aria-label="Copy in an agency member" onchange="if (this.value) repSet('cc', [...repConfig(state.ctx).cc, this.value])"><option value="">Add agency member</option>${agency.filter(m => !cfg.cc.includes(m.id)).map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select>` : ''}</div>
    </section>
    <section class="card"><div class="card-header"><div><h2 class="h-card">Email</h2><div class="card-sub">Sent from Galaxis Reports. Replies go to the account manager.</div></div></div>
      <div class="stack-sm">
        <div class="field"><label class="field-label" for="rep-owner">Account manager</label><select class="select" id="rep-owner" onchange="repSet('owner', this.value)">${agency.map(m => `<option value="${m.id}" ${m.id === cfg.owner ? 'selected' : ''}>${esc(m.name)} (${esc(m.email)})</option>`).join('')}</select><div class="field-hint">Shown on the cover as “Prepared by”, and used as the reply-to address.</div></div>
        <div class="field"><label class="field-label" for="rep-subject">Subject</label><input class="input" id="rep-subject" value="${esc(cfg.subject)}" onchange="repSet('subject', this.value.trim() || REP_SUBJECT)"><div class="field-hint">Preview: ${esc(repFill(cfg.subject, ws.id, next))}</div></div>
        <div class="field"><label class="field-label" for="rep-message">Message</label><textarea class="textarea" id="rep-message" rows="7" onchange="repSet('message', this.value)">${esc(cfg.message)}</textarea><div class="field-hint">{client}, {month} and {am} are replaced with the client’s name, the report month and the account manager’s name.</div></div>
        <div class="rep-attach"><i data-lucide="download"></i><span>Attachment: ${esc(repFileName(ws.id, next))}</span></div>
      </div></section>`;
}
function repAddTo() {
  const cfg = repConfig(state.ctx);
  const name = document.getElementById('rep-to-name').value.trim(), email = document.getElementById('rep-to-email').value.trim();
  state.ui.repToErr = !isEmail(email) ? 'Enter a valid email address.' : cfg.to.some(r => r.email.toLowerCase() === email.toLowerCase()) ? 'This email is already a recipient.' : '';
  if (!state.ui.repToErr) { cfg.to.push({ id: uid('rr'), name, email }); showToast(`${email} added`, 'mail'); }
  rerender();
  if (state.ui.repToErr) { const el = document.getElementById('rep-to-email'); el.value = email; document.getElementById('rep-to-name').value = name; el.focus(); }
}
function repAddMember(id) {
  const m = memberById(id);
  if (!m) return;
  repConfig(state.ctx).to.push({ id: uid('rr'), name: m.name, email: m.email });
  state.ui.repToErr = '';
  rerender();
  showToast(`${m.email} added`, 'mail');
}
function repRemoveTo(id) {
  const cfg = repConfig(state.ctx);
  cfg.to = cfg.to.filter(r => r.id !== id);
  rerender();
}

// ---------- Sent Reports ----------
function repHistoryHTML(ws, cfg) {
  const list = repHistory(ws.id), next = repNextMonth(cfg), status = repStatus(ws.id);
  const pill = h => h.status === 'failed' ? '<span class="pill pill-red pill-sm">Failed</span>' : '<span class="pill pill-green pill-sm">Sent</span>';
  return `<section class="card"><div class="card-header"><div><h2 class="h-card">Sent Reports</h2><div class="card-sub">Every monthly report, with the PDF exactly as it was sent. A failed report is tried again daily for 3 days before it shows here as Failed.</div></div></div>
    <div class="table-wrap"><table class="table">
      <thead><tr><th>Report Month</th><th>Status</th><th>Sent</th><th>Recipients</th><th></th></tr></thead>
      <tbody>
        <tr class="rep-upcoming"><td>${esc(repMonthLabel(next))}</td><td>${status === 'paused' ? '<span class="pill pill-grey pill-sm">Paused</span>' : '<span class="pill pill-blue pill-sm">Scheduled</span>'}</td><td>${status === 'paused' ? '<span class="t-muted">Not scheduled</span>' : esc(fmtDateTime(repSendDate(next, cfg.day)))}</td><td>${cfg.to.length}</td><td></td></tr>
        ${list.map(h => `<tr><td>${esc(repMonthLabel(h.month))}</td><td>${pill(h)}${h.reason ? `<div class="cell-sub rep-wrap-text rep-reason">${esc(h.reason)}</div>` : ''}</td><td>${h.sentAt ? esc(fmtDateTime(h.sentAt)) : '<span class="t-muted">Not sent</span>'}</td>
          <td><span title="${esc(h.to.join(', '))}">${h.to.length}</span></td>
          <td>${rowMenu(`rep-h-${h.id}`, [{ label: 'View PDF', icon: 'eye', onClick: `repOpenPreview('${h.month}')` }, { label: h.status === 'failed' ? 'Try again now' : 'Resend', icon: 'send', onClick: `repResend('${h.id}')` }])}</td></tr>`).join('')}
        ${list.length ? '' : '<tr><td colspan="5" class="table-empty">No reports have been sent yet.</td></tr>'}
      </tbody></table></div></section>`;
}
function repResend(id) {
  const ws = wsById(state.ctx), cfg = repConfig(state.ctx), list = repHistories[state.ctx], h = list.find(x => x.id === id) || repHistory(state.ctx).find(x => x.id === id);
  confirmDialog({ title: `${h.status === 'failed' ? 'Send' : 'Resend'} the ${repMonthLabel(h.month)} report?`, text: `It goes to ${cfg.to.length} ${cfg.to.length === 1 ? 'recipient' : 'recipients'} of ${ws.name}’s report now, with the agency members copied in.`, confirmLabel: 'Send now', icon: 'send',
    onConfirm: () => {
      const entry = { id: uid('rh'), month: h.month, sentAt: repToday().toISOString(), to: cfg.to.map(r => r.email), status: 'sent' };
      const i = list.findIndex(x => x.id === id);
      if (h.status === 'failed' && i >= 0) list[i] = entry; else list.unshift(entry);
      state.flags.repFailed = false;
      rerender();
      showToast(`${repMonthLabel(h.month)} report sent to ${cfg.to.length} ${cfg.to.length === 1 ? 'recipient' : 'recipients'}`, 'send');
    } });
}
function repSendTest() {
  const me = memberById(CURRENT_USER_ID);
  showToast(`Test report for ${repMonthLabel(repLastMonth())} sent to ${me.email}`, 'send');
}

// ---------- PDF preview (route param preview=YYYY-MM, so a preview can be linked) and download ----------
function repOpenPreview(month) { state.params = { ...state.params, tab: repTab(), preview: month }; rerender(); }
function repClosePreview() { const { preview, ...rest } = state.params; state.params = rest; rerender(); }
function repPreviewMonths(wsId) {
  const months = new Set(repHistory(wsId).map(h => h.month));
  months.add(repLastMonth());
  return [...months].sort().reverse();
}
function repViewerHTML(ws, cfg) {
  const month = state.params.preview;
  return `<div class="rep-viewer" role="dialog" aria-modal="true" aria-label="Report preview">
    <div class="rep-viewer-bar">
      <div class="grow"><div class="rep-viewer-title">${esc(repFileName(ws.id, month))}</div><div class="rep-viewer-sub">Preview with this month’s set-up. Sent reports keep the content they were sent with.</div></div>
      <select class="select rep-viewer-month" aria-label="Report month" onchange="state.params.preview = this.value; rerender()">${repPreviewMonths(ws.id).map(m => `<option value="${m}" ${m === month ? 'selected' : ''}>${esc(repMonthLabel(m))}</option>`).join('')}</select>
      <button type="button" class="btn btn-primary" onclick="repDownload()"><i data-lucide="download"></i>Download PDF</button>
      <button type="button" class="kebab rep-viewer-close" aria-label="Close preview" onclick="repClosePreview()"><i data-lucide="x"></i></button>
    </div>
    <div class="rep-viewer-scroll" id="rep-viewer-scroll"><div class="rep-pages" id="rep-pages">${repPages(ws.id, month).join('')}</div></div>
  </div>`;
}
// Pages are drawn at A4 size and zoomed to fit the viewer.
function repFitPages() {
  const s = document.getElementById('rep-viewer-scroll'), p = document.getElementById('rep-pages');
  if (s && p) p.style.zoom = Math.min(1, (s.clientWidth - 48) / 1123);
}
window.addEventListener('resize', repFitPages);
// "Download PDF" opens the browser's print dialog on the pages alone (Save as PDF), A4 landscape.
function repDownload() {
  const el = document.createElement('div');
  el.id = 'rep-print';
  el.innerHTML = repPages(state.ctx, state.params.preview).join('');
  document.body.appendChild(el);
  document.body.classList.add('rep-printing');
  const done = () => { el.remove(); document.body.classList.remove('rep-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  const title = document.title;
  document.title = repFileName(state.ctx, state.params.preview).replace(/\.pdf$/, '');
  window.print();
  document.title = title;
  setTimeout(done, 500);
}

// =====================================================================
// Screen, dev toolbar and specs
// =====================================================================
registerScreen('reports', {
  contexts: ['agency', 'client'],
  agencyOnly: true,   // client users never see this page (navigate() sends them to the dashboard)
  title: () => isAgency() ? 'Reports' : 'Monthly Report',
  desc: () => isAgency() ? 'Monthly PDF reports for your clients: what’s scheduled, what was sent and what needs attention.' : 'Choose what goes into this client’s monthly PDF report, when it’s sent and who receives it. Only your agency sees this page.',
  key: () => isAgency() ? 'agency-reports' : state.params.preview ? 'client-reports-preview' : `client-reports-${repTab()}`,
  render: () => isAgency() ? repRenderAgency() : repRenderClient(),
  afterRender: () => repFitPages()
});
registerDevScreen('Agency', 'agency-reports', 'Reports', () => { state.ctx = null; state.persona = 'agency'; navigate('reports'); });
REP_TABS.forEach(t => registerDevScreen('Client workspace', `client-reports-${t.id}`, `Reports › ${t.label}`, () => { state.ctx = devClientCtx(); state.persona = 'agency'; navigate('reports', { tab: t.id }); }));
registerDevScreen('Client workspace', 'client-reports-preview', 'Reports › PDF preview', () => { state.ctx = devClientCtx(); state.persona = 'agency'; state.flags.repEmpty = false; navigate('reports', { tab: 'content', preview: repLastMonth() }); });
const repDevToggles = () => [
  { label: 'Not set up', active: !!state.flags.repEmpty, run: () => { state.flags.repEmpty = !state.flags.repEmpty; if (state.params.preview) repClosePreview(); else rerender(); } },
  ...(state.flags.repEmpty ? [] : [{ label: 'Last report failed', active: !!state.flags.repFailed, run: () => { state.flags.repFailed = !state.flags.repFailed; rerender(); } }])
];
[...REP_TABS.map(t => `client-reports-${t.id}`), 'client-reports-preview'].forEach(k => registerDevToggles(k, repDevToggles));

(function repSpecs() {
  const common = `
### Scope and audience
- **Agency only.** Account managers (AMs) set up each client's report in Galaxis. Client users never see the Reports page; in Client user view the nav item is hidden and the route sends them to the Dashboard. Clients only receive the PDF by email.
- **Data:** Google Ads and Meta Ads only, so it works in Version 1. Nothing from a CRM or other integration.
- **Permissions (agency roles, Team & Access › Agency › Monthly Reports):** View Reports, Set Up Reports (content, schedule, recipients), Send Reports (test, resend). Account Manager has all three by default; Analyst can view.
- **Mock data:** the dashboard's platform data, scaled to the days in the report month. Demand Gen and App (Google) and Engagement and App promotion (Meta) campaigns were added to the mock data so every category can be shown.`;
  const sources = `
### What the APIs give us (checked 19/11/2026)
- **Categories** come from fields the APIs return, so no ad needs tagging by hand: Google \`campaign.advertising_channel_type\` (Search, Performance Max, Demand Gen, Video = YouTube, Display, Shopping, App) and Meta \`campaign.objective\` (Awareness, Traffic, Engagement, Leads, App promotion, Sales).
- **"Ran in the month"** = at least 1 impression between the 1st and the last day of the month. Neither API keeps a usable status history (Google's change history only goes back 30 days; Meta has none), so delivery decides, and ads paused since then are still listed.
- **Performance Max has no individual ads.** Its table lists asset groups (\`asset_group\` metrics). Asset-level metrics exist (\`asset_group_asset\`) and could be a later option.
- **Columns** are each platform's own metrics at that level, named as in Google Ads and Meta Ads Manager (the same list as the dashboard's Google Ads and Meta Ads reports, from the *Google & Meta Ads Metrics* sheet). Search impression share is not available per ad, so it is not offered. Meta's quality rankings need about 500 impressions per ad (not offered yet).
- **No merging:** one table per platform. Google "Clicks" and Meta "Link clicks", or Google "Conversions" and Meta "Results", count different things.
- **Reach** is requested for the whole month; it can't be added up across days or ads, so table totals for Reach and Frequency are approximations in the prototype and must come from a separate account-level query in the product.
- **Attribution:** Meta removed the 7-day-view and 28-day-view windows from the Insights API on 12/01/2026. The PDF states the attribution setting.
- **Thumbnails:** Meta's preview endpoint returns iframe code valid for 24 hours, which can't go in a PDF. The product uses the creative's image or video thumbnail (Google: image asset URL or YouTube thumbnail; Meta: creative thumbnail), downloaded and stored when the PDF is generated because Meta's image URLs expire. Search ads have no image: a text tile.
- **Charts** are drawn by Galaxis from the numbers: daily rows (\`segments.date\` / \`time_increment=1\`) and breakdowns (device, age, gender, region; Meta \`publisher_platform\` + \`platform_position\`; Google \`ad_network_type\`). Google's age and gender data varies by campaign type.
- **Rate limits:** reports are generated in a batch spread over the night before the send date.`;
  Object.assign(screenSpecs, {
    'agency-reports': { title: 'Reports — Client Reports Overview (Agency)', status: 'Draft', author: 'Hannah', updatedAt: '20/11/2026', notes: `
### Screen purpose
One list of every client workspace the AM can see, with the state of its monthly report, so nothing is missed: which clients have no report, which are paused and which failed last month.
${common}

### Key functional specifications
- **KPI cards:** count of workspaces per report status: Scheduled, Last report failed, Paused, Not set up.
- **Table:** Client Workspace, Ad Platforms (logos, or "No ad accounts linked"), Report status, Next Report (month and send date and time), Last Report (month, sent date or Failed), Recipients (count). Default sort: status (failed first). Search by name, 10 per page.
- **Statuses:** Scheduled (automatic sending on, at least 1 recipient) · Paused (sending off, or no recipients) · Last report failed (the latest report could not be generated or sent) · Not set up.
- Selecting a row opens that workspace's Reports page.
` },
    'client-reports-content': { title: 'Reports › Report Content (Client workspace, agency only)', status: 'Draft', author: 'Hannah', updatedAt: '20/11/2026', notes: `
### Screen purpose
The AM chooses what goes into the client's monthly PDF: tables of ads per campaign type or objective, and charts, in the order they appear.
${common}

### Key functional specifications
- **Summary card (all tabs):** status, one line on the next report ("The October 2026 report will be sent on 5 Dec 2026, 09:00 to 2 recipients"), **Send test to me**, **Preview PDF** (last month). A failed latest report shows a red banner with the reason and **Try again now**.
- **Not set up:** empty state with **Set up monthly report**, which creates a suggested set-up: a Monthly summary and a Daily trend per platform, Spend by platform (when both are linked), and one table for each category that ran last month, with suggested columns. Recipients start with the workspace Owner; the AM setting it up is the account manager and is copied in.
- **Content list:** fixed **Cover page** first and **About this report** last (locked). Between them, the AM's tables and charts with move up / down, Edit and Remove. Each row shows the platform, title, Table / Chart, and for tables the columns and how many ads ran last month. A block for a platform that is no longer linked is flagged and left out of the PDF.
- **Add / edit table (modal):** Platform (linked platforms only) → Campaign type (Google) or objective (Meta), each with last month's ad count → optional title (default "Google Ads · Search") → columns, grouped as in the platform, **up to ${REP_MAX_COLS}** (what fits an A4 landscape page next to the ad column) → sort (highest first). Changing the category swaps the suggested columns unless the AM has changed them. The ad name, thumbnail, campaign and ad group / ad set are always shown.
- **Add / edit chart (modal):** Monthly summary, Daily trend, By campaign type / objective, Top 10 ads, Device, Age and gender, Network / Placement, Location, Video drop-off, Spend by platform (both platforms only). Platform and, where it applies, metric (Cost / Amount spent, Impressions, Clicks / Link clicks, Conversions / Results).
${sources}

### Open questions
- Should a table be able to combine several categories (e.g. all Google campaigns)?
- Agency-wide templates, and copying a set-up from another client?
- Asset-level Performance Max table, and Meta quality rankings as columns?
` },
    'client-reports-delivery': { title: 'Reports › Schedule & Recipients (Client workspace, agency only)', status: 'Draft', author: 'Hannah', updatedAt: '20/11/2026', notes: `
### Screen purpose
When the report is sent automatically, who receives it and what the email says. Changes save as they are made.
${common}

### Key functional specifications
- **Schedule:** "Send automatically every month" on/off. Send on the 1st–28th (every month has the date); a warning below the 3rd because conversions keep arriving for a few days. Sent at 9:00 am Singapore time; each report covers the previous calendar month. The PDF is generated just before sending and its numbers are frozen.
- **Recipients — To:** client contacts (name optional, email required, valid and not duplicated), up to 20; or add a member of the workspace. Without recipients the report is not sent and the status is Paused.
- **Recipients — CC:** agency members assigned to the workspace.
- **Email:** account manager (cover "Prepared by" and reply-to), subject and message with {client}, {month} and {am} placeholders and a live subject preview; attachment name \`{Client}_Ads-Report_{YYYY-MM}.pdf\`. Sent from a Galaxis no-reply address.
- **Failures:** if Google or Meta data can't be fetched (e.g. an expired connection), the report is not sent with missing data. It is tried again daily for 3 days, then marked Failed and the AM is notified. A partial PDF is never sent.
- **PDPA:** recipient emails are personal data: only stored for sending, removed with the workspace; the prototype uses placeholder addresses only.
` },
    'client-reports-history': { title: 'Reports › Sent Reports (Client workspace, agency only)', status: 'Draft', author: 'Hannah', updatedAt: '20/11/2026', notes: `
### Screen purpose
Every report sent for this client, so the AM can see what the client received and resend it.
${common}

### Key functional specifications
- First row: the next report (Scheduled, or Paused).
- Each past report: month, status (Sent / Failed with the reason), sent date and time, recipient count (hover for the addresses). Actions: **View PDF** (the stored PDF; the prototype regenerates it), **Resend** or, for a failed report, **Try again now** (confirmation, then sends to the current recipients).
` },
    'client-reports-preview': { title: 'Reports › PDF Preview (Client workspace, agency only)', status: 'Draft', author: 'Hannah', updatedAt: '20/11/2026', notes: `
### Screen purpose
See the PDF exactly as the client will, for any month, and download it.
${common}

### PDF layout (A4 landscape)
1. **Cover:** Galaxis, "Monthly Ads Report", client name, month, linked platforms, "Prepared by {AM}, ${AGENCY_ORG.name} · Generated {date}".
2. The content in the AM's order: **charts two to a page**; **each table starts on a new page**, ${REP_ROWS_PER_PAGE} rows per page ("continued" on later pages), a Total row at the end, title "Google Ads · Search" and "12 ads ran in October 2026 · Sorted by Cost, highest first". An empty category says so instead of being dropped.
3. **About this report:** which ads are listed, that figures are as reported when generated, the attribution notes, and a definition of every column and metric used (from the metrics sheet).
- Header on every page after the cover: client · Monthly Ads Report, and the month; footer: Page n of N.
- **Download PDF** in the prototype opens the browser's print dialog (Save as PDF). The month can be changed in the viewer; the link includes it (\`preview=YYYY-MM\`).
` }
  });
})();
