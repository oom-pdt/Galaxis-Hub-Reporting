// Galaxis Hub Reporting — Monthly Reports: two fixed PDF reports per client, SEM (Google Ads) and SMM (Facebook Page,
// Instagram and Meta Ads), sent automatically to the client's recipients. The sections and their order are fixed; the
// AM only turns sections, and table columns, on or off. Agency only: client users never see this page, only the PDF.
// Owns src/reports.js + src/reports.css. Every global here is prefixed `rep`.
//
// Icon registry: one meaning per icon across the app (check here before using an icon somewhere new).
//   layout-dashboard   Dashboard page          file-chart-column  Reports page
//   building-2         Organisation page       users              Team & Access page
//   blocks             Integrations page       cable              Ad Accounts page (agency)
//   eye-off            Agency only (hidden from client users)
//   search-check       SEM Report              thumbs-up          SMM Report
//   calendar-cog       Schedule & Recipients   history            Sent Reports
//   calendar-clock     Next scheduled send     info               Explanatory note
//   eye                View / preview a report send               Send or resend the email
//   refresh-cw         Retry (regenerate) a report                ban    Cancel a send
//   undo-2             Resume a cancelled send circle-alert       Failed (error banner)
//   triangle-alert     Warning                 circle-pause       Report turned off
//   lock               Always included, can't be turned off
//   layout-grid        Summary cards           chart-spline       Charts
//   table-2            Table columns           chevron-down       Expand / open a menu
//   chevrons-up-down   Expand all              chevrons-down-up   Collapse all
//   x                  Remove / close / clear  plus               Add
//   rotate-ccw         Reset the schedule to its default
//   paperclip          Attachments             download           Download PDF
//   mail               Recipient added (toast) search             Search
//   user               Account menu            home               Go to My Workspace
//   chevron-left/right Previous / next page
//   check              Current workspace       repeat             Switched workspace (toast)
//   more-vertical      Row actions menu (shared helper, not used on these pages)

// =====================================================================
// Catalogue: sources, categories, columns, breakdowns
// =====================================================================
const REP_ADS = ['google', 'meta'];
const REP_PLATFORM = { google: 'Google Ads', meta: 'Meta Ads', facebook: 'Facebook Page', instagram: 'Instagram' };
function repIsAds(p) { return REP_ADS.includes(p); }
function repSources(wsId) { return [...wsPlatforms(wsId), ...wsSocial(wsId)]; }
function repHas(wsId, p) { return repSources(wsId).includes(p); }

// Categories a table or chart is limited to, from the campaign type Google returns. 'all': every campaign.
const REP_CATEGORIES = {
  google: [
    { id: 'all', label: 'All campaign types' },
    { id: 'search', label: 'Search', campTypes: ['Search'] },
    { id: 'pmax', label: 'Performance Max', campTypes: ['Performance Max'] },
    { id: 'demandgen', label: 'Demand Gen', campTypes: ['Demand Gen'] },
    { id: 'display', label: 'Display', campTypes: ['Display'] },
    { id: 'youtube', label: 'YouTube', campTypes: ['Video'] },
    { id: 'app', label: 'App install', campTypes: ['App'] }
  ],
  meta: [
    { id: 'all', label: 'All objectives' },
    { id: 'awareness', label: 'Awareness', campTypes: ['Awareness'] },
    { id: 'traffic', label: 'Traffic', campTypes: ['Traffic'] },
    { id: 'engagement', label: 'Engagement', campTypes: ['Engagement'] },
    { id: 'leads', label: 'Lead generation', campTypes: ['Leads'] },
    { id: 'sales', label: 'Sales', campTypes: ['Sales'] }
  ],
  facebook: [{ id: 'all', label: 'All posts' }],
  instagram: [{ id: 'all', label: 'All posts' }]
};
function repCategory(p, id) { return (REP_CATEGORIES[p] || []).find(c => c.id === id); }
function repInCat(row, cat) { return !cat?.campTypes || cat.campTypes.includes(row.campType); }
function repNoun(b) {
  const l = b.rows;
  if (l === 'adgroup') return b.platform === 'meta' ? ['ad set', 'ad sets'] : ['ad group', 'ad groups'];
  return { campaign: ['campaign', 'campaigns'], convType: ['campaign', 'campaigns'], ad: ['ad', 'ads'], keyword: ['keyword', 'keywords'], term: ['search term', 'search terms'], post: ['post', 'posts'] }[l];
}

// Organic columns, in the same shape as the ad platforms' (ADS_PF_COLS). levels ['account']: summary cards only.
const REP_ORG_COLS = {
  facebook: [
    adsPfCol('views', 'post', 'Views', 'int', 'How many times the post was seen, including repeat views.'),
    adsPfCol('viewers', 'post', 'Viewers', 'int', 'How many people saw the post at least once.'),
    adsPfCol('reactions', 'post', 'Reactions', 'int', 'Likes and other reactions.'),
    adsPfCol('comments', 'post', 'Comments', 'int', 'Comments on the post.'),
    adsPfCol('shares', 'post', 'Shares', 'int', 'How many times the post was shared.'),
    adsPfCol('engagements', 'post', 'Engagements', 'int', 'Reactions, comments and shares.'),
    adsPfCol('engRate', 'post', 'Engagement rate', 'pct', 'Engagements divided by viewers.', { needs: 'viewers' }),
    adsPfCol('followers', 'account', 'Followers', 'int', 'Followers of the Page on the last day of the month.', { levels: ['account'] }),
    adsPfCol('newFollows', 'account', 'New follows', 'int', 'People who followed the Page during the month.', { levels: ['account'] }),
    adsPfCol('posts', 'account', 'Posts published', 'int', 'Posts published on the Page during the month.', { levels: ['account'] })
  ],
  instagram: [
    adsPfCol('views', 'post', 'Views', 'int', 'How many times the post or reel was seen, including replays.'),
    adsPfCol('reach', 'post', 'Accounts reached', 'int', 'How many accounts saw the post at least once.'),
    adsPfCol('likes', 'post', 'Likes', 'int', 'Likes on the post.'),
    adsPfCol('comments', 'post', 'Comments', 'int', 'Comments on the post.'),
    adsPfCol('shares', 'post', 'Shares', 'int', 'How many times the post was shared.'),
    adsPfCol('saves', 'post', 'Saves', 'int', 'How many times the post was saved.'),
    adsPfCol('engagements', 'post', 'Interactions', 'int', 'Likes, comments, shares and saves.'),
    adsPfCol('engRate', 'post', 'Engagement rate', 'pct', 'Interactions divided by accounts reached.', { needs: 'reach' }),
    // Reels only (ig_reels_avg_watch_time, ig_reels_video_view_total_time); other posts show "—".
    adsPfCol('avgWatch', 'post', 'Reels avg. watch time', 'secs', 'Average time people spent watching the reel, including replays.', { needs: 'reelPlays' }),
    adsPfCol('totalWatch', 'post', 'Reels total watch time', 'dur', 'Total time people spent watching the reel, including replays.', { needs: 'reelPlays' }),
    adsPfCol('followers', 'account', 'Followers', 'int', 'Followers on the last day of the month.', { levels: ['account'] }),
    adsPfCol('newFollows', 'account', 'New follows', 'int', 'Accounts that followed during the month.', { levels: ['account'] }),
    adsPfCol('posts', 'account', 'Posts published', 'int', 'Posts and reels published during the month.', { levels: ['account'] })
  ]
};
function repAllCols(p) { return ADS_PF_COLS[p] || REP_ORG_COLS[p]; }
// Placeholder columns for campaign types whose columns aren't decided yet. Shown as "—" in the PDF.
function repCol(p, key) { return repAllCols(p).find(c => c.key === key); }
function repColLabel(p, key) { return repCol(p, key)?.label || key; }
function repFmt(p, key, v) { const c = repCol(p, key); return !c ? fmtNum(v) : ADS_PF_FMT[c.t] ? ADS_PF_FMT[c.t](v) : String(v ?? '—'); }

