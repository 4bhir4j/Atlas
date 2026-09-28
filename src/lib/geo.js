import world from '../data/world.geo.json';

const shiftCoords = (coords, dx) =>
  typeof coords[0] === 'number' ? [coords[0] + dx, coords[1]] : coords.map((c) => shiftCoords(c, dx));

/**
 * The world rendered three times (−360°, 0°, +360°) so arcs that cross the
 * antimeridian (e.g. US–Japan across the Pacific) land on real geometry.
 */
export const worldCopies = {
  type: 'FeatureCollection',
  features: [-360, 0, 360].flatMap((dx) =>
    world.features.map((f) => ({
      ...f,
      properties: { ...f.properties, copy: dx },
      geometry: dx === 0 ? f.geometry : { ...f.geometry, coordinates: shiftCoords(f.geometry.coordinates, dx) },
    })),
  ),
};

export const geoNameByIso = Object.fromEntries(world.features.map((f) => [f.properties.iso3, f.properties.name]));

/** Shift `lon` by ±360 so it is the copy nearest to `refLon`. */
export function nearestLon(lon, refLon) {
  let out = lon;
  while (out - refLon > 180) out -= 360;
  while (out - refLon < -180) out += 360;
  return out;
}

/** Quadratic-Bézier arc between two [lat, lon] points, bowed perpendicular to the chord. */
export function arcPoints(from, to, bend = 0.2, steps = 40) {
  const [y1, x1] = from;
  const [y2, x2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Perpendicular offset; flip so arcs bow poleward (reads like a great-circle route on Mercator).
  let cx = mx - dy * bend;
  let cy = my + dx * bend;
  if ((cy - my) * (my >= 0 ? 1 : -1) < 0) {
    cx = mx + dy * bend;
    cy = my - dx * bend;
  }
  cy = Math.max(-75, Math.min(82, cy));
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    pts.push([a * y1 + b * cy + c * y2, a * x1 + b * cx + c * x2]);
  }
  return pts;
}

/** Graticule lines every `step` degrees across all three world copies. */
export function graticule(step = 30) {
  const lines = [];
  for (let lon = -540; lon <= 540; lon += step) lines.push([[-85, lon], [85, lon]]);
  for (let lat = -60; lat <= 80; lat += step) lines.push([[lat, -540], [lat, 540]]);
  return lines;
}
