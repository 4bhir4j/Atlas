import { useMemo } from 'react';
import {
  blocById,
  blocs,
  blocsByIso,
  countries,
  countryByIso,
  counterpart,
  DISPUTE_STATUS,
  flagEmoji,
  fmtNum,
  fmtPct,
  fmtUsdBn,
  meta,
  METRICS,
  rankOf,
  RELATION_TYPES,
  relations,
  relationsByIso,
  TAGS,
} from '../lib/data.js';
import { geoNameByIso } from '../lib/geo.js';

export const PROFILE_TABS = [
  { id: 'des', key: '1', label: 'DES', title: 'Overview' },
  { id: 'eco', key: '2', label: 'ECO', title: 'Economy' },
  { id: 'mil', key: '3', label: 'MIL', title: 'Military' },
  { id: 'gov', key: '4', label: 'GOV', title: 'Government' },
  { id: 'res', key: '5', label: 'RES', title: 'Resources' },
  { id: 'rel', key: '6', label: 'REL', title: 'Relations' },
];

function Stat({ label, metricKey, iso, value, sub }) {
  const m = metricKey ? METRICS[metricKey] : null;
  const c = countryByIso[iso];
  const v = value ?? (m ? m.format(m.get(c)) : 'N/A');
  const rk = metricKey ? rankOf(metricKey, iso) : null;
  return (
    <div className="kv">
      <div className="k" title={label}>{label}</div>
      <div className="v">{v}</div>
      <div className="r">{sub ?? (rk ? `#${rk.rank} of ${rk.of}` : ' ')}</div>
    </div>
  );
}

export function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}>{DISPUTE_STATUS[status]}</span>;
}

