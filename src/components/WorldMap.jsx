import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Polyline, useMap } from 'react-leaflet';
import {
  countryByIso,
  counterpart,
  flagEmoji,
  METRICS,
  partnerTypes,
  rankOf,
  RELATION_HEX,
  RELATION_TYPES,
  relationsByIso,
  blocsByIso,
} from '../lib/data.js';
import { arcPoints, geoNameByIso, graticule, nearestLon, worldCopies } from '../lib/geo.js';
import { COLOR_NODATA, COLOR_UNPROFILED, rampGradient } from '../lib/scale.js';

const ARC_BEND = { alliance: 0.16, trade: -0.12, dispute: 0.26 };
const GRATICULE = graticule(30);

/** Imperative GeoJSON layer so styles can be updated in place without re-creating ~530 paths. */
function CountriesLayer({ styleFor, onHover, onSelect }) {
  const map = useMap();
  const layerRef = useRef(null);
  const cbs = useRef({});
  cbs.current = { styleFor, onHover, onSelect };

  useEffect(() => {
    const layer = L.geoJSON(worldCopies, {
      style: (f) => cbs.current.styleFor(f.properties.iso3),
      onEachFeature: (f, l) => {
        const iso = f.properties.iso3;
        l.on({
          mouseover: (e) => {
            l.setStyle({ weight: 1.6, color: '#ffb000' });
            l.bringToFront();
            cbs.current.onHover({ iso, point: e.containerPoint });
          },
          mousemove: (e) => cbs.current.onHover({ iso, point: e.containerPoint }),
          mouseout: () => {
            l.setStyle(cbs.current.styleFor(iso));
            cbs.current.onHover(null);
          },
          click: () => cbs.current.onSelect(iso),
        });
      },
    }).addTo(map);
    layerRef.current = layer;
    return () => layer.remove();
  }, [map]);

  useEffect(() => {
    layerRef.current?.setStyle((f) => styleFor(f.properties.iso3));
  }, [styleFor]);

  return null;
}

/** Pan to the selected capital if it's outside the central part of the view. */
function FollowSelection({ iso }) {
  const map = useMap();
  useEffect(() => {
    const c = iso && countryByIso[iso];
    if (!c) return;
    const [lat, lon] = c.capitalCoords;
    const center = map.getCenter();
    const target = L.latLng(lat, nearestLon(lon, center.lng));
    const b = map.getBounds().pad(-0.25);
    if (!b.contains(target)) map.panTo(target, { animate: true, duration: 0.6 });
  }, [iso, map]);
  return null;
}

