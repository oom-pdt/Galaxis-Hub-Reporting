// Galaxis Hub Reporting — mock Google Ads and Meta Ads data for Monthly Reports: the campaign → ad group → ad tree of
// each workspace, the platform columns (names, formats and help text as each platform shows them), and the numbers.
// Deterministic from ws.seed. Taken from the Galaxis Hub demo's dashboard. Every global here is prefixed `ads` / `ADS_`.

// =====================================================================
// Mock performance data — generated per workspace, deterministic from ws.seed
// =====================================================================
const ADS_CAMPAIGNS = {
  google: ['Search Campaign', 'Display Remarketing', 'Performance Max', 'Brand Search', 'YouTube Awareness', 'Demand Gen Prospecting', 'App Installs'],
  meta: ['Paid Social Campaign', 'Lead Gen - Instant Forms', 'Retargeting - Site Visitors', 'Awareness Reach', 'Advantage+ Catalogue', 'Page Engagement Boost', 'App Install Campaign']
};
const ADS_ADGROUPS = {
  google: ['Search - Brand Exact', 'Search - Non Brand Broad', 'Display - Cart Abandoners', 'Retargeting - 30D Visitors', 'In-Market Audiences', 'Competitor Terms'],
  meta: ['Lookalike 1%', 'Interest - Decision Makers', 'Retargeting - 30D Engagers', 'Broad - Advantage+', 'Custom Audience - CRM List', 'Video Viewers 50%']
};
const ADS_FORMATS = { google: ['Text/Search', 'Image', 'Video'], meta: ['Image', 'Video', 'Carousel'] };
// Summable metrics, as the platforms report them.
const ADS_SUM_KEYS = ['spend', 'impressions', 'reach', 'clicks', 'conversions', 'pLeads', 'purchases', 'convValue', 'engagements'];
const adsCache = { tree: {}, metrics: {} };
function adsHash(s) {
  let h = 2166136261;
  for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function adsRng(key) { return seededRandom(adsHash(key) % 100000 + 1); }
function adsShuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// 'Limited' = active but delivery-limited. The consolidated table shows it as Active; the native views show
// Google "Limited" / Meta "Learning limited" from the entity's `limited` flag.
function adsPickStatus(rnd, limitedBias) {
  const r = rnd();
  if (r < 0.12) return 'Paused';
  if (r < 0.12 + (limitedBias ? 0.2 : 0.07)) return 'Limited';
  return 'Active';
}
const adsStatusFields = raw => ({ status: raw === 'Limited' ? 'Active' : raw, limited: raw === 'Limited' });
// Platform → campaign → ad group → ad hierarchy for one workspace, only for its linked platforms.
// `base` holds 30-day metrics; adsMetrics() scales them to the report month's days.
function adsTree(wsId) {
  const ws = wsById(wsId);
  const plats = wsPlatforms(wsId);
  const key = `${wsId}|${plats.join(',')}`;
  if (adsCache.tree[key]) return adsCache.tree[key];
  const t = { platforms: [], campaigns: [], adGroups: [], ads: [] };
  const bias = !!ws.perfFlag;   // accounts with a performance issue generate weaker numbers
  let adNo = 0;
  plats.forEach(p => {
    const rnd = adsRng(`${wsId}:${p}`);
    const pid = `${wsId}~${p}`;
    t.platforms.push({ id: pid, level: 'platform', platform: p, name: PLATFORM_NAME[p], status: 'Active', parents: [], path: { platform: pid } });
    adsShuffle(ADS_CAMPAIGNS[p], rnd).slice(0, ws.allCampaigns ? ADS_CAMPAIGNS[p].length : 2 + Math.floor(rnd() * 2)).forEach((cName, ci) => {
      const cid = `${pid}~c${ci + 1}`;
      const cStatus = ci === 0 ? (bias ? 'Limited' : 'Active') : adsPickStatus(rnd, bias);
      t.campaigns.push({ id: cid, level: 'campaign', platform: p, name: cName, ...adsStatusFields(cStatus), parents: [PLATFORM_NAME[p]], path: { platform: pid, campaign: cid } });
      adsShuffle(ADS_ADGROUPS[p], rnd).slice(0, 1 + Math.floor(rnd() * 3)).forEach((gName, gi) => {
        const gid = `${cid}~g${gi + 1}`;
        const gStatus = cStatus === 'Paused' ? 'Paused' : (gi === 0 ? 'Active' : adsPickStatus(rnd, bias));
        t.adGroups.push({ id: gid, level: 'adgroup', platform: p, name: gName, ...adsStatusFields(gStatus), parents: [cName], campaignName: cName, path: { platform: pid, campaign: cid, adgroup: gid } });
        const n = 2 + Math.floor(rnd() * 3);
        for (let k = 0; k < n; k++) {
          adNo++;
          const id = `${gid}~a${k + 1}`;
          const fmt = ADS_FORMATS[p][Math.floor(rnd() * ADS_FORMATS[p].length)];
          const status = gStatus === 'Paused' ? 'Paused' : adsPickStatus(rnd, bias);
          const cpm = p === 'google' ? 30 + rnd() * 60 : 12 + rnd() * 18;
          const ctr = (p === 'google' ? 3 + rnd() * 3.5 : 1 + rnd() * 1.6) / 100;
          const cvr = (1 + rnd() * 3) / 100;
          const spend = (400 + rnd() * 2600) * (status === 'Paused' ? 0.3 : 1);
          const impressions = spend / cpm * 1000;
          const clicks = impressions * ctr;
          const conversions = clicks * cvr;
          // Sheet metrics use their own random stream so the original metrics keep their values.
          const xr = adsRng(`${id}:sheet-metrics`);
          const freq = p === 'google' ? 1.2 + xr() * 1.3 : 1.6 + xr() * 1.8;
          const engRate = (p === 'google' ? 0.4 + xr() * 1.2 : 1 + xr() * 3.5) / 100;
          const purchases = conversions * (0.1 + xr() * 0.2);
          t.ads.push({
            id, level: 'ad', platform: p, name: `Ad Creative Q${Math.ceil(adNo / 2)} - Variant ${adNo}`, format: fmt, ...adsStatusFields(status),
            parents: [cName, gName], campaignName: cName, adGroupName: gName,
            path: { platform: pid, campaign: cid, adgroup: gid, ad: id },
            base: {
              spend, impressions, clicks, conversions,
              reach: impressions / freq,
              engagements: impressions * engRate,
              pLeads: conversions * (0.45 + xr() * 0.3),
              purchases,
              convValue: purchases * (60 + xr() * 180)
            }
          });
        }
      });
    });
  });
  // Fit 30-day spend to 72–94% of the workspace's spend level (ws.budget).
  const total = t.ads.reduce((s, a) => s + a.base.spend, 0);
  if (total) {
    const f = (ws.budget || 0) * (0.72 + adsRng(`${wsId}:budget`)() * 0.22) / total;
    t.ads.forEach(a => Object.keys(a.base).forEach(k => { a.base[k] *= f; }));
  }
  adsCache.tree[key] = t;
  return t;
}
// Date-range scaling. Not purely linear, so ratios (CPM, CTR, CPC) also move a little with the range.
function adsFactors(days) {
  const f = days / 30;
  const impressions = f * (1 + 0.03 * Math.sin(days));
  const conversions = f * (1 - 0.06 * Math.sin(days * 0.7));
  // Reach grows more slowly than impressions over longer ranges, so frequency rises with the range.
  return { spend: f, impressions, reach: Math.pow(f, 0.8), engagements: impressions, clicks: f * (1 + 0.05 * Math.cos(days * 1.3)), conversions, pLeads: conversions, purchases: conversions, convValue: conversions };
}
function adsDerive(o) {
  o.cpm = o.impressions ? o.spend / o.impressions * 1000 : 0;
  o.ctr = o.impressions ? o.clicks / o.impressions * 100 : 0;
  o.cpc = o.clicks ? o.spend / o.clicks : 0;
  o.cpa = o.conversions ? o.spend / o.conversions : 0;
  // Platform-reported metrics from the Google & Meta Ads Metrics sheet (Dev Notes, green rows).
  o.freq = o.reach ? o.impressions / o.reach : 0;
  o.cvr = o.clicks ? o.conversions / o.clicks * 100 : 0;
  o.cpLead = o.pLeads ? o.spend / o.pLeads : 0;
  o.cpp = o.purchases ? o.spend / o.purchases : 0;
  o.pRoas = o.spend ? o.convValue / o.spend : 0;
  o.engRate = o.impressions ? o.engagements / o.impressions * 100 : 0;
  o.cpe = o.engagements ? o.spend / o.engagements : 0;
  return o;
}
function adsSum(items) {
  const o = {};
  ADS_SUM_KEYS.forEach(k => { o[k] = items.reduce((s, c) => s + (c[k] || 0), 0); });
  return adsDerive(o);
}
// Campaigns, ad groups and ads with their metrics scaled to `days`.
function adsMetrics(wsId, days) {
  const key = `${wsId}|${days}|${wsPlatforms(wsId).join(',')}`;
  if (adsCache.metrics[key]) return adsCache.metrics[key];
  const t = adsTree(wsId);
  const f = adsFactors(days);
  const ads = t.ads.map(a => {
    const conversions = Math.round(a.base.conversions * f.conversions);
    return adsDerive({
      ...a, formats: [a.format], childCount: 0,
      spend: a.base.spend * f.spend,
      impressions: Math.round(a.base.impressions * f.impressions),
      reach: Math.round(a.base.reach * f.reach),
      clicks: Math.round(a.base.clicks * f.clicks),
      engagements: Math.round(a.base.engagements * f.engagements),
      pLeads: Math.round(a.base.pLeads * f.pLeads),
      purchases: Math.round(a.base.purchases * f.purchases),
      convValue: a.base.convValue * f.convValue,
      conversions
    });
  });
  const roll = (parents, children, levelKey) => parents.map(p => {
    const kids = children.filter(c => c.path[levelKey] === p.id);
    const o = { ...p, ...adsSum(kids), childCount: kids.length };
    o.formats = [...new Set(kids.flatMap(c => c.formats))].sort();
    return o;
  });
  const adgroup = roll(t.adGroups, ads, 'adgroup');
  const campaign = roll(t.campaigns, adgroup, 'campaign');
  return (adsCache.metrics[key] = { campaign, adgroup, ad: ads, days });
}
// Native attributes (derived from the campaign name, the ad format and a per-entity random stream).
const ADS_G_CAMP_TYPE = { 'Search Campaign': 'Search', 'Brand Search': 'Search', 'Display Remarketing': 'Display', 'Performance Max': 'Performance Max', 'YouTube Awareness': 'Video', 'Demand Gen Prospecting': 'Demand Gen', 'App Installs': 'App' };
const ADS_G_BID = { Search: ['Maximise conversions', 'Target CPA', 'Manual CPC', 'Maximise clicks'], Display: ['Target CPA', 'Maximise conversions'], Video: ['Target CPM', 'Maximum CPV'], 'Performance Max': ['Maximise conversion value', 'Target ROAS'], 'Demand Gen': ['Maximise conversions', 'Maximise clicks'], App: ['Target CPA', 'Maximise conversions'] };
const ADS_G_AG_TYPE = { Search: 'Search standard', Display: 'Display standard', Video: 'Video responsive', 'Performance Max': 'Asset group', 'Demand Gen': 'Demand Gen', App: 'App' };
const ADS_G_AD_TYPE = { 'Text/Search': 'Responsive search ad', Image: 'Responsive display ad', Video: 'Video responsive ad' };
const ADS_G_STATUS = { 'Active': 'Enabled', 'Paused': 'Paused' };
const adsGStatus = e => e.limited ? 'Limited' : ADS_G_STATUS[e.status];
const ADS_G_MATCH = ['Exact', 'Phrase', 'Broad'];
// Keyword templates: {b} = brand (first word of the workspace name), {i} = industry. Placeholder terms only.
const ADS_KW_POOL = ['{b}', '{b} singapore', '{b} {i}', '{i} singapore', '{i} services', '{i} company near me', '{i} agency', 'affordable {i}', '{i} consultation', '{i} pricing', '{b} reviews', '{i} solutions sg'];
const ADS_M_OBJECTIVE = { 'Paid Social Campaign': 'Traffic', 'Lead Gen - Instant Forms': 'Leads', 'Retargeting - Site Visitors': 'Sales', 'Awareness Reach': 'Awareness', 'Advantage+ Catalogue': 'Sales', 'Page Engagement Boost': 'Engagement', 'App Install Campaign': 'App promotion' };
const ADS_M_GOAL = { Leads: 'Leads', Sales: 'Conversions', Traffic: 'Landing page views', Awareness: 'Reach', Engagement: 'Post engagement', 'App promotion': 'App installs' };
const ADS_M_FORMAT = { Image: 'Single image', Video: 'Single video', Carousel: 'Carousel' };
const ADS_M_ATTRIBUTION = '7-day click, 1-day view';
// Extra summable metrics for the platform views (on top of ADS_SUM_KEYS). si* = Search impression-share
// building blocks (eligible impressions etc.), v* = video, the rest are platform counts.
const ADS_PF_SUM_KEYS = ['allConv', 'siImpr', 'siElig', 'siTop', 'siAbs', 'siRank', 'siBudget', 'vImpr', 'vViews', 'v25', 'v50', 'v75', 'v100', 'storeVisits',
  'viewImpr', 'vtc', 'installs', 'inApp', 'allClicks', 'lpv', 'shares', 'saves', 'igFollows', 'igVisits', 'msgs', 'thruplays', 'recall', 'addsToCart', 'checkouts'];
const ADS_PF_INT_KEYS = new Set(['impressions', 'reach', 'clicks', 'conversions', 'pLeads', 'purchases', 'engagements', 'allConv', 'vViews', 'storeVisits',
  'viewImpr', 'vtc', 'installs', 'inApp', 'allClicks', 'lpv', 'shares', 'saves', 'igFollows', 'igVisits', 'msgs', 'thruplays', 'recall', 'v25', 'v50', 'v75', 'v100', 'addsToCart', 'checkouts']);
adsCache.pfStatic = {};
adsCache.pf = {};
// Definitions from the metric sheet (Metrics (Original) › Definition). Rows the sheet leaves blank use
// prototype wording, marked "Not in the sheet" in the spec.
const ADS_SHEET = {
  cost: 'Amount spent on your campaign.',
  impressions: 'Total number of times the ad was shown on screen.',
  reach: 'Estimated number of unique individuals who saw the ad.',
  cpm: 'The average cost to show the ad 1,000 times.',
  freq: 'Average number of times each unique person saw the ad.',
  clicks: 'Number of clicks on links within the ad that direct users to specified destinations (like your website).',
  allClicks: 'The number of clicks, taps or swipes on your ads.',
  ctr: 'Percentage of impressions that resulted in a click.',
  ctrAll: 'The percentage of impressions where a click (all) occurred out of the total number of impressions.',
  cpc: 'Average cost paid for each link click.',
  cpcAll: 'The average cost for each click (all).',
  lpv: 'Number of times a person clicked the ad and the destination page successfully loaded.',
  cplpv: 'Average cost for each landing page view.',
  leads: 'Total number of generated leads, sign-ups, or form submissions.',
  cpLead: 'Average cost required to generate one successful lead.',
  conversions: 'An action that a customer takes after interacting with your ad, such as making a purchase, signing up for a newsletter, or calling your business.',
  allConv: 'Total number of conversions driven by Google Ads, including primary, secondary, and cross-device conversion actions.',
  cvr: 'Percentage of clicks that successfully resulted in a lead submission.',
  purchases: 'Total number of completed transactions or sales.',
  cpp: 'Average cost required to acquire one successful sale.',
  roas: 'Revenue generated for every dollar spent on the campaign.',
  convValue: 'Total monetary value of the purchases driven by the advertising efforts.',
  addsToCart: 'Number of times a product was added to the shopping cart by a user.',
  checkouts: 'Number of times a user started the checkout process.',
  is: 'The percentage of impressions your ads receive compared to the total number of impressions they were eligible to get on the Search Network.',
  topIs: 'The percentage of impressions your ads received in top locations above organic search results relative to the total estimated impressions your ads were eligible to receive in those top locations.',
  absIs: 'Percentage of eligible impressions your ad received in the absolute top position as the very first ad on the page.',
  lostRank: 'Percentage of time your ads did not show on the Search Network due to poor Ad Rank.',
  lostBudget: 'Percentage of time your ads did not show on the Search Network due to insufficient budget.',
  storeVisits: 'Number of visits to physical locations after interacting with Google Ads.',
  thruplays: 'The number of times your video was played to completion, or for at least 15 seconds.',
  vViews: 'ThruView views. The watch time counted varies by ad format: skippable in-stream ads 30 seconds; in-feed video and Shorts ads 10 seconds. Also counted when someone watches the entire video ad, regardless of length, or clicks or taps on it.',
  engRate: 'Percentage of people who interacted with the ad after seeing it.',
  engagements: 'Total actions taken on the ad (likes, comments, shares, video views, ad expansions).',
  cpe: 'Average cost for each interaction with the ad.',
  // Not defined in the sheet (prototype wording, to confirm):
  msgs: 'Number of times people started a messaging conversation with your business after interacting with the ad.',
  cpMsg: 'Average cost for each messaging conversation started.',
  shares: 'Number of times people shared the ad post.',
  saves: 'Number of times people saved the ad post.',
  igFollows: 'Number of Instagram follows gained from the ad.',
  igVisits: 'Number of visits to your Instagram profile from the ad.',
  mVideo: n => `Number of times your video was played to ${n}% of its length, including plays that skipped to this point.`,
  gVideo: n => `Percentage of video impressions where the viewer watched ${n}% of the video.`
};
// ---------- Mock data ----------
function adsSlug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
// Date-independent attributes per campaign / ad group / ad, and the Google keyword list.
function adsPfStatic(wsId) {
  const key = `${wsId}|${wsPlatforms(wsId).join(',')}`;
  if (adsCache.pfStatic[key]) return adsCache.pfStatic[key];
  const t = adsTree(wsId);
  const ws = wsById(wsId);
  const site = ws.site || 'www.example.com';
  const attrs = {}, keywords = [];
  const base = pred => t.ads.filter(pred).reduce((s, a) => ({ spend: s.spend + a.base.spend, clicks: s.clicks + a.base.clicks }), { spend: 0, clicks: 0 });
  const round5 = v => Math.max(5, Math.round(v / 5) * 5);
  t.campaigns.forEach(c => {
    const r = adsRng(`${c.id}:platform-attrs`);
    const daily = round5(base(a => a.path.campaign === c.id).spend / 30 * (1.1 + r() * 0.4));
    if (c.platform === 'google') {
      const type = ADS_G_CAMP_TYPE[c.name] || 'Search';
      const bids = ADS_G_BID[type];
      attrs[c.id] = { pfStatus: adsGStatus(c), campType: type, bid: bids[Math.floor(r() * bids.length)], budget: { amount: daily, kind: 'daily', daily } };
    } else {
      const objective = ADS_M_OBJECTIVE[c.name] || 'Traffic';
      const cbo = r() < 0.55, lifetime = r() < 0.35;
      attrs[c.id] = {
        pfStatus: c.status === 'Paused' ? 'Paused' : c.limited ? 'Learning limited' : 'Active', campType: objective, cbo, attribution: ADS_M_ATTRIBUTION,
        budget: cbo ? (lifetime ? { amount: daily * 30, kind: 'lifetime', daily } : { amount: daily, kind: 'daily', daily }) : { note: 'Using ad set budget' }
      };
    }
  });
  t.adGroups.forEach(g => {
    const c = attrs[g.path.campaign];
    const r = adsRng(`${g.id}:platform-attrs`);
    const roll = r(), spread = r();
    const b = base(a => a.path.adgroup === g.id);
    if (g.platform === 'google') {
      attrs[g.id] = { pfStatus: adsGStatus(g), campType: c.campType, agType: ADS_G_AG_TYPE[c.campType] };
      if (c.campType !== 'Search') return;
      const kr = adsRng(`${g.id}:keywords`);
      const brand = ws.name.split(/\s+/)[0].toLowerCase(), ind = (ws.industry || 'services').toLowerCase();
      const cpc = b.clicks ? b.spend / b.clicks : 1;
      const n = 3 + Math.floor(kr() * 4);
      adsShuffle(ADS_KW_POOL, kr).slice(0, n).forEach((tpl, i) => {
        const id = `${g.id}~k${i + 1}`;
        const match = ADS_G_MATCH[Math.floor(kr() * 3)];
        const qs = Math.max(1, Math.min(10, Math.round(2.5 + kr() * 7.5)));
        const w = 0.25 + kr();
        const paused = kr() < 0.1;
        keywords.push({
          id, level: 'keyword', platform: 'google', adgroupId: g.id, name: tpl.replace('{b}', brand).replace('{i}', ind), match, qs, w,
          maxCpc: cpc * (1.15 + kr() * 0.5), pfStatus: g.status === 'Paused' || paused ? 'Paused' : 'Enabled', campType: 'Search',
          parents: [g.campaignName, g.name], campaignName: g.campaignName, adGroupName: g.name, path: { ...g.path, keyword: id }, childCount: 0
        });
      });
    } else {
      const delivery = g.status === 'Paused' ? 'Paused' : g.limited ? 'Learning limited' : roll < 0.25 ? 'Learning' : 'Active';
      const daily = round5(b.spend / 30 * (1.1 + spread * 0.4));
      attrs[g.id] = { pfStatus: delivery, campType: c.campType, attribution: ADS_M_ATTRIBUTION, optGoal: ADS_M_GOAL[c.campType],
        budget: c.cbo ? { note: 'Using campaign budget' } : { amount: daily, kind: 'daily', daily } };
    }
  });
  t.ads.forEach(a => {
    const g = attrs[a.path.adgroup];
    if (a.platform === 'google') attrs[a.id] = { pfStatus: adsGStatus(a), campType: g.campType, adType: ADS_G_AD_TYPE[a.format], finalUrl: `https://${site}/${adsSlug(a.adGroupName)}` };
    else attrs[a.id] = {
      pfStatus: a.status === 'Paused' ? 'Paused' : a.limited ? 'Learning limited' : /^Learning/.test(g.pfStatus) ? g.pfStatus : 'Active',
      campType: g.campType, adFormat: ADS_M_FORMAT[a.format], attribution: ADS_M_ATTRIBUTION
    };
  });
  return (adsCache.pfStatic[key] = { attrs, keywords });
}
// Extra platform metrics for one ad, as ratios of its (date-scaled) consolidated metrics, so they follow the
// date filter. A fixed number of draws keeps every ad's stream stable whatever branch it takes.
function adsPfAdExt(a, att) {
  const r = adsRng(`${a.id}:platform-ext`);
  const u = Array.from({ length: 16 }, () => r());
  const o = Object.fromEntries(ADS_PF_SUM_KEYS.map(k => [k, 0]));
  const video = a.format === 'Video';
  if (a.platform === 'google') {
    o.allConv = Math.round(a.conversions * (1.08 + u[0] * 0.37));
    if (att.campType === 'Search' && a.impressions) {   // impression share: Search campaigns only (10–90%)
      const is = 0.1 + u[1] * 0.8, top = is * (0.55 + u[2] * 0.35), abs = top * (0.35 + u[3] * 0.35), rank = (1 - is) * (0.35 + u[4] * 0.5);
      const elig = a.impressions / is;
      Object.assign(o, { siImpr: a.impressions, siElig: elig, siTop: elig * top, siAbs: elig * abs, siRank: elig * rank, siBudget: elig * (1 - is - rank) });
    }
    if (video || att.campType === 'Video') {
      const p25 = 0.55 + u[5] * 0.25, p50 = p25 * (0.6 + u[6] * 0.2), p75 = p50 * (0.6 + u[7] * 0.2), p100 = p75 * (0.55 + u[8] * 0.25);
      Object.assign(o, { vImpr: a.impressions, vViews: Math.round(a.impressions * (0.18 + u[9] * 0.2)), v25: a.impressions * p25, v50: a.impressions * p50, v75: a.impressions * p75, v100: a.impressions * p100 });
    }
    if (!video && u[10] < 0.25) o.storeVisits = Math.round(a.clicks * (0.004 + u[11] * 0.016));   // sparse
    // Metrics from the monthly report sheet, on their own random stream so the others keep their values.
    const x = adsRng(`${a.id}:report-ext`);
    o.viewImpr = Math.round(a.impressions * (0.5 + x() * 0.3));
    if (att.campType !== 'Search') o.vtc = Math.round(a.conversions * (0.2 + x() * 0.5));
    if (att.campType === 'App') { o.installs = Math.round(a.clicks * (0.15 + x() * 0.2)); o.inApp = Math.round(o.installs * (0.6 + x() * 1.2)); }
  } else {
    o.allClicks = Math.round(a.clicks * (1.5 + u[0] * 1.1));
    o.lpv = Math.round(a.clicks * (0.58 + u[1] * 0.28));
    o.shares = Math.round(a.engagements * (0.008 + u[2] * 0.027));
    o.saves = Math.round(a.engagements * (0.004 + u[3] * 0.016));
    o.igFollows = Math.round(a.engagements * (0.002 + u[4] * 0.007));
    o.igVisits = Math.round(a.engagements * (0.015 + u[5] * 0.035));
    if (u[6] < 0.4) o.msgs = Math.round(a.clicks * (0.02 + u[7] * 0.05));
    if (video) {
      const v25 = Math.round(a.impressions * (0.18 + u[8] * 0.16)), v50 = Math.round(v25 * (0.55 + u[9] * 0.2)), v75 = Math.round(v50 * (0.55 + u[10] * 0.2));
      Object.assign(o, { vImpr: a.impressions, v25, v50, v75, v100: Math.round(v75 * (0.5 + u[11] * 0.25)), thruplays: Math.round(v50 * (0.7 + u[12] * 0.25)) });
    }
    o.recall = Math.round(a.reach * (0.015 + adsRng(`${a.id}:report-ext`)() * 0.03));
    o.addsToCart = Math.round(a.purchases * (2.5 + u[13] * 3));
    o.checkouts = Math.round(a.purchases * (1.4 + u[14]));
  }
  return o;
}
function adsPfDerive(o) {
  adsDerive(o);
  const si = k => o.siElig ? o[k] / o.siElig * 100 : 0;
  o.is = si('siImpr'); o.topIs = si('siTop'); o.absIs = si('siAbs'); o.lostRank = si('siRank'); o.lostBudget = si('siBudget');
  const vr = k => o.vImpr ? o[k] / o.vImpr * 100 : 0;
  o.v25r = vr('v25'); o.v50r = vr('v50'); o.v75r = vr('v75'); o.v100r = vr('v100');
  o.ctrAll = o.impressions ? o.allClicks / o.impressions * 100 : 0;
  o.cpcAll = o.allClicks ? o.spend / o.allClicks : 0;
  o.cplpv = o.lpv ? o.spend / o.lpv : 0;
  o.cpMsg = o.msgs ? o.spend / o.msgs : 0;
  o.cpv = o.vViews ? o.spend / o.vViews : 0;
  o.viewRate = o.vImpr ? o.vViews / o.vImpr * 100 : 0;
  o.cpInstall = o.installs ? o.spend / o.installs : 0;
  o.cpInApp = o.inApp ? o.spend / o.inApp : 0;
  o.cpThru = o.thruplays ? o.spend / o.thruplays : 0;
  return o;
}
function adsPfSum(items) {
  const o = {};
  ADS_SUM_KEYS.concat(ADS_PF_SUM_KEYS).forEach(k => { o[k] = items.reduce((s, c) => s + (c[k] || 0), 0); });
  return adsPfDerive(o);
}
// Keywords split their ad group's metrics (counts stay whole and add up exactly); impression share varies per keyword.
function adsPfKeywords(st, adgroups) {
  const out = [];
  const keys = ADS_SUM_KEYS.concat(ADS_PF_SUM_KEYS).filter(k => !/^si/.test(k));
  adgroups.forEach(g => {
    const kws = st.keywords.filter(k => k.adgroupId === g.id);
    if (!kws.length) return;
    const r = adsRng(`${g.id}:kw-split`);
    const rows = kws.map(k => ({ ...k }));
    keys.forEach(key => {
      const w = kws.map(k => k.w * (0.8 + r() * 0.4));
      const sw = w.reduce((a, b) => a + b, 0);
      const all = g[key] || 0;
      let left = all;
      rows.forEach((row, i) => {
        if (i === rows.length - 1) { row[key] = Math.max(0, left); return; }
        const v = Math.min(left, ADS_PF_INT_KEYS.has(key) ? Math.round(all * w[i] / sw) : all * w[i] / sw);
        row[key] = v; left -= v;
      });
    });
    const gIs = g.siElig ? g.siImpr / g.siElig : 0;
    rows.forEach(row => {
      const x = r();
      if (gIs && row.impressions) {
        const is = Math.max(0.08, Math.min(0.95, gIs * (0.75 + x * 0.5)));
        const elig = row.impressions / is;
        const topF = g.siTop / g.siImpr, absF = g.siAbs / g.siTop, rankF = g.siRank / ((g.siRank + g.siBudget) || 1);
        Object.assign(row, { siImpr: row.impressions, siElig: elig, siTop: elig * is * topF, siAbs: elig * is * topF * absF, siRank: elig * (1 - is) * rankF, siBudget: elig * (1 - is) * (1 - rankF) });
      } else Object.assign(row, { siImpr: 0, siElig: 0, siTop: 0, siAbs: 0, siRank: 0, siBudget: 0 });
      out.push(adsPfDerive(row));
    });
  });
  return out;
}
// Every level for platform p under the client date filter (or `days`, e.g. a report month) and the attribution model.
function adsPfData(wsId, p, days) {
  const m = adsMetrics(wsId, days);
  const key = `${wsId}|${m.days}|${wsPlatforms(wsId).join(',')}|${p}`;
  if (adsCache.pf[key]) return adsCache.pf[key];
  const st = adsPfStatic(wsId);
  const ad = m.ad.filter(a => a.platform === p).map(a => adsPfDerive({ ...a, ...st.attrs[a.id], ...adsPfAdExt(a, st.attrs[a.id]) }));
  const roll = (parents, kids, lk) => parents.filter(x => x.platform === p).map(x => {
    const ks = kids.filter(c => c.path[lk] === x.id);
    return { ...x, ...st.attrs[x.id], ...adsPfSum(ks), childCount: ks.length };
  });
  const adgroup = roll(m.adgroup, ad, 'adgroup');
  const campaign = roll(m.campaign, adgroup, 'campaign');
  const keyword = p === 'google' ? adsPfKeywords(st, adgroup) : [];
  adgroup.forEach(g => { g.kwCount = keyword.filter(k => k.path.adgroup === g.id).length; });
  campaign.forEach(c => { c.kwCount = keyword.filter(k => k.path.campaign === c.id).length; });
  return (adsCache.pf[key] = { campaign, adgroup, ad, keyword, total: adsPfSum(campaign), days: m.days });
}
// ---------- Columns ----------
// t: status | text | budget | url | qs | money | money2 | int | pct | dec | roas. levels: where the column exists natively.
const ADS_PF_FMT = { money: v => fmtMoney(v), money2: v => fmtMoney(v, 2), int: v => fmtNum(Math.round(v)), pct: v => fmtPct(v), dec: v => Number(v || 0).toFixed(2), roas: v => `${Number(v || 0).toFixed(2)}x` };
function adsPfCol(key, group, label, t, tip, o = {}) { return { key, group, label, t, tip, ...o }; }
const ADS_PF_NOT_KW = ['campaign', 'adgroup', 'ad'];
const ADS_PF_COLS = {
  google: [
    adsPfCol('pfStatus', 'attr', 'Status', 'status', 'Whether the item can serve: Enabled, Limited (by budget, policy or learning) or Paused.'),
    adsPfCol('campType', 'attr', 'Campaign type', 'text', 'The campaign type set in Google Ads: Search, Display, Video or Performance Max.', { levels: ['campaign'] }),
    adsPfCol('bid', 'attr', 'Bid strategy type', 'text', 'How Google Ads sets bids for the campaign.', { levels: ['campaign'] }),
    adsPfCol('budget', 'attr', 'Budget', 'budget', 'Average daily budget set on the campaign.', { levels: ['campaign'] }),
    adsPfCol('agType', 'attr', 'Ad group type', 'text', 'The ad group type, set by the campaign type (Performance Max uses asset groups).', { levels: ['adgroup'] }),
    adsPfCol('adType', 'attr', 'Ad type', 'text', 'The ad format in Google Ads.', { levels: ['ad'] }),
    adsPfCol('finalUrl', 'attr', 'Final URL', 'url', 'The page people reach after clicking the ad.', { levels: ['ad'] }),
    adsPfCol('match', 'attr', 'Match type', 'text', 'How closely a search must match the keyword: Exact [ ], Phrase " " or Broad.', { levels: ['keyword'] }),
    adsPfCol('qs', 'attr', 'Quality Score', 'qs', 'Google\'s 1–10 estimate of the quality of the keyword, its ads and landing page.', { levels: ['keyword'] }),
    adsPfCol('maxCpc', 'attr', 'Max. CPC', 'money2', 'The most you will pay for a click on this keyword.', { levels: ['keyword'] }),
    adsPfCol('impressions', 'perf', 'Impr.', 'int', ADS_SHEET.impressions),
    adsPfCol('clicks', 'perf', 'Clicks', 'int', ADS_SHEET.clicks),
    adsPfCol('ctr', 'perf', 'CTR', 'pct', ADS_SHEET.ctr, { quality: 'high', needs: 'impressions' }),
    adsPfCol('cpc', 'perf', 'Avg. CPC', 'money2', ADS_SHEET.cpc, { quality: 'low', needs: 'clicks' }),
    adsPfCol('spend', 'perf', 'Cost', 'money2', ADS_SHEET.cost),
    adsPfCol('cpm', 'perf', 'Avg. CPM', 'money2', ADS_SHEET.cpm, { quality: 'low', needs: 'impressions' }),
    adsPfCol('engagements', 'perf', 'Interactions', 'int', ADS_SHEET.engagements),
    adsPfCol('engRate', 'perf', 'Engagement rate', 'pct', ADS_SHEET.engRate, { needs: 'impressions' }),
    adsPfCol('cpe', 'perf', 'Avg. CPE', 'money2', ADS_SHEET.cpe, { needs: 'engagements' }),
    adsPfCol('conversions', 'conv', 'Conversions', 'int', ADS_SHEET.conversions),
    adsPfCol('cvr', 'conv', 'Conv. rate', 'pct', ADS_SHEET.cvr, { needs: 'clicks' }),
    adsPfCol('cpa', 'conv', 'Cost / conv.', 'money2', `${ADS_SHEET.cpLead} Google reports cost per lead and cost per purchase as Cost / conv. of that conversion action.`, { quality: 'low', needs: 'conversions' }),
    adsPfCol('allConv', 'conv', 'All conv.', 'int', ADS_SHEET.allConv),
    adsPfCol('convValue', 'conv', 'Conv. value', 'money2', ADS_SHEET.convValue),
    adsPfCol('pRoas', 'conv', 'ROAS', 'dec', ADS_SHEET.roas, { needs: 'spend' }),
    adsPfCol('vtc', 'conv', 'View-through conv.', 'int', 'Conversions after someone saw, but didn’t interact with, an ad.'),
    adsPfCol('is', 'comp', 'Search impr. share', 'pct', ADS_SHEET.is, { needs: 'siElig', levels: ['campaign', 'adgroup', 'keyword'] }),
    adsPfCol('topIs', 'comp', 'Search top IS', 'pct', ADS_SHEET.topIs, { needs: 'siElig', levels: ['campaign', 'adgroup', 'keyword'] }),
    adsPfCol('absIs', 'comp', 'Search abs. top IS', 'pct', ADS_SHEET.absIs, { needs: 'siElig', levels: ['campaign', 'adgroup', 'keyword'] }),
    adsPfCol('lostRank', 'comp', 'Search lost IS (rank)', 'pct', ADS_SHEET.lostRank, { needs: 'siElig', levels: ['campaign', 'adgroup', 'keyword'] }),
    adsPfCol('lostBudget', 'comp', 'Search lost IS (budget)', 'pct', ADS_SHEET.lostBudget, { needs: 'siElig', levels: ['campaign', 'adgroup'] }),
    adsPfCol('reach', 'reach', 'Unique reach', 'int', ADS_SHEET.reach, { levels: ADS_PF_NOT_KW }),
    adsPfCol('freq', 'reach', 'Avg. impr. freq. / user', 'dec', ADS_SHEET.freq, { needs: 'reach', levels: ADS_PF_NOT_KW }),
    adsPfCol('vViews', 'video', 'Views', 'int', ADS_SHEET.vViews, { needs: 'vImpr', levels: ADS_PF_NOT_KW }),
    adsPfCol('viewRate', 'video', 'View rate', 'pct', 'Views divided by video impressions.', { needs: 'vImpr', levels: ADS_PF_NOT_KW }),
    adsPfCol('cpv', 'video', 'Avg. CPV', 'money2', 'Average cost per view: cost divided by views.', { needs: 'vViews', levels: ADS_PF_NOT_KW }),
    ...[25, 50, 75, 100].map(n => adsPfCol(`v${n}r`, 'video', `Video played to ${n}%`, 'pct', ADS_SHEET.gVideo(n), { needs: 'vImpr', levels: ADS_PF_NOT_KW })),
    adsPfCol('storeVisits', 'store', 'Store visits', 'int', ADS_SHEET.storeVisits, { levels: ADS_PF_NOT_KW }),
    adsPfCol('viewImpr', 'perf', 'Viewable impr.', 'int', 'Impressions where at least half of the ad was on screen for at least one second (two for video).', { levels: ADS_PF_NOT_KW }),
    adsPfCol('installs', 'app', 'Installs', 'int', 'App installs from the ads.', { levels: ADS_PF_NOT_KW }),
    adsPfCol('cpInstall', 'app', 'Cost / install', 'money2', 'Cost divided by installs.', { needs: 'installs', levels: ADS_PF_NOT_KW }),
    adsPfCol('inApp', 'app', 'In-app actions', 'int', 'In-app conversions, such as purchases or sign-ups in the app.', { levels: ADS_PF_NOT_KW }),
    adsPfCol('cpInApp', 'app', 'Cost / in-app action', 'money2', 'Cost divided by in-app actions.', { needs: 'inApp', levels: ADS_PF_NOT_KW })
  ],
  meta: [
    adsPfCol('pfStatus', 'attr', 'Delivery', 'status', 'Whether the item is delivering: Active, Learning (the delivery system is still optimising), Learning limited or Paused.'),
    adsPfCol('campType', 'attr', 'Objective', 'text', 'The campaign objective chosen in Meta Ads Manager.', { levels: ['campaign'] }),
    adsPfCol('budget', 'attr', 'Budget', 'budget', 'Daily or lifetime budget, set on the campaign (Advantage campaign budget) or on each ad set.', { levels: ['campaign', 'adgroup'] }),
    adsPfCol('optGoal', 'attr', 'Optimisation goal', 'text', 'The result the ad set is optimised to get.', { levels: ['adgroup'] }),
    adsPfCol('adFormat', 'attr', 'Ad format', 'text', 'The creative format of the ad.', { levels: ['ad'] }),
    adsPfCol('attribution', 'attr', 'Attribution setting', 'text', 'The window in which a conversion is credited to the ad after a click or view.'),
    adsPfCol('conversions', 'perf', 'Results', 'int', ADS_SHEET.conversions),
    adsPfCol('cvr', 'perf', 'Result rate', 'pct', ADS_SHEET.cvr, { needs: 'clicks' }),
    adsPfCol('cpa', 'perf', 'Cost per result', 'money2', 'Amount spent divided by results.', { quality: 'low', needs: 'conversions' }),
    adsPfCol('spend', 'perf', 'Amount spent', 'money2', ADS_SHEET.cost),
    adsPfCol('reach', 'perf', 'Reach', 'int', ADS_SHEET.reach),
    adsPfCol('impressions', 'perf', 'Impressions', 'int', ADS_SHEET.impressions),
    adsPfCol('freq', 'perf', 'Frequency', 'dec', ADS_SHEET.freq, { needs: 'reach' }),
    adsPfCol('cpm', 'perf', 'CPM (cost per 1,000 impressions)', 'money2', ADS_SHEET.cpm, { quality: 'low', needs: 'impressions' }),
    adsPfCol('clicks', 'clicks', 'Link clicks', 'int', ADS_SHEET.clicks),
    adsPfCol('ctr', 'clicks', 'CTR (link click-through rate)', 'pct', ADS_SHEET.ctr, { quality: 'high', needs: 'impressions' }),
    adsPfCol('cpc', 'clicks', 'CPC (cost per link click)', 'money2', ADS_SHEET.cpc, { quality: 'low', needs: 'clicks' }),
    adsPfCol('allClicks', 'clicks', 'Clicks (all)', 'int', ADS_SHEET.allClicks),
    adsPfCol('ctrAll', 'clicks', 'CTR (all)', 'pct', ADS_SHEET.ctrAll, { needs: 'impressions' }),
    adsPfCol('cpcAll', 'clicks', 'CPC (all)', 'money2', ADS_SHEET.cpcAll, { needs: 'allClicks' }),
    adsPfCol('lpv', 'clicks', 'Landing page views', 'int', ADS_SHEET.lpv),
    adsPfCol('cplpv', 'clicks', 'Cost per landing page view', 'money2', ADS_SHEET.cplpv, { needs: 'lpv' }),
    adsPfCol('engagements', 'eng', 'Post engagement', 'int', ADS_SHEET.engagements),
    adsPfCol('cpe', 'eng', 'Cost per post engagement', 'money2', ADS_SHEET.cpe, { needs: 'engagements' }),
    adsPfCol('engRate', 'eng', 'Engagement rate', 'pct', ADS_SHEET.engRate, { needs: 'impressions' }),
    adsPfCol('shares', 'eng', 'Post shares', 'int', ADS_SHEET.shares),
    adsPfCol('saves', 'eng', 'Post saves', 'int', ADS_SHEET.saves),
    adsPfCol('igFollows', 'eng', 'Instagram follows', 'int', ADS_SHEET.igFollows),
    adsPfCol('igVisits', 'eng', 'Instagram profile visits', 'int', ADS_SHEET.igVisits),
    adsPfCol('msgs', 'msg', 'Messaging conversations started', 'int', ADS_SHEET.msgs),
    adsPfCol('cpMsg', 'msg', 'Cost per messaging conversation started', 'money2', ADS_SHEET.cpMsg, { needs: 'msgs' }),
    adsPfCol('thruplays', 'video', 'ThruPlays', 'int', ADS_SHEET.thruplays, { needs: 'vImpr' }),
    adsPfCol('cpThru', 'video', 'Cost per ThruPlay', 'money2', 'Amount spent divided by ThruPlays.', { needs: 'thruplays' }),
    adsPfCol('recall', 'perf', 'Estimated ad recall lift (people)', 'int', 'Estimated number of people who would remember the ad if asked within two days.'),
    ...[25, 50, 75, 100].map(n => adsPfCol(`v${n}`, 'video', `Video plays at ${n}%`, 'int', ADS_SHEET.mVideo(n), { needs: 'vImpr' })),
    adsPfCol('pLeads', 'conv', 'Leads', 'int', ADS_SHEET.leads),
    adsPfCol('cpLead', 'conv', 'Cost per lead', 'money2', ADS_SHEET.cpLead, { needs: 'pLeads' }),
    adsPfCol('purchases', 'conv', 'Purchases', 'int', ADS_SHEET.purchases),
    adsPfCol('cpp', 'conv', 'Cost per purchase', 'money2', ADS_SHEET.cpp, { needs: 'purchases' }),
    adsPfCol('convValue', 'conv', 'Purchases conversion value', 'money2', ADS_SHEET.convValue),
    adsPfCol('pRoas', 'conv', 'Purchase ROAS (return on ad spend)', 'dec', ADS_SHEET.roas, { needs: 'spend' }),
    adsPfCol('addsToCart', 'conv', 'Adds to cart', 'int', ADS_SHEET.addsToCart),
    adsPfCol('checkouts', 'conv', 'Checkouts initiated', 'int', ADS_SHEET.checkouts)
  ]
};
