import { blocs, countries, DISPUTE_STATUS, meta, METRICS, REGIONS, relations, TAGS } from '../lib/data.js';

const INDICATORS = [
  ['gdp', 'Nominal GDP in current US dollars at market exchange rates.', 'IMF WEO; World Bank for gaps'],
  ['gdpPerCapita', 'Derived in-app: nominal GDP ÷ population. Not PPP-adjusted.', 'Derived'],
  ['gdpGrowth', 'Annual real GDP growth rate. Map uses a diverging scale clamped at ±8%.', 'IMF WEO'],
  ['inflation', 'Average annual consumer-price inflation (log scale on the map).', 'IMF WEO'],
  ['debt', 'General government gross debt as % of GDP (map clamped at 160%).', 'IMF WEO / Fiscal Monitor'],
  ['population', 'Mid-year population estimate, in millions.', 'UN WPP 2024; national statistics offices'],
  ['milex', 'Military expenditure in current US dollars, per SIPRI definition (includes military pensions, paramilitaries where relevant).', 'SIPRI Milex'],
  ['milexPct', 'Military expenditure as a share of GDP (map clamped at 10%).', 'SIPRI Milex'],
  ['personnel', 'Active-duty armed forces personnel; excludes reserves and most paramilitaries.', 'IISS Military Balance'],
  ['warheads', 'Estimated total inventory of nuclear warheads (deployed + stored), January 2025.', 'SIPRI Yearbook 2025'],
];