// Breakdown values as each platform reports them (mock shares are generated per workspace and month).
const REP_DIMS = {
  age: { google: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+', 'Unknown'], meta: ['18–24', '25–34', '35–44', '45–54', '55–64', '65+'], instagram: ['13–17', '18–24', '25–34', '35–44', '45–54', '55–64', '65+'] },
  convActions: { google: ['Form submission', 'WhatsApp click', 'Calls from ads', 'Website phone click'] }
};

// =====================================================================
// The two reports. Sections, their order, their headings and their charts are fixed. Per client, the AM turns
// sections on or off, and the columns of each table (the column order is fixed). A section whose source isn't linked
// can't be turned on.
// Table: { id, kind: 'table', platform, category, rows, title, cols (every column it can show, in order), limit }.
// Columns are in the order things happen: reach and impressions, then clicks, cost, video, conversions, value, then
// impression share. A table is sorted by the first number column turned on (e.g. Impr., else Clicks, else CTR),
// highest first; a table with no number column turned on is sorted by impressions.
// Chart: { id, kind: 'chart', chart, platform, category, title, metric, metric2, metrics (summary cards it can show, in order), off (of those, off until the AM turns them on) }
// Defaults for a new client are general: the summary, all-campaign and Search sections are on (every SEM client runs Search); sections and charts marked
// hidden (campaign types, detail tables) start off, for the AM to turn on where they apply.
// =====================================================================
// off: columns that start off, for the AM to turn on.
function repT(id, platform, category, rows, title, cols, o = {}) { return { id, kind: 'table', platform, category, rows, title, cols, limit: o.limit || 0, off: o.off }; }
function repSortKey(p, cols) { const num = k => !['text', 'status'].includes(repCol(p, k)?.t); return cols.find(num) || 'impressions'; }
function repC(id, chart, platform, title, o = {}) { return { id, kind: 'chart', chart, platform, category: 'all', title, ...o }; }
// The same optional daily charts in every campaign-type section. hidden: off until the AM turns it on. Meta has no
// conversions chart: the metrics sheet has no conversions for Meta.
function repTrends(id, p, category, hidden) {
  if (p === 'meta') return [repC(`${id}-ic`, 'trend', p, 'Impressions and link clicks by day', { category, metric: 'impressions', metric2: 'clicks', hidden })];
  return [repC(`${id}-ic`, 'trend', p, 'Impressions and clicks by day', { category, metric: 'impressions', metric2: 'clicks', hidden }),
    repC(`${id}-cc`, 'trend', p, 'Conversions and cost per conversion by day', { category, metric: 'conversions', metric2: 'cpa', hidden })];
}
// Columns per campaign type, from the "Google & Meta Ads Metrics - Monthly Report" sheet.
const REP_G_SEARCH = ['impressions', 'clicks', 'ctr', 'cpc', 'spend', 'conversions', 'cvr', 'cpa', 'convValue', 'pRoas', 'is', 'lostBudget', 'lostRank'];
const REP_G_PMAX = ['impressions', 'clicks', 'ctr', 'cpc', 'spend', 'conversions', 'cvr', 'cpa', 'convValue', 'pRoas'];
const REP_G_DEMANDGEN = ['impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'spend', 'conversions', 'cpa', 'convValue', 'pRoas'];
const REP_G_DISPLAY = ['impressions', 'viewImpr', 'clicks', 'ctr', 'cpc', 'spend', 'conversions', 'vtc', 'cpa'];
const REP_G_YOUTUBE = ['impressions', 'reach', 'avgFreq', 'freq', 'vViews', 'viewRate', 'v25r', 'v50r', 'v75r', 'v100r', 'clicks', 'ctr', 'cpv', 'cpm', 'spend', 'conversions', 'cvr', 'cpa', 'pRoas'];
const REP_G_APP = ['impressions', 'clicks', 'spend', 'installs', 'cpInstall', 'inApp', 'cpInApp'];
const REP_M_AWARENESS = ['reach', 'impressions', 'freq', 'recall', 'allClicks', 'clicks', 'ctrAll', 'ctr', 'cpm', 'thruplays', 'cpThru', 'spend'];
const REP_M_TRAFFIC = ['reach', 'impressions', 'freq', 'allClicks', 'clicks', 'ctrAll', 'ctr', 'cpc', 'lpv', 'cplpv', 'cpm', 'spend'];
const REP_M_ENGAGEMENT = ['reach', 'viewers', 'impressions', 'views', 'freq', 'engagements', 'pageEng', 'engRate', 'interactions', 'reactions', 'comments', 'saves', 'shares', 'fbLikes', 'igFollows',
  'allClicks', 'clicks', 'ctrAll', 'ctr', 'cpc', 'cpm', 'spend', 'plays3s', 'thruplays', 'msgs', 'cpMsg'];
const REP_M_LEADS = ['reach', 'impressions', 'freq', 'allClicks', 'clicks', 'ctrAll', 'ctr', 'cpc', 'lpv', 'cplpv', 'cpm', 'spend', 'msgs', 'cpMsg', 'pLeads', 'cpLead', 'purchases', 'convValue', 'pRoas'];
const REP_M_SALES = ['reach', 'impressions', 'freq', 'allClicks', 'clicks', 'ctrAll', 'ctr', 'cpc', 'lpv', 'cpm', 'spend', 'purchases', 'convValue', 'pRoas'];
const REP_RSA_NOTE = 'Google combines each search ad’s headlines and descriptions automatically, so an ad’s results cover every combination it showed. The text below is the ad as written.';
const REP_TYPES = {
  sem: { id: 'sem', name: 'SEM Report', short: 'SEM', icon: 'search-check', file: 'SEM-Report', needs: 'a Google Ads account', needsShort: 'Google Ads', desc: 'Search engine marketing: the client’s Google Ads campaigns, search ads, keywords and search terms.', sections: [
    { id: 'overview', title: 'Overall Performance', note: 'All your Google Ads campaigns this month.', source: 'google', blocks: [
      repC('g-kpis', 'summary', 'google', 'Summary cards', { metrics: ['impressions', 'clicks', 'ctr', 'cpc', 'spend', 'is', 'conversions', 'cvr', 'cpa', 'convValue'], off: ['cpa', 'convValue'] }),
      repC('g-trend', 'trend', 'google', 'Impressions and clicks by day', { metric: 'impressions', metric2: 'clicks' })] },
    { id: 'campaigns', title: 'Campaign Performance', source: 'google', blocks: [
      repC('g-bycamp', 'byCampaign', 'google', 'Conversions by campaign', { metric: 'conversions' })] },
    // As in the sample SEM report: each campaign, with its conversions split by conversion action underneath.
    { id: 'convTypes', title: 'Conversion Type Breakdown', source: 'google', blocks: [repT('g-conv-types', 'google', 'all', 'convType', 'Conversions by campaign and conversion action', ['conversions'])] },
    // Google Ads can't group by age and gender in one query, so each gets its own chart. quad: four charts to a page.
    { id: 'demographics', title: 'Age and Gender', note: 'Google Ads reports age and gender separately, so each has its own chart.', source: 'google', blocks: [
      repC('g-age-clicks', 'age', 'google', 'Clicks by age', { metric: 'clicks', quad: true }),
      repC('g-gender-clicks', 'gender', 'google', 'Clicks by gender', { metric: 'clicks', quad: true }),
      repC('g-age-conv', 'age', 'google', 'Conversions by age', { metric: 'conversions', quad: true }),
      repC('g-gender-conv', 'gender', 'google', 'Conversions by gender', { metric: 'conversions', quad: true })] },
    { id: 'search', title: 'Search Campaigns', source: 'google', blocks: [
      ...repTrends('g-s', 'google', 'search', false),
      repT('g-s-camps', 'google', 'search', 'campaign', 'Search campaigns', REP_G_SEARCH)] },
    { id: 'adgroups', title: 'Search Ad Groups', source: 'google', blocks: [
      repT('g-s-groups', 'google', 'search', 'adgroup', 'Ad groups', REP_G_SEARCH)] },
    { id: 'keywords', title: 'Top Keywords', source: 'google', blocks: [
      repT('g-kw', 'google', 'search', 'keyword', 'Top 10 keywords', ['match', ...REP_G_SEARCH.filter(k => k !== 'lostBudget')], { limit: 10 })] },
    { id: 'terms', title: 'Top Search Terms', note: 'What people typed into Google before seeing your ads. Google leaves out terms searched by very few people, for privacy.', source: 'google', blocks: [
      repT('g-terms', 'google', 'search', 'term', 'Top 20 search terms', ['match', ...REP_G_PMAX], { limit: 20 })] },
    { id: 'searchAds', title: 'Search Ads', note: REP_RSA_NOTE, source: 'google', blocks: [
      repT('g-s-ads', 'google', 'search', 'ad', 'Search ads', REP_G_PMAX)] },
    { id: 'pmax', hidden: true, title: 'Performance Max Campaigns', source: 'google', blocks: [
      ...repTrends('g-p', 'google', 'pmax', false),
      repT('g-p-camps', 'google', 'pmax', 'campaign', 'Performance Max campaigns', REP_G_PMAX)] },
    { id: 'demandgen', hidden: true, title: 'Demand Gen Campaigns', source: 'google', blocks: [...repTrends('g-dg', 'google', 'demandgen', true), repT('g-dg-camps', 'google', 'demandgen', 'campaign', 'Demand Gen campaigns', REP_G_DEMANDGEN)] },
    { id: 'display', hidden: true, title: 'Display Campaigns', source: 'google', blocks: [...repTrends('g-d', 'google', 'display', true), repT('g-d-camps', 'google', 'display', 'campaign', 'Display campaigns', REP_G_DISPLAY)] },
    { id: 'youtube', hidden: true, title: 'YouTube Campaigns', source: 'google', blocks: [...repTrends('g-yt', 'google', 'youtube', true), repT('g-yt-camps', 'google', 'youtube', 'campaign', 'YouTube campaigns', REP_G_YOUTUBE)] },
    { id: 'app', hidden: true, title: 'App Install Campaigns', source: 'google', blocks: [...repTrends('g-app', 'google', 'app', true), repT('g-app-camps', 'google', 'app', 'campaign', 'App install campaigns', REP_G_APP)] },
  ] },
  smm: { id: 'smm', name: 'SMM Report', short: 'SMM', icon: 'thumbs-up', file: 'SMM-Report', needs: 'a Facebook Page, Instagram account or Meta Ads account', needsShort: 'Meta', desc: 'Social media marketing: the client’s Facebook Page and Instagram posts and followers, and their Meta Ads.', sections: [
    { id: 'facebook', title: 'Facebook Page', note: 'Your Facebook Page this month.', source: 'facebook', blocks: [
      repC('f-kpis', 'summary', 'facebook', 'Summary cards', { metrics: ['followers', 'newFollows', 'posts', 'views', 'viewers', 'reactions', 'comments', 'shares', 'engagements', 'engRate'], off: ['reactions', 'comments', 'shares', 'engRate'] }),
      repC('f-fol', 'followers', 'facebook', 'Followers over time'), repC('f-fol-m', 'followersMonth', 'facebook', 'Followers this month')] },
    { id: 'fbPosts', title: 'Facebook Posts', source: 'facebook', blocks: [
      repT('f-posts', 'facebook', 'all', 'post', 'Posts', ['views', 'viewers', 'reactions', 'comments', 'shares', 'engagements', 'engRate'])] },
    { id: 'instagram', title: 'Instagram', note: 'Your Instagram account this month. Stories are not included, as Instagram only keeps their results for 24 hours.', source: 'instagram', blocks: [
      repC('i-kpis', 'summary', 'instagram', 'Summary cards', { metrics: ['followers', 'newFollows', 'posts', 'views', 'reach', 'likes', 'comments', 'shares', 'saves', 'engagements', 'engRate', 'avgWatch', 'totalWatch'], off: ['likes', 'shares', 'engRate', 'avgWatch', 'totalWatch'] }),
      repC('i-demo', 'demo', 'instagram', 'Audience by age and gender', { metric: 'reach' })] },
    { id: 'igPosts', title: 'Instagram Posts', source: 'instagram', blocks: [
      repT('i-posts', 'instagram', 'all', 'post', 'Posts and reels', ['views', 'reach', 'likes', 'comments', 'shares', 'saves', 'engagements', 'engRate', 'avgWatch', 'totalWatch'], { off: ['avgWatch', 'totalWatch'] })] },
    { id: 'metaOverview', title: 'Meta Ads', note: 'Your paid Facebook and Instagram campaigns this month.', source: 'meta', blocks: [
      repC('m-kpis', 'summary', 'meta', 'Summary cards', { metrics: ['reach', 'impressions', 'freq', 'clicks', 'ctr', 'cpc', 'spend'], off: ['freq', 'cpc'] }),
      repC('m-trend', 'trend', 'meta', 'Impressions and link clicks by day', { metric: 'impressions', metric2: 'clicks' }),
      repC('m-demo', 'demo', 'meta', 'Impressions by age and gender', { metric: 'impressions' })] },
    { id: 'metaAds', title: 'All Ads', source: 'meta', blocks: [
      repT('m-ads', 'meta', 'all', 'ad', 'Ads', ['reach', 'impressions', 'clicks', 'ctr', 'cpc', 'spend'])] },
    { id: 'metaAwareness', hidden: true, title: 'Awareness Campaigns', source: 'meta', blocks: [...repTrends('m-aw', 'meta', 'awareness', true), repT('m-aw-camps', 'meta', 'awareness', 'campaign', 'Awareness campaigns', REP_M_AWARENESS)] },
    { id: 'metaTraffic', hidden: true, title: 'Traffic Campaigns', source: 'meta', blocks: [...repTrends('m-tr', 'meta', 'traffic', true), repT('m-tr-camps', 'meta', 'traffic', 'campaign', 'Traffic campaigns', REP_M_TRAFFIC)] },
    { id: 'metaEngagement', hidden: true, title: 'Engagement Campaigns', source: 'meta', blocks: [...repTrends('m-en', 'meta', 'engagement', true), repT('m-en-camps', 'meta', 'engagement', 'campaign', 'Engagement campaigns', REP_M_ENGAGEMENT)] },
    { id: 'metaLeads', hidden: true, title: 'Lead Generation Campaigns', source: 'meta', blocks: [...repTrends('m-ld', 'meta', 'leads', true), repT('m-ld-camps', 'meta', 'leads', 'campaign', 'Lead generation campaigns', REP_M_LEADS)] },
    { id: 'metaSales', hidden: true, title: 'Sales Campaigns', source: 'meta', blocks: [...repTrends('m-sa', 'meta', 'sales', true), repT('m-sa-camps', 'meta', 'sales', 'campaign', 'Sales campaigns', REP_M_SALES)] },
  ] }
};
const REP_TYPE_IDS = Object.keys(REP_TYPES);
function repTypeSources(type) { return [...new Set(REP_TYPES[type].sections.map(s => s.source))]; }
// A report can be sent when at least one of its sources is linked.
function repTypeOk(wsId, type) { return repTypeSources(type).some(p => repHas(wsId, p)); }
function repSourceList(list) { const n = list.map(p => REP_PLATFORM[p]); return n.length > 1 ? `${n.slice(0, -1).join(', ')} or ${n[n.length - 1]}` : n[0]; }

// =====================================================================
// Months
// =====================================================================
// Dev toggle "Review period": pretend it is 10:00 on the 1st of next month, between the end of the report month and
// the send date, when AMs review the upcoming reports.
function repToday() { const n = new Date(); return state.flags.repReview ? new Date(n.getFullYear(), n.getMonth() + 1, 1, 10, 0) : n; }
function repMonthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function repAddMonths(month, n) { const [y, m] = month.split('-').map(Number); return repMonthKey(new Date(y, m - 1 + n, 1)); }
function repMonthDays(month) { const [y, m] = month.split('-').map(Number); return new Date(y, m, 0).getDate(); }
function repMonthLabel(month) { const [y, m] = month.split('-').map(Number); return `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1]} ${y}`; }
function repLastMonth() { return repAddMonths(repMonthKey(repToday()), -1); }
// A client's reports for `month` are sent on cfg.sendDay of the following month at cfg.sendHour:00 (Singapore time).
// Default: the 3rd at 12:00, by when most late conversions have come in. Days stop at the 28th so every month has one.
const REP_SEND_DAY = 3, REP_SEND_HOUR = 12;
function repSendDate(month, cfg) { const [y, m] = month.split('-').map(Number); return new Date(y, m, cfg?.sendDay ?? REP_SEND_DAY, cfg?.sendHour ?? REP_SEND_HOUR, 0); }
function repHourLabel(h) { return `${h % 12 || 12}:00 ${h < 12 ? 'am' : 'pm'}`; }
function repOrdinal(n) { const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
// The next reports to go out: last month's if their send date is still ahead, otherwise this month's.
function repNextMonth(cfg) {
  const last = repLastMonth();
  return repSendDate(last, cfg) > repToday() ? last : repAddMonths(last, 1);
}
// The review period: the next report's month has ended but it hasn't been sent yet (1st of the month to the send
// date). The AM can preview the real report, change its set-up, or cancel the send. Before that the month is in progress.
function repInReview(cfg) { return repMonthKey(repToday()) > repNextMonth(cfg); }
// cfg.skip: the month whose send the AM cancelled.
function repCancelled(cfg) { return cfg.skip === repNextMonth(cfg); }
// Monday-first weekday (0–6) of a day in the month.
function repDow(month, day) { const [y, m] = month.split('-').map(Number); return (new Date(y, m - 1, day).getDay() + 6) % 7; }

// =====================================================================
// Month data (mock). Ads: the platform data at each level, scaled to the month's days. Organic: posts published in
// the month and the account's followers.
// =====================================================================
const repCache = {};
function repMemo(key, fn) { return key in repCache ? repCache[key] : (repCache[key] = fn()); }
function repData(wsId, p, month) { return adsPfData(wsId, p, repMonthDays(month)); }
// "Ran in the month" = at least one impression. Neither API keeps a status history, so delivery decides.
// Mock: about half the paused items did not deliver in a given month.
function repDelivered(row, month) { return row.impressions > 0 && !(row.pfStatus === 'Paused' && adsRng(`${row.id}:${month}:delivered`)() < 0.55); }

// Search terms: what people typed, split from the keyword that matched (Google's search_term_view).
const REP_TERM_TPL = ['{k}', '{k} singapore', '{k} near me', '{k} price', '{k} cost', 'how much is {k}'];
function repTerms(wsId, month) {
  return repMemo(`terms|${wsId}|${month}`, () => repData(wsId, 'google', month).keyword.filter(k => k.impressions > 0).flatMap(k => {
    const r = adsRng(`${k.id}:${month}:terms`), n = 1 + Math.floor(r() * 3);
    const tpls = [REP_TERM_TPL[0], ...adsShuffle(REP_TERM_TPL.slice(1), r)].slice(0, n);
    const w = tpls.map((_, i) => (i ? 0.35 : 1) * (0.6 + r())), sw = w.reduce((a, b) => a + b, 0);
    return tpls.map((t, i) => {
      const o = { id: `${k.id}~t${i}`, level: 'term', name: t.replace('{k}', k.name), keyword: k.name, match: k.match, campType: 'Search', campaignName: k.campaignName, adGroupName: k.adGroupName };
      ['impressions', 'clicks', 'spend', 'conversions', 'allConv', 'convValue', 'engagements'].forEach(key => { const v = (k[key] || 0) * w[i] / sw; o[key] = ADS_PF_INT_KEYS.has(key) ? Math.round(v) : v; });
      return adsPfDerive(o);
    });
  }));
}

// Organic posts. Captions are placeholders; {b} is the brand, {i} the industry.
const REP_POST_TYPES = { facebook: ['Photo', 'Photo', 'Video', 'Reel', 'Link'], instagram: ['Image', 'Carousel', 'Carousel', 'Reel', 'Reel'] };
const REP_CAPTIONS = [
  'Meet the team behind {b}. This week we sat down with our project leads to talk about what a typical day looks like, and what keeps them coming back to work in {i}.',
  'Three things to check before you choose a {i} partner. Swipe through for the questions we get asked most often, and send us yours in the comments.',
  'Our new office hours start next week. Drop by any weekday from 9am to 6pm, or book a time that suits you through the link in our bio.',
  'Behind the scenes: how a project comes together at {b}, from the first call to the final handover.',
  'Thank you to everyone who joined our open house last weekend. Here are a few moments from the day.',
  'Quick tip for the week: small changes that make a big difference. Save this post for later.',
  'We are hiring. If you are interested in {i} and want to grow with a friendly team, we would love to hear from you.',
  'Customer question of the month, answered by our team. Got a question of your own? Leave it below.',
  'A look back at the month at {b}. What would you like to see more of next month?',
  'New this month: a simpler way to get in touch with us. Message us on WhatsApp and our team will reply within one working day.'
];
function repPosts(wsId, p, month) {
  return repMemo(`posts|${wsId}|${p}|${month}`, () => {
    const ws = wsById(wsId), r = adsRng(`${wsId}:${p}:${month}:posts`), days = repMonthDays(month);
    const size = 0.5 + (adsHash(`${wsId}:${p}`) % 100) / 100, n = 6 + Math.floor(r() * 9);
    const brand = ws.name, ind = (ws.industry || 'services').toLowerCase();
    const acct = socialAccounts.find(a => a.workspaceId === wsId && a.platform === p);
    return Array.from({ length: n }, (_, i) => {
      const day = Math.min(days, 1 + Math.floor((i + r()) * days / n));
      const type = REP_POST_TYPES[p][Math.floor(r() * REP_POST_TYPES[p].length)], video = /Video|Reel/.test(type);
      const views = Math.round(size * (video ? 3200 : 1300) * (0.3 + r() * 1.7)), reach = Math.round(views * (0.55 + r() * 0.3));
      const likes = Math.round(reach * (0.01 + r() * 0.05)), comments = Math.round(likes * (0.03 + r() * 0.12)), shares = Math.round(likes * (0.02 + r() * 0.15));
      const saves = p === 'instagram' ? Math.round(likes * (0.05 + r() * 0.2)) : 0, engagements = likes + comments + shares + saves;
      const caption = REP_CAPTIONS[Math.floor(r() * REP_CAPTIONS.length)].replace(/\{b\}/g, brand).replace(/\{i\}/g, ind);
      const code = adsHash(`${wsId}:${p}:${month}:${i}`).toString(36).toUpperCase();
      const link = p === 'facebook' ? `https://www.facebook.com/${acct ? acct.id : '0'}/posts/${adsHash(code)}` : `https://www.instagram.com/${type === 'Reel' ? 'reel' : 'p'}/C${code}/`;
      return { id: `${wsId}:${p}:${month}:${i}`, level: 'post', name: caption, caption, date: `${month}-${String(day).padStart(2, '0')}`, day, campType: type,
        format: video ? 'Video' : type === 'Carousel' ? 'Carousel' : 'Image', views, viewers: reach, reach, reactions: likes, likes, comments, shares, saves, engagements,
        engRate: reach ? engagements / reach * 100 : 0, link, impressions: views, ...repReelWatch(`${wsId}:${p}:${month}:${i}`, type, views) };
    }).sort((a, b) => a.day - b.day);
  });
}
// The account's follower count at the end of each day since January 2025, by date (mock: it rises a little faster on
// the day a post goes live and the day after).
function repFollowerHistory(wsId, p) {
  return repMemo(`folh|${wsId}|${p}`, () => {
    const base = 900 + adsHash(`${wsId}:${p}:followers`) % 8000, r = adsRng(`${wsId}:${p}:followers`), out = {};
    let f = base;
    for (let m = '2025-01'; m <= repMonthKey(repToday()); m = repAddMonths(m, 1)) {
      const posted = new Set(repPosts(wsId, p, m).map(x => x.day));
      for (let d = 1; d <= repMonthDays(m); d++) {
        f += Math.round(base * (r() * 0.0008 + (posted.has(d) ? 0.0016 : posted.has(d - 1) ? 0.0008 : 0)));
        out[`${m}-${String(d).padStart(2, '0')}`] = f;
      }
    }
    return out;
  });
}
// Watch time of a reel (mock; on its own random stream). reelPlays: the reel's views, so totals can average it.
function repReelWatch(id, type, views) {
  if (type !== 'Reel') return {};
  const avgWatch = 4 + adsRng(`${id}:watch`)() * 20;
  return { reelPlays: views, avgWatch, totalWatch: avgWatch * views };
}
// Followers through the month.
function repFollowers(wsId, p, month) {
  const h = repFollowerHistory(wsId, p);
  return Array.from({ length: repMonthDays(month) }, (_, i) => ({ day: i + 1, value: h[`${month}-${String(i + 1).padStart(2, '0')}`] }));
}
// Organic charts cover the whole time the agency has managed the client's social media (ws.smmSince), up to 12 months,
// to the end of the report month.
function repSmmStart(wsId, month) {
  const since = wsById(wsId).smmSince || `${month}-01`, min = `${repAddMonths(month, -11)}-01`;
  return since < min ? min : since > `${month}-01` ? `${month}-01` : since;
}
// Followers by date from `start`, and the dates posts went live in that period.
function repFollowerSeries(wsId, p, month, start) {
  const pts = [], posts = new Set();
  for (let m = start.slice(0, 7); m <= month; m = repAddMonths(m, 1)) {
    repFollowers(wsId, p, m).forEach(d => { const date = `${m}-${String(d.day).padStart(2, '0')}`; if (date >= start) pts.push({ date, day: d.day, value: d.value, cur: m === month }); });
    repPosts(wsId, p, m).forEach(x => posts.add(x.date));
  }
  return { pts, marks: pts.map((pt, i) => posts.has(pt.date) ? i : -1).filter(i => i >= 0) };
}
// The month's totals. Ads: the campaigns that ran (in a category, if given), so they match the campaigns table.
function repTotals(wsId, p, month, category) {
  if (repIsAds(p)) {
    const cat = repCategory(p, category);
    return adsPfSum(repData(wsId, p, month).campaign.filter(r => repDelivered(r, month) && repInCat(r, cat)));
  }
  return repMemo(`tot|${wsId}|${p}|${month}`, () => {
    const posts = repPosts(wsId, p, month), fol = repFollowers(wsId, p, month), sum = k => posts.reduce((s, x) => s + (x[k] || 0), 0);
    const o = Object.fromEntries(['views', 'viewers', 'reach', 'reactions', 'likes', 'comments', 'shares', 'saves', 'engagements'].map(k => [k, sum(k)]));
    // Viewers and reach can't be added up across posts: the product asks for the account's monthly figure.
    o.viewers = Math.round(o.viewers * 0.62); o.reach = Math.round(o.reach * 0.62);
    o.engRate = o.reach ? o.engagements / o.reach * 100 : 0;
    o.followers = fol[fol.length - 1].value; o.newFollows = Math.round((fol[fol.length - 1].value - fol[0].value) * 1.25);
    o.posts = posts.length;
    o.reelPlays = sum('reelPlays'); o.totalWatch = sum('totalWatch'); o.avgWatch = o.reelPlays ? o.totalWatch / o.reelPlays : 0;
    return o;
  });
}
// Rows a table lists (before the row limit), sorted highest first.
function repRows(wsId, b, month) {
  const cat = repCategory(b.platform, b.category), level = b.rows;
  let rows;
  if (level === 'convType') return repConvTypes(wsId, month);   // keeps each campaign's actions under it
  if (level === 'post') rows = repPosts(wsId, b.platform, month);
  else if (level === 'term') rows = repTerms(wsId, month);
  else rows = repData(wsId, b.platform, month)[level].filter(r => repDelivered(r, month));
  rows = rows.filter(r => repInCat(r, cat));
  return [...rows].sort((a, c) => (c[b.sort] || 0) - (a[b.sort] || 0));
}
// Deterministic shares for a breakdown, adding up to 1.
function repShares(key, n, skew = 1) {
  const r = adsRng(key);
  const w = Array.from({ length: n }, (_, i) => (0.35 + r()) / Math.pow(i + 1, skew * 0.35));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}
function repBreakdown(wsId, p, dim, month, metric) {
  const total = repTotals(wsId, p, month)[metric] || 0;
  const labels = REP_DIMS[dim][p];
  const shares = repShares(`${wsId}:${p}:${dim}:${month}`, labels.length, dim === 'convActions' ? 2 : 1);
  return labels.map((label, i) => ({ label, value: total * shares[i] }));
}
// Age × gender: each age group's value split into women, men and unknown.
function repDemo(wsId, p, month, metric) {
  return repBreakdown(wsId, p, 'age', month, metric).map(a => {
    const r = adsRng(`${wsId}:${p}:${a.label}:${month}:gender`);
    const f = 0.4 + r() * 0.25, u = 0.02 + r() * 0.04;
    return { label: a.label, female: a.value * f * (1 - u), male: a.value * (1 - f) * (1 - u) };
  });
}
// Gender on its own (Google reports it apart from age): women, men and unknown, adding up to the month's total.
function repGender(wsId, p, month, metric) {
  const total = repTotals(wsId, p, month)[metric] || 0, r = adsRng(`${wsId}:${p}:${month}:${metric}:gender`);
  const f = 0.4 + r() * 0.25, u = 0.03 + r() * 0.05;
  return [{ label: 'Female', value: total * f * (1 - u), ink: REP_INK.female }, { label: 'Male', value: total * (1 - f) * (1 - u), ink: REP_INK.male }, { label: 'Unknown', value: total * u, ink: REP_INK.unknown }];
}
// Daily values adding up to the month's total (weekends a little lower). Followers are a running count instead.
// Cost per conversion is worked out each day from that day's cost and conversions.
function repDaily(wsId, p, month, metric, category) {
  if (metric === 'followers') return repFollowers(wsId, p, month);
  if (metric === 'cpa') {
    const cost = repDaily(wsId, p, month, 'spend', category), conv = repDaily(wsId, p, month, 'conversions', category);
    return cost.map((d, i) => ({ day: d.day, value: conv[i].value ? d.value / conv[i].value : 0 }));
  }
  const days = repMonthDays(month), total = repTotals(wsId, p, month, category)[metric] || 0;
  const r = adsRng(`${wsId}:${p}:${category || 'all'}:${month}:${metric}:daily`);
  const w = Array.from({ length: days }, (_, i) => (repDow(month, i + 1) >= 5 ? 0.78 : 1) * (0.8 + r() * 0.4) * (1 + 0.15 * Math.sin(i / 4)));
  const s = w.reduce((a, b) => a + b, 0);
  // Rates (CTR, engagement rate) stay near the month's rate instead of adding up.
  const rate = repCol(p, metric)?.t === 'pct';
  return w.map((x, i) => ({ day: i + 1, value: rate ? total * (0.85 + x * 0.15) : total * x / s }));
}
// Campaign start dates (mock: each campaign started up to two months before the report month). The product reads
// Google campaign.start_date and Meta start_time.
function repCampStart(row, month) {
  const r = adsRng(`${row.id}:start`), back = Math.floor(r() * 3), m = repAddMonths(month, -back);
  return `${m}-${String(1 + Math.floor(r() * (back ? repMonthDays(m) : 10))).padStart(2, '0')}`;
}
// Time-series charts cover the whole campaign: from the earliest start of the campaigns (in the chart's category) that
// ran in the report month, but no more than two months before it (campaigns typically last up to three months).
function repTrendStart(wsId, p, month, category) {
  const cat = repCategory(p, category), min = `${repAddMonths(month, -2)}-01`;
  const first = repData(wsId, p, month).campaign.filter(r => repDelivered(r, month) && repInCat(r, cat)).map(c => repCampStart(c, month)).sort()[0] || `${month}-01`;
  return first < min ? min : first;
}
// Daily values from `start` to the end of the report month; cur marks the report month's days.
function repSeries(wsId, p, month, metric, category, start) {
  const out = [];
  for (let m = start.slice(0, 7); m <= month; m = repAddMonths(m, 1)) {
    repDaily(wsId, p, m, metric, category).forEach(d => {
      const date = `${m}-${String(d.day).padStart(2, '0')}`;
      if (date >= start) out.push({ date, day: d.day, value: d.value, cur: m === month });
    });
  }
  return out;
}
function repShortDate(date) { const [, m, d] = date.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; }

// =====================================================================
// Sample data for previews: made-up, obviously fake names and text over a mock data set that has every kind of
// campaign, so every section the AM turns on shows. Real reports (Sent Reports) use the client's own data.
// =====================================================================
const REP_LOREM = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];
let repSampling = false;   // true while sample pages are being drawn (drawing is synchronous)
const repSampleNums = {};
function repSampleNum(kind, key) {
  const m = repSampleNums[kind] || (repSampleNums[kind] = new Map());
  if (!m.has(key)) m.set(key, m.size + 1);
  return m.get(key);
}
function repLorem(seed, n) { const r = adsRng(`lorem:${seed}`); return Array.from({ length: n }, () => REP_LOREM[Math.floor(r() * REP_LOREM.length)]).join(' '); }
function repCap(s) { return s[0].toUpperCase() + s.slice(1); }
// A name as printed: itself, or its stand-in in a sample. kind: campaign | adgroup | adset | ad | keyword | term.
function repName(kind, name) {
  if (!repSampling || !name) return name;
  const n = repSampleNum(kind, name);
  return { campaign: `Lorem ipsum campaign ${n}`, adgroup: `Dolor sit ad group ${n}`, adset: `Dolor sit ad set ${n}`, ad: `Amet consectetur ad ${n}`,
    keyword: repLorem(`kw${n}`, 2 + n % 2), term: repLorem(`term${n}`, 3 + n % 2) }[kind] || name;
}
// The workspace whose mock numbers fill sample previews: the one running the most kinds of campaigns.
function repSampleWs() {
  return repMemo('sample-ws', () => {
    const score = w => wsPlatforms(w.id).length * 10 + new Set(repData(w.id, 'google', repLastMonth()).campaign.map(c => c.campType)).size;
    return [...activeWorkspaces()].filter(w => wsPlatforms(w.id).includes('google')).sort((a, b) => score(b) - score(a))[0].id;
  });
}

// =====================================================================
// Each client's report set-up (in memory, like the rest of the demo)
// =====================================================================
// cfg: { owner (agency member: "Prepared by" and reply-to), sendDay (1–28), sendHour (0–23, Singapore time), subject, message, to: [{ id, name, email }],
//        cc: [agency member ids], reports: { sem | smm: { on, off: [section ids turned off], charts: [chart ids turned off],
//        hide: { table or summary cards id: [column / number keys turned off] } } }, createdAt }
const repConfigs = {};
const repHistories = {};
const REP_SUBJECT = 'Your {month} marketing results: {client}';
const REP_MESSAGE = 'Hi,\n\nAttached are your marketing results for {month}.\n\nReply to this email if you have any questions.\n\n{am}';
function repNewReports(wsId, on = REP_TYPE_IDS) {
  return Object.fromEntries(REP_TYPE_IDS.map(t => {
    const ss = REP_TYPES[t].sections;
    return [t, { on: on.includes(t) && repTypeOk(wsId, t), off: ss.filter(s => s.hidden).map(s => s.id), charts: ss.flatMap(s => s.blocks).filter(b => b.hidden).map(b => b.id), hide: {} }];
  }));
}
function repNewConfig(wsId, o = {}) {
  const owner = wsPrimaryContact(wsId);
  const ws = wsById(wsId);
  return {
    owner: CURRENT_USER_ID, sendDay: REP_SEND_DAY, sendHour: REP_SEND_HOUR, subject: REP_SUBJECT, message: REP_MESSAGE,
    to: [...(owner ? [{ id: uid('rr'), name: owner.name, email: owner.email }] : []), { id: uid('rr'), name: 'Marketing Team', email: `marketing@${ws.site || 'example.com'}` }],
    cc: [CURRENT_USER_ID], reports: repNewReports(wsId), createdAt: repToday().toISOString(), ...o
  };
}
// Every workspace has a set-up, with both reports off to begin with. Seed: a workspace with every source linked has had
// both reports on since June 2026 and sent every month since July.
function repSeed(wsId) {
  if (!['google', 'meta', 'facebook', 'instagram'].every(p => repHas(wsId, p))) { repHistories[wsId] = []; return repNewConfig(wsId, { reports: repNewReports(wsId, []) }); }
  const cfg = repNewConfig(wsId, { createdAt: '2026-06-20T10:00:00+08:00' });
  const types = REP_TYPE_IDS.filter(t => cfg.reports[t].on);
  const hist = [];
  for (let m = '2026-07'; repSendDate(m, cfg) <= repToday(); m = repAddMonths(m, 1)) {
    hist.unshift({ id: uid('rh'), month: m, sentAt: new Date(repSendDate(m, cfg).getTime() + 3 * 60000).toISOString(), to: cfg.to.map(r => r.email), status: 'sent', types });
  }
  // One of each past status, newest first: Failed (the SEM Report couldn't be generated), Ready to send (it failed and
  // has since been regenerated), Cancelled (the AM cancelled the send during review), then Sent.
  const failure = { sentAt: null, failedTypes: ['sem'], shortReason: 'SEM Report couldn’t be generated: Google Ads data unavailable.',
    reason: 'The SEM Report couldn’t be generated: Google Ads data could not be fetched (Google returned a temporary error). Tried again 3 times over 3 days. The email was held.' };
  if (hist[0]) Object.assign(hist[0], failure, { status: 'failed' });
  if (hist[1]) { Object.assign(hist[1], failure, { status: 'failed' }); repRetried[hist[1].id] = ['sem']; }
  if (hist[2]) Object.assign(hist[2], { status: 'cancelled', sentAt: null });
  repHistories[wsId] = hist;
  return cfg;
}
function repConfig(wsId) {
  if (!(wsId in repConfigs)) repConfigs[wsId] = repSeed(wsId);
  return repConfigs[wsId];
}
function repHistory(wsId) {
  repConfig(wsId);
  const list = repHistories[wsId] || (repHistories[wsId] = []);
  return list;
}
// History entry status: sent | failed (failedTypes: the reports that couldn't be generated; the email is held) |
// cancelled (the AM cancelled the send). Reports regenerated by the AM after a failure, by history entry id. A failed email can be sent once none is still failing.
const repRetried = {};
function repStillFailing(h) { return (h.failedTypes || []).filter(t => !(repRetried[h.id] || []).includes(t)); }
// A report's settings, and what goes in it for this client.
function repRep(cfg, type) { return cfg.reports[type]; }
function repSectionOk(wsId, s) { return repHas(wsId, s.source); }
function repSectionOn(wsId, cfg, type, s) { return repSectionOk(wsId, s) && !repRep(cfg, type).off.includes(s.id); }
function repTypeOn(wsId, cfg, type) { return repRep(cfg, type).on && repTypeOk(wsId, type) && REP_TYPES[type].sections.some(s => repSectionOn(wsId, cfg, type, s)); }
function repTypesOn(wsId, cfg) { return REP_TYPE_IDS.filter(t => repTypeOn(wsId, cfg, t)); }
// The columns of a table, or the summary cards of a section, that are turned on. hide[block id] is set once the AM
// changes them; until then, everything but the block's `off` list is on.
function repKeys(b) { return b.kind === 'table' ? b.cols : b.metrics; }
function repHidden(cfg, type, b) { return repRep(cfg, type).hide[b.id] || b.off || []; }
function repShownCols(cfg, type, b) { const hide = repHidden(cfg, type, b); return repKeys(b).filter(k => !hide.includes(k)); }
// The blocks of a report, in order: each section turned on becomes a heading, then its charts and tables.
// Summary cards have no switch: they are in the section unless every card is deselected.
function repChartOn(cfg, type, b) { return b.chart === 'summary' ? repShownCols(cfg, type, b).length > 0 : !(repRep(cfg, type).charts || []).includes(b.id); }
function repBlocks(wsId, cfg, type) {
  return REP_TYPES[type].sections.filter(s => repSectionOn(wsId, cfg, type, s)).flatMap(s => [
    { kind: 'text', id: s.id, title: s.title, note: s.note || '' },
    ...s.blocks.filter(b => b.kind === 'table' || repChartOn(cfg, type, b)).map(b => b.kind === 'table' ? { ...b, columns: repShownCols(cfg, type, b), sort: repSortKey(b.platform, repShownCols(cfg, type, b)) } : b.chart === 'summary' ? { ...b, metrics: repShownCols(cfg, type, b) } : b)
  ]);
}
// Status of a workspace's reports: none | paused | failed | scheduled.
function repStatus(wsId) {
  const cfg = repConfig(wsId);
  return repTypesOn(wsId, cfg).length && cfg.to.length ? 'active' : 'inactive';
}
// The dot carries the colour; the text stays dark for contrast, except failures (red text passes AA).
const REP_STATUS = { active: ['Active', 'dot-green-strong', ''], inactive: ['Inactive', 'dot-grey', ''] };
// The latest email failed (shown in red under the status, whether or not reports are still active).
function repFailed(wsId) { return repHistory(wsId)[0]?.status === 'failed'; }
// Why a workspace's reports aren't being sent.
function repOffReason(wsId, cfg) {
  return !repTypesOn(wsId, cfg).length ? 'No report is turned on' : 'No recipients';
}
// Status pills (dark text on a tinted background, readable at small sizes). kind: sent | failed | scheduled | review | off
function repPill(kind, label) { return `<span class="rep-pill is-${kind}">${esc(label)}</span>`; }
function repStatusDot(s) { const [l, d, c] = REP_STATUS[s]; return `<span class="dot-label ${c}"><span class="dot ${d}"></span>${esc(l)}</span>`; }
function repFill(text, wsId, month) {
  const cfg = repConfig(wsId), am = memberById(cfg?.owner);
  return String(text).replace(/\{client\}/g, wsById(wsId).name).replace(/\{month\}/g, repMonthLabel(month)).replace(/\{am\}/g, am ? am.name : '');
}
function repFileName(wsId, type, month) { return `${wsById(wsId).name.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')}_${REP_TYPES[type].file}_${month}.pdf`; }
function repTypeChips(types) { return types.length ? `<span class="row wrap rep-type-chips">${types.map(t => `<span class="chip">${REP_TYPES[t].short}</span>`).join('')}</span>` : '<span class="t-muted">None</span>'; }
function repJoin(list) { return list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list[0] || ''; }

// =====================================================================
// PDF: pages (A4 landscape, 1123 × 794 px at 96 dpi), charts as inline SVG
// =====================================================================
// Report palette, after OOm's brand: wine for the main series, slate for a second, blush tints behind.
const REP_INK = { google: '#A51F4E', meta: '#A51F4E', facebook: '#A51F4E', instagram: '#A51F4E', second: '#3E5468', female: '#A51F4E', male: '#3E5468', unknown: '#968A8F', grid: '#EEE7E9', text: '#6B6266', ink: '#2A2326', band: '#FBEFF3', bandText: '#7A1739' };
function repShort(v, key, p) {
  const c = repCol(p || 'google', key);
  if (c && c.t === 'pct') return `${Number(v).toFixed(1)}%`;
  if (c && /^money/.test(c.t)) return v >= 10000 ? `$${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k` : fmtMoney(v);
  return v >= 10000 ? `${(v / 1000).toFixed(v >= 100000 ? 0 : 1)}k` : fmtNum(Math.round(v));
}
// Line chart (daily trend), with an optional second metric on its own scale (right axis, dashed).
// Points over several months (with date and cur) get ticks on the 1st and 15th (1st only past four months), and the
// report month is shaded. marks: indexes of days to flag, e.g. when posts went live. Followers are drawn from just
// below their lowest value, so growth is visible.
function repSvgLine(points, p, key, points2, key2, marks = []) {
  const W = 1000, H = 230, L = 60, R = points2 ? 64 : 10, B = points2 || marks.length ? 44 : 26, T = 10;
  const axis = pts => Math.max(...pts.map(x => x.value), 1) * 1.1;
  const fMin = Math.min(...points.map(pt => pt.value)), fMax = Math.max(...points.map(pt => pt.value)), span = Math.max(fMax - fMin, 10);
  const lo = key === 'followers' ? Math.max(0, Math.floor(fMin - span * 0.2)) : 0;
  const max = key === 'followers' ? Math.ceil(fMax + span * 0.1) : axis(points), max2 = points2 ? axis(points2) : 1;
  const x = i => L + (W - L - R) * (points.length > 1 ? i / (points.length - 1) : 0);
  const y = (v, m) => T + (H - T - B) * (1 - (m === max ? (v - lo) / (max - lo) : v / m));
  const path = (pts, m) => pts.map((pt, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pt.value, m).toFixed(1)}`).join('');
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const c1 = REP_INK[p], c2 = REP_INK.second;
  const multi = points.some(pt => pt.date && !pt.cur), from = points.findIndex(pt => pt.cur);
  const band = multi && from > 0 ? `<rect x="${((x(from - 1) + x(from)) / 2).toFixed(1)}" y="${T}" width="${(W - R - (x(from - 1) + x(from)) / 2).toFixed(1)}" height="${H - T - B}" fill="${REP_INK.band}"/>
    <text x="${((x(from - 1) + x(from)) / 2 + 8).toFixed(1)}" y="${T + 14}" font-size="11" font-weight="700" fill="${REP_INK.bandText}">${esc(repMonthLabel(points[from].date.slice(0, 7)))}</text>` : '';
  const tick = (pt, i) => multi ? pt.day === 1 || (pt.day === 15 && points.length <= 125) : i % 5 === 0 || i === points.length - 1;
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(repColLabel(p, key))}${key2 ? ` and ${esc(repColLabel(p, key2))}` : ''} by day">
    ${band}
    ${ticks.map(f => `<line x1="${L}" x2="${W - R}" y1="${y(lo + (max - lo) * f, max)}" y2="${y(lo + (max - lo) * f, max)}" stroke="${REP_INK.grid}"/><text x="${L - 8}" y="${y(lo + (max - lo) * f, max) + 4}" text-anchor="end" font-size="11" fill="${REP_INK.text}">${esc(repShort(lo + (max - lo) * f, key, p))}</text>
 ${points2 ? `<text x="${W - R + 8}" y="${y(lo + (max - lo) * f, max) + 4}" font-size="11" fill="${REP_INK.text}">${esc(repShort(max2 * f, key2, p))}</text>` : ''}`).join('')}
    ${points.map((pt, i) => tick(pt, i) ? `<text x="${x(i)}" y="${H - B + 18}" text-anchor="middle" font-size="11" fill="${REP_INK.text}">${multi ? repShortDate(pt.date) : pt.day}</text>` : '').join('')}
    ${marks.map(i => `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${c1}" stroke-opacity=".22"/><circle cx="${x(i).toFixed(1)}" cy="${H - B}" r="3.5" fill="${c1}"/>`).join('')}
    ${points2 ? '' : `<path d="${path(points, max)} L${x(points.length - 1)},${y(lo, max)} L${x(0)},${y(lo, max)}Z" fill="${c1}" opacity=".10"/>`}
    <path d="${path(points, max)}" fill="none" stroke="${c1}" stroke-width="2.5"/>
    ${points2 ? `<path d="${path(points2, max2)}" fill="none" stroke="${c2}" stroke-width="2.5" stroke-dasharray="7 5"/>
      <line x1="${L}" x2="${L + 24}" y1="${H - 8}" y2="${H - 8}" stroke="${c1}" stroke-width="2.5"/><text x="${L + 30}" y="${H - 4}" font-size="11" fill="${REP_INK.ink}">${esc(repColLabel(p, key))} (left)</text>
      <line x1="${L + 260}" x2="${L + 284}" y1="${H - 8}" y2="${H - 8}" stroke="${c2}" stroke-width="2.5" stroke-dasharray="7 5"/><text x="${L + 290}" y="${H - 4}" font-size="11" fill="${REP_INK.ink}">${esc(repColLabel(p, key2))} (right)</text>` : ''}
    ${marks.length ? `<line x1="${L}" x2="${L + 24}" y1="${H - 8}" y2="${H - 8}" stroke="${c1}" stroke-width="2.5"/><text x="${L + 30}" y="${H - 4}" font-size="11" fill="${REP_INK.ink}">${esc(repColLabel(p, key))}</text>
      <circle cx="${L + 210}" cy="${H - 8}" r="3.5" fill="${c1}"/><line x1="${L + 210}" x2="${L + 210}" y1="${H - 18}" y2="${H - 8}" stroke="${c1}" stroke-opacity=".4"/><text x="${L + 220}" y="${H - 4}" font-size="11" fill="${REP_INK.ink}">A post went live</text>` : ''}
  </svg>`;
}
// Horizontal bars. items: [{ label, value }].
function repSvgBars(items, p, key, W = 1000, L = 230, row = 24) {
  const H = items.length * row + 4, bh = Math.min(row - 9, 22);
  const max = Math.max(...items.map(i => i.value), 1);
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(repColLabel(p, key))} breakdown">
    ${items.map((it, i) => {
      const w = (W - L - 110) * it.value / max, yy = i * row + 2, ty = yy + row / 2 + 4;
      return `<text x="${L - 10}" y="${ty}" text-anchor="end" font-size="12" fill="${REP_INK.ink}">${esc(it.label.length > 34 ? it.label.slice(0, 33) + '…' : it.label)}</text>
        <rect x="${L}" y="${yy + (row - bh) / 2}" width="${Math.max(2, w).toFixed(1)}" height="${bh}" rx="3" fill="${it.ink || REP_INK[p]}"/>
        <text x="${L + w + 8}" y="${ty}" font-size="12" fill="${REP_INK.text}">${esc(repFmt(p, key, it.value))}</text>`;
    }).join('')}
  </svg>`;
}
// Columns, one per item, with the value on top. Half width: four to a page.
function repSvgCols(items, p, key) {
  const W = 500, H = 220, L = 10, B = 26, T = 20;
  const max = Math.max(...items.map(i => i.value), 1);
  const gw = (W - L * 2) / items.length, bw = Math.min(44, gw * 0.62);
  const y = v => T + (H - T - B) * (1 - v / max);
  return `<svg class="rep-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(repColLabel(p, key))} by age">
    <line x1="${L}" x2="${W - L}" y1="${y(0)}" y2="${y(0)}" stroke="${REP_INK.grid}"/>
    ${items.map((it, i) => {
      const cx = L + gw * i + gw / 2;
      return `<rect x="${(cx - bw / 2).toFixed(1)}" y="${y(it.value).toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - y(it.value)).toFixed(1)}" rx="3" fill="${it.ink || REP_INK[p]}"/>
        <text x="${cx}" y="${(y(it.value) - 6).toFixed(1)}" text-anchor="middle" font-size="11" fill="${REP_INK.text}">${esc(repShort(it.value, key, p))}</text>
        <text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="12" fill="${REP_INK.ink}">${esc(it.label)}</text>`;
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
        <text x="${cx}" y="${H - 22}" text-anchor="middle" font-size="12" fill="${REP_INK.ink}">${esc(r.label)}</text>`;
    }).join('')}
    <rect x="${L}" y="${H - 12}" width="10" height="10" fill="${REP_INK.female}"/><text x="${L + 16}" y="${H - 3}" font-size="11" fill="${REP_INK.text}">Women</text>
    <rect x="${L + 80}" y="${H - 12}" width="10" height="10" fill="${REP_INK.male}"/><text x="${L + 96}" y="${H - 3}" font-size="11" fill="${REP_INK.text}">Men</text>
  </svg>`;
}
function repChartBody(wsId, b, month) {
  const p = b.platform, key = b.metric || 'spend';
  const empty = text => `<div class="rep-chart-empty">${esc(text)}</div>`;
  switch (b.chart) {
    case 'summary': {
      const now = repTotals(wsId, p, month), keys = b.metrics.filter(k => repCol(p, k));
      return `<div class="rep-kpis" style="grid-template-columns:repeat(${keys.length <= 4 ? keys.length : Math.ceil(keys.length / 2)}, minmax(0, 1fr))">${keys.map(k => `<div class="rep-kpi"><div class="rep-kpi-label">${esc(repColLabel(p, k))}</div><div class="rep-kpi-val">${esc(repFmt(p, k, now[k] || 0))}</div></div>`).join('')}</div>`;
    }
    case 'trend': {
      const start = repTrendStart(wsId, p, month, b.category);
      return repSvgLine(repSeries(wsId, p, month, key, b.category, start), p, key, b.metric2 ? repSeries(wsId, p, month, b.metric2, b.category, start) : null, b.metric2);
    }
    // Over time: the whole service period, report month shaded. This month: with the days posts went live (over a long
    // period the post markers are too dense to read).
    case 'followers': return repSvgLine(repFollowerSeries(wsId, p, month, repSmmStart(wsId, month)).pts, p, 'followers');
    case 'followersMonth': { const f = repFollowerSeries(wsId, p, month, `${month}-01`); return repSvgLine(f.pts, p, 'followers', null, null, f.marks); }
    case 'byCampaign': {
      const items = repRows(wsId, { platform: p, category: 'all', rows: 'campaign', sort: key }, month).slice(0, 10).map(r => ({ label: repName('campaign', r.name), value: r[key] || 0 }));
      return items.length ? repSvgBars(items, p, key) : empty('No campaigns ran this month.');
    }
    case 'age': return repSvgCols(repBreakdown(wsId, p, 'age', month, key), p, key);
    case 'gender': return repSvgBars(repGender(wsId, p, month, key), p, key, 500, 80, 44);
    case 'demo': return repSvgDemo(repDemo(wsId, p, month, key), p, key);
  }
  return '';
}
// "from 14 Aug, since the campaigns began. October 2026 is shaded." or ", October 2026" when the campaigns began in the month.
function repTrendSpan(wsId, b, month) {
  const start = repTrendStart(wsId, b.platform, month, b.category);
  return start.slice(0, 7) === month ? `, ${repMonthLabel(month)}` : `, ${repShortDate(start)} to the end of ${repMonthLabel(month)}, since the campaigns began. ${repMonthLabel(month)} is shaded`;
}
function repSmmSpan(wsId, month) {
  const start = repSmmStart(wsId, month), from = start.slice(0, 7) < month.slice(0, 4) + '-01' ? `${repShortDate(start)} ${start.slice(0, 4)}` : repShortDate(start);
  return start.slice(0, 7) === month ? `, ${repMonthLabel(month)}` : `, ${from} to the end of ${repMonthLabel(month)}, since we started managing the account. ${repMonthLabel(month)} is shaded`;
}
function repChartSub(b, month, wsId) {
  const m = repMonthLabel(month), p = b.platform;
  const metric = b.metric ? repColLabel(p, b.metric) : '';
  return { summary: m, trend: `${metric}${b.metric2 ? ` (left) and ${repColLabel(p, b.metric2)} (right)` : ''} by day${b.chart === 'trend' ? repTrendSpan(wsId, b, month) : ''}`, followers: `Followers at the end of each day${repSmmSpan(wsId, month)}`, followersMonth: `Followers at the end of each day, ${m}. Dots mark the days a post went live`,
    byCampaign: `Top 10 campaigns by ${metric}, ${m}`, age: `${m}, by age group`, gender: `${m}, by gender`,
    demo: p === 'instagram' ? `Accounts reached by age and gender, ${m}. Unknown gender not shown.` : `${metric} by age and gender, ${m}. Unknown gender not shown.` }[b.chart] || m;
}

// Thumbnail: drawn from the format here (the product stores the creative's or post's image when the PDF is generated).
function repThumb(row) {
  const h = adsHash(row.id) % 360, bg = `hsl(${h} 55% 88%)`, fg = `hsl(${h} 45% 32%)`;
  const glyph = {
    Video: `<path d="M16 12 L28 20 L16 28 Z" fill="${fg}"/>`,
    Carousel: `<rect x="13" y="9" width="18" height="20" rx="2" fill="${fg}" opacity=".45"/><rect x="9" y="12" width="18" height="20" rx="2" fill="${fg}"/>`,
    Image: `<circle cx="27" cy="13" r="3.5" fill="${fg}"/><path d="M7 31 L16 19 L22 26 L26 22 L33 31 Z" fill="${fg}"/>`
  }[row.format] || '';
  return `<svg class="rep-thumb" viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="6" fill="${bg}"/>${glyph}</svg>`;
}
// Responsive search ad text (mock): the first three headlines and the first description, as written.
function repRsa(row, wsId) {
  if (repSampling) return { headlines: [1, 2, 3].map(i => repCap(repLorem(`${row.id}:h${i}`, 3))), desc: `${repCap(repLorem(`${row.id}:d`, 14))}.`, url: 'https://www.example.com' };
  const ws = wsById(wsId), r = adsRng(`${row.id}:rsa`);
  const ctas = ['Speak to Our Team', 'Get a Quote Today', 'Book a Consultation', 'Enquire Online'];
  return { headlines: [row.adGroupName, ws.name, ctas[Math.floor(r() * ctas.length)]],
    desc: `Find out how ${ws.name} can help your business. Talk to our team and get a reply within one working day.`,
    url: row.finalUrl || `https://${ws.site}` };
}
// Where a row links to from the PDF: a post itself, or a Meta ad's shareable preview link. Search ads show their own
// URL instead. Samples link to example.com.
function repLink(row, b) {
  const l = b.rows === 'post' ? { href: row.link, label: 'View post' }
    : b.rows === 'ad' && b.platform === 'meta' ? { href: `https://fb.me/adspreview${adsHash(row.id).toString(36)}`, label: 'View ad' } : null;
  return l && repSampling ? { ...l, href: 'https://www.example.com' } : l;
}
function repA(l) { return l ? `<a class="rep-link" href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>` : ''; }
function repRowCell(wsId, r, b) {
  const level = b.rows;
  const camp = repName('campaign', r.campaignName), group = repName(b.platform === 'meta' ? 'adset' : 'adgroup', r.adGroupName);
  if (level === 'ad' && r.campType === 'Search' && b.platform === 'google') {
    const a = repRsa(r, wsId);
    return `<div class="rep-ad"><div class="rep-ad-text"><div class="rep-rsa-head">${esc(a.headlines.join(' | '))}</div><a class="rep-rsa-url" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.url)}</a>
      <div class="rep-rsa-desc">${esc(a.desc)}</div><div class="rep-ad-sub">${esc(`${camp} › ${group}`)}</div></div></div>`;
  }
  if (level === 'convType') {
    const name = r.sub ? (repSampling ? repCap(repLorem(r.name, 2)) : r.name) : repName('campaign', r.name);
    return `<div class="${r.sub ? 'rep-conv-action' : 'rep-ad-name'}">${esc(name)}</div>`;
  }
  if (level === 'post') {
    const caption = repSampling ? `${repCap(repLorem(r.id, 34))}.` : r.caption;
    return `<div class="rep-ad">${repThumb(r)}<div class="rep-ad-text"><div class="rep-caption">${esc(caption)}</div><div class="rep-ad-sub">${esc(`${fmtDate(r.date)} · ${r.campType}`)} · ${repA(repLink(r, b))}</div></div></div>`;
  }
  const typeLabel = b.platform === 'google' && r.campType === 'Video' ? 'YouTube' : r.campType;
  const name = repName(level === 'adgroup' && b.platform === 'meta' ? 'adset' : level, r.name);
  const sub = { campaign: typeLabel, adgroup: camp, ad: `${typeLabel} · ${camp} › ${group}`, keyword: `${camp} › ${group}`, term: `Keyword: ${repName('keyword', r.keyword)}` }[level] || '';
  const thumb = level === 'ad' ? repThumb(r) : '';
  const link = repLink(r, b);
  return `<div class="rep-ad">${thumb}<div class="rep-ad-text"><div class="rep-ad-name">${esc(name)}</div><div class="rep-ad-sub">${esc(sub || '')}${link ? ` · ${repA(link)}` : ''}</div></div></div>`;
}
// Rows per page by how tall a row is (tables with a section heading above them fit fewer on that page).
// Campaigns with conversions (most first), each followed by its conversion actions (sub: true), which add up to it.
// Google segments.conversion_action_name.
function repConvTypes(wsId, month) {
  return repData(wsId, 'google', month).campaign.filter(c => repDelivered(c, month) && c.conversions > 0).sort((a, c) => c.conversions - a.conversions).flatMap(c => {
    const r = adsRng(`${c.id}:${month}:conv-actions`), picked = adsShuffle(REP_DIMS.convActions.google, r).slice(0, 1 + Math.floor(r() * 3));
    const w = picked.map(() => 0.3 + r()), sw = w.reduce((a, x) => a + x, 0);
    let left = c.conversions;
    const kids = picked.map((name, i) => {
      const v = i === picked.length - 1 ? left : Math.min(left, Math.round(c.conversions * w[i] / sw));
      left -= v;
      return { id: `${c.id}~ca${i}`, name, conversions: v, sub: true };
    }).filter(k => k.conversions > 0).sort((a, k) => k.conversions - a.conversions);
    return [{ id: c.id, name: c.name, campType: c.campType, conversions: c.conversions }, ...kids];
  });
}
function repRowsPerPage(b) {
  const level = b.rows;
  if (level === 'post') return 7;
  if (level === 'convType') return 28;   // conversion action rows are short
  if (level === 'ad') return b.category === 'search' ? 5 : 8;   // search ads show their text
  return ['keyword', 'term'].includes(level) ? 12 : 14;
}
// Reach-type numbers can't be added up across rows, so the Total row leaves them out.
const REP_NOT_ADDITIVE = ['reach', 'freq', 'avgFreq', 'viewers', 'engRate'];
function repTablePages(wsId, b, month, withHead) {
  const p = b.platform, all = repRows(wsId, b, month), noun = repNoun(b), main = all.filter(r => !r.sub);
  const rows = b.limit ? all.slice(0, b.limit) : all;
  const verb = b.rows === 'post' ? 'published' : b.rows === 'term' ? 'had impressions' : 'ran';
  const what = b.limit && all.length > b.limit ? `Top ${b.limit} of ${all.length} ${noun[1]} that ${verb} in ${repMonthLabel(month)}` : `${main.length} ${main.length === 1 ? noun[0] : noun[1]} ${b.rows === 'convType' ? 'had conversions' : verb} in ${repMonthLabel(month)}`;
  const sub = b.columns.includes(b.sort) ? `${what} · Sorted by ${repColLabel(p, b.sort)}, highest first` : what;
  const cols = b.columns.map(k => repCol(p, k)).filter(Boolean);
  const cell = (r, c, total) => {
    if (c.t === 'text' || c.t === 'status') return total ? '' : esc(r[c.key] || '—');
    if (total && REP_NOT_ADDITIVE.includes(c.key) && !repIsAds(p)) return '—';
    return c.needs && !r[c.needs] ? '—' : esc(ADS_PF_FMT[c.t](r[c.key]));
  };
  // More than 16 columns don’t fit across the page: the columns are split into two tables, one under the other, each
  // with the same rows.
  const parts = cols.length > 16 ? [cols.slice(0, Math.ceil(cols.length / 2)), cols.slice(Math.ceil(cols.length / 2))] : [cols];
  const head = pc => `<thead><tr><th>${esc(repCap(noun[0]))}</th>${pc.map(c => `<th class="${c.t === 'text' || c.t === 'status' ? '' : 'num'}">${esc(c.label)}</th>`).join('')}</tr></thead>`;
  const total = b.rows === 'convType' ? { conversions: main.reduce((n, r) => n + r.conversions, 0) } : repIsAds(p) ? adsPfSum(all) : Object.fromEntries([...cols.map(c => c.key), 'reelPlays', 'totalWatch'].map(k => [k, all.reduce((s, r) => s + (r[k] || 0), 0)]));
  if (total.reelPlays) total.avgWatch = total.totalWatch / total.reelPlays;   // averaged over every reel's views, not added up
  const per = Math.max(2, Math.floor(repRowsPerPage(b) / parts.length) - (parts.length - 1)), chunks = [];
  // A page never starts with a conversion action: it moves to the next page with its campaign.
  for (let i = 0, n = withHead ? Math.max(3, per - (per > 10 ? 3 : 1)) : per; i < rows.length; n = per) {
    while (n > 1 && rows[i + n]?.sub) n--;
    chunks.push(rows.slice(i, i + n));
    i += n;
  }
  return chunks.map((chunk, ci) => {
    const last = ci === chunks.length - 1;
    return `<h2 class="rep-h2">${esc(b.title)}${ci ? ' <span class="rep-cont">(continued)</span>' : ''}</h2><div class="rep-sub">${esc(sub)}${parts.length > 1 ? `. Columns continue in the second table` : ''}</div>
      ${parts.map(pc => `<table class="rep-table ${b.rows === 'convType' ? 'rep-table-compact' : ''} ${pc.length >= 16 ? 'rep-table-wide rep-table-xwide rep-table-xxwide' : pc.length >= 12 ? 'rep-table-wide rep-table-xwide' : pc.length >= 9 ? 'rep-table-wide' : ''}">${head(pc)}<tbody>${chunk.map(r => `<tr class="${r.sub ? 'rep-subrow' : ''}"><td>${repRowCell(wsId, r, b)}</td>${pc.map(c => `<td class="${c.t === 'text' || c.t === 'status' ? '' : 'num'}">${cell(r, c)}</td>`).join('')}</tr>`).join('')}
      ${last ? `<tr class="rep-total"><td>${b.limit && all.length > b.limit ? `Total, all ${all.length} ${noun[1]}` : 'Total'}</td>${pc.map(c => `<td class="${c.t === 'text' || c.t === 'status' ? '' : 'num'}">${cell(total, c, true)}</td>`).join('')}</tr>` : ''}</tbody></table>`).join('')}`;
  });
}
// Left out of a real report: tables with no rows that month (e.g. no Performance Max campaigns ran), and a section
// heading left with nothing under it.
function repLiveBlocks(wsId, blocks, month) {
  const live = blocks.filter(b => b.kind !== 'table' || repRows(wsId, b, month).length);
  return live.filter((b, i) => b.kind !== 'text' || (live[i + 1] && live[i + 1].kind !== 'text'));
}
// r: { wsId (the client), type, month, cfg, sample }. A sample uses made-up names over the sample workspace's numbers.
function repPages(r) {
  const ws = wsById(r.wsId), t = REP_TYPES[r.type], am = memberById(r.cfg?.owner || CURRENT_USER_ID);
  const data = r.sample ? repSampleWs() : r.wsId, month = r.month;
  repSampling = !!r.sample;
  try {
    const pages = [];
    const plats = repTypeSources(r.type).filter(p => repHas(r.wsId, p));
    pages.push({ cover: true, html: `<div class="rep-cover">
        <div class="rep-cover-brand">galaxis</div>
        <div class="rep-cover-main">${r.sample ? '<div class="rep-sample-flag">Sample data: made-up names and numbers</div>' : ''}<div class="rep-cover-kicker">Monthly ${esc(t.name)}</div><div class="rep-cover-client">${esc(ws.name)}</div><div class="rep-cover-month">${esc(repMonthLabel(month))}</div>
          <div class="rep-cover-plats">${plats.map(p => `<span class="rep-cover-plat">${platformLogo(p)}${REP_PLATFORM[p]}</span>`).join('')}</div></div>
        <div class="rep-cover-foot">Prepared by ${esc(am ? am.name : AGENCY_ORG.name)}, ${esc(AGENCY_ORG.name)} · Generated ${esc(fmtDate(repSendDate(month, r.cfg)))}</div>
      </div>` });
    let slots = [], head = '', quad = false;
    const flush = () => { if (slots.length || head) pages.push({ html: head + (quad ? `<div class="rep-quad">${slots.join('')}</div>` : slots.join('')) }); slots = []; head = ''; quad = false; };
    repLiveBlocks(data, repBlocks(r.wsId, r.cfg, r.type), month).forEach(b => {
      if (b.kind === 'text') { flush(); head = `<div class="rep-section"><h2 class="rep-section-title">${esc(b.title)}</h2>${b.note ? `<p class="rep-section-note">${esc(b.note)}</p>` : ''}</div>`; }
      else if (b.kind === 'chart') {
        if (slots.length && !!b.quad !== quad) flush();
        quad = !!b.quad;
        // Summary cards need no title: each card names its number.
        slots.push(`<section class="rep-slot ${b.chart === 'summary' ? 'rep-slot-cards' : ''}">${b.chart === 'summary' ? '' : `<h2 class="rep-h2">${esc(b.title)}</h2><div class="rep-sub">${esc(repChartSub(b, month, data))}</div>`}<div class="rep-chart">${repChartBody(data, b, month)}</div></section>`);
        if (slots.length === (quad ? 4 : 2)) flush();
      } else {
        if (slots.length) flush();
        repTablePages(data, b, month, !!head).forEach((html, i) => pages.push({ html: (i ? '' : head) + html }));
        head = '';
      }
    });
    flush();
    const n = pages.length;
    return pages.map((pg, i) => pg.cover ? `<div class="rep-page rep-page-cover">${pg.html}</div>` : `<div class="rep-page">
        <div class="rep-page-head"><span>${esc(ws.name)} · Monthly ${esc(t.name)}</span>${r.sample ? '<span class="rep-sample-tag">Sample data</span>' : ''}<span>${esc(repMonthLabel(month))}</span></div>
        <div class="rep-page-body">${pg.html}</div>
        <div class="rep-page-foot"><span>galaxis</span><span>Page ${i + 1} of ${n}</span></div>
      </div>`);
  } finally { repSampling = false; }
}

