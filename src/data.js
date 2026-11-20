// Galaxis Hub Reporting — shared mock data. Every person, email and number here is a placeholder.
// The prototype covers Monthly Reports only, with two client workspaces: one with everything linked and ready, and
// one with only Google Ads linked.

const AGENCY_ORG = { id: 'agency', name: 'OOm Pte Ltd', site: 'oom.com.sg' };

// budget: monthly ad spend the mock numbers are scaled to (SGD). smmSince: when the agency started managing the client's
// social media (organic charts start here). allCampaigns: the workspace runs one campaign of every
// kind in the mock data, so every report section has rows.
const workspaces = [
  { id: 'ws-visual',   name: 'Visual Studio',      industry: 'Digital Media', site: 'visualstudio.example.com', seed: 1, budget: 120000, allCampaigns: true, smmSince: '2026-05-11', archived: false },
  { id: 'ws-technova', name: 'TechNova Solutions', industry: 'Technology',    site: 'technova.example.com',     seed: 2, budget: 40000, archived: false }
];

// Ad accounts linked to each workspace (max 1 Google + 1 Meta account per workspace).
const adAccounts = [
  { id: '#778-901-2244', platform: 'google', name: 'Visual Studio — Search', workspaceId: 'ws-visual' },
  { id: 'act_98241028',  platform: 'meta',   name: 'Visual Studio — Social', workspaceId: 'ws-visual' },
  { id: '#401-552-1180', platform: 'google', name: 'TechNova — Brand Search', workspaceId: 'ws-technova' }
];

// Facebook Pages and Instagram professional accounts linked to each workspace (max 1 of each).
const socialAccounts = [
  { id: '104829301122041',   platform: 'facebook',  name: 'Visual Studio',         workspaceId: 'ws-visual' },
  { id: '17841400000000101', platform: 'instagram', name: '@visualstudio.example', workspaceId: 'ws-visual' }
];

// ---------- People ----------
// org: 'agency' (OOm staff) or a workspace id (client staff). workspaces: agency members' assigned client workspaces.
const members = [
  { id: 'm-a1', org: 'agency', name: 'Jungkook Jeon', email: 'jk@example.com',         roleId: 'r-a-owner', status: 'active', workspaces: ['*'] },
  { id: 'm-a3', org: 'agency', name: 'Joseph Tan',    email: 'joseph.tan@example.com', roleId: 'r-a-am',    status: 'active', workspaces: ['ws-visual', 'ws-technova'] },
  { id: 'm-a4', org: 'agency', name: 'Serah Chua',    email: 'serah.chua@example.com', roleId: 'r-a-am',    status: 'active', workspaces: ['ws-visual'] },
  { id: 'm-v1', org: 'ws-visual',   name: 'Jon Doe',       email: 'jon.doe@example.com',   status: 'active', isPrimary: true },
  { id: 'm-v2', org: 'ws-visual',   name: 'Xiao Chen',     email: 'xiao.chen@example.com', status: 'active' },
  { id: 'm-v3', org: 'ws-visual',   name: 'Aisha Tan',     email: 'aisha.tan@example.com', status: 'active' },
  { id: 'm-t1', org: 'ws-technova', name: 'Sarah Jenkins', email: 'sarah.j@example.com',   status: 'active', isPrimary: true }
];
const roles = [
  { id: 'r-a-owner', name: 'Owner' },
  { id: 'r-a-am',    name: 'Account Manager' }
];

// ---------- Deterministic random ----------
function seededRandom(seed) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