export default function Methodology() {
  const counts = {
    alliance: relations.filter((r) => r.type === 'alliance').length,
    trade: relations.filter((r) => r.type === 'trade').length,
    dispute: relations.filter((r) => r.type === 'dispute').length,
  };
  return (
    <div className="panel method">
      <div className="panel-head"><span>Methodology &amp; sources</span><span className="spacer" /><span className="count">Dataset v{meta.version}</span></div>
      <div className="method-inner">
        <h1>Methodology &amp; Sources</h1>
        <p className="dim" style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
          {countries.length} country profiles · {relations.length} relationships ({counts.alliance} alliance, {counts.trade} trade,{' '}
          {counts.dispute} dispute) · {blocs.length} blocs · figures ≈ {meta.referenceYear} · narrative as of {meta.asOf.toLowerCase()}
        </p>
        <nav className="toc" aria-label="Sections">
          {[
            ['purpose', 'Purpose'],
            ['indicators', 'Indicators'],
            ['relationships', 'Relationship coding'],
            ['classification', 'Classification'],
            ['regions', 'Regions'],
            ['visual', 'Visual encoding'],
            ['limits', 'Limitations'],
            ['sources', 'Sources'],
            ['update', 'Updating the data'],
          ].map(([id, label]) => (
            <a key={id} className="chip" href={`#/methodology`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }}>
              {label}
            </a>
          ))}
        </nav>

        <div className="callout">
          <p>
            Atlas is an analytical reference built from open sources, not a live intelligence feed. Values are rounded
            approximations intended for comparison between countries; always check primary sources before citing a figure.
          </p>
        </div>

        <h2 id="purpose">Purpose &amp; scope</h2>
        <p>
          Atlas gives a fast, terminal-style overview of the states that matter most to the current geopolitical landscape:
          great and middle powers, major energy and mineral producers, states in active conflict and those sitting on key
          chokepoints. Each profile combines hard indicators (economy, military, demography) with a short qualitative assessment
          of the country's strategic interests, resources and relationships.
        </p>
        <p>
          Countries were selected for strategic weight rather than completeness. Territories drawn on the map but without a
          profile are shaded as <em>not profiled</em>; they still appear in bloc membership lists.
        </p>

        <h2 id="indicators">Indicators</h2>
        <table className="data-table">
          <thead>
            <tr><th>Indicator</th><th>Definition</th><th>Primary source</th></tr>
          </thead>
          <tbody>
            {INDICATORS.map(([k, def, src]) => (
              <tr key={k}>
                <td className="amber" style={{ fontFamily: 'var(--mono)', fontSize: 12, whiteSpace: 'nowrap' }}>{METRICS[k].label}</td>
                <td>{def}</td>
                <td className="dim">{src}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          <strong>Reference year.</strong> Quantitative figures are for {meta.referenceYear} (or the latest year available). Where
          official statistics are unavailable or badly distorted — for example after a currency collapse or during civil war
          (Venezuela, Ethiopia after the 2024 float, Yemen, Sudan, Myanmar, North Korea) — the value is shown as <code>N/A</code>{' '}
          rather than a guess. States that do not publish defence budgets (e.g. UAE, Qatar) are also left blank.
        </p>
        <p>
          <strong>Rankings</strong> (e.g. “#3 of 58”) are computed only among profiled countries with data for that indicator.
        </p>

        <h2 id="relationships">Relationship coding</h2>
        <p>Each relationship links two profiled countries and has a type, a strength from 1 to 3 and a short description.</p>
        <table className="data-table">
          <thead>
            <tr><th>Type</th><th>Inclusion rule</th><th>Strength (1–3)</th></tr>
          </thead>
          <tbody>
            <tr>
              <td className="amber">Alliance / partnership</td>
              <td>
                <em>Treaty</em>: a ratified agreement with a mutual-defence or mutual-assistance commitment (e.g. US–Japan, NATO
                bilateral pillars, Russia–DPRK 2024). <em>Partnership</em>: a formal strategic partnership, major non-NATO ally
                designation, basing or sustained arms relationship without a binding defence clause.
              </td>
              <td>Depth of integration: basing, command integration, arms dependence.</td>
            </tr>
            <tr>
              <td className="amber">Trade link</td>
              <td>
                Bilateral goods trade (exports + imports) of strategic significance to at least one side, shown as ≈ USD bn per
                year from customs data. Services trade is excluded. Only a curated subset of the largest or most strategic links
                is tracked.
              </td>
              <td>1: under $100bn · 2: $100bn or more, or a dominant/strategic dependency for one side (e.g. energy) · 3: over $200bn and the top trading partner of at least one side.</td>
            </tr>
            <tr>
              <td className="amber">Dispute / rivalry</td>
              <td>
                An unresolved territorial, maritime, political or military confrontation between states, including open wars.
                Internal conflicts are captured by the <em>Active conflict</em> tag rather than as a bilateral dispute.
              </td>
              <td>Severity. 1: diplomatic or legal · 2: militarised incidents or proxy fighting · 3: war, or high risk of major interstate conflict.</td>
            </tr>
          </tbody>
        </table>
        <p>Disputes additionally carry a status:</p>
        <ul>
          <li><strong>{DISPUTE_STATUS.escalating}</strong> — rising incident frequency or intensity over the past year.</li>
          <li><strong>{DISPUTE_STATUS.active}</strong> — ongoing confrontation without a clear trend.</li>
          <li><strong>{DISPUTE_STATUS.frozen}</strong> — unresolved but largely static, or under a durable truce.</li>
          <li><strong>{DISPUTE_STATUS.easing}</strong> — active diplomacy, de-escalation agreements or normalisation under way.</li>
        </ul>
        <p>
          On the map, when a country is selected its partners are shaded by the <em>most salient</em> tie: a militarised
          dispute (severity 2–3) always takes precedence; otherwise the strongest tie wins, with ties broken dispute › alliance ›
          trade. So US–China reads as a dispute, while US–Canada (treaty allies with a tariff row) reads as an alliance.
          Every individual tie is still drawn as its own arc and listed in the profile.
        </p>

        <h2 id="classification">Classification tags</h2>
        <table className="data-table">
          <tbody>
            {Object.entries(TAGS).map(([k, t]) => (
              <tr key={k}><td className="amber" style={{ width: 180 }}>{t.label}</td><td>{t.desc}</td></tr>
            ))}
          </tbody>
        </table>
        <p>
          Tags are analytical judgements, applied conservatively. <em>Nuclear-armed</em> is applied only where SIPRI estimates a
          warhead inventory, and the dataset test suite enforces that consistency.
        </p>

        <h2 id="regions">Regional scheme</h2>
        <p>
          Atlas uses ten geopolitical regions: {REGIONS.join(', ')}. The grouping follows security geography rather than
          UN statistical regions — for instance, Turkey is placed in Europe (NATO, Council of Europe) and Russia, Belarus and the
          South Caucasus form a separate Eurasia group.
        </p>

        <h2 id="visual">Visual encoding</h2>
        <ul>
          <li>Magnitude layers use a single-hue amber ramp from dark (low) to bright (high). Heavy-tailed indicators (GDP, population, spending, warheads, inflation) use a log scale so mid-sized states remain distinguishable.</li>
          <li>GDP growth uses a diverging blue ← grey → amber scale centred on 0%.</li>
          <li>Colour scales are computed over the whole dataset, so a country's colour does not change when filters are applied; filtered-out countries are dimmed instead.</li>
          <li>Relationship types use a colour-blind-checked trio (blue, teal, vermilion) and are always doubled with line style — solid for alliances, dotted for trade, dashed for disputes.</li>
          <li><strong>No data</strong> (mid grey) is distinct from <strong>not profiled</strong> (near black).</li>
        </ul>

        <h2 id="limits">Limitations &amp; caveats</h2>
        <ul>
          <li>Figures are rounded and can differ between sources by several percent; IMF and national data are revised frequently.</li>
          <li>Military expenditure for opaque states (China, Russia, Iran, Saudi Arabia) is a SIPRI <em>estimate</em>; true spending may be higher.</li>
          <li>Leadership, governments and conflict situations change quickly. Narrative content reflects the situation as of {meta.asOf.toLowerCase()}.</li>
          <li>Alliance strength and dispute severity are editorial judgements on a coarse 1–3 scale.</li>
          <li>The trade network is a curated subset, not a complete matrix of bilateral trade.</li>
          <li>Boundaries are from Natural Earth at 1:110m scale. Their depiction — including of Taiwan, Palestine, Kosovo, Western Sahara, Kashmir and occupied territories — does not imply any position on sovereignty.</li>
        </ul>

        <h2 id="sources">Sources</h2>
        <table className="data-table">
          <thead><tr><th>Source</th><th>Publisher</th><th>Used for</th></tr></thead>
          <tbody>
            {meta.sources.map((s) => (
              <tr key={s.id}>
                <td><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></td>
                <td className="dim">{s.publisher}</td>
                <td>{s.covers}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>Qualitative assessments draw on the above plus official government statements and reputable international reporting.</p>

        <h2 id="update">Updating the data</h2>
        <p>All data ships as local JSON in <code>src/data/</code> — no network access is required at runtime.</p>
        <pre>{`src/data/
├── countries/*.json   country profiles, one file per macro-region
├── relations.json     alliance / trade / dispute edges
├── blocs.json         blocs and alliances with ISO3 member lists
├── meta.json          dataset version, vintage and source catalogue
└── world.geo.json     Natural Earth 1:110m boundaries (trimmed)`}</pre>
        <p>A minimal country record:</p>
        <pre>{`{
  "iso3": "FRA", "iso2": "FR", "name": "France",
  "region": "Europe", "capital": "Paris", "capitalCoords": [48.86, 2.35],
  "population": 68.4, "areaKm2": 643801,
  "tags": ["nuclear-armed", "p5"],
  "summary": "…", "strategicInterests": ["…"],
  "economy":  { "gdpUsdBn": 3162, "gdpGrowthPct": 1.1, "inflationPct": 2.3,
                "debtPctGdp": 113, "currency": "Euro (EUR)",
                "sectors": ["…"], "topExports": ["…"] },
  "military": { "spendUsdBn": 64.7, "spendPctGdp": 2.1, "activePersonnel": 202000,
                "nuclearWarheads": 290, "capabilities": ["…"] },
  "government": { "system": "…", "headOfState": "…", "headOfGovernment": "…" },
  "resources": [{ "name": "…", "note": "…" }]
}`}</pre>
        <p>
          Use <code>null</code> for unknown values. Run <code>npm test</code> after editing: the suite checks schema, ISO codes
          against the map geometry, relationship references, duplicate edges and tag consistency.
        </p>
      </div>
    </div>
  );
}
