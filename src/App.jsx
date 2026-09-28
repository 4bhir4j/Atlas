import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TopBar, { VIEWS } from './components/TopBar.jsx';
import Ticker from './components/Ticker.jsx';
import CountryList from './components/CountryList.jsx';
import WorldMap from './components/WorldMap.jsx';
import CountryProfile, { PROFILE_TABS } from './components/CountryProfile.jsx';
import RelationsView from './components/RelationsView.jsx';
import BlocsView from './components/BlocsView.jsx';
import Methodology from './components/Methodology.jsx';
import { blocs, countries, matchesCategory, matchesQuery, meta, METRICS, relations } from './lib/data.js';
import { geoNameByIso } from './lib/geo.js';
import { buildScale } from './lib/scale.js';

const VIEW_IDS = VIEWS.map((v) => v.id);

/** Hash routes: #/map/USA/eco · #/relations/CHN · #/blocs/NATO · #/methodology */
function parseHash() {
  const [view, a, b] = window.location.hash.replace(/^#\/?/, '').split('/');
  const v = VIEW_IDS.includes(view) ? view : 'map';
  const iso = a && /^[A-Z]{3}$/.test(a) ? a : null;
  return {
    view: v,
    iso: v === 'map' || v === 'relations' ? iso : null,
    tab: PROFILE_TABS.some((t) => t.id === b) ? b : 'des',
    bloc: v === 'blocs' && blocs.some((x) => x.id === decodeURIComponent(a || '')) ? decodeURIComponent(a) : null,
  };
}

export default function App() {
  const initial = useMemo(parseHash, []);
  const [view, setView] = useState(initial.view);
  const [selectedIso, setSelectedIso] = useState(initial.iso);
  const [tab, setTab] = useState(initial.tab);
  const [blocId, setBlocId] = useState(initial.bloc || 'NATO');
  const [filters, setFilters] = useState({ query: '', region: '', category: '' });
  const [metricKey, setMetricKey] = useState('gdp');
  const [sortDir, setSortDir] = useState('desc');
  const [relTypes, setRelTypes] = useState({ alliance: true, trade: true, dispute: true });
  const searchRef = useRef(null);

  // State → URL
  useEffect(() => {
    let h = `#/${view}`;
    if ((view === 'map' || view === 'relations') && selectedIso) h += `/${selectedIso}`;
    if (view === 'map' && selectedIso && tab !== 'des') h += `/${tab}`;
    if (view === 'blocs') h += `/${encodeURIComponent(blocId)}`;
    if (window.location.hash !== h) window.history.replaceState(null, '', h);
  }, [view, selectedIso, tab, blocId]);

  // URL → state (back/forward, pasted links)
  useEffect(() => {
    const onHash = () => {
      const s = parseHash();
      setView(s.view);
      if (s.view !== 'blocs') setSelectedIso(s.iso);
      setTab(s.tab);
      if (s.bloc) setBlocId(s.bloc);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const scale = useMemo(() => buildScale(metricKey), [metricKey]);

  const visible = useMemo(
    () =>
      countries.filter(
        (c) =>
          (!filters.region || c.region === filters.region) &&
          matchesCategory(c, filters.category) &&
          matchesQuery(c, filters.query),
      ),
    [filters],
  );
  const visibleSet = useMemo(() => new Set(visible.map((c) => c.iso3)), [visible]);

  const selectCountry = useCallback((iso) => {
    setSelectedIso((prev) => (iso && prev === iso ? prev : iso));
    if (iso) setView((v) => (v === 'methodology' || v === 'blocs' ? 'map' : v));
  }, []);

  const toggleMapSelection = useCallback((iso) => setSelectedIso((prev) => (prev === iso ? null : iso)), []);

  const setCategory = useCallback((category) => {
    setFilters((f) => ({ ...f, category, query: '' }));
    setSelectedIso(null);
    setView('map');
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const inField = ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName);
      const fIdx = ['F1', 'F2', 'F3', 'F4'].indexOf(e.key);
      if (fIdx >= 0) {
        e.preventDefault();
        setView(VIEW_IDS[fIdx]);
        return;
      }
      if (inField) return;
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSelectedIso(null);
      } else if (view === 'map' && selectedIso && /^[1-6]$/.test(e.key)) {
        setTab(PROFILE_TABS[Number(e.key) - 1].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, selectedIso]);

  const selectedName = selectedIso ? countries.find((c) => c.iso3 === selectedIso)?.name || geoNameByIso[selectedIso] : null;

  return (
    <div className="app">
      <TopBar
        ref={searchRef}
        view={view}
        onView={setView}
        query={filters.query}
        onQuery={(query) => setFilters((f) => ({ ...f, query }))}
        onPickCountry={(iso) => {
          setFilters((f) => ({ ...f, query: '' }));
          selectCountry(iso);
          if (view !== 'relations') setView('map');
        }}
        onPickBloc={(id) => {
          setFilters((f) => ({ ...f, query: '' }));
          setBlocId(id);
          setView('blocs');
        }}
      />
      <Ticker onSelect={(iso) => { selectCountry(iso); setTab('rel'); setView('map'); }} />

      {view === 'map' && (
        <main className="workspace">
          <CountryList
            visible={visible}
            selectedIso={selectedIso}
            onSelect={selectCountry}
            filters={filters}
            setFilters={setFilters}
            metricKey={metricKey}
            onMetricChange={setMetricKey}
            sortDir={sortDir}
            onToggleSort={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          />
          <WorldMap
            selectedIso={selectedIso}
            onSelect={toggleMapSelection}
            metricKey={metricKey}
            onMetricChange={setMetricKey}
            scale={scale}
            visibleSet={visibleSet}
            relTypes={relTypes}
            onToggleRelType={(k) => setRelTypes((s) => ({ ...s, [k]: !s[k] }))}
          />
          <CountryProfile
            iso={selectedIso}
            tab={tab}
            onTab={setTab}
            onSelect={selectCountry}
            onClose={() => setSelectedIso(null)}
            onCategory={setCategory}
            relTypes={relTypes}
            metricKey={metricKey}
          />
        </main>
      )}
      {view === 'relations' && (
        <RelationsView
          selectedIso={selectedIso && countries.some((c) => c.iso3 === selectedIso) ? selectedIso : null}
          onSelect={setSelectedIso}
          onOpenOnMap={(iso) => {
            setSelectedIso(iso);
            setTab('rel');
            setView('map');
          }}
        />
      )}
      {view === 'blocs' && (
        <BlocsView
          blocId={blocId}
          onBloc={setBlocId}
          onSelectCountry={(iso) => {
            setSelectedIso(iso);
            setView('map');
          }}
          onShowOnMap={(id) => setCategory(`bloc:${id}`)}
        />
      )}
      {view === 'methodology' && (
        <main className="view-full" style={{ gridTemplateColumns: '1fr' }}>
          <Methodology />
        </main>
      )}

      <footer className="statusbar">
        <span className="live">LOCAL DATASET</span>
        <span>v<b>{meta.version}</b> · as of <b>{meta.asOf}</b></span>
        <span className="hide-sm"><b>{countries.length}</b> countries · <b>{relations.length}</b> links · <b>{blocs.length}</b> blocs</span>
        {view === 'map' && <span className="hide-sm">Layer: <b>{METRICS[metricKey].label}</b></span>}
        {selectedName && <span>Focus: <b>{selectedName}</b></span>}
        <span className="right hide-sm">
          <kbd>/</kbd> search · <kbd>F1–F4</kbd> views · <kbd>1–6</kbd> tabs · <kbd>Esc</kbd> clear
        </span>
      </footer>
    </div>
  );
}
