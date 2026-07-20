/**
 * Deterministic stub astronomy — good enough projection for v1, not planetarium-accurate.
 * Real astronomy engine (astronomy-engine) can replace this without touching UI.
 */

import type {
  AstronomyProvider,
} from "./AstronomyProvider";
import type {
  Constellation,
  MoonRenderState,
  PlanetRenderState,
  ProjectedConstellation,
  ProjectedStar,
  SkySnapshot,
  Star,
} from "./types";
import type { ObservingSite } from "../location/types";
import rawStars from "../../data/stars.json";
import rawConstellations from "../../data/constellations.json";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

interface RawStar {
  id: string;
  name?: string | null;
  bayer?: string | null;
  equatorial: { ra: number; dec: number };
  magnitude: number;
  colorIndex?: number;
  constellationId?: string;
}

interface RawConstellation {
  id: string;
  abbreviation: string;
  name: string;
  longName?: string | null;
  starIds: string[];
  lines: Array<{ fromStarId: string; toStarId: string }>;
  facingAz?: number | null;
  blurb?: string | null;
}

const STARS: Star[] = (rawStars as { stars: RawStar[] }).stars.map((s) => ({
  id: s.id,
  name: s.name ?? null,
  bayer: s.bayer ?? null,
  equatorial: { ra: (s.equatorial.ra as number) * RAD, dec: (s.equatorial.dec as number) * RAD },
  magnitude: s.magnitude,
  colorIndex: s.colorIndex,
  constellationId: s.constellationId ?? null,
}));

const CONSTELLATIONS: Constellation[] = (
  rawConstellations as { constellations: RawConstellation[] }
).constellations.map((c) => ({
  id: c.id,
  abbreviation: c.abbreviation,
  name: c.name,
  longName: c.longName ?? null,
  starIds: c.starIds,
  lines: c.lines,
  facingAz: c.facingAz != null ? c.facingAz * RAD : null,
  blurb: c.blurb ?? null,
}));

const PLANETS_STUB: Array<{
  id: string;
  name: string;
  magnitude: number;
  ra: number;
  dec: number;
}> = [
  { id: "jupiter", name: "Jupiter", magnitude: -2.2, ra: 90 * RAD, dec: 18 * RAD },
  { id: "saturn", name: "Saturn", magnitude: 0.4, ra: 340 * RAD, dec: -10 * RAD },
  { id: "mars", name: "Mars", magnitude: -0.5, ra: 290 * RAD, dec: -22 * RAD },
  { id: "venus", name: "Venus", magnitude: -4.0, ra: 250 * RAD, dec: -18 * RAD },
];

/** Compute the Local Sidereal Time from date + longitude (deterministic). */
function localSiderealTime(site: ObservingSite, utcMs: number): number {
  const d = new Date(utcMs);
  const jd = utcMsToJd(utcMs);
  const t = (jd - 2451545.0) / 36525.0;
  // GMST in hours (Meeus formula, simplified)
  let gmstHours = 6.697374558 + 0.06570982441908 * t * 36525 + 1.00273790935 * (d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600);
  gmstHours = ((gmstHours % 24) + 24) % 24;
  const lonHours = (site.lon * RAD) * 12 / Math.PI;
  return (((gmstHours + lonHours) % 24) + 24) % 24 * Math.PI / 12;
}

function utcMsToJd(utcMs: number): number {
  return utcMs / 86400000 + 2440587.5;
}

/** Convert equatorial (ra, dec) → horizontal (az, alt). ra in radians, lst in radians, lat in radians. */
function equatorialToHorizontal(
  ra: number,
  dec: number,
  lat: number,
  lst: number
): { az: number; alt: number } {
  const ha = lst - ra;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAlt = Math.cos(alt);
  let sinAz = -Math.cos(dec) * Math.sin(ha) / (cosAlt || 1e-9);
  let cosAz =
    (Math.sin(dec) - Math.sin(lat) * sinAlt) / ((Math.cos(lat) * cosAlt) || 1e-9);
  sinAz = clamp(sinAz, -1, 1);
  cosAz = clamp(cosAz, -1, 1);
  let az = Math.atan2(sinAz, cosAz);
  if (az < 0) az += 2 * Math.PI;
  return { az, alt };
}

/** Stereographic-ish projection of (az, alt) into -1..1 dome coords.
 *  az: 0 = north, increases clockwise (east at 90°). Alt: 0 at horizon, π/2 at zenith.
 *  Rotation applied ccw around zenith (drag-to-rotate). */
