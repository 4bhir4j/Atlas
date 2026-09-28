import { useMemo } from 'react';
import { BLOC_TYPES, blocById, blocs, countryByIso, flagEmoji, fmtUsdBn } from '../lib/data.js';
import { geoNameByIso } from '../lib/geo.js';

function aggregate(members) {
  let gdp = 0;
  let pop = 0;
  let milex = 0;
  let nukes = 0;
  let profiled = 0;
  for (const iso of members) {
    const c = countryByIso[iso];
    if (!c) continue;
    profiled++;
    gdp += c.economy.gdpUsdBn || 0;
    pop += c.population || 0;
    milex += c.military.spendUsdBn || 0;
    nukes += c.military.nuclearWarheads || 0;
  }
  return { gdp, pop, milex, nukes, profiled };
}

export default function BlocsView({ blocId, onBloc, onSelectCountry, onShowOnMap }) {
  const bloc = blocById[blocId] || blocs[0];
  const agg = useMemo(() => aggregate(bloc.members), [bloc]);
  const overlaps = useMemo(
    () =>
      blocs
        .filter((b) => b.id !== bloc.id)
        .map((b) => ({ b, shared: b.members.filter((m) => bloc.members.includes(m)) }))
        .filter((x) => x.shared.length > 0)
        .sort((x, y) => y.shared.length - x.shared.length),
    [bloc],
  );

  return (
    <div className="view-full bloc-view">
      <aside className="panel" aria-label="Blocs">
        <div className="panel-head"><span>Blocs &amp; alliances</span><span className="spacer" /><span className="count">{blocs.length}</span></div>
        <ul className="bloc-list">
          {blocs.map((b) => (
            <li key={b.id}>
              <button type="button" className="bloc-row" aria-current={b.id === bloc.id} onClick={() => onBloc(b.id)}>
                <span className="id">{b.id}</span>
                <span>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</div>
                  <div className="muted" style={{ fontSize: 10.5 }}>{BLOC_TYPES[b.type]} · est. {b.founded}</div>
                </span>
                <span className="dim">{b.members.length}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="panel bloc-detail" aria-label={`${bloc.name} detail`}>
        <div className="panel-head">
          <span>{bloc.id} &lt;BLOC&gt; DES</span>
          <span className="spacer" />
          <span className="count">{BLOC_TYPES[bloc.type]}</span>
        </div>
        <div className="scroll" style={{ flex: 1 }}>
          <div className="section" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h2>{bloc.name}</h2>
              <div className="dim" style={{ marginTop: 2 }}>
                <span className="amber">{bloc.id}</span> · {BLOC_TYPES[bloc.type]} · founded {bloc.founded} · {bloc.members.length} members
              </div>
            </div>
            <button type="button" className="btn" onClick={() => onShowOnMap(bloc.id)}>Show members on map ›</button>
          </div>
          <div className="section"><p className="prose">{bloc.description}</p></div>
          <div className="bloc-stats">
            <div className="kv"><div className="k">Combined GDP</div><div className="v">{fmtUsdBn(agg.gdp)}</div><div className="r">profiled members</div></div>
            <div className="kv"><div className="k">Population</div><div className="v">{agg.pop >= 1000 ? `${(agg.pop / 1000).toFixed(2)}bn` : `${Math.round(agg.pop)}m`}</div><div className="r">profiled members</div></div>
            <div className="kv"><div className="k">Military spend</div><div className="v">{fmtUsdBn(agg.milex)}</div><div className="r">where reported</div></div>
            <div className="kv"><div className="k">Nuclear warheads</div><div className="v">{agg.nukes ? agg.nukes.toLocaleString('en-US') : '—'}</div><div className="r">est. inventory</div></div>
          </div>
          <div className="subhead">Members <small>{agg.profiled} of {bloc.members.length} have full profiles — click to open</small></div>
          <div className="section">
            <div className="chips">
              {bloc.members.map((iso) => {
                const c = countryByIso[iso];
                return c ? (
                  <button key={iso} type="button" className="chip" onClick={() => onSelectCountry(iso)}>
                    {flagEmoji(c.iso2)} <b className="amber">{iso}</b> {c.name}
                  </button>
                ) : (
                  <span key={iso} className="chip" title="Not profiled in dataset">
                    <b>{iso}</b> <span className="muted">{geoNameByIso[iso] || iso}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="subhead">Overlapping memberships <small>shared members with other tracked blocs</small></div>
          <div className="section">
            {overlaps.length === 0 ? (
              <div className="muted">No overlap with other tracked blocs.</div>
            ) : (
              <table className="data-table">
                <tbody>
                  {overlaps.map(({ b, shared }) => (
                    <tr key={b.id} className="clickable" onClick={() => onBloc(b.id)}>
                      <td className="amber" style={{ width: 80 }}>{b.id}</td>
                      <td>
                        <div className="meter" style={{ marginTop: 6 }}>
                          <i style={{ width: `${(shared.length / bloc.members.length) * 100}%` }} />
                        </div>
                      </td>
                      <td className="num" style={{ width: 70 }}>{shared.length}/{bloc.members.length}</td>
                      <td className="muted" style={{ fontSize: 10.5 }}>{shared.slice(0, 8).join(' ')}{shared.length > 8 ? ' …' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
