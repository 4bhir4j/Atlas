import americas from '../data/countries/americas.json';
import europe from '../data/countries/europe.json';
import eurasia from '../data/countries/eurasia.json';
import mena from '../data/countries/mena.json';
import africa from '../data/countries/africa.json';
import asiaPacific from '../data/countries/asia-pacific.json';
import blocsRaw from '../data/blocs.json';
import relationsRaw from '../data/relations.json';
import meta from '../data/meta.json';

export { meta };

export const REGIONS = [
  'North America',
  'Latin America',
  'Europe',
  'Eurasia',
  'Middle East & North Africa',
  'Sub-Saharan Africa',
  'South Asia',
  'East Asia',
  'Southeast Asia',
  'Oceania',
];

export const REGION_CODES = {
  'North America': 'NAM',
  'Latin America': 'LAT',
  Europe: 'EUR',
  Eurasia: 'EUA',
  'Middle East & North Africa': 'MNA',
  'Sub-Saharan Africa': 'SSA',
  'South Asia': 'SAS',
  'East Asia': 'EAS',
  'Southeast Asia': 'SEA',
  Oceania: 'OCE',
};

export const TAGS = {
  'great-power': { label: 'Great power', desc: 'Global military, economic and diplomatic reach' },
  'middle-power': { label: 'Middle power', desc: 'Significant regional influence and some global reach' },
  'nuclear-armed': { label: 'Nuclear-armed', desc: 'Possesses nuclear weapons (declared or undeclared)' },
  p5: { label: 'UNSC P5', desc: 'Permanent member of the UN Security Council with veto power' },
  'energy-exporter': { label: 'Energy exporter', desc: 'Oil, gas or coal exports are strategically significant' },
  'critical-minerals': { label: 'Critical minerals', desc: 'Major producer or holder of energy-transition or strategic minerals' },
  chokepoint: { label: 'Chokepoint', desc: 'Controls or borders a strategic maritime chokepoint' },
  'active-conflict': { label: 'Active conflict', desc: 'Engaged in or experiencing a major armed conflict' },
  sanctioned: { label: 'Under sanctions', desc: 'Subject to broad US/EU/UN sanctions regimes' },
  'fragile-state': { label: 'Fragile state', desc: 'Contested governance, humanitarian emergency or state collapse risk' },
};

export const RELATION_TYPES = {
  alliance: { label: 'Alliance / partnership', short: 'ALLY', color: 'var(--rel-alliance)', dash: null },
  trade: { label: 'Trade link', short: 'TRADE', color: 'var(--rel-trade)', dash: '2 6' },
  dispute: { label: 'Dispute / rivalry', short: 'DISP', color: 'var(--rel-dispute)', dash: '10 6' },
};

// Hex twins of the CSS tokens, for canvas/SVG attributes that cannot read CSS variables.
export const RELATION_HEX = { alliance: '#3987e5', trade: '#199e70', dispute: '#d95926' };

export const DISPUTE_STATUS = {
  escalating: 'Escalating',
  active: 'Active',
  frozen: 'Frozen',
  easing: 'Easing',
};

export const BLOC_TYPES = {
  military: 'Military',
  political: 'Political',
  economic: 'Economic',
  energy: 'Energy',
  intelligence: 'Intelligence',
};

const withDerived = (c) => {
  const gdp = c.economy.gdpUsdBn;
  return {
    ...c,
    economy: {
      ...c.economy,
      gdpPerCapitaUsd: gdp != null && c.population ? Math.round((gdp * 1e9) / (c.population * 1e6)) : null,
    },
  };
};

export const countries = [...americas, ...europe, ...eurasia, ...mena, ...africa, ...asiaPacific]
  .map(withDerived)
  .sort((a, b) => a.name.localeCompare(b.name));

export const countryByIso = Object.fromEntries(countries.map((c) => [c.iso3, c]));

export const blocs = blocsRaw;
export const blocById = Object.fromEntries(blocs.map((b) => [b.id, b]));

export const blocsByIso = {};
for (const b of blocs) {
  for (const iso of b.members) (blocsByIso[iso] ||= []).push(b.id);
}

export const relations = relationsRaw.map((r, i) => ({ ...r, id: `${r.type}-${r.a}-${r.b}-${i}` }));

export const relationsByIso = {};
for (const r of relations) {
  (relationsByIso[r.a] ||= []).push(r);
  (relationsByIso[r.b] ||= []).push(r);
}

export const counterpart = (r, iso) => (r.a === iso ? r.b : r.a);

// Most salient relation type between the focus country and each partner. Militarised disputes
// (severity ≥ 2) always dominate; otherwise the strongest tie wins, ties broken dispute › alliance › trade.
const TYPE_PRIORITY = { dispute: 3, alliance: 2, trade: 1 };
const salience = (r) => (r.type === 'dispute' && r.strength >= 2 ? 100 : 0) + r.strength * 10 + TYPE_PRIORITY[r.type];
export function partnerTypes(iso) {
  const best = {};
  for (const r of relationsByIso[iso] || []) {
    const other = counterpart(r, iso);
    if (!best[other] || salience(r) > salience(best[other])) best[other] = r;
  }
  return Object.fromEntries(Object.entries(best).map(([k, r]) => [k, r.type]));
}