export function Severity({ n }) {
  return (
    <span className="severity" aria-label={`Severity ${n} of 3`} title={`Severity ${n}/3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={i <= n ? '' : 'off'}>▮</span>
      ))}
    </span>
  );
}

function RelationItem({ r, iso, onSelect }) {
  const other = countryByIso[counterpart(r, iso)];
  let meta;
  if (r.type === 'trade') meta = <>≈ {fmtUsdBn(r.valueUsdBn)}</>;
  else if (r.type === 'dispute') meta = <><StatusBadge status={r.status} /> <Severity n={r.strength} /></>;
  else meta = <>{r.subtype === 'treaty' ? 'TREATY' : 'PARTNER'} · {r.since}</>;
  return (
    <button type="button" className={`rel-item ${r.type}`} onClick={() => onSelect(other.iso3)}>
      <span aria-hidden="true">{flagEmoji(other.iso2)}</span>
      <span className="who">
        <span className="iso">{other.iso3}</span>
        {r.label}
      </span>
      <span className="meta">{meta}</span>
      <span className="desc">{r.description}</span>
    </button>
  );
}

function RelationsTab({ c, onSelect, relTypes }) {
  const rels = relationsByIso[c.iso3] || [];
  const groups = ['dispute', 'alliance', 'trade'].map((type) => ({
    type,
    items: rels
      .filter((r) => r.type === type)
      .sort((a, b) => (type === 'trade' ? b.valueUsdBn - a.valueUsdBn : b.strength - a.strength)),
  }));
  return (
    <div className="section">
      {groups.map(({ type, items }) => (
        <div className="rel-group" key={type} style={{ opacity: relTypes[type] ? 1 : 0.5 }}>
          <h4>
            <span className={`line-swatch ${type}`} />
            {RELATION_TYPES[type].label} <span className="muted">({items.length})</span>
          </h4>
          {items.length === 0 ? (
            <div className="muted" style={{ padding: '2px 6px' }}>None recorded in dataset.</div>
          ) : (
            items.map((r) => <RelationItem key={r.id} r={r} iso={c.iso3} onSelect={onSelect} />)
          )}
        </div>
      ))}
    </div>
  );
}

function Overview({ c, onCategory }) {
  const memberOf = blocsByIso[c.iso3] || [];
  return (
    <>
      <div className="kv-grid">
        <Stat label="GDP" metricKey="gdp" iso={c.iso3} />
        <Stat label="GDP / capita" metricKey="gdpPerCapita" iso={c.iso3} />
        <Stat label="Population" metricKey="population" iso={c.iso3} />
        <Stat label="Military spend" metricKey="milex" iso={c.iso3} />
        <Stat label="Active troops" metricKey="personnel" iso={c.iso3} />
        <Stat
          label="Nuclear warheads"
          iso={c.iso3}
          value={c.military.nuclearWarheads ? fmtNum(c.military.nuclearWarheads) : '—'}
          sub={c.military.nuclearWarheads ? `#${rankOf('warheads', c.iso3).rank} of ${rankOf('warheads', c.iso3).of}` : 'Non-nuclear'}
        />
      </div>
      <div className="section">
        <p className="prose">{c.summary}</p>
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 8 }}>Strategic interests</div>
        <ul className="bullet-list">
          {c.strategicInterests.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 8 }}>
          Classification <small>click to filter</small>
        </div>
        <div className="chips" style={{ marginBottom: 8 }}>
          {c.tags.length === 0 && <span className="muted">—</span>}
          {c.tags.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${t === 'active-conflict' ? 'tag-conflict' : ''}`}
              title={TAGS[t].desc}
              onClick={() => onCategory(`tag:${t}`)}
            >
              {TAGS[t].label}
            </button>
          ))}
        </div>
        <div className="chips">
          {memberOf.map((b) => (
            <button key={b} type="button" className="chip" title={blocById[b].name} onClick={() => onCategory(`bloc:${b}`)}>
              <b className="amber">{b}</b>
            </button>
          ))}
          {memberOf.length === 0 && <span className="muted">No tracked bloc memberships</span>}
        </div>
      </div>
    </>
  );
}

function Economy({ c, onSelect }) {
  const e = c.economy;
  const trade = (relationsByIso[c.iso3] || [])
    .filter((r) => r.type === 'trade')
    .sort((a, b) => b.valueUsdBn - a.valueUsdBn);
  const maxTrade = Math.max(...trade.map((t) => t.valueUsdBn), 1);
  const growthCls = e.gdpGrowthPct == null ? '' : e.gdpGrowthPct >= 0 ? 'up' : 'down';
  return (
    <>
      <div className="kv-grid">
        <Stat label="GDP (nominal)" metricKey="gdp" iso={c.iso3} />
        <Stat label="GDP / capita" metricKey="gdpPerCapita" iso={c.iso3} />
        <Stat
          label="Real growth"
          iso={c.iso3}
          metricKey="gdpGrowth"
          value={<span className={growthCls}>{e.gdpGrowthPct == null ? 'N/A' : `${e.gdpGrowthPct >= 0 ? '▲' : '▼'} ${fmtPct(e.gdpGrowthPct, true)}`}</span>}
        />
        <Stat label="Inflation" metricKey="inflation" iso={c.iso3} />
        <Stat label="Gov. debt / GDP" metricKey="debt" iso={c.iso3} />
        <Stat label="Currency" iso={c.iso3} value={<span style={{ fontSize: 11.5, whiteSpace: 'normal' }}>{e.currency}</span>} sub=" " />
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 8 }}>Key sectors</div>
        <div className="chips">
          {e.sectors.map((s) => (
            <span key={s} className="chip">{s}</span>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 6 }}>Top exports</div>
        <table className="data-table">
          <tbody>
            {e.topExports.map((x, i) => (
              <tr key={x}>
                <td className="muted" style={{ width: 24 }}>{i + 1}</td>
                <td>{x}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 6 }}>
          Tracked trade links <small>goods, ≈ USD bn/yr</small>
        </div>
        {trade.length === 0 ? (
          <div className="muted">No bilateral trade links tracked for this country.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Partner</th>
                <th className="num">Value</th>
              </tr>
            </thead>
            <tbody>
              {trade.map((r) => {
                const o = countryByIso[counterpart(r, c.iso3)];
                return (
                  <tr key={r.id} className="clickable" onClick={() => onSelect(o.iso3)} title={r.description}>
                    <td>
                      {flagEmoji(o.iso2)} <span className="amber">{o.iso3}</span> {o.name}
                      <div className="meter"><i style={{ width: `${(r.valueUsdBn / maxTrade) * 100}%`, background: 'var(--rel-trade)' }} /></div>
                    </td>
                    <td className="num">{fmtUsdBn(r.valueUsdBn)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Military({ c }) {
  const m = c.military;
  const maxSpend = Math.max(...countries.map((x) => x.military.spendUsdBn || 0));
  return (
    <>
      <div className="kv-grid">
        <Stat label="Expenditure" metricKey="milex" iso={c.iso3} />
        <Stat label="Burden (% GDP)" metricKey="milexPct" iso={c.iso3} />
        <Stat label="Active personnel" metricKey="personnel" iso={c.iso3} />
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 6 }}>
          Spend vs. largest spender <small>linear share</small>
        </div>
        {m.spendUsdBn == null ? (
          <div className="muted">No reliable open-source estimate available.</div>
        ) : (
          <>
            <div className="dim">{fmtUsdBn(m.spendUsdBn)} = {((m.spendUsdBn / maxSpend) * 100).toFixed(1)}% of the largest budget in the dataset</div>
            <div className="meter" style={{ height: 6 }}><i style={{ width: `${Math.max(0.5, (m.spendUsdBn / maxSpend) * 100)}%` }} /></div>
          </>
        )}
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 6 }}>Nuclear status</div>
        {m.nuclearWarheads > 0 ? (
          <div>
            <span className="chip tag-conflict">☢ NUCLEAR-ARMED</span>{' '}
            <span className="dim">≈ {fmtNum(m.nuclearWarheads)} warheads (total inventory estimate)</span>
          </div>
        ) : (
          <div className="dim">No nuclear weapons.</div>
        )}
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 8 }}>Notable capabilities</div>
        <ul className="bullet-list">
          {m.capabilities.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

function Government({ c, onCategory }) {
  const g = c.government;
  const memberOf = blocsByIso[c.iso3] || [];
  return (
    <>
      <div className="section">
        <table className="data-table">
          <tbody>
            <tr><th style={{ width: 130 }}>System</th><td>{g.system}</td></tr>
            <tr><th>Head of state</th><td>{g.headOfState}</td></tr>
            <tr><th>Head of gov't</th><td>{g.headOfGovernment}</td></tr>
            <tr><th>Capital</th><td>{c.capital}</td></tr>
            <tr><th>Area</th><td>{fmtNum(c.areaKm2)} km²</td></tr>
          </tbody>
        </table>
        {g.notes && <p className="prose dim" style={{ marginTop: 8, fontSize: 13 }}>{g.notes}</p>}
      </div>
      <div className="section">
        <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 6 }}>Bloc memberships</div>
        {memberOf.length === 0 && <div className="muted">No tracked bloc memberships.</div>}
        <table className="data-table">
          <tbody>
            {memberOf.map((id) => {
              const b = blocById[id];
              return (
                <tr key={id} className="clickable" onClick={() => onCategory(`bloc:${id}`)}>
                  <td style={{ width: 70 }} className="amber">{id}</td>
                  <td>{b.name}</td>
                  <td className="muted num">{b.type}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">Leadership as of {meta.asOf.toLowerCase()}. Offices change — verify against current official sources.</p>
    </>
  );
}

function Resources({ c }) {
  return (
    <div className="section">
      <table className="data-table">
        <thead>
          <tr><th>Resource / asset</th><th>Strategic significance</th></tr>
        </thead>
        <tbody>
          {c.resources.map((r) => (
            <tr key={r.name}>
              <td className="amber" style={{ width: '34%' }}>{r.name}</td>
              <td style={{ fontFamily: 'var(--sans)', fontSize: 13 }}>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GlobalBrief({ onSelect, metricKey }) {
  const flash = useMemo(
    () => relations.filter((r) => r.type === 'dispute' && r.strength === 3).sort((a, b) => (a.status === 'escalating' ? -1 : 1) - (b.status === 'escalating' ? -1 : 1)),
    [],
  );
  const m = METRICS[metricKey];
  const top = useMemo(
    () => countries.filter((c) => m.get(c) != null).sort((a, b) => m.get(b) - m.get(a)).slice(0, 8),
    [m],
  );
  const counts = {
    alliance: relations.filter((r) => r.type === 'alliance').length,
    trade: relations.filter((r) => r.type === 'trade').length,
    dispute: relations.filter((r) => r.type === 'dispute').length,
  };
  return (
    <>
      <div className="kv-grid">
        <Stat label="Countries" value={countries.length} sub="profiled" />
        <Stat label="Relationships" value={relations.length} sub={`${counts.alliance} A · ${counts.trade} T · ${counts.dispute} D`} />
        <Stat label="Blocs" value={blocs.length} sub="tracked" />
      </div>
      <div className="subhead">Top flashpoints <small>severity 3</small></div>
      <div className="section" style={{ paddingTop: 4 }}>
        {flash.map((r) => {
          const a = countryByIso[r.a];
          const b = countryByIso[r.b];
          return (
            <button key={r.id} type="button" className="rel-item dispute" onClick={() => onSelect(r.a)}>
              <span aria-hidden="true">⚑</span>
              <span className="who">
                <span className="iso">{a.iso3}/{b.iso3}</span>
                {r.label}
              </span>
              <span className="meta"><StatusBadge status={r.status} /></span>
              <span className="desc">{r.description}</span>
            </button>
          );
        })}
      </div>
      <div className="subhead">Leaders — {m.label}</div>
      <div className="section" style={{ paddingTop: 4 }}>
        <table className="data-table">
          <tbody>
            {top.map((c, i) => (
              <tr key={c.iso3} className="clickable" onClick={() => onSelect(c.iso3)}>
                <td className="muted" style={{ width: 24 }}>{i + 1}</td>
                <td>{flagEmoji(c.iso2)} <span className="amber">{c.iso3}</span> {c.name}</td>
                <td className="num">{m.format(m.get(c))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function CountryProfile({ iso, tab, onTab, onSelect, onClose, onCategory, relTypes, metricKey }) {
  const c = iso ? countryByIso[iso] : null;

  if (!iso) {
    return (
      <section className="panel profile" aria-label="Global brief">
        <div className="panel-head"><span>Global brief</span><span className="spacer" /><span className="count">{meta.asOf}</span></div>
        <div className="profile-scroll">
          <GlobalBrief onSelect={onSelect} metricKey={metricKey} />
        </div>
      </section>
    );
  }

  if (!c) {
    const memberOf = blocsByIso[iso] || [];
    return (
      <section className="panel profile" aria-label="Country profile">
        <div className="panel-head"><span>Profile</span><span className="spacer" /><span className="count">{iso}</span></div>
        <div className="profile-title">
          <div>
            <h2>{geoNameByIso[iso] || iso}</h2>
            <div className="sub">Not profiled in the current dataset</div>
          </div>
          <button type="button" className="btn close" onClick={onClose} aria-label="Close profile">ESC ✕</button>
        </div>
        <div className="section">
          <p className="prose dim">
            Atlas profiles {countries.length} strategically significant states. This territory appears on the map but has no
            detailed profile yet. See Methodology for how to add one.
          </p>
        </div>
        {memberOf.length > 0 && (
          <div className="section">
            <div className="subhead" style={{ padding: '0 0 4px', marginBottom: 8 }}>Tracked bloc memberships</div>
            <div className="chips">
              {memberOf.map((b) => (
                <button key={b} type="button" className="chip" onClick={() => onCategory(`bloc:${b}`)}>
                  <b className="amber">{b}</b>&nbsp;{blocById[b].name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="panel profile" aria-label={`${c.name} profile`}>
      <div className="panel-head">
        <span>{c.iso3} &lt;CNTRY&gt; {PROFILE_TABS.find((t) => t.id === tab)?.label}</span>
        <span className="spacer" />
        <span className="count">{PROFILE_TABS.find((t) => t.id === tab)?.title}</span>
      </div>
      <div className="profile-title">
        <span className="flag" aria-hidden="true">{flagEmoji(c.iso2)}</span>
        <div>
          <h2>{c.name}</h2>
          <div className="sub">
            <span className="amber">{c.iso3}</span> · {c.region} · {c.capital}
          </div>
        </div>
        <button type="button" className="btn close" onClick={onClose} aria-label="Close profile">ESC ✕</button>
      </div>
      <div className="tabs" role="tablist" aria-label="Profile sections">
        {PROFILE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="tab"
            aria-selected={tab === t.id}
            title={`${t.title} (key ${t.key})`}
            onClick={() => onTab(t.id)}
          >
            <b>{t.key})</b>{t.label}
          </button>
        ))}
      </div>
      <div className="profile-scroll" role="tabpanel">
        {tab === 'des' && <Overview c={c} onCategory={onCategory} />}
        {tab === 'eco' && <Economy c={c} onSelect={onSelect} />}
        {tab === 'mil' && <Military c={c} />}
        {tab === 'gov' && <Government c={c} onCategory={onCategory} />}
        {tab === 'res' && <Resources c={c} />}
        {tab === 'rel' && <RelationsTab c={c} onSelect={onSelect} relTypes={relTypes} />}
        <p className="note">
          Figures ≈ {meta.referenceYear} reference year; narrative as of {meta.asOf.toLowerCase()}. See Methodology (F4) for sources.
        </p>
      </div>
    </section>
  );
}
