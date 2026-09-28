import { useMemo, useState } from 'react';
import {
  countries,
  countryByIso,
  DISPUTE_STATUS,
  flagEmoji,
  fmtUsdBn,
  REGION_CODES,
  REGIONS,
  RELATION_HEX,
  RELATION_TYPES,
  relations,
} from '../lib/data.js';
import { Severity, StatusBadge } from './CountryProfile.jsx';
import { RegionSelect } from './CountryList.jsx';

const SIZE = 820;
const R = 300;
const C = SIZE / 2;

// Stable ring layout: countries grouped by region, gaps between regions.
const layout = (() => {
  const ordered = REGIONS.flatMap((reg) => countries.filter((c) => c.region === reg).sort((a, b) => a.name.localeCompare(b.name)));
  const gap = 1.4;
  const total = ordered.length + REGIONS.length * gap;
  const pos = {};
  const regionSpans = [];
  let slot = 0;
  for (const reg of REGIONS) {
    const members = ordered.filter((c) => c.region === reg);
    const start = slot;
    for (const c of members) {
      const ang = (slot / total) * Math.PI * 2 - Math.PI / 2;
      pos[c.iso3] = { ang, x: C + R * Math.cos(ang), y: C + R * Math.sin(ang) };
      slot += 1;
    }
    regionSpans.push({ reg, a0: (start / total) * Math.PI * 2 - Math.PI / 2, a1: ((slot - 1) / total) * Math.PI * 2 - Math.PI / 2 });
    slot += gap;
  }
  return { pos, regionSpans };
})();

const edgePath = (a, b) => {
  const p = layout.pos[a];
  const q = layout.pos[b];
  // Control point pulled toward the centre: tighter bundling for nearby nodes.
  const k = 0.18;
  const mx = (p.x + q.x) / 2;
  const my = (p.y + q.y) / 2;
  const cx = C + (mx - C) * k;
  const cy = C + (my - C) * k;
  return `M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${q.x.toFixed(1)},${q.y.toFixed(1)}`;
};

