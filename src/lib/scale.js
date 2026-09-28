import { countries, METRICS } from './data.js';

// Single-hue amber ramp: dark (near the ocean surface) → bright (high magnitude).
export const SEQ_RAMP = ['#3a2408', '#553510', '#724714', '#935a17', '#b66e18', '#d9831b', '#fb9b2a', '#ffc04d'];

// Diverging: cool blue arm (negative) ← neutral gray → warm amber arm (positive).
export const DIV_NEG = ['#1c5cab', '#2f6fbd', '#4d86cc', '#7ba5d9'];
export const DIV_MID = '#3a3a37';
export const DIV_POS = ['#b77a2a', '#d9831b', '#fb9b2a', '#ffc04d'];

export const COLOR_NODATA = '#2c2c2c';
export const COLOR_UNPROFILED = '#161616';

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbToHex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

export function interpolateRamp(ramp, t) {
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  return rgbToHex(a.map((v, k) => v + (b[k] - v) * f));
}

const DIVERGING = new Set(['gdpGrowth']);
const DIV_CLAMP = 8;

/** Builds a colour scale for a metric over the full dataset (independent of filters, so colours stay stable). */
export function buildScale(metricKey) {
  const m = METRICS[metricKey];
  const values = countries
    .map((c) => m.get(c))
    .filter((v) => v != null && !(m.zeroIsNoData && v === 0));

  if (DIVERGING.has(metricKey)) {
    const divRamp = [...DIV_NEG, DIV_MID, ...DIV_POS];
    return {
      kind: 'diverging',
      min: -DIV_CLAMP,
      max: DIV_CLAMP,
      ramp: divRamp,
      color(v) {
        if (v == null) return COLOR_NODATA;
        return interpolateRamp(divRamp, (Math.max(-DIV_CLAMP, Math.min(DIV_CLAMP, v)) + DIV_CLAMP) / (2 * DIV_CLAMP));
      },
      ticks: [
        { t: 0, label: `≤ −${DIV_CLAMP}%` },
        { t: 0.5, label: '0%' },
        { t: 1, label: `≥ +${DIV_CLAMP}%` },
      ],
    };
  }

  const tf = m.scale === 'log' ? (v) => Math.log10(Math.max(v, 1e-3)) : (v) => v;
  let lo = Math.min(...values);
  let hi = m.clampMax != null ? Math.min(m.clampMax, Math.max(...values)) : Math.max(...values);
  if (m.scale !== 'log') lo = Math.min(0, lo);
  const tlo = tf(lo);
  const thi = tf(hi);
  const norm = (v) => (thi === tlo ? 1 : (tf(Math.min(v, hi)) - tlo) / (thi - tlo));

  return {
    kind: 'sequential',
    min: lo,
    max: hi,
    ramp: SEQ_RAMP,
    color(v) {
      if (v == null || (m.zeroIsNoData && v === 0)) return COLOR_NODATA;
      return interpolateRamp(SEQ_RAMP, norm(v));
    },
    ticks: [
      { t: 0, label: m.format(lo) },
      { t: 1, label: `${m.clampMax != null && hi === m.clampMax ? '≥ ' : ''}${m.format(hi)}` },
    ],
  };
}

export const rampGradient = (ramp) => `linear-gradient(90deg, ${ramp.join(', ')})`;