// =====================================================================
// Agency: every client's reports at a glance
// =====================================================================
state.ui.repSearch = '';
// The summary cards filter the table: click one to show only those clients, click it again to show all.
const REP_FILTERS = {
  active: { label: 'Active', test: id => repStatus(id) === 'active' },
  inactive: { label: 'Inactive', test: id => repStatus(id) === 'inactive' },
  failed: { label: 'Last report failed', test: id => repFailed(id) }
};
state.ui.repFilter = null;
function repSetFilter(f) { state.ui.repFilter = state.ui.repFilter === f ? null : f; pager('rep-agency').page = 1; rerender(); }
function repAgencyRows() {
  const s = state.ui.repSearch.trim().toLowerCase();
  const f = REP_FILTERS[state.ui.repFilter];
  return visibleWorkspaces().filter(w => (!s || w.name.toLowerCase().includes(s)) && (!f || f.test(w.id))).map(w => {
    const cfg = repConfig(w.id), last = repHistory(w.id)[0], status = repStatus(w.id);
    const next = status === 'active' ? repNextMonth(cfg) : null;
    return { w, cfg, last, status, next, types: cfg ? repTypesOn(w.id, cfg) : [], sendAt: next ? repSendDate(next, cfg) : null };
  });
}
function repAgencyBody() {
  const rows = applySort(repAgencyRows(), 'rep-agency', { name: r => r.w.name, next: r => r.sendAt ? r.sendAt.getTime() : Infinity }, { col: 'name', dir: 'asc' });
  const page = paginate(rows, 'rep-agency');
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>${sortHeader('rep-agency', 'name', 'Client Workspace', 'repRefreshAgency')}</th><th>Linked</th><th>Reports</th><th>${sortHeader('rep-agency', 'next', 'Next Send', 'repRefreshAgency')}</th><th>Last Sent</th><th></th></tr></thead>
    <tbody>${page.length ? page.map(r => `<tr class="clickable" onclick="openWorkspace('${q(r.w.id)}', 'reports')">
      <td><div class="rep-wrap-text t-bold">${esc(r.w.name)}</div></td>
      <td>${repSources(r.w.id).length ? `<span class="row" style="gap:6px">${repSources(r.w.id).map(p => platformLogo(p)).join('')}</span>` : '<span class="t-muted">Nothing linked</span>'}</td>
      <td>${r.cfg ? repTypeChips(r.types) : '<span class="t-muted">—</span>'}</td>
      <td>${repNextCell(r)}</td>
      <td>${repLastCell(r)}</td>
      <td class="num">${r.status === 'active' && repInReview(r.cfg) && !repCancelled(r.cfg) ? `<button type="button" class="btn btn-primary btn-sm" onclick="event.stopPropagation(); openWorkspace('${q(r.w.id)}', 'reports', { tab: 'history' })"><i data-lucide="eye"></i>Review</button>` : ''}</td>
    </tr>`).join('') : `<tr><td colspan="6" class="table-empty">${state.ui.repFilter ? `No client workspaces match “${esc(REP_FILTERS[state.ui.repFilter].label)}”${state.ui.repSearch.trim() ? ' and your search' : ''}.` : 'No client workspaces match your search.'}</td></tr>`}</tbody>
  </table></div>${paginationBar('rep-agency', rows.length, 'repRefreshAgency')}`;
}
// Next Send: the upcoming month with Month in progress, Ready for review (review period), Cancelled or Not scheduled.
function repNextCell(r) {
  if (!r.types.length) return '<span class="t-muted">—</span>';
  const next = repNextMonth(r.cfg), when = `<span class="cell-sub">Sends ${esc(fmtDateTime(repSendDate(next, r.cfg)))}</span>`;
  const pill = r.status === 'inactive' ? `${repPill('off', 'Not scheduled')}<span class="cell-sub">${esc(repOffReason(r.w.id, r.cfg))}</span>`
    : !repInReview(r.cfg) ? `${repPill('off', 'Month in progress')}${when}`
    : repCancelled(r.cfg) ? `${repPill('failed', 'Cancelled')}<span class="cell-sub">Won’t be sent</span>`
    : `${repPill('review', 'Ready for review')}${when}`;
  return `<div class="rep-cell-month">${esc(repMonthLabel(next))} Report</div><div class="rep-cell-status">${pill}</div>`;
}
// Last Sent: the latest month emailed, Sent (date) or Failed.
function repLastCell(r) {
  if (!r.last) return '<span class="t-muted">—</span>';
  const pill = r.last.status === 'failed' ? `${repPill('failed', 'Failed')}<span class="cell-sub">Not sent</span>`
    : r.last.status === 'cancelled' ? `${repPill('off', 'Cancelled')}<span class="cell-sub">Not sent</span>` : `${repPill('sent', 'Sent')}<span class="cell-sub">${esc(fmtDate(r.last.sentAt))}</span>`;
  return `<div class="rep-cell-month">${esc(repMonthLabel(r.last.month))} Report</div><div class="rep-cell-status">${pill}</div>`;
}
function repRefreshAgency() { renderRegion('rep-agency-body', repAgencyBody()); }
function repAgencySearch(v) { state.ui.repSearch = v; pager('rep-agency').page = 1; repRefreshAgency(); }
function repRenderAgency() {
  const ws = visibleWorkspaces(), count = s => ws.filter(w => repStatus(w.id) === s).length;
  const card = (f, title, n) => `<button type="button" class="kpi-card rep-filter-card ${state.ui.repFilter === f ? 'is-on' : ''}" aria-pressed="${state.ui.repFilter === f}" onclick="repSetFilter('${f}')" title="${state.ui.repFilter === f ? 'Show all clients' : `Show only ${esc(REP_FILTERS[f].label.toLowerCase())} clients`}"><div class="kpi-title">${title}</div><div class="kpi-value">${n}</div><div class="kpi-sub">Client workspaces${state.ui.repFilter === f ? ' · Showing only these' : ''}</div></button>`;
  return `<div class="grid-4 rep-agency-kpis rep-kpis-3">
      ${card('active', repStatusDot('active'), count('active'))}${card('inactive', repStatusDot('inactive'), count('inactive'))}
      ${card('failed', '<span class="dot-label t-error"><span class="dot dot-red-strong"></span>Last report failed</span>', ws.filter(w => repFailed(w.id)).length)}
    </div>
    <section class="card"><div class="card-header"><div><h2 class="h-card">Client Reports</h2><div class="card-sub">Each client can receive an SEM Report (Google Ads) and an SMM Report (Facebook, Instagram and Meta Ads) every month. Select a client to choose its sections, schedule and recipients.</div></div></div>
      <div class="table-toolbar"><div class="search"><input class="input" placeholder="Search client workspaces" value="${esc(state.ui.repSearch)}" oninput="repAgencySearch(this.value)" aria-label="Search client workspaces"><i data-lucide="search"></i></div>
        ${state.ui.repFilter ? `<span class="rep-filter-chip">Showing: ${esc(REP_FILTERS[state.ui.repFilter].label)}<button type="button" class="chip-remove" aria-label="Clear filter" title="Clear filter" onclick="repSetFilter('${state.ui.repFilter}')"><i data-lucide="x"></i></button></span>` : ''}</div>
      <div id="rep-agency-body">${repAgencyBody()}</div></section>`;
}

// =====================================================================
// Client workspace: SEM Report · SMM Report · Schedule & Recipients · Sent Reports
// =====================================================================
const REP_TABS = [...REP_TYPE_IDS.map(t => ({ id: t, label: REP_TYPES[t].name, icon: REP_TYPES[t].icon })), { id: 'delivery', label: 'Schedule & Recipients', icon: 'calendar-cog' }, { id: 'history', label: 'Sent Reports', icon: 'history' }];
function repTab() {
  if (REP_TABS.some(t => t.id === state.params.tab)) return state.params.tab;
  const cfg = repConfig(state.ctx);
  return (cfg && REP_TYPE_IDS.find(t => repRep(cfg, t).on)) || REP_TYPE_IDS.find(t => repTypeOk(state.ctx, t)) || REP_TYPE_IDS[0];
}
function repGo(tab) { navigate('reports', { tab }); }
function repRenderClient() {
  const ws = currentWs();
  const cfg = repConfig(ws.id);
  const tab = repTab();
  const body = tab === 'delivery' ? repDeliveryHTML(ws, cfg) : tab === 'history' ? repHistoryHTML(ws, cfg) : repReportHTML(ws, cfg, tab);
  return `${repSummaryCard(ws, cfg)}
    <div class="page-tabs" role="tablist">${REP_TABS.map(t => `<button type="button" role="tab" aria-selected="${t.id === tab}" class="page-tab ${t.id === tab ? 'active' : ''}" onclick="repGo('${t.id}')"><i data-lucide="${t.icon}"></i>${esc(t.label)}</button>`).join('')}</div>
    <div class="stack">${body}</div>
    ${state.params.preview ? repViewerHTML() : ''}`;
}
function repSummaryCard(ws, cfg) {
  const status = repStatus(ws.id), next = repNextMonth(cfg), last = repHistory(ws.id)[0], types = repTypesOn(ws.id, cfg);
  const names = repJoin(types.map(t => REP_TYPES[t].short));
  const these = `The ${repMonthLabel(next)} ${names} ${types.length > 1 ? 'reports' : 'report'}`;
  const line = !types.length ? 'No report is turned on. Turn on the SEM or SMM Report to start sending.'
    : status === 'inactive' ? 'Add at least one recipient to start sending.'
    : repCancelled(cfg) ? `${these} won’t be sent: the send on ${fmtDateTime(repSendDate(next, cfg))} was cancelled.`
    : `${these} ${repInReview(cfg) ? `${types.length > 1 ? 'are' : 'is'} ready to review in Sent Reports, and will be sent` : 'will be sent'} on ${fmtDateTime(repSendDate(next, cfg))} to ${cfg.to.length} ${cfg.to.length === 1 ? 'recipient' : 'recipients'}.`;

  return `${repFailedBanner(ws, last)}<section class="card rep-summary">
    <div class="grow"><div class="row wrap" style="gap:12px"><h2 class="h-card">Monthly Reports</h2>${repStatusDot(status)}</div><div class="rep-summary-line">${esc(line)}</div></div>
</section>`;
}

// The last email failed: says what to do next, with the action in the banner itself. Retry each report that couldn't
// be generated; once none is failing, send the email. The link to Sent Reports is left out on that tab.
function repFailedBanner(ws, last) {
  if (!repFailed(ws.id)) return '';
  const failing = repStillFailing(last), month = repMonthLabel(last.month);
  const link = repTab() === 'history' ? '' : `<button type="button" class="banner-action" onclick="repGo('history')">View in Sent Reports</button>`;
  if (!failing.length) return `<div class="banner rep-banner rep-banner-ready"><i data-lucide="send"></i><div class="grow"><div class="banner-title">The ${esc(month)} reports are ready to send</div><div class="banner-text">Every report has been regenerated. Send the email to deliver them.</div></div>
    <div class="rep-banner-actions">${link}<button type="button" class="btn btn-primary btn-sm" onclick="repSendEmail('${last.id}')"><i data-lucide="send"></i>Send email</button></div></div>`;
  const names = repJoin(failing.map(t => REP_TYPES[t].name));
  return `<div class="banner banner-error rep-banner"><i data-lucide="circle-alert"></i><div class="grow"><div class="banner-title">The ${esc(month)} email was not sent</div><div class="banner-text">${esc(last.reason)} Retry the ${esc(names)}, then send the email.</div></div>
    <div class="rep-banner-actions">${link}${failing.map(t => `<button type="button" class="btn btn-sm rep-btn-on-error" onclick="repRetry('${last.id}', '${t}')"><i data-lucide="refresh-cw"></i>Retry ${esc(REP_TYPES[t].short)}</button>`).join('')}</div></div>`;
}

// ---------- SEM / SMM Report: sections and columns (changes save as you make them) ----------
function repReportHTML(ws, cfg, type) {
  const t = REP_TYPES[type], rep = repRep(cfg, type), ok = repTypeOk(ws.id, type);
  const nOn = t.sections.filter(s => repSectionOn(ws.id, cfg, type, s)).length;
  const head = `<div class="card-header"><div><h2 class="h-card">${esc(t.name)}</h2><div class="card-sub">${esc(t.desc)} Sections and columns can be turned off; their order is fixed. Changes save automatically.</div></div>
    <button type="button" class="btn btn-primary" ${ok && nOn ? '' : 'disabled'} onclick="repOpenSample('${type}')"><i data-lucide="eye"></i>Preview with sample data</button></div>`;
  return `<section class="card">${head}
    <label class="row rep-switch rep-type-switch"><span class="toggle"><input type="checkbox" ${rep.on ? 'checked' : ''} onchange="repSetType('${type}', this.checked)"><span></span></span><span><b>Send the ${esc(t.name)} every month</b><span class="field-hint rep-block-line">${!ok ? `Off. Link ${esc(t.needs)} to this workspace first.` : rep.on ? `Attached to the monthly email with ${nOn} of ${t.sections.length} sections.` : 'Turned off: it isn’t made or sent. The sections below are kept for when you turn it on.'}</span></span></label>
    ${rep.on && !nOn ? '<div class="banner banner-warning rep-banner"><i data-lucide="triangle-alert"></i><div><div class="banner-title">Every section is off</div><div class="banner-text">Turn on at least one section, or this report won’t be sent.</div></div></div>' : ''}
    ${rep.on ? '' : `<div class="rep-off-note"><i data-lucide="circle-pause"></i><span>${esc(`The ${t.name} is off, so none of these sections are sent. Your choices are kept for when you turn it on.`)}</span></div>`}
    <div class="rep-blocks-head"><span class="rep-blocks-label">Sections</span>${repExpandAllHTML(ws, cfg, type)}</div>
    <ol class="rep-blocks ${rep.on ? '' : 'is-off'}">
      <li class="rep-block rep-block-fixed"><span class="rep-block-icon"><i data-lucide="lock"></i></span><div class="grow"><div class="rep-block-title">Cover page</div><div class="rep-block-meta">Always included: the client’s name, the month, the linked accounts and “Prepared by” the account manager.</div></div></li>
      ${t.sections.map(s => repSectionHTML(ws, cfg, type, s)).join('')}
    </ol></section>`;
}
// "Search campaigns", "Display campaigns", "keywords": what an empty table would have listed.
function repEmptyNoun(b) { const cat = repCategory(b.platform, b.category), n = repNoun(b)[1]; return cat?.campTypes && ['campaign', 'adgroup', 'ad'].includes(b.rows) ? `${cat.label} ${n}` : n; }
function repBlockLabel(b) { return b.kind === 'table' ? `Table: ${b.title}` : b.title; }
function repSectionHTML(ws, cfg, type, s) {
  const ok = repSectionOk(ws.id, s), on = repSectionOn(ws.id, cfg, type, s), id = `rep-s-${type}-${s.id}`;
  const tables = s.blocks.filter(b => b.kind === 'table');
  // Last month, for the client's own data: an empty table is left out of the real report.
  const empty = on ? tables.filter(b => !repRows(ws.id, b, repLastMonth()).length) : [];
  const open = on && repIsOpen(type, s.id);
  return `<li class="rep-block rep-section-row ${on ? '' : 'rep-block-off'}">
    <label class="toggle rep-section-toggle"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} ${ok ? '' : 'disabled'} onchange="repSetSection('${type}', '${s.id}', this.checked)" aria-label="Include ${esc(s.title)}"><span></span></label>
    <div class="grow">
      ${on ? `<button type="button" class="rep-block-title rep-expand" aria-expanded="${open}" aria-controls="${id}-body" onclick="repToggleOpen('${type}', '${s.id}')">${platformLogo(s.source)}<span>${esc(s.title)}</span><i data-lucide="chevron-down" class="rep-chev"></i></button>
        ${open ? '' : `<div class="rep-block-meta">${esc(repSectionSummary(cfg, type, s))}</div>`}`
      : `<label class="rep-block-title" for="${id}">${platformLogo(s.source)}<span>${esc(s.title)}</span></label>`}
      ${on ? '' : `<div class="rep-block-meta">${ok ? esc(`Off. Contains ${s.blocks.map(repBlockLabel).join(' · ')}`) : `<span class="rep-off">${esc(REP_PLATFORM[s.source])} isn’t linked to this workspace, so this section can’t be turned on. Link it in Integrations first.</span>`}</div>`}
      ${empty.length ? `<div class="rep-block-meta rep-note"><i data-lucide="info"></i><span>${esc(`Last month: no ${repJoin(empty.map(repEmptyNoun)).replace(/ and ([^,]*)$/, ' or $1')} ran, so ${empty.length > 1 ? 'those tables were' : 'that table was'} left out. ${empty.length === tables.length && s.blocks.length === tables.length ? 'The whole section is left out of a month with nothing to show.' : ''}`.trim())}</span></div>` : ''}
      ${open ? `<div id="${id}-body">${repSummaryHTML(cfg, type, s) + repChartsHTML(cfg, type, s) + s.blocks.filter(b => b.kind === 'table').map(b => repColsHTML(cfg, type, b)).join('')}</div>` : ''}
    </div></li>`;
}
// Sections start open; collapsed, each shows one line, e.g. "Summary cards: 8 of 10 · Charts: 1 of 1".
state.ui.repOpen = {};
function repIsOpen(type, sid) { return state.ui.repOpen[`${type}:${sid}`] !== false; }
function repToggleOpen(type, sid) { state.ui.repOpen[`${type}:${sid}`] = !repIsOpen(type, sid); rerender(); }
function repOpenSections(ws, cfg, type) { return REP_TYPES[type].sections.filter(s => repSectionOn(ws.id, cfg, type, s)); }
function repExpandAllHTML(ws, cfg, type) {
  const secs = repOpenSections(ws, cfg, type);
  if (!secs.length) return '';
  const all = secs.every(s => repIsOpen(type, s.id));
  return `<button type="button" class="rep-expand-all" onclick="repSetAllOpen('${type}', ${!all})"><i data-lucide="${all ? 'chevrons-down-up' : 'chevrons-up-down'}"></i>${all ? 'Collapse all' : 'Expand all'}</button>`;
}
function repSetAllOpen(type, open) {
  const ws = currentWs(), cfg = repConfig(ws.id);
  repOpenSections(ws, cfg, type).forEach(s => { state.ui.repOpen[`${type}:${s.id}`] = open; });
  rerender();
}
function repSectionSummary(cfg, type, s) {
  const parts = [], summary = s.blocks.find(b => b.chart === 'summary');
  const charts = s.blocks.filter(b => b.kind === 'chart' && b.chart !== 'summary');
  if (summary) parts.push(`Summary cards: ${repShownCols(cfg, type, summary).length} of ${repKeys(summary).length}`);
  if (charts.length) parts.push(`Charts: ${charts.filter(b => repChartOn(cfg, type, b)).length} of ${charts.length}`);
  s.blocks.filter(b => b.kind === 'table').forEach(b => parts.push(`${b.title} table: ${repShownCols(cfg, type, b).length} of ${repKeys(b).length} columns`));
  return parts.join(' · ');
}
// Summary cards (the big numbers) and charts of a section. A section with no table keeps at least one card or chart
// (turn the section off instead): the last one left can't be deselected.
function repLastVisual(cfg, type, s) {
  if (s.blocks.some(x => x.kind === 'table')) return null;
  const on = s.blocks.filter(x => x.kind === 'chart' && repChartOn(cfg, type, x));
  return on.length === 1 ? on[0] : null;
}
function repVisualLocked(cfg, type, s, b) { return repLastVisual(cfg, type, s) === b; }
const REP_KEEP_ONE = 'Keep a summary card or a chart, or turn the section off';
function repSummaryHTML(cfg, type, s) {
  const b = s.blocks.find(x => x.chart === 'summary');
  if (!b) return '';
  return `<div class="rep-col-set"><div class="rep-col-set-title"><i data-lucide="layout-grid"></i>Summary cards</div>${repColsHTML(cfg, type, b, repVisualLocked(cfg, type, s, b))}</div>`;
}
function repChartsHTML(cfg, type, s) {
  const charts = s.blocks.filter(b => b.kind === 'chart' && b.chart !== 'summary');
  if (!charts.length) return '';
  return `<div class="rep-col-set"><div class="rep-col-set-title"><i data-lucide="chart-spline"></i>Charts</div><div class="rep-col-chips">${charts.map(b => {
    const on = repChartOn(cfg, type, b), last = repVisualLocked(cfg, type, s, b);
    return `<label class="rep-col-chip ${on ? 'on' : ''} ${last ? 'is-disabled' : ''}" ${last ? `title="${REP_KEEP_ONE}"` : ''}><input type="checkbox" ${on ? 'checked' : ''} ${last ? 'disabled' : ''} onchange="repSetChart('${type}', '${b.id}', this.checked)"><span>${esc(b.title)}</span></label>`;
  }).join('')}</div></div>`;
}
function repSetChart(type, id, on) {
  const rep = repRep(repConfig(state.ctx), type), cur = rep.charts || [];
  rep.charts = on ? cur.filter(x => x !== id) : [...new Set([...cur, id])];
  rerender();
}
// The first column of a table, always shown: what each row is.
function repNameCol(b) {
  const l = b.rows;
  if (l === 'ad') return 'Ad preview';
  if (l === 'convType') return 'Campaign and conversion action';
  if (l === 'post') return 'Post preview';
  if (l === 'keyword' || l === 'term') return repCap(repNoun(b)[0]);
  return `${repCap(repNoun(b)[0])} name`;
}
function repColsHTML(cfg, type, b, keepOne) {
  const shown = repShownCols(cfg, type, b), table = b.kind === 'table';
  const chips = `<div class="rep-col-chips">${table ? `<span class="rep-col-chip is-locked" title="Always shown. Can’t be turned off."><i data-lucide="lock"></i><span>${esc(repNameCol(b))}</span><span class="rep-sr-only">(always shown)</span></span>` : ''}${repKeys(b).map(k => {
      const on = shown.includes(k), last = on && shown.length === 1 && (table || keepOne);
      return `<label class="rep-col-chip ${on ? 'on' : ''} ${last ? 'is-disabled' : ''}" ${last ? `title="${table ? 'A table needs at least one column' : REP_KEEP_ONE}"` : ''}><input type="checkbox" ${on ? 'checked' : ''} ${last ? 'disabled' : ''} onchange="repSetCol('${type}', '${b.id}', '${k}', this.checked)"><span>${esc(repColLabel(b.platform, k))}</span></label>`;
    }).join('')}</div>`;
  return table ? `<div class="rep-col-set"><div class="rep-col-set-title"><i data-lucide="table-2"></i>${esc(b.title)} table: Displayed columns</div>${chips}</div>` : chips;
}
// A report can only be turned on once its source is linked: otherwise it stays off and a dialog says what to link.
function repSetType(type, on) {
  const t = REP_TYPES[type];
  if (on && !repTypeOk(state.ctx, type)) {
    rerender();
    openModal({ title: `Link ${t.needsShort} first`, desc: `The ${t.name} needs ${t.needs} linked to ${wsById(state.ctx).name}. Link one in Integrations, then turn the report on.`, actions: [{ label: 'OK' }] });
    return;
  }
  repRep(repConfig(state.ctx), type).on = on;
  rerender();
  showToast(`${REP_TYPES[type].name} turned ${on ? 'on' : 'off'}`);
}
function repSetSection(type, sid, on) {
  const rep = repRep(repConfig(state.ctx), type);
  rep.off = on ? rep.off.filter(x => x !== sid) : [...new Set([...rep.off, sid])];
  if (on) state.ui.repOpen[`${type}:${sid}`] = true;
  rerender();
}
function repSetCol(type, tid, key, on) {
  const cfg = repConfig(state.ctx), hide = repRep(cfg, type).hide;
  const cur = repHidden(cfg, type, REP_TYPES[type].sections.flatMap(x => x.blocks).find(b => b.id === tid));
  hide[tid] = on ? cur.filter(k => k !== key) : [...new Set([...cur, key])];
  rerender();
}

// ---------- Schedule & Recipients (changes save as you make them) ----------
function repSet(field, value) {
  const cfg = repConfig(state.ctx);
  cfg[field] = value;
  rerender();
}
function repResetSchedule() {
  Object.assign(repConfig(state.ctx), { sendDay: REP_SEND_DAY, sendHour: REP_SEND_HOUR });
  rerender();
}
function repDeliveryHTML(ws, cfg) {
  const next = repNextMonth(cfg), types = repTypesOn(ws.id, cfg);
  const agency = members.filter(m => m.org === 'agency' && m.status === 'active' && (m.workspaces.includes('*') || m.workspaces.includes(ws.id)));
  const err = state.ui.repToErr || '';
  const isDefault = cfg.sendDay === REP_SEND_DAY && cfg.sendHour === REP_SEND_HOUR;
  const days = Array.from({ length: 28 }, (_, i) => i + 1), hours = Array.from({ length: 24 }, (_, i) => i);
  return `<section class="card"><div class="card-header"><div><h2 class="h-card">Schedule</h2><div class="card-sub">Each report turned on goes out every month, with the SEM and SMM Reports together in one email. Each report covers the previous calendar month (1st to last day).</div></div>
      ${isDefault ? '<span class="rep-default-tag">Default</span>' : `<button type="button" class="btn btn-secondary btn-sm" onclick="repResetSchedule()"><i data-lucide="rotate-ccw"></i>Reset to default</button>`}</div>
      <div class="stack-sm">
        <div class="rep-schedule-fields">
          <div class="field"><label class="field-label" for="rep-send-day">Send on</label><select class="select" id="rep-send-day" onchange="repSet('sendDay', Number(this.value))">${days.map(d => `<option value="${d}" ${d === cfg.sendDay ? 'selected' : ''}>The ${repOrdinal(d)} of each month</option>`).join('')}</select></div>
          <div class="field"><label class="field-label" for="rep-send-hour">At (Singapore time)</label><select class="select" id="rep-send-hour" onchange="repSet('sendHour', Number(this.value))">${hours.map(h => `<option value="${h}" ${h === cfg.sendHour ? 'selected' : ''}>${repHourLabel(h)}</option>`).join('')}</select></div>
        </div>
        <div class="rep-schedule-note"><i data-lucide="info"></i><span>${cfg.sendDay < REP_SEND_DAY ? 'Sending this early may miss late conversions: Google and Meta can take a few days to count them. ' : ''}The default is the ${repOrdinal(REP_SEND_DAY)} at ${repHourLabel(REP_SEND_HOUR)}, by when most late conversions have come in. Until the send, you can review the reports in Sent Reports. The PDFs are generated just before they are sent, and the numbers in them are kept as they were then.</span></div>
        <div class="rep-next ${types.length ? '' : 'is-off'}"><i data-lucide="calendar-clock"></i><span>${esc(types.length ? `Next: the ${repMonthLabel(next)} reports, on ${fmtDateTime(repSendDate(next, cfg))}.` : 'No report is turned on.')}</span></div>
      </div></section>
    <section class="card"><div class="card-header"><div><h2 class="h-card">Recipients</h2><div class="card-sub">The client contacts who receive the PDFs, and the agency members copied in. Up to 20 recipients.</div></div></div>
      <div class="form-section-title rep-first">To</div>
      ${cfg.to.length ? `<div class="rep-people">${cfg.to.map(r => repPersonChip(r.name, r.email, `repRemoveTo('${r.id}')`)).join('')}</div>`
        : `<div class="banner banner-warning"><i data-lucide="triangle-alert"></i><div><div class="banner-title">No recipients</div><div class="banner-text">Add at least one, or the reports won’t be sent.</div></div></div>`}
      ${repComboHTML('to', 'Add a recipient', repPlaceholder('to'), cfg.to.length >= 20 ? 'Up to 20 recipients: remove one to add another.' : '', cfg.to.length >= 20, err)}
      <div class="form-section-title">Cc</div>
      ${cfg.cc.length ? `<div class="rep-people">${cfg.cc.map(id => memberById(id)).filter(Boolean).map(m => repPersonChip(m.name, m.email, `repRemoveCc('${m.id}')`)).join('')}</div>` : '<div class="t-muted rep-none">No one is copied in.</div>'}
      ${agency.some(m => !cfg.cc.includes(m.id)) ? repComboHTML('cc', 'Copy in an agency member', repPlaceholder('cc'), '') : ''}
    </section>
    <section class="card"><div class="card-header"><div><h2 class="h-card">Email</h2><div class="card-sub">Sent from Galaxis Reports. Replies go to the account manager.</div></div></div>
      <div class="stack-sm">
        <div class="field"><label class="field-label" for="rep-owner">Account manager</label><select class="select" id="rep-owner" onchange="repSet('owner', this.value)">${agency.map(m => `<option value="${m.id}" ${m.id === cfg.owner ? 'selected' : ''}>${esc(m.name)} (${esc(m.email)})</option>`).join('')}</select><div class="field-hint">Shown on the cover as “Prepared by”, and used as the reply-to address.</div></div>
        <div class="field"><label class="field-label" for="rep-subject">Subject</label><input class="input" id="rep-subject" value="${esc(cfg.subject)}" onchange="repSet('subject', this.value.trim() || REP_SUBJECT)"><div class="field-hint">Preview: ${esc(repFill(cfg.subject, ws.id, next))}</div></div>
        <div class="field"><label class="field-label" for="rep-message">Message</label><textarea class="textarea" id="rep-message" rows="7" onchange="repSet('message', this.value)">${esc(cfg.message)}</textarea><div class="field-hint">{client}, {month} and {am} are replaced with the client’s name, the report month and the account manager’s name.</div></div>
        <div class="rep-attach"><i data-lucide="paperclip"></i><span>${types.length ? `Attachments: ${esc(types.map(t => repFileName(ws.id, t, next)).join(', '))}` : 'No attachments: no report is turned on.'}</span></div>
      </div></section>`;
}
// Recipient picker (To and CC): one field that suggests people as you type. To also takes any email address, with an
// optional name ("Jane Tan <jane@company.com>"); CC only takes agency members assigned to the client.
function repPersonChip(name, email, remove) {
  return `<span class="rep-person"><span class="avatar">${esc(initials(name || email))}</span><span class="rep-person-text"><span class="rep-person-name">${esc(name || email)}</span>${name ? `<span class="rep-person-email">${esc(email)}</span>` : ''}</span><button type="button" class="chip-remove" aria-label="Remove ${esc(name || email)}" title="Remove" onclick="${remove}"><i data-lucide="x"></i></button></span>`;
}
function repComboHTML(kind, label, placeholder, hint, disabled, err) {
  const id = `rep-${kind}-input`;
  return `<div class="field rep-combo">
    <label class="field-label" for="${id}">${esc(label)}</label>
    <div class="rep-combo-box"><input class="input ${err ? 'invalid' : ''}" id="${id}" placeholder="${esc(placeholder)}" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="rep-${kind}-list" aria-autocomplete="list" ${disabled ? 'disabled' : ''}
      oninput="repComboInput('${kind}')" onfocus="repComboOpen('${kind}')" onkeydown="repComboKey(event, '${kind}')" onblur="setTimeout(() => repComboClose('${kind}'), 150)">
      <ul class="rep-combo-list" id="rep-${kind}-list" role="listbox" hidden></ul></div>
    ${err ? `<div class="field-error">${esc(err)}</div>` : hint ? `<div class="field-hint">${esc(hint)}</div>` : ''}
  </div>`;
}
// "Jane Tan <jane@company.com>" → { name, email }; a bare email has no name.
function repParsePerson(v) {
  const m = String(v).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].replace(/^"|"$/g, ''), email: m[2].trim() } : { name: '', email: String(v).trim() };
}
// The picker edits the client's settings (kinds to, cc) or the draft of a one-off send (send-to, send-cc).
// Placeholders can't wrap, so phones get a shorter version.
function repNarrow() { return window.matchMedia('(max-width: 600px)').matches; }
const REP_PLACEHOLDERS = { to: ['Choose a workspace member, or type an email', 'Member or email'], cc: ['Choose an agency member, or type an email', 'Agency member or email'] };
function repPlaceholder(kind) { return REP_PLACEHOLDERS[kind][repNarrow() ? 1 : 0]; }
function repComboBase(kind) { return kind.endsWith('cc') ? 'cc' : 'to'; }
function repComboDraft(kind) { return kind.startsWith('send-'); }
function repComboTarget(kind) { return repComboDraft(kind) ? state.ui.repDraft : repConfig(state.ctx); }
function repComboErr(kind) { return repComboDraft(kind) ? state.ui.repDraft.err : state.ui.repToErr; }
function repSetComboErr(kind, v) { if (repComboDraft(kind)) state.ui.repDraft.err = v; else state.ui.repToErr = v; }
function repComboRerender(kind) { if (repComboDraft(kind)) repRenderSend(); else rerender(); }
function repComboOptions(kind) {
  const ws = currentWs(), cfg = repComboTarget(kind), q = (document.getElementById(`rep-${kind}-input`)?.value || '').trim().toLowerCase();
  const match = m => !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  if (repComboBase(kind) === 'cc') return members.filter(m => m.org === 'agency' && m.status === 'active' && (m.workspaces.includes('*') || m.workspaces.includes(ws.id)) && !cfg.cc.includes(m.id) && match(m)).map(m => ({ id: m.id, name: m.name, email: m.email }));
  const taken = e => cfg.to.some(r => r.email.toLowerCase() === e.toLowerCase());
  const opts = members.filter(m => m.org === ws.id && m.status === 'active' && !taken(m.email) && match(m)).map(m => ({ name: m.name, email: m.email }));
  const typed = repParsePerson(q ? document.getElementById(`rep-${kind}-input`).value : '');
  if (isEmail(typed.email) && !taken(typed.email) && !opts.some(o => o.email.toLowerCase() === typed.email.toLowerCase())) opts.push({ ...typed, typed: true });
  return opts;
}
state.ui.repCombo = { kind: null, active: 0, opts: [] };
function repComboOpen(kind) {
  const list = document.getElementById(`rep-${kind}-list`), input = document.getElementById(`rep-${kind}-input`);
  if (!list) return;
  const opts = repComboOptions(kind), c = state.ui.repCombo;
  if (c.kind !== kind) c.active = 0;
  Object.assign(c, { kind, opts, active: Math.min(c.active, Math.max(0, opts.length - 1)) });
  list.innerHTML = opts.map((o, i) => `<li role="option" id="rep-${kind}-opt-${i}" aria-selected="${i === c.active}" class="rep-combo-opt ${i === c.active ? 'active' : ''}" onmousedown="event.preventDefault(); repComboPick('${kind}', ${i})">
      <span class="avatar">${esc(initials(o.name || o.email))}</span><span class="rep-person-text">${o.typed ? `<span class="rep-person-name">Add ${esc(o.name ? `${o.name} (${o.email})` : o.email)}</span>` : `<span class="rep-person-name">${esc(o.name)}</span><span class="rep-person-email">${esc(o.email)}</span>`}</span></li>`).join('')
    || `<li class="rep-combo-empty">${esc(repComboBase(kind) === 'cc' ? 'No other agency members match.' : 'No member matches. Type a full email address to add it.')}</li>`;
  list.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  if (opts.length) input.setAttribute('aria-activedescendant', `rep-${kind}-opt-${c.active}`); else input.removeAttribute('aria-activedescendant');
}
// Typing again clears an error from the last attempt.
function repComboInput(kind) {
  if (repComboBase(kind) === 'to' && repComboErr(kind)) {
    repSetComboErr(kind, '');
    const input = document.getElementById(`rep-${kind}-input`), err = input.closest('.rep-combo').querySelector('.field-error');
    input.classList.remove('invalid');
    if (err) err.remove();
  }
  repComboOpen(kind);
}
function repComboClose(kind) {
  const list = document.getElementById(`rep-${kind}-list`), input = document.getElementById(`rep-${kind}-input`);
  if (list) list.hidden = true;
  if (input) { input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
}
function repComboKey(e, kind) {
  const c = state.ui.repCombo;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    if (c.kind === kind && c.opts.length) c.active = (c.active + (e.key === 'ArrowDown' ? 1 : -1) + c.opts.length) % c.opts.length;
    repComboOpen(kind);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    repComboOpen(kind);
    if (c.opts.length) repComboPick(kind, c.active);
    else if (repComboBase(kind) === 'to') repComboInvalid(kind);
  } else if (e.key === 'Escape') repComboClose(kind);
}
// Enter with nothing to pick: say why it can't be added.
function repComboInvalid(kind) {
  const cfg = repComboTarget(kind), v = document.getElementById(`rep-${kind}-input`).value, { email } = repParsePerson(v);
  if (!v.trim()) return;
  repSetComboErr(kind, cfg.to.some(r => r.email.toLowerCase() === email.toLowerCase()) ? 'This email is already a recipient.' : 'Enter a valid email address, or choose a member.');
  repComboRerender(kind);
  const el = document.getElementById(`rep-${kind}-input`); el.value = v; el.focus();
}
function repComboPick(kind, i) {
  const o = state.ui.repCombo.opts[i], cfg = repComboTarget(kind);
  if (!o) return;
  if (repComboBase(kind) === 'cc') cfg.cc.push(o.id);
  else cfg.to.push({ id: uid('rr'), name: o.name, email: o.email });
  repSetComboErr(kind, '');
  state.ui.repCombo.active = 0;
  repComboRerender(kind);
  showToast(repComboBase(kind) === 'cc' ? `${o.name} copied in` : `${o.email} added`, 'mail');
  document.getElementById(`rep-${kind}-input`)?.focus();
}
function repRemoveCc(id) { repSet('cc', repConfig(state.ctx).cc.filter(x => x !== id)); }
function repRemoveTo(id) {
  const cfg = repConfig(state.ctx);
  cfg.to = cfg.to.filter(r => r.id !== id);
  rerender();
}

// ---------- Sent Reports ----------
function repHistoryHTML(ws, cfg) {
  const list = repHistory(ws.id), next = repNextMonth(cfg), status = repStatus(ws.id);
  // A failed email whose reports have all been regenerated is Ready to send.
  const ready = h => h.status === 'failed' && !repStillFailing(h).length;
  const pill = h => ready(h) ? `${repPill('scheduled', 'Ready to send')}<div class="cell-sub">Every report is generated. Send the email when ready.</div>`
    : h.status === 'failed' ? repPill('failed', 'Failed')
    : h.status === 'cancelled' ? `${repPill('off', 'Cancelled')}<div class="cell-sub">The send was cancelled during review</div>` : repPill('sent', 'Sent');
  return `<section class="card"><div class="card-header"><div><h2 class="h-card">Sent Reports</h2><div class="card-sub">Every monthly email, with the PDFs exactly as they were sent. A failed email is tried again daily for 3 days before it shows here as Failed.</div></div></div>
    <div class="table-wrap"><table class="table rep-history">
      <thead><tr><th>Report Month</th><th>Status</th><th>Sent</th><th><span class="rep-sr-only">Actions</span></th></tr></thead>
      <tbody>
        ${repUpcomingRow(ws, cfg, next, status)}
        ${list.map(h => `<tr><td>${esc(repMonthLabel(h.month))}</td><td>${pill(h)}${h.reason && !ready(h) ? `<div class="cell-sub rep-wrap-text rep-reason">${esc(h.shortReason || h.reason)}</div>` : ''}</td><td>${h.sentAt ? esc(fmtDateTime(h.sentAt)) : '<span class="t-muted">Not sent</span>'}${repToLine(h.to)}</td>
          <td>${repHistoryActions(h)}</td></tr>`).join('')}
        ${list.length ? '' : '<tr><td colspan="4" class="table-empty">No reports have been sent yet.</td></tr>'}
      </tbody></table></div></section>`;
}
// "To 2 recipients" under the send time (the emails on hover), so the actions have room.
function repToLine(to) { return `<div class="cell-sub" title="${esc(to.join(', '))}">To ${to.length} ${to.length === 1 ? 'recipient' : 'recipients'}</div>`; }
// Which reports a month had shows in its View / Retry / Preview buttons, so there is no separate Reports column.
// Sent Reports actions in three fixed columns, so they line up on every row: SEM, SMM, then the send action.
function repActionCells(cells) { return `<div class="rep-actions">${cells.map(c => `<div>${c || ''}</div>`).join('')}</div>`; }
// The next report's row in Sent Reports: Month in progress (nothing to review yet), Scheduled (review period, with
// Preview and Cancel send), Cancelled, or Inactive.
function repUpcomingRow(ws, cfg, next, status) {
  const types = repTypesOn(ws.id, cfg), review = status === 'active' && repInReview(cfg), cancelled = review && repCancelled(cfg);
  const from = fmtDate(new Date(repAddMonths(next, 1) + '-01T00:00:00'));
  const pill = status === 'inactive' ? repPill('off', 'Not scheduled')
    : cancelled ? repPill('failed', 'Cancelled')
    : review ? repPill('review', 'Ready for review')
    : repPill('off', 'Month in progress');
  // Preview is the call-out while the report is waiting to be sent; before the month ends there is nothing to preview.
  const preview = kind => REP_TYPE_IDS.map(t => types.includes(t) ? `<button type="button" class="btn ${kind} btn-sm" onclick="repOpenSent('${t}', '${next}')"><i data-lucide="eye"></i>Preview ${esc(REP_TYPES[t].short)}</button>` : '');
  const actions = status === 'inactive' ? '' : !review ? `<div class="rep-actions"><span class="t-muted rep-not-ready">${esc(`Preview from ${from}`)}</span></div>`
    : cancelled ? repActionCells([...preview('btn-outline'), `<button type="button" class="btn btn-outline btn-sm" onclick="repResume()"><i data-lucide="undo-2"></i>Resume send</button>`])
    : repActionCells([...preview('btn-primary'), `<button type="button" class="btn btn-outline btn-sm" onclick="repCancelSend()"><i data-lucide="ban"></i>Cancel send</button>`]);
  return `<tr class="rep-upcoming"><td>${esc(repMonthLabel(next))}</td><td>${pill}</td><td>${status === 'inactive' || cancelled ? '<span class="t-muted">Not scheduled</span>' : esc(fmtDateTime(repSendDate(next, cfg)))}${repToLine(cfg.to.map(r => r.email))}</td><td>${actions}</td></tr>`;
}
function repCancelSend() {
  const cfg = repConfig(state.ctx), next = repNextMonth(cfg), types = repTypesOn(state.ctx, cfg);
  confirmDialog({ title: `Cancel the ${repMonthLabel(next)} send?`, text: `The ${repJoin(types.map(t => REP_TYPES[t].name))} for ${repMonthLabel(next)} won’t be sent on ${fmtDateTime(repSendDate(next, cfg))}. You can resume the send before then, or send them later from Sent Reports.`, confirmLabel: 'Cancel send', danger: true, icon: 'ban',
    onConfirm: () => { cfg.skip = next; rerender(); showToast(`${repMonthLabel(next)} send cancelled`, 'ban'); } });
}
function repResume() {
  const cfg = repConfig(state.ctx), next = repNextMonth(cfg);
  cfg.skip = null;
  rerender();
  showToast(`${repMonthLabel(next)} reports will be sent on ${fmtDateTime(repSendDate(next, cfg))}`, 'undo-2');
}
// A sent email: View each report, Resend email. A failed one: Retry each report that couldn't be generated (View the
// others), then Send email once nothing is still failing.
function repHistoryActions(h) {
  const failing = h.status === 'failed' ? repStillFailing(h) : [];
  const view = t => `<button type="button" class="btn btn-outline btn-sm" onclick="repOpenSent('${t}', '${h.month}')"><i data-lucide="eye"></i>View ${esc(REP_TYPES[t].short)}</button>`;
  const cells = REP_TYPE_IDS.map(t => !h.types.includes(t) ? '' : failing.includes(t)
    ? `<button type="button" class="btn btn-primary btn-sm" onclick="repRetry('${h.id}', '${t}')"><i data-lucide="refresh-cw"></i>Retry ${esc(REP_TYPES[t].short)}</button>` : view(t));
  const send = h.status !== 'sent'
    ? `<button type="button" class="btn ${failing.length || h.status === 'cancelled' ? 'btn-outline' : 'btn-primary'} btn-sm" ${failing.length ? `disabled title="Retry the ${esc(repJoin(failing.map(t => REP_TYPES[t].short)))} Report first"` : ''} onclick="repSendEmail('${h.id}')"><i data-lucide="send"></i>Send email</button>`
    : `<button type="button" class="btn btn-outline btn-sm" onclick="repSendEmail('${h.id}')"><i data-lucide="send"></i>Resend email</button>`;
  return repActionCells([...cells, send]);
}
// Regenerate one report of a failed email (mock: it now succeeds).
function repRetry(id, type) {
  const h = repHistory(state.ctx).find(x => x.id === id);
  repRetried[id] = [...new Set([...(repRetried[id] || []), type])];
  rerender();
  showToast(`${REP_TYPES[type].name} for ${repMonthLabel(h.month)} regenerated${repStillFailing(h).length ? '' : '. The email is ready to send'}`, 'refresh-cw');
}
// Send email (a held or cancelled month) and Resend email (a sent one). The recipients, CC, subject and message start
// as the client's monthly settings and can be changed for this email only.
function repSendEmail(id) {
  const cfg = repConfig(state.ctx), h = repHistory(state.ctx).find(x => x.id === id);
  state.ui.repDraft = { hid: id, types: repSendTypes(h), to: cfg.to.map(r => ({ ...r })), cc: [...cfg.cc], subject: cfg.subject, message: cfg.message, err: '' };
  openModal({ title: `${h.status !== 'sent' ? 'Send' : 'Resend'} the ${repMonthLabel(h.month)} email`, desc: 'It is sent as soon as you select Send now. Changes here apply to this email only.', size: 'xl',
    body: '<div id="rep-send-body"></div>',
    actions: [{ label: 'Cancel', kind: 'outline' }, { label: 'Send now', icon: 'send', onClick: repSendNow }] });
  repRenderSend();
}
function repSendTypes(h) { return h.types.length ? h.types : repTypesOn(state.ctx, repConfig(state.ctx)); }
// Layout: a checkbox per report, then two panels side by side: Recipients (To, CC) and Email (subject,
// message). Each picker sits under its label with the people chosen listed below it.
function repRenderSend() {
  const d = state.ui.repDraft, ws = currentWs(), h = repHistory(ws.id).find(x => x.id === d.hid), full = d.to.length >= 20;
  const agency = members.filter(m => m.org === 'agency' && m.status === 'active' && (m.workspaces.includes('*') || m.workspaces.includes(ws.id)));
  const people = (list, none) => list.length ? `<div class="rep-people">${list.join('')}</div>` : `<div class="t-muted rep-none">${none}</div>`;
  renderRegion('rep-send-body', `
    ${repSendTypesHTML(ws, h, d)}
    <div class="rep-send-cols">
      <section class="rep-send-panel" aria-labelledby="rep-send-rcpt">
        <h4 class="rep-send-head" id="rep-send-rcpt">Recipients</h4>
        ${repComboHTML('send-to', 'To', repPlaceholder('to'), full ? 'Up to 20 recipients: remove one to add another.' : '', full, d.err)}
        ${people(d.to.map(r => repPersonChip(r.name, r.email, `repDraftRemove('to', '${r.id}')`)), 'No recipients yet.')}
        ${agency.some(m => !d.cc.includes(m.id)) ? repComboHTML('send-cc', 'Cc', repPlaceholder('cc'), '') : '<div class="field-label rep-send-label">Cc</div>'}
        ${people(d.cc.map(id => memberById(id)).filter(Boolean).map(m => repPersonChip(m.name, m.email, `repDraftRemove('cc', '${m.id}')`)), 'No one is copied in.')}
      </section>
      <section class="rep-send-panel rep-send-email" aria-labelledby="rep-send-mail">
        <h4 class="rep-send-head" id="rep-send-mail">Email</h4>
        <div class="field"><label class="field-label" for="rep-send-subject">Subject</label><input class="input" id="rep-send-subject" value="${esc(d.subject)}" oninput="repDraftText('subject', this.value)"><div class="field-hint" id="rep-send-subject-preview">Preview: ${esc(repFill(d.subject || REP_SUBJECT, ws.id, h.month))}</div></div>
        <div class="field"><label class="field-label" for="rep-send-message">Message</label><textarea class="textarea" id="rep-send-message" rows="8" oninput="repDraftText('message', this.value)">${esc(d.message)}</textarea><div class="field-hint">{client}, {month} and {am} are replaced with the client’s name, the report month and the account manager’s name.</div></div>
      </section>
    </div>`);
}
// One checkbox per report in the email, so the AM can send just the SEM or SMM Report. The last one ticked can't be
// unticked: an email needs at least one report.
function repSendTypesHTML(ws, h, d) {
  const all = repSendTypes(h);
  return `<h4 class="rep-send-head" id="rep-send-reps">Reports</h4><div class="rep-send-types" role="group" aria-labelledby="rep-send-reps">${all.map(t => {
      const on = d.types.includes(t), last = on && d.types.length === 1;
      return `<label class="rep-send-type ${on ? 'on' : ''} ${last ? 'is-locked' : ''}" ${last ? 'title="An email needs at least one report."' : ''}><input type="checkbox" ${on ? 'checked' : ''} ${last ? 'aria-disabled="true" onclick="return false"' : ''} onchange="repDraftType('${t}', this.checked)"><span class="rep-send-type-text"><span class="rep-send-type-name">${esc(REP_TYPES[t].name)}</span><span class="rep-send-file"><i data-lucide="paperclip"></i>${esc(repFileName(ws.id, t, h.month))}</span></span></label>`;
    }).join('')}</div>`;
}
function repDraftType(t, on) {
  const d = state.ui.repDraft, h = repHistory(state.ctx).find(x => x.id === d.hid);
  d.types = repSendTypes(h).filter(x => x === t ? on : d.types.includes(x));
  repRenderSend();
}
function repDraftText(field, v) {
  const d = state.ui.repDraft, h = repHistory(state.ctx).find(x => x.id === d.hid);
  d[field] = v;
  if (field === 'subject') document.getElementById('rep-send-subject-preview').textContent = `Preview: ${repFill(v.trim() || REP_SUBJECT, state.ctx, h.month)}`;
}
function repDraftRemove(kind, id) {
  const d = state.ui.repDraft;
  if (kind === 'cc') d.cc = d.cc.filter(x => x !== id); else d.to = d.to.filter(r => r.id !== id);
  repRenderSend();
}
function repSendNow() {
  const d = state.ui.repDraft, list = repHistories[state.ctx], h = list.find(x => x.id === d.hid);
  if (!d.to.length) {
    d.err = 'Add at least one recipient.';
    repRenderSend();
    document.getElementById('rep-send-to-input')?.focus();
    return false;
  }
  const subject = d.subject.trim() || REP_SUBJECT;
  const entry = { id: uid('rh'), month: h.month, sentAt: repToday().toISOString(), to: d.to.map(r => r.email), cc: [...d.cc], subject, message: d.message, status: 'sent', types: [...d.types] };
  const i = list.indexOf(h);
  if (h.status !== 'sent' && i >= 0) list[i] = entry; else list.unshift(entry);
  state.ui.repDraft = null;
  rerender();
  showToast(`${repMonthLabel(h.month)} ${repJoin(d.types.map(t => REP_TYPES[t].short))} email sent to ${d.to.length} ${d.to.length === 1 ? 'recipient' : 'recipients'}`, 'send');
}

// ---------- PDF viewer. Route params: report=sem|smm, and preview=sample (sample data) or preview=YYYY-MM (a sent report) ----------
function repOpenSample(type) { state.params = { tab: repTab(), report: type, preview: 'sample' }; rerender(); }
function repOpenSent(type, month) { state.params = { tab: 'history', report: type, preview: month }; rerender(); }
function repClosePreview() { const { preview, report, ...rest } = state.params; state.params = rest; rerender(); }
function repViewArgs() {
  const type = REP_TYPES[state.params.report] ? state.params.report : REP_TYPE_IDS[0], sample = state.params.preview === 'sample';
  const cfg = repConfig(state.ctx), month = sample ? repLastMonth() : state.params.preview;
  return { wsId: state.ctx, type, cfg, sample, month, upcoming: !sample && month === repNextMonth(cfg) && !repHistory(state.ctx).some(h => h.month === month && h.status === 'sent') };
}
function repViewerHTML() {
  const r = repViewArgs(), t = REP_TYPES[r.type], ws = wsById(r.wsId);
  const sentMonths = repHistory(r.wsId).filter(h => h.status === 'sent' && h.types.includes(r.type)).map(h => h.month);
  const months = [...new Set([...sentMonths, ...(r.sample ? [] : [r.month])])].sort().reverse();
  return `<div class="rep-viewer" role="dialog" aria-modal="true" aria-label="${esc(t.name)} preview">
    <div class="rep-viewer-bar">
      <div class="grow"><div class="rep-viewer-title">${r.sample ? `${esc(t.name)} preview <span class="rep-sample-badge">Sample data</span>` : `${esc(repFileName(r.wsId, r.type, r.month))}${r.upcoming ? ' <span class="rep-upcoming-badge">Upcoming</span>' : ''}`}</div>
        <div class="rep-viewer-sub">${r.sample ? esc(`Made-up names and numbers, to check the sections and columns that are turned on. The real report uses ${ws.name}’s data.`) : r.upcoming ? esc(`Not sent yet: this is what recipients will get on ${fmtDateTime(repSendDate(r.month, r.cfg))}, with ${ws.name}’s data and the current set-up. Change sections, columns or recipients until then.`) : repHistory(r.wsId).some(h => h.month === r.month && h.status === 'cancelled') ? 'Generated, not sent: the send was cancelled during review.' : repHistory(r.wsId).some(h => h.month === r.month && h.status === 'failed') ? 'Generated, not sent yet: the email is held until every report in it has been generated.' : 'As sent. In the product this is the stored PDF; the prototype draws it again.'}</div></div>
      ${r.sample ? '' : `<select class="select rep-viewer-month" aria-label="Report month" onchange="state.params.preview = this.value; rerender()">${months.map(m => `<option value="${m}" ${m === r.month ? 'selected' : ''}>${esc(repMonthLabel(m))}</option>`).join('')}</select>`}
      <button type="button" class="btn btn-primary" onclick="repDownload()"><i data-lucide="download"></i>Download PDF</button>
      <button type="button" class="kebab rep-viewer-close" aria-label="Close preview" onclick="repClosePreview()"><i data-lucide="x"></i></button>
    </div>
    <div class="rep-viewer-scroll" id="rep-viewer-scroll"><div class="rep-pages" id="rep-pages">${repPages(r).join('')}</div></div>
  </div>`;
}
// Pages are drawn at A4 size and zoomed to fit the viewer.
function repFitPages() {
  const s = document.getElementById('rep-viewer-scroll'), p = document.getElementById('rep-pages');
  if (s && p) p.style.zoom = Math.min(1, (s.clientWidth - 48) / 1123);
}
window.addEventListener('resize', repFitPages);
// "Download PDF" opens the browser's print dialog on the pages alone (Save as PDF), A4 landscape. Links stay clickable.
function repDownload() {
  const r = repViewArgs();
  const el = document.createElement('div');
  el.id = 'rep-print';
  el.innerHTML = repPages(r).join('');
  document.body.appendChild(el);
  document.body.classList.add('rep-printing');
  const done = () => { el.remove(); document.body.classList.remove('rep-printing'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  const title = document.title;
  document.title = repFileName(r.wsId, r.type, r.month).replace(/\.pdf$/, '') + (r.sample ? '_SAMPLE' : '');
  window.print();
  document.title = title;
  setTimeout(done, 500);
}

// =====================================================================
// Screen, dev toolbar and specs
// =====================================================================
registerScreen('reports', {
  contexts: ['agency', 'client'],
  title: () => isAgency() ? 'Reports' : 'Monthly Reports',
  desc: () => isAgency() ? 'Monthly SEM and SMM reports for your clients: what’s scheduled, what was sent and what needs attention.' : 'Choose which reports this client receives, the sections and columns in each, when they’re sent and who receives them. Only your agency sees this page.',
  key: () => isAgency() ? 'agency-reports' : state.params.preview === 'sample' ? 'client-reports-sample' : state.params.preview ? 'client-reports-sent' : `client-reports-${repTab()}`,
  render: () => isAgency() ? repRenderAgency() : repRenderClient(),
  afterRender: () => repFitPages()
});
registerDevScreen('Agency', 'agency-reports', 'Reports › Client Reports', () => { state.ctx = null; navigate('reports'); });
REP_TABS.forEach(t => registerDevScreen('Client workspace', `client-reports-${t.id}`, `Reports › ${t.label}`, () => { state.ctx = devClientCtx(); navigate('reports', { tab: t.id }); }));
registerDevScreen('Client workspace', 'client-reports-sample', 'Reports › Preview with sample data', () => { state.ctx = devClientCtx(); navigate('reports', { tab: 'sem', report: 'sem', preview: 'sample' }); });
registerDevScreen('Client workspace', 'client-reports-sent', 'Reports › Sent report', () => {
  state.ctx = devClientCtx();
  const h = repHistory(state.ctx).find(x => x.status === 'sent');
  navigate('reports', h ? { tab: 'history', report: h.types[0], preview: h.month } : { tab: 'history' });
});
const repReviewToggle = () => ({ label: 'Review period (1st of next month)', active: !!state.flags.repReview, run: () => { state.flags.repReview = !state.flags.repReview; if (state.params.preview && !state.flags.repReview) repClosePreview(); else render(); } });
const repDevToggles = () => [repReviewToggle()];
registerDevToggles('agency-reports', () => [repReviewToggle()]);
[...REP_TABS.map(t => `client-reports-${t.id}`), 'client-reports-sample', 'client-reports-sent'].forEach(k => registerDevToggles(k, repDevToggles));

(function repSpecs() {
  const outline = type => REP_TYPES[type].sections.map((s, i) => `${i + 1}. **${s.title}** (${REP_PLATFORM[s.source]}): ${s.blocks.map(b => b.kind === 'table' ? `table “${b.title}” (${b.cols.map(k => repColLabel(b.platform, k)).join(', ')}${b.limit ? `; top ${b.limit}` : ''})` : `chart “${b.title}”${b.chart === 'summary' ? ` (${b.metrics.map(k => repColLabel(b.platform, k)).join(', ')})` : ''}`).join('; ')}`).join('\n');
  const common = `