const arcPath = (r, a0, a1) => {
  const x0 = C + r * Math.cos(a0);
  const y0 = C + r * Math.sin(a0);
  const x1 = C + r * Math.cos(a1);
  const y1 = C + r * Math.sin(a1);
  return `M${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
};

export default function RelationsView({ selectedIso, onSelect, onOpenOnMap }) {
  const [types, setTypes] = useState({ alliance: true, trade: true, dispute: true });
  const [statuses, setStatuses] = useState({ escalating: true, active: true, frozen: true, easing: true });
  const [minStrength, setMinStrength] = useState(1);
  const [region, setRegion] = useState('');
  const [hoverIso, setHoverIso] = useState(null);
  const [sort, setSort] = useState({ key: 'strength', dir: -1 });

  const filtered = useMemo(
    () =>
      relations.filter((r) => {
        if (!types[r.type]) return false;
        if (r.type === 'dispute' && !statuses[r.status]) return false;
        if (r.strength < minStrength) return false;
        if (region && countryByIso[r.a].region !== region && countryByIso[r.b].region !== region) return false;
        return true;
      }),
    [types, statuses, minStrength, region],
  );

  const focus = hoverIso || selectedIso;
  const tableRows = useMemo(() => {
    const rows = selectedIso ? filtered.filter((r) => r.a === selectedIso || r.b === selectedIso) : filtered;
    const val = (r) =>
      sort.key === 'strength' ? r.strength * 1000 + (r.valueUsdBn || 0) : sort.key === 'since' ? r.since || 0 : sort.key === 'type' ? r.type : `${r.a}${r.b}`;
    return [...rows].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va > vb ? 1 : va < vb ? -1 : 0) * sort.dir;
    });
  }, [filtered, selectedIso, sort]);

  const degree = useMemo(() => {
    const d = {};
    for (const r of filtered) {
      d[r.a] = (d[r.a] || 0) + 1;
      d[r.b] = (d[r.b] || 0) + 1;
    }
    return d;
  }, [filtered]);

  const counts = useMemo(() => {
    const out = { alliance: 0, trade: 0, dispute: 0 };
    for (const r of filtered) out[r.type]++;
    return out;
  }, [filtered]);

  const sortBy = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));
  const sortMark = (key) => (sort.key === key ? (sort.dir === -1 ? ' ▼' : ' ▲') : '');

  // Draw order: trade underneath, alliances, disputes on top.
  const drawOrder = { trade: 0, alliance: 1, dispute: 2 };
  const edges = [...filtered].sort((a, b) => drawOrder[a.type] - drawOrder[b.type]);

  return (
    <div className="view-full rel-view">
      <aside className="panel" aria-label="Relationship filters">
        <div className="panel-head"><span>Filters</span><span className="spacer" /><span className="count">{filtered.length}/{relations.length}</span></div>
        <div className="filters scroll">
          <div className="field">
            <span>Relationship type</span>
            <div className="rel-toggles">
              {Object.entries(RELATION_TYPES).map(([k, t]) => (
                <button key={k} type="button" className="rel-toggle" aria-pressed={types[k]} onClick={() => setTypes((s) => ({ ...s, [k]: !s[k] }))}>
                  <span className={`line-swatch ${k}`} />
                  {t.label}
                  <span className="n">{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span>Dispute status</span>
            <div className="chips">
              {Object.entries(DISPUTE_STATUS).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className="btn"
                  aria-pressed={statuses[k]}
                  disabled={!types.dispute}
                  onClick={() => setStatuses((s) => ({ ...s, [k]: !s[k] }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="field">
            <span>Minimum strength / severity</span>
            <select className="select" value={minStrength} onChange={(e) => setMinStrength(Number(e.target.value))}>
              <option value={1}>1 — all</option>
              <option value={2}>2 — significant</option>
              <option value={3}>3 — critical only</option>
            </select>
          </label>
          <label className="field">
            <span>Region (either party)</span>
            <RegionSelect value={region} onChange={setRegion} />
          </label>
          <div className="field">
            <span>Focus country</span>
            {selectedIso && countryByIso[selectedIso] ? (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                <span className="chip">
                  {flagEmoji(countryByIso[selectedIso].iso2)} <b className="amber">{selectedIso}</b> {countryByIso[selectedIso].name}
                </span>
                <button type="button" className="btn" onClick={() => onSelect(null)}>Clear</button>
                <button type="button" className="btn" onClick={() => onOpenOnMap(selectedIso)}>Open on map ›</button>
              </div>
            ) : (
              <span className="muted" style={{ textTransform: 'none', letterSpacing: 0 }}>Click a node or table row to focus.</span>
            )}
          </div>
          <p className="muted" style={{ margin: 0, fontSize: 10.5 }}>
            Strength encodes line weight: alliance depth, trade volume tier, or dispute severity (1–3). Line style repeats the type
            so it is never identified by colour alone.
          </p>
        </div>
      </aside>

      <section className="panel network-wrap" aria-label="Relationship network">
        <div className="panel-head">
          <span>Network</span>
          <span className="spacer" />
          <span className="count">{Object.keys(degree).length} countries connected</span>
        </div>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Circular network of relationships grouped by region">
          {layout.regionSpans.map(({ reg, a0, a1 }) => {
            const mid = (a0 + a1) / 2;
            const lx = C + (R + 78) * Math.cos(mid);
            const ly = C + (R + 78) * Math.sin(mid);
            return (
              <g key={reg}>
                <path d={arcPath(R + 8, a0 - 0.02, a1 + 0.02)} stroke="#3a3a3a" strokeWidth="2" fill="none" />
                <text x={lx} y={ly} className="region-label" textAnchor="middle" dominantBaseline="middle">
                  {REGION_CODES[reg]}
                </text>
              </g>
            );
          })}
          <g>
            {edges.map((r) => {
              const involved = focus && (r.a === focus || r.b === focus);
              const op = focus ? (involved ? 0.95 : 0.06) : 0.45;
              return (
                <path
                  key={r.id}
                  d={edgePath(r.a, r.b)}
                  className="edge"
                  stroke={RELATION_HEX[r.type]}
                  strokeWidth={0.6 + r.strength * (involved ? 0.9 : 0.5)}
                  strokeDasharray={r.type === 'trade' ? '2 4' : r.type === 'dispute' ? '7 4' : undefined}
                  opacity={op}
                >
                  <title>{`${r.a}–${r.b}: ${r.label}`}</title>
                </path>
              );
            })}
          </g>
          <g>
            {countries.map((c) => {
              const p = layout.pos[c.iso3];
              const deg = degree[c.iso3] || 0;
              const isFocus = c.iso3 === focus;
              const linked = focus && filtered.some((r) => (r.a === focus && r.b === c.iso3) || (r.b === focus && r.a === c.iso3));
              const deg2rad = (p.ang * 180) / Math.PI;
              const flip = deg2rad > 90 && deg2rad < 270;
              const lx = C + (R + 14) * Math.cos(p.ang);
              const ly = C + (R + 14) * Math.sin(p.ang);
              return (
                <g
                  key={c.iso3}
                  onMouseEnter={() => setHoverIso(c.iso3)}
                  onMouseLeave={() => setHoverIso(null)}
                  onClick={() => onSelect(c.iso3)}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isFocus ? 6 : 2.5 + Math.min(4, deg * 0.35)}
                    fill={isFocus ? '#ffb000' : deg ? '#d8d4cc' : '#333'}
                    stroke="#000"
                    strokeWidth="2"
                    opacity={focus && !isFocus && !linked ? 0.35 : 1}
                  />
                  <text
                    x={lx}
                    y={ly}
                    className={`node-label ${isFocus || linked ? 'hl' : ''}`}
                    textAnchor={flip ? 'end' : 'start'}
                    dominantBaseline="middle"
                    transform={`rotate(${flip ? deg2rad - 180 : deg2rad} ${lx} ${ly})`}
                    opacity={focus && !isFocus && !linked ? 0.35 : 1}
                  >
                    {c.iso3}
                  </text>
                </g>
              );
            })}
          </g>
          {focus && countryByIso[focus] && (
            <text x={C} y={C} textAnchor="middle" dominantBaseline="middle" fill="#ffb000" style={{ font: '600 20px var(--mono)' }}>
              {countryByIso[focus].name.toUpperCase()}
            </text>
          )}
        </svg>
        <div className="legend-keys" style={{ padding: '6px 10px', borderTop: '1px solid var(--line)', marginTop: 0 }}>
          {Object.entries(RELATION_TYPES).map(([k, t]) => (
            <span key={k}><i className={`line-swatch ${k}`} /> {t.label}</span>
          ))}
          <span><i className="swatch" style={{ background: '#ffb000', borderRadius: '50%' }} /> Focus</span>
          <span className="muted">Node size = number of ties</span>
        </div>
      </section>

      <section className="panel" aria-label="Relationship table">
        <div className="panel-head">
          <span>Relations{selectedIso ? ` · ${selectedIso}` : ''}</span>
          <span className="spacer" />
          <span className="count">{tableRows.length} rows</span>
        </div>
        <div className="scroll" style={{ flex: 1 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th><button type="button" className="btn" style={{ border: 0, padding: 0, height: 'auto', background: 'none' }} onClick={() => sortBy('type')}>Type{sortMark('type')}</button></th>
                <th><button type="button" className="btn" style={{ border: 0, padding: 0, height: 'auto', background: 'none' }} onClick={() => sortBy('pair')}>Pair{sortMark('pair')}</button></th>
                <th>Relationship</th>
                <th className="num"><button type="button" className="btn" style={{ border: 0, padding: 0, height: 'auto', background: 'none' }} onClick={() => sortBy('strength')}>Str{sortMark('strength')}</button></th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => {
                const other = selectedIso && r.b === selectedIso ? r.a : r.b;
                const first = selectedIso && r.b === selectedIso ? r.b : r.a;
                return (
                  <tr key={r.id} className="clickable" onClick={() => onSelect(selectedIso === first ? other : first)} title={r.description}>
                    <td>
                      <span className={`line-swatch ${r.type}`} style={{ width: 14, marginRight: 5, verticalAlign: 3 }} />
                      <span style={{ fontSize: 10.5 }}>{RELATION_TYPES[r.type].short}</span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="amber">{first}</span>–<span className="amber">{other}</span>
                    </td>
                    <td>
                      <div>{r.label}</div>
                      <div className="muted" style={{ fontSize: 10.5 }}>
                        {r.type === 'trade' && <>≈ {fmtUsdBn(r.valueUsdBn)} / yr goods</>}
                        {r.type === 'alliance' && <>{r.subtype === 'treaty' ? 'Formal treaty' : 'Partnership'}{r.since ? ` · since ${r.since}` : ''}</>}
                        {r.type === 'dispute' && <><StatusBadge status={r.status} /> since {r.since}</>}
                      </div>
                    </td>
                    <td className="num">{r.type === 'dispute' ? <Severity n={r.strength} /> : <span className="dim">{'●'.repeat(r.strength)}</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {tableRows.length === 0 && <div className="empty">No relationships match these filters.</div>}
        </div>
      </section>
    </div>
  );
}