/** Choropleth / ranking metrics. `scale: 'log'` for heavy-tailed magnitudes. */
export const METRICS = {
  gdp: {
    label: 'GDP (nominal)',
    short: 'GDP',
    unit: 'USD bn',
    scale: 'log',
    get: (c) => c.economy.gdpUsdBn,
    format: (v) => fmtUsdBn(v),
  },
  gdpPerCapita: {
    label: 'GDP per capita',
    short: 'GDP/CAP',
    unit: 'USD',
    scale: 'log',
    get: (c) => c.economy.gdpPerCapitaUsd,
    format: (v) => (v == null ? 'N/A' : `$${fmtNum(v)}`),
  },
  gdpGrowth: {
    label: 'Real GDP growth',
    short: 'GROWTH',
    unit: '%',
    scale: 'linear',
    get: (c) => c.economy.gdpGrowthPct,
    format: (v) => fmtPct(v, true),
  },
  population: {
    label: 'Population',
    short: 'POP',
    unit: 'millions',
    scale: 'log',
    get: (c) => c.population,
    format: (v) => (v == null ? 'N/A' : v >= 1000 ? `${(v / 1000).toFixed(2)}bn` : `${v >= 10 ? v.toFixed(0) : v.toFixed(1)}m`),
  },
  milex: {
    label: 'Military expenditure',
    short: 'MILEX',
    unit: 'USD bn',
    scale: 'log',
    get: (c) => c.military.spendUsdBn,
    format: (v) => fmtUsdBn(v),
  },
  milexPct: {
    label: 'Military burden (% of GDP)',
    short: 'MIL %GDP',
    unit: '% of GDP',
    scale: 'linear',
    clampMax: 10,
    get: (c) => c.military.spendPctGdp,
    format: (v) => fmtPct(v),
  },
  personnel: {
    label: 'Active military personnel',
    short: 'TROOPS',
    unit: 'personnel',
    scale: 'log',
    get: (c) => c.military.activePersonnel,
    format: (v) => (v == null ? 'N/A' : v >= 1e6 ? `${(v / 1e6).toFixed(2)}m` : `${Math.round(v / 1000)}k`),
  },
  warheads: {
    label: 'Nuclear warheads (est.)',
    short: 'NUKES',
    unit: 'warheads',
    scale: 'log',
    zeroIsNoData: true,
    get: (c) => c.military.nuclearWarheads,
    format: (v) => (v == null ? 'N/A' : fmtNum(v)),
  },
  debt: {
    label: 'Government debt (% of GDP)',
    short: 'DEBT',
    unit: '% of GDP',
    scale: 'linear',
    clampMax: 160,
    get: (c) => c.economy.debtPctGdp,
    format: (v) => fmtPct(v),
  },
  inflation: {
    label: 'Inflation (CPI)',
    short: 'CPI',
    unit: '%',
    scale: 'log',
    get: (c) => c.economy.inflationPct,
    format: (v) => fmtPct(v),
  },
};

export function fmtNum(v) {
  if (v == null) return 'N/A';
  return v.toLocaleString('en-US');
}

export function fmtUsdBn(v) {
  if (v == null) return 'N/A';
  if (v >= 1000) return `$${(v / 1000).toFixed(2)}tn`;
  if (v >= 10) return `$${Math.round(v)}bn`;
  return `$${v.toFixed(1)}bn`;
}

export function fmtPct(v, signed = false) {
  if (v == null) return 'N/A';
  const s = Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1);
  return `${signed && v > 0 ? '+' : ''}${s}%`;
}

export function flagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((ch) => 0x1f1a5 + ch.charCodeAt(0)));
}

/** Rank of a country (1 = highest) among countries with a value for the metric. */
export function rankOf(metricKey, iso) {
  const m = METRICS[metricKey];
  const vals = countries
    .map((c) => ({ iso: c.iso3, v: m.get(c) }))
    .filter((x) => x.v != null && !(m.zeroIsNoData && x.v === 0))
    .sort((a, b) => b.v - a.v);
  const idx = vals.findIndex((x) => x.iso === iso);
  return idx === -1 ? null : { rank: idx + 1, of: vals.length };
}

/** Text search across name, ISO codes, capital, region, tags and bloc membership. */
export function matchesQuery(c, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [
    c.name,
    c.iso3,
    c.iso2,
    c.capital,
    c.region,
    ...(c.tags || []).map((t) => TAGS[t]?.label || t),
    ...(blocsByIso[c.iso3] || []),
  ]
    .join(' ')
    .toLowerCase();
  return needle.split(/\s+/).every((tok) => hay.includes(tok));
}

/** Category filter values look like `tag:nuclear-armed` or `bloc:NATO`. */
export function matchesCategory(c, category) {
  if (!category) return true;
  const [kind, value] = category.split(':');
  if (kind === 'tag') return (c.tags || []).includes(value);
  if (kind === 'bloc') return (blocsByIso[c.iso3] || []).includes(value);
  return true;
}