function projectToDome(
  az: number,
  alt: number,
  rotation: number
): { x: number; y: number } {
  const theta = az + rotation;
  const r = 1 - alt / (Math.PI / 2);
  return { x: r * Math.sin(theta), y: r * Math.cos(theta) };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Deterministic moon position — very rough geocentric model for v1. */
function moonState(site: ObservingSite, utcMs: number): MoonRenderState {
  const jd = utcMsToJd(utcMs);
  const t = (jd - 2451545.0) / 36525.0;
  // Mean longitude of moon
  const L = (218.316 + 13.176396 * (jd - 2451545.0)) % 360 * RAD;
  // Mean elongation from sun
  const D = (297.85 + 13.06499 * (jd - 2451545.0)) % 360 * RAD;
  // Phase: 0 = new, 0.5 = full
  const phase = (((1 - Math.cos(D)) / 2) + 1) % 1;
  const illumination = (1 - Math.cos(D)) / 2;
  // Loosely tie declination and RA to L for projection.
  const dec = 23.4 * RAD * Math.sin(L);
  const ra = L;
  const lst = localSiderealTime(site, utcMs);
  const { az, alt } = equatorialToHorizontal(ra, dec, site.lat * RAD, lst);
  const xy = projectToDome(az, alt, 0);
  return {
    phase,
    illumination,
    xy,
    altitude: alt,
    aboveHorizon: alt > -0.05,
  };
}

function sunAltitude(site: ObservingSite, utcMs: number): number {
  const jd = utcMsToJd(utcMs);
  const t = (jd - 2451545.0) / 36525.0;
  const L0 = (280.466 + 36000.77 * t) * RAD;
  const M = (357.529 + 35999.05 * t) * RAD;
  const lambda = L0 + (1.915 * RAD) * Math.sin(M) + (0.02 * RAD) * Math.sin(2 * M);
  const obliquity = 23.4397 * RAD;
  const ra = Math.atan2(Math.cos(obliquity) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(obliquity) * Math.sin(lambda));
  const lst = localSiderealTime(site, utcMs);
  const { alt } = equatorialToHorizontal(ra, dec, site.lat * RAD, lst);
  return alt;
}

function projectPlanets(
  site: ObservingSite,
  utcMs: number,
  rotation: number
): PlanetRenderState[] {
  const lst = localSiderealTime(site, utcMs);
  return PLANETS_STUB.map((p) => {
    const { az, alt } = equatorialToHorizontal(p.ra, p.dec, site.lat * RAD, lst);
    return {
      id: p.id,
      name: p.name,
      magnitude: p.magnitude,
      xy: projectToDome(az, alt, rotation),
      altitude: alt,
      aboveHorizon: alt > 0,
    };
  });
}

function facingLabel(az: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const i = Math.round((az / (Math.PI / 8)) % 16);
  return dirs[i];
}

/** Estimate next sunset → sunrise window for a date near today (deterministic approximation). */
function nightWindowFor(site: ObservingSite, utcMs: number): { start: number; end: number } {
  // Sweep over the next 36h in 10-min steps, find current state.
  const step = 10 * 60 * 1000;
  let start = utcMs;
  let end = utcMs;
  let prevSunUp = sunAltitude(site, utcMs) > 0;
  for (let i = 0; i < (36 * 60) / 10; i++) {
    const t = utcMs + i * step;
    const sunUp = sunAltitude(site, t) > 0;
    if (prevSunUp && !sunUp) start = t;
    if (!prevSunUp && sunUp && start > utcMs) {
      end = t;
      return { start, end };
    }
    prevSunUp = sunUp;
  }
  // Fallback: framed as 20:00 → 06:00 local low-precision stub.
  start = utcMs;
  end = utcMs + 8 * 3600 * 1000;
  return { start, end };
}

export const stubAstronomyProvider: AstronomyProvider = {
  skyAt(site: ObservingSite, timeUtcMs: number): SkySnapshot {
    const lst = localSiderealTime(site, timeUtcMs);
    const latRad = site.lat * RAD;
    const rotation = 0;

    const stars: ProjectedStar[] = STARS.map((star) => {
      const { az, alt } = equatorialToHorizontal(
        star.equatorial.ra,
        star.equatorial.dec,
        latRad,
        lst
      );
      const aboveHorizon = alt > -0.02;
      const xy = projectToDome(az, alt, rotation);
      return { star, xy, altitude: alt, aboveHorizon };
    });

    const starById = new Map(stars.map((s) => [s.star.id, s]));

    const constellations: ProjectedConstellation[] = CONSTELLATIONS.map((c) => {
      const pts: ProjectedConstellation["points"] = [];
      let cx = 0, cy = 0, n = 0;
      let sumAlt = 0;
      for (const sid of c.starIds) {
        const ps = starById.get(sid);
        if (!ps) continue;
        pts.push({ starId: sid, xy: ps.xy });
        cx += ps.xy.x; cy += ps.xy.y; n++;
        sumAlt += ps.altitude;
      }
      const visible = n > 0 && pts.some((p) => {
        return p.xy.x * p.xy.x + p.xy.y * p.xy.y < 1 && starById.get(p.starId)!.aboveHorizon;
      });
      return {
        constellation: c,
        points: pts,
        centroid: n ? { x: cx / n, y: cy / n } : { x: 0, y: 0 },
        meanAltitude: n ? sumAlt / n : 0,
        visible,
      };
    });

    const moon = moonState(site, timeUtcMs);
    const planets = projectPlanets(site, timeUtcMs, rotation);

    return {
      site,
      time: timeUtcMs,
      stars,
      constellations,
      moon,
      planets,
      rotation,
      sunAltitude: sunAltitude(site, timeUtcMs),
    };
  },

  nightWindow(site, utcMs) {
    return nightWindowFor(site, utcMs);
  },

  facingHint(site, constellationId, utcMs) {
    const c = CONSTELLATIONS.find((x) => x.id === constellationId);
    const snap = this.skyAt(site, utcMs);
    const pc = snap.constellations.find((x) => x.constellation.id === constellationId);
    let az = c?.facingAz ?? 0;
    let alt = pc?.meanAltitude ?? Math.PI / 4;
    if (alt < 0) alt = 0;
    return {
      azimuth: az,
      altitude: alt,
      label: `Look ${facingLabel(az)} · ${Math.round(alt * DEG)}° above horizon`,
    };
  },
};