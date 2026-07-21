/**
 * Pure rendering helpers for SkyDome — projection math, color, sizing.
 * Side-effect free: takes a SkySnapshot + VisibilityState and returns
 * renderable primitives the React SVG layer can paint.
 */

import type {
  ProjectedConstellation,
  ProjectedStar,
  SkySnapshot,
  Star,
} from "@/lib/astronomy/types";
import type { VisibilityState } from "@/lib/weather/types";

/** Star size from magnitude — return radius in dome units (1.0 = full dome radius).
 *  Sized so the dimmest catalog stars stay clearly visible on a phone screen. */
export function starRadius(star: Star): number {
  const m = star.magnitude;
  // Map magnitude -1.5 (brightest) → ~0.02, +4.8 (faintest field) → ~0.006.
  const norm = clamp((4.8 - m) / 5.2, 0, 1);
  return 0.006 + norm * 0.014;
}

/** Star fill color derived from B-V color index. */
export function starFill(star: Star): string {
  const bv = star.colorIndex ?? 0;
  // Hot blue → cool red. Approximate temperature tint.
  if (bv < -0.1) return "#bcd6ff";
  if (bv < 0.15) return "#eaf0fb";
  if (bv < 0.4) return "#fff8ec";
  if (bv < 0.8) return "#ffe9c7";
  if (bv < 1.4) return "#ffd28a";
  return "#ff9d5c";
}

export interface RenderPrimitives {
  stars: Array<{
    star: Star;
    x: number;
    y: number;
    r: number;
    fill: string;
    aboveHorizon: boolean;
  }>;
  constellations: Array<{
    id: string;
    name: string;
    longName: string | null;
    lines: Array<{ x1: number; y1: number; x2: number; y2: number; visible: boolean }>;
    centroid: { x: number; y: number };
    visible: boolean;
    meanAltitude: number;
  }>;
  moon: {
    x: number;
    y: number;
    radius: number;
    illumination: number;
    phase: number;
    aboveHorizon: boolean;
  };
  planets: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    fill: string;
    aboveHorizon: boolean;
  }>;
  /** Sky background gradient + veil opacities. */
  sky: {
    zenith: string;
    mid: string;
    horizon: string;
    cloudOpacity: number;
    hazeOpacity: number;
    moonWash: number;
  };
}

export function buildPrimitives(
  snap: SkySnapshot,
  visibility: VisibilityState,
  rotation: number
): RenderPrimitives {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  // Rotate (x,y) around origin by `rotation` radians ccw — applied to everything together.
  // Dome space is y-up (north = +y); SVG screen space is y-down, so y is
  // negated here once. Everything downstream (labels, hit-testing, cardinals)
  // works in screen space.
  const rot = (x: number, y: number) => {
    const nx = cos * x - sin * y;
    const ny = sin * x + cos * y;
    return { x: nx, y: -ny };
  };

  const stars = snap.stars.map((ps) => {
    const { x, y } = rot(ps.xy.x, ps.xy.y);
    return {
      star: ps.star,
      x,
      y,
      r: starRadius(ps.star),
      fill: starFill(ps.star),
      aboveHorizon: ps.aboveHorizon,
    };
  });

  const constellations = snap.constellations.map((pc: ProjectedConstellation) => {
    const starMap = new Map(pc.points.map((p) => [p.starId, rot(p.xy.x, p.xy.y)]));
    const lines = pc.constellation.lines.map((L) => {
      const a = starMap.get(L.fromStarId);
      const b = starMap.get(L.toStarId);
      if (!a || !b) return { x1: 0, y1: 0, x2: 0, y2: 0, visible: false };
      return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, visible: true };
    });
    const c = rot(pc.centroid.x, pc.centroid.y);
    return {
      id: pc.constellation.id,
      name: pc.constellation.name,
      longName: pc.constellation.longName ?? null,
      lines,
      centroid: c,
      visible: pc.visible,
      meanAltitude: pc.meanAltitude,
    };
  });

  const moon = (() => {
    const { x, y } = rot(snap.moon.xy.x, snap.moon.xy.y);
    return {
      x,
      y,
      radius: 0.04,
      illumination: snap.moon.illumination,
      phase: snap.moon.phase,
      aboveHorizon: snap.moon.aboveHorizon,
    };
  })();

  const planetFills: Record<string, string> = {
    jupiter: "#ffd9a3",
    saturn: "#ffe3a0",
    mars: "#ff7a4d",
    venus: "#fef6d8",
  };
  const planets = snap.planets.map((p) => {
    const { x, y } = rot(p.xy.x, p.xy.y);
    return {
      id: p.id,
      name: p.name,
      x,
      y,
      fill: planetFills[p.id] ?? "#fff",
      aboveHorizon: p.aboveHorizon,
    };
  });

  // Sky background influenced by weather. Veil opacity is what paints clouds.
  const moonBleach = visibility.moonWash;
  const zenith = mixColor("#070c18", "#24355c", moonBleach * 0.45);
  const mid = mixColor("#101d38", "#2c4066", moonBleach * 0.45);
  const horizon = mixColor("#2a3a5c", "#5a6a8f", moonBleach * 0.55);

  return {
    stars,
    constellations,
    moon,
    planets,
    sky: {
      zenith,
      mid,
      horizon,
      cloudOpacity: visibility.cloudOpacity,
      hazeOpacity: visibility.haze,
      moonWash: visibility.moonWash,
    },
  };
}

function mixColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
}
function hex(n: number): string {
  return n.toString(16).padStart(2, "0");
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Test if a dome-space point is within the visible disc — used for hit detection. */
export function inDome(x: number, y: number): boolean {
  return x * x + y * y <= 1;
}

/** Hit-test a screen-space pointer → constellation id, if any. */
export function hitTestConstellation(
  primitives: RenderPrimitives,
  domeX: number,
  domeY: number,
  tolerance: number
): string | null {
  let best: string | null = null;
  let bestDist = tolerance;
  for (const c of primitives.constellations) {
    if (!c.visible) continue;
    const d = Math.hypot(c.centroid.x - domeX, c.centroid.y - domeY);
    if (d < bestDist) {
      bestDist = d;
      best = c.id;
    }
  }
  if (best) return best;
  // Try nearest star → its constellation.
  let starBest: string | null = null;
  let starDist = tolerance * 0.5;
  for (const s of primitives.stars) {
    if (!s.aboveHorizon) continue;
    if (!s.star.constellationId) continue;
    const d = Math.hypot(s.x - domeX, s.y - domeY);
    if (d < starDist) {
      starDist = d;
      starBest = s.star.constellationId;
    }
  }
  return starBest;
}