function ResizeWatcher() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[-48, -150], [72, 170]], { animate: false });
  }, [map]);
  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export default function WorldMap({
  selectedIso,
  onSelect,
  metricKey,
  onMetricChange,
  scale,
  visibleSet,
  relTypes,
  onToggleRelType,
}) {
  const [hover, setHover] = useState(null);
  const metric = METRICS[metricKey];
  const selected = selectedIso ? countryByIso[selectedIso] : null;

  const activeRelations = useMemo(
    () => (selectedIso ? (relationsByIso[selectedIso] || []).filter((r) => relTypes[r.type]) : []),
    [selectedIso, relTypes],
  );

  const partners = useMemo(() => {
    if (!selectedIso) return {};
    const all = partnerTypes(selectedIso);
    return Object.fromEntries(Object.entries(all).filter(([, t]) => relTypes[t]));
  }, [selectedIso, relTypes]);

  const relCounts = useMemo(() => {
    const out = { alliance: 0, trade: 0, dispute: 0 };
    for (const r of relationsByIso[selectedIso] || []) out[r.type]++;
    return out;
  }, [selectedIso]);

  const styleFor = useMemo(() => {
    const focusMode = Boolean(selectedIso);
    return (iso) => {
      const c = countryByIso[iso];
      const inFilter = visibleSet.has(iso);
      if (iso === selectedIso) {
        return { fillColor: '#ffb000', fillOpacity: 1, color: '#ffffff', weight: 1.4, opacity: 1 };
      }
      if (focusMode && partners[iso]) {
        return { fillColor: RELATION_HEX[partners[iso]], fillOpacity: 0.85, color: '#000', weight: 0.6, opacity: 1 };
      }
      if (!c) {
        return { fillColor: COLOR_UNPROFILED, fillOpacity: 1, color: '#000', weight: 0.5, opacity: 1 };
      }
      const fill = scale.color(metric.get(c));
      const dimmed = !inFilter || focusMode;
      return {
        fillColor: fill === COLOR_NODATA ? COLOR_NODATA : fill,
        fillOpacity: dimmed ? (inFilter ? 0.32 : 0.12) : 1,
        color: '#000',
        weight: 0.6,
        opacity: 1,
      };
    };
  }, [selectedIso, partners, visibleSet, scale, metric]);

  const arcs = useMemo(() => {
    if (!selected) return [];
    const from = selected.capitalCoords;
    return activeRelations.map((r) => {
      const other = countryByIso[counterpart(r, selectedIso)];
      const to = [other.capitalCoords[0], nearestLon(other.capitalCoords[1], from[1])];
      return { r, other, to, points: arcPoints(from, to, ARC_BEND[r.type]) };
    });
  }, [selected, selectedIso, activeRelations]);

  const hoverInfo = useMemo(() => {
    if (!hover) return null;
    const c = countryByIso[hover.iso];
    const rels = selectedIso && hover.iso !== selectedIso
      ? (relationsByIso[selectedIso] || []).filter((r) => counterpart(r, selectedIso) === hover.iso)
      : [];
    return { ...hover, c, rels };
  }, [hover, selectedIso]);

  return (
    <div className="map-wrap" aria-label="World map">
      <MapContainer
        center={[28, 15]}
        zoom={2}
        minZoom={1.5}
        maxZoom={6}
        zoomSnap={0.25}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={120}
        maxBounds={[[-70, -420], [86, 420]]}
        maxBoundsViscosity={0.8}
        attributionControl={false}
        worldCopyJump={false}
      >
        <ResizeWatcher />
        <FollowSelection iso={selectedIso} />
        {GRATICULE.map((line, i) => (
          <Polyline key={i} positions={line} pathOptions={{ color: '#0f1924', weight: 1, interactive: false }} />
        ))}
        <CountriesLayer styleFor={styleFor} onHover={setHover} onSelect={onSelect} />
        {arcs.map(({ r, points }) => (
          <Polyline
            key={r.id}
            positions={points}
            pathOptions={{
              color: RELATION_HEX[r.type],
              weight: 1 + r.strength * 0.7,
              opacity: 0.95,
              dashArray: r.type === 'trade' ? '2 6' : r.type === 'dispute' ? '10 6' : null,
              lineCap: 'round',
              interactive: false,
              className: r.type === 'alliance' ? 'rel-arc static' : 'rel-arc',
            }}
          />
        ))}
        {arcs.map(({ r, other, to }) => (
          <CircleMarker
            key={`m-${r.id}`}
            center={to}
            radius={3.5}
            pathOptions={{ color: '#000', weight: 2, fillColor: RELATION_HEX[r.type], fillOpacity: 1 }}
            eventHandlers={{ click: () => onSelect(other.iso3) }}
          />
        ))}
        {selected && (
          <>
            <CircleMarker
              center={selected.capitalCoords}
              radius={9}
              pathOptions={{ color: '#ffb000', weight: 1.5, fill: false, className: 'capital-pulse', interactive: false }}
            />
            <CircleMarker
              center={selected.capitalCoords}
              radius={4}
              pathOptions={{ color: '#000', weight: 2, fillColor: '#ffffff', fillOpacity: 1, interactive: false }}
            />
          </>
        )}
      </MapContainer>

      {!selected && <div className="map-hint map-overlay">Click a country to open its profile and relationships</div>}

      <div className="map-overlay map-controls">
        <label className="field">
          <span>Map layer</span>
          <select className="select" value={metricKey} onChange={(e) => onMetricChange(e.target.value)}>
            {Object.entries(METRICS).map(([k, m]) => (
              <option key={k} value={k}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <div className="field rel-field">
          <span>Relationships{selected ? ` · ${selected.iso3}` : ''}</span>
          <div className="rel-toggles">
            {Object.entries(RELATION_TYPES).map(([k, t]) => (
              <button key={k} type="button" className="rel-toggle" aria-pressed={relTypes[k]} onClick={() => onToggleRelType(k)}>
                <span className={`line-swatch ${k}`} />
                {t.label}
                {selected && <span className="n">{relCounts[k]}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="map-overlay legend">
        {selected ? (
          <>
            <div className="legend-title">
              {selected.name} <small>— relationship view</small>
            </div>
            <div className="legend-keys">
              <span><i className="swatch" style={{ background: '#ffb000', outline: '1px solid #fff' }} /> Selected</span>
              {Object.entries(RELATION_TYPES).map(([k, t]) => (
                <span key={k}>
                  <i className="swatch" style={{ background: RELATION_HEX[k] }} />
                  <i className={`line-swatch ${k}`} />
                  {t.label}
                </span>
              ))}
            </div>
            <div className="legend-keys muted legend-note">Partner fill = most salient tie (militarised disputes first, then strongest tie).</div>
          </>
        ) : (
          <>
            <div className="legend-title">
              {metric.label} <small>({metric.unit}{metric.scale === 'log' ? ', log scale' : ''})</small>
            </div>
            <div className="legend-ramp" style={{ background: rampGradient(scale.ramp) }} />
            <div className="legend-ticks">
              {scale.ticks.map((t) => (
                <span key={t.t}>{t.label}</span>
              ))}
            </div>
            <div className="legend-keys">
              <span><i className="swatch" style={{ background: COLOR_NODATA }} /> No data</span>
              <span><i className="swatch" style={{ background: COLOR_UNPROFILED, outline: '1px solid #333' }} /> Not profiled</span>
            </div>
          </>
        )}
      </div>

      {hoverInfo && (
        <div
          className="map-tooltip"
          style={{
            left: Math.min(hoverInfo.point.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1e4) - 300),
            top: hoverInfo.point.y + 14,
          }}
          role="tooltip"
        >
          <div className="tt-name">
            <span>{flagEmoji(hoverInfo.c?.iso2)}</span>
            <span className="iso">{hoverInfo.iso}</span>
            <span>{hoverInfo.c?.name || geoNameByIso[hoverInfo.iso]}</span>
          </div>
          {hoverInfo.c ? (
            <>
              <div className="tt-row">
                <span>{metric.short}</span>
                <b>{metric.format(metric.get(hoverInfo.c))}</b>
              </div>
              {(() => {
                const rk = rankOf(metricKey, hoverInfo.iso);
                return rk ? (
                  <div className="tt-row">
                    <span>Rank</span>
                    <b>
                      #{rk.rank} of {rk.of}
                    </b>
                  </div>
                ) : null;
              })()}
              <div className="tt-row">
                <span>Region</span>
                <b>{hoverInfo.c.region}</b>
              </div>
            </>
          ) : (
            <div className="tt-row">
              <span>{(blocsByIso[hoverInfo.iso] || []).join(' · ') || 'Not profiled in dataset'}</span>
            </div>
          )}
          {hoverInfo.rels.map((r) => (
            <div className="tt-rel" key={r.id}>
              <span className={`line-swatch ${r.type}`} style={{ width: 16, marginRight: 6, verticalAlign: 3 }} />
              <b style={{ color: 'var(--text)' }}>{RELATION_TYPES[r.type].short}</b> {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
