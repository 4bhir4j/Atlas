import { useMemo } from 'react';
import { DISPUTE_STATUS, relations } from '../lib/data.js';

const ORDER = { escalating: 0, active: 1, frozen: 2, easing: 3 };
const ARROW = { escalating: '▲', active: '■', frozen: '◆', easing: '▼' };

export default function Ticker({ onSelect }) {
  const items = useMemo(
    () =>
      relations
        .filter((r) => r.type === 'dispute' && r.strength >= 2)
        .sort((a, b) => b.strength - a.strength || ORDER[a.status] - ORDER[b.status]),
    [],
  );
  const renderItems = (dup) =>
    items.map((r) => (
      <button
        key={`${dup}-${r.id}`}
        type="button"
        className="ticker-item"
        onClick={() => onSelect(r.a)}
        tabIndex={dup ? -1 : 0}
        aria-hidden={dup || undefined}
        title={r.description}
      >
        <b>{r.a}/{r.b}</b>
        {r.label}
        <span className={r.status === 'escalating' ? 'down' : r.status === 'easing' ? 'up' : 'dim'}>
          {ARROW[r.status]} {DISPUTE_STATUS[r.status].toUpperCase()}
        </span>
      </button>
    ));
  return (
    <div className="ticker" aria-label="Flashpoint ticker">
      <span className="ticker-label">FLASHPOINTS</span>
      <div className="ticker-track">
        {renderItems(false)}
        {renderItems(true)}
      </div>
    </div>
  );
}
