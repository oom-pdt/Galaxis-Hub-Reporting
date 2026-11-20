# Galaxis Hub Reporting

A copy of the [Galaxis Hub Demo](https://github.com/oom-pdt/Hub-V2-Demo) (from commit 4cd33af), used to prototype reporting.

A clickable prototype of **Monthly Reports** only: account managers set up each client's monthly SEM Report (Google Ads) and SMM Report (Facebook Page, Instagram and Meta Ads), choose their sections and columns, schedule them and see what was sent. Agency view only. The other Galaxis pages appear in the sidebar for context but are disabled.

Two client workspaces:

- **Visual Studio:** Google Ads, Meta Ads, Facebook Page and Instagram all linked, with every kind of campaign running and reports already set up and sent.
- **TechNova Solutions:** only Google Ads linked, and both reports still off.

All people, companies, emails and numbers are placeholders.

## Running it

Open `index.html` directly in a browser. No build step is needed.

Or serve it with Vite:

```bash
npm install
npm run dev        # http://localhost:5173
```

## Single-file build

```bash
npm run build      # python3 scripts/build_standalone.py
```

This writes `standalone.html` and `dist/index.html`, with every stylesheet and script inlined. Google Fonts and Lucide icons still load from a CDN.

## Developer toolbar

The dark bar at the top has two parts:

- **Screen selector:** jump to any Reports screen in the agency context ("My Workspace") or a client workspace.
- **States:** scenario toggles for the current screen: Not set up, and Last report failed.

## Code layout

| File | Purpose |
|---|---|
| `src/design.css` | Figma tokens (colours, fonts, radii, shadows) and shared components |
| `src/data.js` | Mock entities: the agency, two client workspaces, their linked ad and social accounts, members |
| `src/core.js` | State, routing (`navigate`, `switchWorkspace`), formatting, modals, menus, sorting, pagination |
| `src/shell.js` | Sidebar (Reports only; other pages disabled), page header, workspace switcher |
| `src/devtools.js` | Developer toolbar |
| `src/specs.js` | Spec registry: the Reports module adds its screen specs here as documentation (not shown in the UI) |
| `src/ads-data.js` | Mock Google Ads and Meta Ads data: campaigns, ad groups, ads and keywords, and the platform columns |
| `src/reports.js` | Monthly Reports: the SEM and SMM Reports' fixed sections, each client's section, chart, summary card and column choices, schedule and recipients, sent reports, PDF preview with sample data, and download |
| `src/app.js` | Start-up |

Each module is a plain script loaded in the order listed in `index.html`, so all modules share one set of globals. Each module prefixes its globals (`ads`, `rep`) to avoid name clashes, and keeps any styles of its own in its matching `.css` file.
