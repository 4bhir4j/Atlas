import { forwardRef, useEffect, useMemo, useState } from 'react';
import { blocs, countries, flagEmoji, matchesQuery } from '../lib/data.js';

export const VIEWS = [
  { id: 'map', key: 'F1', label: 'MAP', title: 'World map & profiles' },
  { id: 'relations', key: 'F2', label: 'REL', title: 'Relationship explorer' },
  { id: 'blocs', key: 'F3', label: 'BLOC', title: 'Blocs & alliances' },
  { id: 'methodology', key: 'F4', label: 'METH', title: 'Methodology & sources' },
];

const COMMANDS = {
  MAP: 'map',
  REL: 'relations',
  RELATIONS: 'relations',
  BLOC: 'blocs',
  BLOCS: 'blocs',
  METH: 'methodology',
  METHODOLOGY: 'methodology',
  SOURCES: 'methodology',
};

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function suggestionsFor(q) {
  const needle = q.trim().toUpperCase();
  if (!needle) return [];
  const out = [];
  if (COMMANDS[needle]) out.push({ kind: 'cmd', id: COMMANDS[needle], label: `Go to ${needle}`, code: '⏎' });
  for (const b of blocs) {
    if (b.id.includes(needle) || b.name.toUpperCase().includes(needle)) {
      out.push({ kind: 'bloc', id: b.id, label: b.name, code: b.id, sub: `${b.members.length} members` });
    }
  }
  const exact = countries.filter((c) => c.iso3 === needle || c.iso2 === needle);
  const starts = countries.filter((c) => !exact.includes(c) && c.name.toUpperCase().startsWith(needle));
  const rest = countries.filter((c) => !exact.includes(c) && !starts.includes(c) && matchesQuery(c, q));
  for (const c of [...exact, ...starts, ...rest]) {
    out.push({ kind: 'country', id: c.iso3, label: c.name, code: c.iso3, flag: flagEmoji(c.iso2), sub: c.region });
  }
  return out.slice(0, 8);
}

const TopBar = forwardRef(function TopBar({ view, onView, query, onQuery, onPickCountry, onPickBloc }, inputRef) {
  const now = useClock();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const items = useMemo(() => suggestionsFor(query), [query]);

  useEffect(() => setActive(0), [query]);

  const pick = (item) => {
    if (!item) return;
    if (item.kind === 'country') onPickCountry(item.id);
    else if (item.kind === 'bloc') onPickBloc(item.id);
    else onView(item.id);
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(items[active]);
    } else if (e.key === 'Escape') {
      if (query) onQuery('');
      else inputRef.current?.blur();
      setOpen(false);
    }
  };

  const utc = now.toISOString().slice(11, 19);
  const date = now.toISOString().slice(0, 10);

  return (
    <header className="topbar">
      <div className="brand">
        ATLAS<small>GEOPOLITICAL TERMINAL</small>
      </div>
      <nav className="fkeys" aria-label="Views">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            className="fkey"
            aria-current={view === v.id ? 'page' : undefined}
            title={`${v.title} (${v.key})`}
            onClick={() => onView(v.id)}
          >
            <kbd>{v.key}</kbd>
            <span className="lbl">{v.label}</span>
          </button>
        ))}
      </nav>
      <div className="command" role="combobox" aria-expanded={open && items.length > 0} aria-haspopup="listbox" aria-owns="cmd-suggest">
        <div className="command-box">
          <span className="command-prompt" aria-hidden="true">&gt;</span>
          <label htmlFor="cmd" className="sr-only">Search countries, ISO codes or blocs</label>
          <input
            id="cmd"
            ref={inputRef}
            value={query}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search country, ISO code, bloc or command…   ( / )"
            onChange={(e) => {
              onQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={onKeyDown}
            aria-autocomplete="list"
            aria-controls="cmd-suggest"
            aria-activedescendant={open && items[active] ? `sg-${active}` : undefined}
          />
          <button type="button" className="go-btn" onClick={() => pick(items[active])}>GO</button>
        </div>
        {open && items.length > 0 && (
          <ul className="suggest" id="cmd-suggest" role="listbox">
            {items.map((it, i) => (
              <li
                key={`${it.kind}-${it.id}`}
                id={`sg-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(it);
                }}
              >
                <span aria-hidden="true">{it.flag || (it.kind === 'bloc' ? '◆' : '›')}</span>
                <span className="code">{it.code}</span>
                <span>{it.label}</span>
                <span className="muted">{it.kind === 'bloc' ? `BLOC · ${it.sub}` : it.sub}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="clock" aria-label="UTC time">
        <div><b>{utc}</b> UTC</div>
        <div className="date">{date}</div>
      </div>
    </header>
  );
});

export default TopBar;
