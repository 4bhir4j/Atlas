# ATLAS — Geopolitical Intelligence Terminal

An interactive, Bloomberg-terminal-style dashboard for exploring countries, their strategic interests, alliances, trade links, disputes and resources. Built with **React + Leaflet** on **local JSON datasets**, so it runs fully offline with no API keys or map-tile services.

## Features

- **Interactive world map** (F1). A choropleth with 10 selectable layers: GDP, GDP per capita, growth, population, military spend, military burden, troops, nuclear warheads, debt and inflation. Click any country to open its profile. Its alliances, trade links and disputes are drawn as arcs to partner capitals, and the partners are shaded by relationship type.
- **Country profiles**, 66 states across 6 tabs: `DES` overview, `ECO` economy, `MIL` military, `GOV` government, `RES` strategic resources and `REL` relationships. Tabs include dataset rankings, strategic interests, bloc memberships and classification tags.
- **Relationship explorer** (F2). A circular network grouped by region, plus a sortable table of all 170 alliance, trade and dispute links. You can filter by type, dispute status, severity and region.
- **Blocs & alliances** (F3). The profile of each bloc (NATO, EU, BRICS, SCO, CSTO, ASEAN, OPEC+, AUKUS, Quad, Five Eyes and others), with combined totals and overlapping memberships.
- **Search and filters.** A command bar (`/`) searches countries, ISO codes and blocs. The monitor panel filters by region or category (tags such as *nuclear-armed*, *chokepoint*, *active conflict*, or bloc membership) and ranks by any indicator.
- **Methodology & sources** (F4). Indicator definitions, relationship coding rules, visual encoding, limitations and the source catalogue.
- **Flashpoint ticker**, shareable hash URLs (`#/map/JPN/eco`, `#/relations/CHN`, `#/blocs/NATO`) and keyboard shortcuts.

| Key | Action |
| --- | --- |
| `/` | Focus the command bar (↑/↓ + Enter to pick) |
| `F1`–`F4` | Map · Relations · Blocs · Methodology |
| `1`–`6` | Profile tabs |
| `Esc` | Clear the selection |

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm test          # dataset integrity tests (vitest)
npm run build     # static build in dist/ (relative paths, deployable anywhere)
```

## Data

Everything is stored in `src/data/`:

| File | Contents |
| --- | --- |
| `countries/*.json` | Country profiles, one file per macro-region |
| `relations.json` | Alliance / trade / dispute edges, with strength 1–3 |
| `blocs.json` | Blocs and alliances with ISO3 member lists |
| `meta.json` | Dataset version, vintage and sources |
| `world.geo.json` | Natural Earth 1:110m country boundaries (trimmed) |

Figures are approximate and use 2024 as the reference year. They are drawn from the IMF WEO, the World Bank, UN WPP, SIPRI, IISS, USGS, the EIA and UN Comtrade. Narrative content reflects the situation as of late 2025. For definitions, caveats and a schema example, see the in-app Methodology page. Run `npm test` after editing data: it checks the schema, ISO codes against the map geometry, relationship references and tag consistency.

Boundaries shown do not imply any position on sovereignty.
