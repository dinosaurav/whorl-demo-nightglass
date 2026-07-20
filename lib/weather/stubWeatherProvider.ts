import type { WeatherProvider } from "./WeatherProvider";
import type { NightWeatherCurve, VisibilityState, WeatherSample } from "./types";
import type { ObservingSite } from "../location/types";

/** Deterministic pseudo-random in 0..1 from integer seed. */
function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

/** Smoothly varying curve via low-frequency wave mixing + a touch of noise. */
function cloudProfile(siteId: string, tHours: number): number {
  const hash = siteId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = seeded(hash);
  const phase1 = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;
  const w = tHours / 6;
  const v =
    0.5
    + 0.32 * Math.sin(w + phase1)
    + 0.18 * Math.sin(0.7 * w + phase2 + 1.3);
  return clamp(v, 0.0, 1.0);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Per-site base cloudiness — Joshua Tree clear, Reykjavík changeable, Brooklyn middling. */
function baselineCloud(siteId: string): number {
  if (siteId.startsWith("joshua")) return 0.18;
  if (siteId.startsWith("reyk")) return 0.55;
  if (siteId.startsWith("brook")) return 0.45;
  return 0.4;
}

export const stubWeatherProvider: WeatherProvider = {
  async curveFor(site, nightStart, nightEnd): Promise<NightWeatherCurve> {
    const dur = nightEnd - nightStart;
    const hourMs = 3600 * 1000;
    const samples: WeatherSample[] = [];
    const base = baselineCloud(site.id);
    for (let t = 0; t <= dur + 1000; t += hourMs) {
      const time = nightStart + t;
      const hoursIn = t / hourMs;
      const profile = cloudProfile(site.id, hoursIn);
      // Mix baseline with the dynamic profile.
      const cloudCover = clamp(base * 0.4 + profile * 0.6, 0, 1);
      const visibilityKm = clamp(30 - cloudCover * 22, 2, 30);
      const precipProb = clamp(cloudCover * 0.5 - 0.05, 0, 1);
      samples.push({ time, cloudCover, visibilityKm, precipProb });
    }
    return {
      siteId: site.id,
      nightStart,
      nightEnd,
      samples,
      mocked: true,
    };
  },

  sampleAt(curve, utcMs, moonIllumination): VisibilityState {
    const s = curve.samples;
    if (s.length === 0) {
      return {
        cloudOpacity: 0.5,
        haze: 0.2,
        moonWash: moonIllumination,
        precipRisk: 0,
        clarity: 0.5,
        mocked: curve.mocked,
      };
    }
    // Linear interpolation between samples.
    const i = s.findIndex((x) => x.time >= utcMs);
    let sample: WeatherSample;
    if (i === -1) sample = s[s.length - 1];
    else if (i === 0) sample = s[0];
    else {
      const a = s[i - 1];
      const b = s[i];
      const span = b.time - a.time;
      const frac = span > 0 ? (utcMs - a.time) / span : 0;
      sample = {
        time: utcMs,
        cloudCover: a.cloudCover + (b.cloudCover - a.cloudCover) * frac,
        visibilityKm: a.visibilityKm + (b.visibilityKm - a.visibilityKm) * frac,
        precipProb: a.precipProb + (b.precipProb - a.precipProb) * frac,
      };
    }
    const cloudOpacity = clamp(sample.cloudCover, 0, 1);
    const haze = clamp(1 - sample.visibilityKm / 30, 0, 1) * 0.6;
    const moonWash = clamp(moonIllumination * (1 - cloudOpacity * 0.4), 0, 1);
    const precipRisk = clamp(sample.precipProb, 0, 1);
    const clarity = clamp(1 - cloudOpacity * 0.8 - haze * 0.4 - moonWash * 0.25, 0, 1);
    return {
      cloudOpacity,
      haze,
      moonWash,
      precipRisk,
      clarity,
      mocked: curve.mocked,
    };
  },
};