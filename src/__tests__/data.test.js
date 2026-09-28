import { describe, expect, it } from 'vitest';
import world from '../data/world.geo.json';
import {
  blocs,
  countries,
  countryByIso,
  DISPUTE_STATUS,
  REGIONS,
  relations,
  TAGS,
  METRICS,
  partnerTypes,
  matchesQuery,
  matchesCategory,
} from '../lib/data.js';

const geoIsos = new Set(world.features.map((f) => f.properties.iso3));

describe('countries dataset', () => {
  it('has unique ISO3 codes', () => {
    expect(new Set(countries.map((c) => c.iso3)).size).toBe(countries.length);
  });

  it.each(countries.map((c) => [c.iso3, c]))('%s is well-formed', (iso, c) => {
    expect(c.iso3).toMatch(/^[A-Z]{3}$/);
    expect(c.iso2).toMatch(/^[A-Z]{2}$/);
    expect(REGIONS).toContain(c.region);
    expect(geoIsos.has(iso), `${iso} missing from map geometry`).toBe(true);
    expect(c.capitalCoords).toHaveLength(2);
    const [lat, lon] = c.capitalCoords;
    expect(Math.abs(lat)).toBeLessThanOrEqual(90);
    expect(Math.abs(lon)).toBeLessThanOrEqual(180);
    expect(c.population).toBeGreaterThan(0);
    expect(c.summary.length).toBeGreaterThan(80);
    expect(c.strategicInterests.length).toBeGreaterThanOrEqual(3);
    expect(c.resources.length).toBeGreaterThanOrEqual(1);
    for (const t of c.tags) expect(Object.keys(TAGS)).toContain(t);
    expect(c.government.system).toBeTruthy();
    expect(c.economy.currency).toBeTruthy();
    for (const k of ['spendUsdBn', 'spendPctGdp', 'activePersonnel', 'nuclearWarheads']) {
      expect(k in c.military).toBe(true);
    }
  });

  it('flags nuclear-armed states consistently with warhead counts', () => {
    for (const c of countries) {
      const armed = c.military.nuclearWarheads > 0;
      expect(c.tags.includes('nuclear-armed'), c.iso3).toBe(armed);
    }
  });

  it('derives GDP per capita', () => {
    expect(countryByIso.USA.economy.gdpPerCapitaUsd).toBeGreaterThan(50000);
    expect(countryByIso.VEN.economy.gdpPerCapitaUsd).toBeNull();
  });
});

describe('relations dataset', () => {
  it('references profiled countries only', () => {
    for (const r of relations) {
      expect(countryByIso[r.a], `${r.id}: ${r.a}`).toBeDefined();
      expect(countryByIso[r.b], `${r.id}: ${r.b}`).toBeDefined();
      expect(r.a).not.toBe(r.b);
    }
  });

  it('has valid type-specific fields', () => {
    for (const r of relations) {
      expect(['alliance', 'trade', 'dispute']).toContain(r.type);
      expect([1, 2, 3]).toContain(r.strength);
      expect(r.label).toBeTruthy();
      expect(r.description).toBeTruthy();
      if (r.type === 'trade') expect(r.valueUsdBn).toBeGreaterThan(0);
      if (r.type === 'dispute') expect(Object.keys(DISPUTE_STATUS)).toContain(r.status);
      if (r.type === 'alliance') expect(['treaty', 'partnership']).toContain(r.subtype);
    }
  });

  it('has no duplicate pair of the same type', () => {
    const seen = new Set();
    for (const r of relations) {
      const key = [r.type, ...[r.a, r.b].sort()].join(':');
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it('computes the most salient partner type', () => {
    // USA–CHN is trade (3) and a severity-2 dispute: the militarised dispute wins.
    expect(partnerTypes('USA').CHN).toBe('dispute');
    expect(partnerTypes('USA').JPN).toBe('alliance');
    // USA–CAN is a treaty alliance (3) with a severity-1 tariff dispute: the alliance wins.
    expect(partnerTypes('USA').CAN).toBe('alliance');
    expect(partnerTypes('USA').ZAF).toBe('dispute');
  });
});

describe('blocs dataset', () => {
  it('uses ISO3 codes present on the map', () => {
    for (const b of blocs) {
      expect(new Set(b.members).size).toBe(b.members.length);
      for (const m of b.members) expect(geoIsos.has(m) || m === 'SGP' || m === 'BHR' || m === 'MLT', `${b.id}: ${m}`).toBe(true);
    }
  });
});

describe('search & filter helpers', () => {
  it('matches by name, code, bloc and tag', () => {
    expect(matchesQuery(countryByIso.FRA, 'fra')).toBe(true);
    expect(matchesQuery(countryByIso.FRA, 'nato')).toBe(true);
    expect(matchesQuery(countryByIso.FRA, 'nuclear')).toBe(true);
    expect(matchesQuery(countryByIso.BRA, 'nato')).toBe(false);
  });

  it('matches category filters', () => {
    expect(matchesCategory(countryByIso.POL, 'bloc:NATO')).toBe(true);
    expect(matchesCategory(countryByIso.POL, 'tag:nuclear-armed')).toBe(false);
  });

  it('formats every metric without throwing', () => {
    for (const m of Object.values(METRICS)) {
      for (const c of countries) expect(typeof m.format(m.get(c))).toBe('string');
    }
  });
});

describe('trade strength tiers', () => {
  it('follow the documented value bands', () => {
    for (const r of relations.filter((x) => x.type === 'trade')) {
      if (r.strength === 3) expect(r.valueUsdBn, r.id).toBeGreaterThan(200);
      if (r.strength === 1) expect(r.valueUsdBn, r.id).toBeLessThan(100);
      if (r.valueUsdBn >= 100) expect(r.strength, r.id).toBeGreaterThanOrEqual(2);
    }
  });
});
