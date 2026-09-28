import { useMemo } from 'react';
import { blocs, countries, flagEmoji, METRICS, REGIONS, TAGS } from '../lib/data.js';

export function CategorySelect({ value, onChange, id }) {
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All categories</option>
      <optgroup label="Classification">
        {Object.entries(TAGS).map(([k, t]) => (
          <option key={k} value={`tag:${k}`}>
            {t.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Bloc / alliance">
        {blocs.map((b) => (
          <option key={b.id} value={`bloc:${b.id}`}>
            {b.id} — {b.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

export function RegionSelect({ value, onChange, id }) {
  return (
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All regions</option>
      {REGIONS.map((r) => (
        <option key={r} value={r}>
          {r}
        </option>
      ))}
    </select>
  );
}

export default function CountryList({
  visible,
  selectedIso,
  onSelect,
  filters,
  setFilters,
  metricKey,
  onMetricChange,
  sortDir,
  onToggleSort,
}) {
  const metric = METRICS[metricKey];

  const rows = useMemo(() => {
    const withVal = visible.map((c) => ({ c, v: metric.get(c) }));
    return withVal.sort((a, b) => {
      if (a.v == null && b.v == null) return a.c.name.localeCompare(b.c.name);
      if (a.v == null) return 1;
      if (b.v == null) return -1;
      return sortDir === 'desc' ? b.v - a.v : a.v - b.v;
    });
  }, [visible, metric, sortDir]);

  const max = useMemo(() => Math.max(...rows.map((r) => Math.abs(r.v ?? 0)), 1), [rows]);

  const hasFilters = filters.query || filters.region || filters.category;

  return (
    <aside className="panel list-panel" aria-label="Country monitor">
      <div className="panel-head">
        <span>Monitor</span>
        <span className="spacer" />
        <span className="count">
          {visible.length}/{countries.length}
        </span>
      </div>
      <div className="filters">
        <label className="field">
          <span>Region</span>
          <RegionSelect value={filters.region} onChange={(region) => setFilters((f) => ({ ...f, region }))} />
        </label>
        <label className="field">
          <span>Category</span>
          <CategorySelect value={filters.category} onChange={(category) => setFilters((f) => ({ ...f, category }))} />
        </label>
        <label className="field full">
          <span>Rank by</span>
          <select className="select" value={metricKey} onChange={(e) => onMetricChange(e.target.value)}>
            {Object.entries(METRICS).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        {hasFilters && (
          <div className="full" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="muted" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {filters.query && <>“{filters.query}” </>}
            </span>
            <button type="button" className="btn" onClick={() => setFilters({ query: '', region: '', category: '' })}>
              Clear filters
            </button>
          </div>
        )}
      </div>
      <div className="list-head">
        <span>#</span>
        <span>Country</span>
        <button type="button" onClick={onToggleSort} title="Toggle sort direction">
          {metric.short} {sortDir === 'desc' ? '▼' : '▲'}
        </button>
      </div>
      {rows.length === 0 ? (
        <div className="empty">No countries match these filters.</div>
      ) : (
        <ul className="country-list">
          {rows.map(({ c, v }, i) => (
            <li key={c.iso3}>
              <button
                type="button"
                className="country-row"
                aria-current={c.iso3 === selectedIso}
                onClick={() => onSelect(c.iso3)}
              >
                <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                <span className="nm">
                  <span aria-hidden="true">{flagEmoji(c.iso2)}</span>
                  <span className="iso">{c.iso3}</span>
                  <span>{c.name}</span>
                </span>
                <span className="val">
                  {metric.format(v)}
                  {v != null && <span className="bar" style={{ width: `${Math.max(2, (Math.abs(v) / max) * 64)}px` }} />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