### Scope and audience
- **Agency only.** Account managers (AMs) set up each client's reports in Galaxis. Client users never see the Reports page; in Client user view the nav item is hidden and the route sends them to the Dashboard. Clients only receive the PDFs by email.
- **Two fixed reports per client:** the **SEM Report** (Google Ads) and the **SMM Report** (Facebook Page, Instagram and Meta Ads). Each has fixed sections in a fixed order, with fixed headings, charts and tables. Per client the AM can only turn a report on or off, turn sections on or off, and turn table columns on or off (column order is fixed). No templates and no custom headings (decided 20/11/2026).
- **Sources:** a section needs its source linked to the workspace. A section whose source isn't linked can't be turned on. Nothing from a CRM or other integration.
- **Permissions (agency roles, Team & Access › Agency › Monthly Reports):** View Reports, Set Up Reports (reports, sections, columns, schedule, recipients), Send Reports (resend). Account Manager has all three; Analyst can view.
- **Mock data:** the dashboard's platform data, scaled to the days in the report month; search terms split from keywords; posts, captions and followers generated per workspace. All names, captions and numbers are placeholders.`;
  const sources = `
### What the APIs give us (checked 20/11/2026)
- **Campaign types** come from \`campaign.advertising_channel_type\` (Search, Performance Max, Demand Gen, Video = YouTube, Display), so nothing needs tagging by hand.
- **Levels:** Google campaign, ad group, ad, keyword (\`keyword_view\`) and search term (\`search_term_view\`, Search campaigns only; Google hides low-volume terms for privacy, so search terms don't add up to the campaign). Meta campaign, ad set, ad. Performance Max has no ads: results are per asset group.
- **"Ran in the month"** = at least 1 impression between the 1st and the last day of the month. Neither ads API keeps a usable status history, so delivery decides. **Status** shows the status when the report is made.
- **Search ad text:** \`ad_group_ad.ad.responsive_search_ad\` gives every headline and description as written; Google mixes them, so the PDF shows the first three headlines and the first description with a note.
- **Links in the PDF are clickable** (Chrome / Puppeteer keep \`<a href>\` links when printing to PDF). Google: the ad's final URL (YouTube: the video). Meta: the ad's \`preview_shareable_link\` (to be checked: whether it still opens once the ad is off). Posts: Facebook \`permalink_url\`, Instagram \`permalink\`.
- **Thumbnails:** Google image asset or YouTube thumbnail; Meta creative thumbnail; posts \`full_picture\` / \`media_url\` / \`thumbnail_url\`. Downloaded and stored when the PDF is made, because Meta's image URLs expire. Search ads have no image.
- **Organic:** posts published in the month, with their lifetime results on the day the report is made. Instagram stories are left out: their insights are only available for 24 hours. Meta replaced impressions with **views** (Instagram from April 2025, Facebook Pages from November 2025, more Page metrics retired in v25.0, February 2026). Audience by age and gender (Instagram): accounts reached, from \`reached_audience_demographics\` with the age and gender breakdowns (not followers).
- **Reach and viewers** can't be added up across days or posts: totals come from a separate account-level query, and post table totals leave them out.`;
  const connection = `
### Connecting Facebook Pages and Instagram (Integrations)
- **No sign-in per client.** Galaxis reads Pages and Instagram accounts through the agency's existing Meta Business Manager system user (the same master connection that finds ad accounts). The client gives ${AGENCY_ORG.name}'s business portfolio access to their Page and Instagram account once (Business settings › Partners), as most already do for ads. They then appear in the workspace's **Organic Social** cards to link, like ad accounts.
- **Permissions to add to the Meta app** (Advanced Access, so Meta App Review is needed): \`pages_show_list\`, \`pages_read_engagement\`, \`read_insights\`, \`instagram_basic\`, \`instagram_manage_insights\` (plus \`business_management\`, already used for ad accounts). To be confirmed against Meta's current permission list during App Review.
- **Instagram** must be a Business or Creator account connected to a Facebook Page.
- **Fallback** for a client who won't add the agency as a partner: Facebook Login for Business (OAuth) by someone with access to the Page. Not in the prototype.`;
  const spec = (title, purpose, body, extra = '') => ({ title, status: 'Draft', author: 'Hannah', updatedAt: '20/11/2026', notes: `
### Screen purpose
${purpose}
${common}

### Key functional specifications
${body}
${extra}` });
  const summary = `- **Summary card (all tabs):** status, one line on the next send ("The November 2026 SEM and SMM reports will be sent on 3 Dec 2026, 12:00 to 2 recipients"). A failed latest email shows a red banner with the reason, what to do ("Retry the SEM Report, then send the email") and a **Retry SEM** / **Retry SMM** button for each report still failing, plus a "View in Sent Reports" link (left out on that tab). Once every report is regenerated the banner turns blue, "The October 2026 reports are ready to send", with **Send email**.`;
  const report = type => spec(`Reports › ${REP_TYPES[type].name} (Client workspace, agency only)`, `Turn the ${REP_TYPES[type].name} on or off for this client, and choose which of its fixed sections and table columns are included.`, `
${summary}
- **No set-up step:** every client workspace has this page, with both reports off to begin with. Every section and column starts on. Recipients start with the workspace Owner and a marketing@ address; the account manager is copied in.
- **Turning a report on needs its source:** the SEM Report needs Google Ads; the SMM Report needs Meta (a Facebook Page, Instagram account or Meta Ads account). Without it the switch stays off, its hint says what is needed, and turning it on opens a dialog: "Link Google Ads first … Link it in Integrations, then turn the SEM Report on." Sections whose source isn't linked are greyed out with the switch disabled.
- **Send the ${REP_TYPES[type].name} every month:** on/off. Off keeps the section choices.
- **Defaults for a new client (general):** on: SEM Overall performance, Campaign performance, Conversion type breakdown, Age and gender, the Search sections (Search campaigns, ad groups, keywords, search terms, search ads: every SEM client runs Search); SMM Facebook Page, Facebook posts, Instagram, Instagram posts, Meta Ads and All Ads (a table of every Meta ad that ran, right below Meta Ads). Off until the AM turns them on: every other campaign-type section (Performance Max, Demand Gen, Display, YouTube, App install; Meta Awareness, Traffic, Engagement, Lead generation, Sales).
- **Daily charts:** every campaign-type section offers the same two: Impressions and clicks by day, and Conversions and cost per conversion by day (Meta: Impressions and link clicks by day only, as the sheet has no conversions for Meta). They start on where the sample report had daily charts (Search and Performance Max). Overall performance also has Impressions and clicks by day, for all campaigns.
- **Sections** (fixed order, fixed headings): the Cover page is always included. Each section has an on/off switch, its platform and what it contains. Sections that are on start **open**; each can be collapsed to one line summarising what's in it ("Summary cards: 8 of 10 · Charts: 1 of 1", "Search campaigns table: 13 of 13 columns"); clicking the title (or its chevron) opens the chips. **Expand all / Collapse all** sits above the list. Turning a section on opens it.
- **Report off:** the sections stay editable, but their switches and chips turn grey and a note says "The SEM Report is off, so none of these sections are sent. Your choices are kept for when you turn it on."  A section whose source isn't linked is greyed out with the switch disabled and a link to Integrations. With every section off, a warning says the report won't be sent.
- **Each section that is on shows, in PDF order:** Summary cards, then Charts, then each table's columns.
- **Summary cards** (the big numbers at the top of a section; Looker Studio calls them scorecards): no switch, always part of the section. The numbers are on/off chips in a fixed order; deselecting every chip leaves the cards out. In the PDF they have no title.
- **Charts:** on/off chips (e.g. Impressions and clicks by day).
- A section without a table keeps at least one summary card or chart (turn the section off instead): the last one left can't be deselected. A section that is off just lists what it contains.
- **Summary card numbers:** a few extra numbers start off (e.g. Cost / conv. and Conv. value for Google). At least one stays on.
- **Sorting:** every table is sorted by its first number column that is turned on, highest first (Impr., or Clicks if Impr. is off, and so on; Status and Match type are skipped). Top 10 / Top 20 tables take the top rows by that column. No sort setting.
- **Columns:** for each table in a section that is on, a row of on/off chips in the fixed column order. The first chip is the name column (Campaign name, Ad group name, Asset group name, Ad set name, Keyword, Search term, Ad preview, Post preview): greyed out with a lock, always shown, can't be turned off. At least one column stays on (the last one can't be turned off). The row's name, and for ads and posts the thumbnail, text and link, always show.
- **Last month note:** if a table had no rows last month for this client (e.g. no Performance Max campaigns ran), the section says so: empty tables, and sections left with nothing, are left out of the real PDF that month.
- **Preview with sample data:** opens the PDF with made-up names (Lorem ipsum campaign 1…), lorem ipsum captions and ad text, example.com links and mock numbers, marked "Sample data" on the cover, on every page and in the viewer. Uses the sections and columns turned on; every section that is on shows, as the sample has every kind of campaign.

### ${REP_TYPES[type].name}: sections in order
${outline(type)}`, sources + (type === 'smm' ? connection : ''));
  Object.assign(screenSpecs, {
    'agency-reports': spec('Reports — Client Reports (Agency)', 'Every client workspace the AM can see, with the state of its monthly reports, so nothing is missed: which clients have no reports, which are paused and which failed last month.', `
- **KPI cards:** count of workspaces that are Active, Inactive, and whose last report failed. Each card is also a **filter**: click it to show only those clients (the card is highlighted, "Showing only these", and a "Showing: Last report failed ×" chip sits by the search); click it again or the × to show all.
- **Table:** Client Workspace, Linked (logos of the linked sources, or "Nothing linked"), Reports (SEM / SMM tags for the reports turned on, or None), Next Send ("November 2026 Report", then a pill: Month in progress (grey) / Ready for review (amber, during the review period) / Cancelled (red) / Not scheduled (grey, with the reason), and the send date and time), Last Sent ("October 2026 Report", then Sent with the date, or Failed), and a **Review** button during the review period. No Status column: the Reports and Next Send columns show it. Sort by name (default) or next send. Search by name, 10 per page.
- **Statuses:** Active (green: a report is on and there is at least 1 recipient) · Inactive (grey), with the reason underneath: No report is turned on / No recipients. A failed latest email shows "Last report failed" in red under the status. Inactive workspaces stay in the list, so the AM can see which clients still need a report.
- Selecting a row opens that workspace's Reports page.`),
    'client-reports-sem': report('sem'),
    'client-reports-smm': report('smm'),
    'client-reports-delivery': spec('Reports › Schedule & Recipients (Client workspace, agency only)', 'When the reports are sent, who receives them and what the email says. Changes save as they are made.', `
${summary}
- **One email for both reports:** the SEM and SMM Reports turned on are attached to the same monthly email.
- **Schedule:** no on/off switch here: each report turned on (SEM / SMM tabs) is sent every month. Set per client: **Send on** (the 1st to the 28th of each month, so every month has the day) and **At** (on the hour, Singapore time). The default is the 3rd at 12:00 pm, by when most late conversions have come in; a "Default" tag shows while it is unchanged, and **Reset to default** once it is changed. Choosing the 1st or 2nd adds a note that late conversions may be missed. Each report covers the previous calendar month. The review period runs from the 1st to the send. The PDFs are made just before sending and their numbers are frozen.
- **Recipients — To:** client contacts, up to 20, shown as chips (initials, name, email, remove ×). One **Add a recipient** field suggests workspace members as you type (arrow keys and Enter, or click) and also takes any valid email (a name can be typed with it as "Jane Tan <jane@company.com>"; the hint doesn't mention this). An invalid or duplicate email shows an error under the field, cleared as soon as you type again. Without recipients nothing is sent and the status is Inactive.
- **Recipients — Cc:** agency members assigned to the workspace, as chips, added with the same kind of field (**Copy in an agency member**), which only suggests agency members (matched by name or email).
- **Picker copy:** To's placeholder is "Choose a workspace member, or type an email"; Cc's is "Choose an agency member, or type an email". On phones (600px and narrower) they shorten to "Member or email" and "Agency member or email", since placeholders can't wrap. No hint under the fields (only "Up to 20 recipients…" when To is full, or an error).
- **Email:** account manager (cover "Prepared by" and reply-to), subject and message with {client}, {month} and {am} placeholders and a live subject preview; attachments \`{Client}_SEM-Report_{YYYY-MM}.pdf\` and \`{Client}_SMM-Report_{YYYY-MM}.pdf\`. Sent from a Galaxis no-reply address.
- **Failures:** if a source's data can't be fetched (e.g. an expired connection), nothing is sent with missing data. It is tried again daily for 3 days, then marked Failed and the AM is notified.
- **PDPA:** recipient emails are personal data: only stored for sending, removed with the workspace; the prototype uses placeholder addresses only.`),
    'client-reports-history': spec('Reports › Sent Reports (Client workspace, agency only)', 'Every monthly email sent for this client, so the AM can see what the client received and resend it.', `
- **First row: the next report.** While its month is still running: **Month in progress**, with "Preview from 1 Dec" in place of the Preview buttons. From the 1st of the following month until it is sent on the client's send date (the 3rd at 12:00 by default) (the **review period**): **Ready for review**, with **Preview SEM / Preview SMM** (the real report as it will be sent, with the client's data and the current set-up, marked "Upcoming") and **Cancel send** (confirmation; the row then shows **Cancelled** with **Resume send**). Inactive workspaces show Inactive.
- **Past reports** have visible **View SEM / View SMM** buttons; next to them, **Resend email**. The action buttons sit in three fixed columns (SEM, SMM, send action), so they line up from row to row; nothing is hidden in a menu. Before the month ends the next report's row says "Preview from 1 Dec" instead of a button; during the review period its Preview buttons are the solid, primary call-out. The summary line says the reports are ready to review in Sent Reports.
- **Agency list:** clients in the review period have a **Review** button that opens their Sent Reports tab, and Next Send shows a "Ready for review" pill with "Sends 3 Dec 2026, 12:00" (or "Cancelled").
- Dev toggle **Review period (1st of next month)** shows this state.
- **Prototype data:** Visual Studio's history shows one of each past status: October Failed (Retry SEM), September Ready to send (the SEM Report was regenerated), August Cancelled (Send email), and July Sent.
- Each past email: month, status (Sent / Failed with the reason), sent date and time with "To 2 recipients" underneath (hover for the addresses). Which reports were attached shows in the row's View / Retry buttons, so there is no separate Reports or Recipients column: the table and its three action columns fit without scrolling down to a 1180px-wide window. Actions: **View SEM** / **View SMM** (the stored PDF, with the client's real data) and **Resend email** (see Manual sends).
- **Manual sends (Send email / Resend email, in this table and the banner):** a wide dialog titled "Send the October 2026 email" (or Resend), "Changes here apply to this email only." **Reports:** a plain checkbox per report in that month's email (SEM Report, SMM Report, each with its PDF file name underneath), on one line and ticked, so the AM can send just one; the last one ticked can't be unticked, since an email needs at least one report. Below, two panels side by side (stacked on narrow screens): **Recipients** (To, then Cc, each a picker as on Schedule & Recipients with the people chosen as chips underneath) and **Email** (grey panel: Subject with a live preview, Message). All start as the client's monthly settings. **Send now** with no recipient shows "Add at least one recipient." under To. Cancel and Send now stay pinned to the bottom of the dialog. The sent row records the reports, recipients, CC, subject and message actually used.
- **A failed email** means a report couldn't be generated (e.g. Google Ads data couldn't be fetched); the email is held, not sent with a missing report. The row has **Retry SEM** / **Retry SMM** for each report that failed (regenerates just that report; the others show **View**), and **Send email**, disabled until no report is still failing. Once every report is regenerated the row shows **Ready to send**. The banner on every tab has the Retry buttons, then Send email, until the email is sent.`),
    'client-reports-sample': spec('Reports › Preview with sample data (Client workspace, agency only)', 'Check the layout of a report, with the sections and columns turned on for this client, without showing real data.', `
- Opened from **Preview with sample data** on the SEM or SMM Report tab. Link: \`report=sem|smm&preview=sample\`.
- **Sample data:** made-up names (Lorem ipsum campaign 1, Dolor sit ad group 2…), lorem ipsum captions, search ad text and conversion actions, example.com links, mock numbers for last month. "Sample data" shows on the cover, on every page header, in the file name (\`…_SAMPLE\`) and in the viewer.
- Every section that is on shows (the sample has every kind of campaign); real reports leave out empty tables.

### PDF layout (A4 landscape, page by page)
1. **Cover:** Galaxis, "Monthly SEM Report" / "Monthly SMM Report", client name, month, the linked sources of that report, "Prepared by {AM}, ${AGENCY_ORG.name} · Generated {date}".
2. Each section turned on, in order: **its heading (and note) starts a new page**; **charts two to a page**; **each table starts on a new page** (or under its heading), with as many rows per page as fit (14 for campaigns and ad groups; 12 for keywords and search terms; 8 for image and video ads, asset groups and Meta ads; 7 for posts; 5 for search ads, which show their text), "continued" on later pages, and a Total row at the end. Subtitle: "Top 10 of 34 keywords that ran in October 2026 · Sorted by Clicks, highest first".
- **Daily charts (Google Ads and Meta Ads) cover the whole campaign:** from the earliest start date of the campaigns in the chart that ran in the report month (Google \`campaign.start_date\`, Meta \`start_time\`), capped at two months before the report month, to the month's last day. The report month is shaded and labelled; ticks on the 1st and 15th. **Followers** (Facebook only) has two charts: **Followers over time** covers the whole time the agency has managed the client's social media (service start date, up to 12 months) to the end of the report month, with the report month shaded; **Followers this month** covers the report month only, with a dot and line on each day a post went live, so follower changes can be read against posting days (over a long period the post markers are too dense to read). Instagram has no follower charts: the daily follower history can't be pulled, so the charts would need Galaxis to save the count every day.
- **Conversion type breakdown** (right after Campaign performance, below Conversions by campaign): each campaign with conversions, most first, with its conversion actions (Google \`segments.conversion_action_name\`) indented underneath; a Total row.
- **Age and gender** (SEM, after Conversion type breakdown): Clicks by age, Clicks by gender, Conversions by age and Conversions by gender, four charts on one page. Google Ads can't group by age and gender in the same query (\`age_range_view\` and \`gender_view\` are separate reports), so they are separate charts. Each includes Unknown.
- **Report colours** follow OOm's brand, modernised: wine (#A51F4E) for the main series, slate (#3E5468) for a second series and men, blush tints for table headers and the shaded report month, a deep plum-to-wine cover.
- **Reels watch time (Instagram):** Reels avg. watch time and Reels total watch time, as optional summary cards and Posts and reels table columns (off by default). Reels only (\`ig_reels_avg_watch_time\`, \`ig_reels_video_view_total_time\`); other posts show "—". The average is weighted by each reel's views.
- **Wide tables are never split:** type gets smaller as columns are added (9+ columns, 12+ columns, 16+ columns such as YouTube); readers can zoom into the PDF.
- **Campaign-type tables** (Search, Performance Max, Demand Gen, Display, YouTube, App install; Meta Awareness, Traffic, Engagement, Lead generation and Sales) offer the columns in the "Google & Meta Ads Metrics - Monthly Report" sheet, reordered to follow the funnel: reach and impressions, clicks, cost, video, conversions, value, impression share. Search ad groups, keywords, search terms and search ads use the Search columns that exist at their level. Number formats follow the sheet: counts 0 d.p.; percentages, currency, ROAS and Google Avg. frequency 2 d.p.; Google Avg. impr. freq. / user 0 d.p.; Meta Frequency 1 d.p.; Meta Purchases 2 d.p. (Meta can report fractional, modelled purchases). Column names follow the Galaxis naming (e.g. Conv., Search Impr. Share (%), Search Lost IS (budget), Search Lost IS (rank)), not the sheet's wording. The sheet's YouTube "Avg. Frequency" sits next to Avg. impr. freq. / user; which Google Ads metric it is is to confirm.
- **Rows:** ads show a thumbnail, name, campaign › ad group and a link; search ads show their headlines, URL and description; posts show the image, the first 3 lines of the caption, the date, the type and a **View post** link.
- No month-on-month comparison and no definitions page (decided 20/11/2026).
- **Download PDF** in the prototype opens the browser's print dialog (Save as PDF; links stay clickable).`),
    'client-reports-sent': spec('Reports › Sent report (Client workspace, agency only)', 'See a PDF exactly as the client received it.', `
- Opened from **View SEM Report / View SMM Report** in Sent Reports. Link: \`report=sem|smm&preview=YYYY-MM\`. The month can be changed to any other month that report was sent.
- In the product this is the stored PDF; the prototype draws it again with the client's mock data and current sections.
- Tables with no rows that month, and sections left with nothing, are left out.
- **Download PDF** as in the sample preview.`)
  });
})();
