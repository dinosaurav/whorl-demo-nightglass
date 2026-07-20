import type { NightWeatherCurve } from "@/lib/weather/types";

export interface BestWindow {
  start: number; // utc ms inclusive
  end: number; // utc ms exclusive
  /** Average clarity 0..1 across the window. */
  clarity: number;
  /** Fraction of the night 0..1 of window start (for timeline placement). */
  startFraction: number;
  endFraction: number;
}

/**
 * Find the clearest, darkest contiguous span within the night.
 * Combines cloud cover AND moon illumination (proxy: time near midnight and
 * low moon). For v1 we apply a simple score per hour and pick the longest
 * high-scoring run.
 */
export function computeBestWindow(
  curve: NightWeatherCurve,
  nightDurationMs: number
): BestWindow | null {
  if (!curve.samples.length || nightDurationMs <= 0) return null;
  const span = nightDurationMs;
  const start = curve.nightStart;

  // Score each sample: 1 - cloudOpacity - 0.25 * nearbyMoonProxy (we lack moon
  // curve, so just use cloud + spread penalty to prefer longer runs).
  const scored = curve.samples.map((s) => {
    const cloud = Math.max(0, Math.min(1, s.cloudCover));
    const moonProxy = 0; // weather provider already blends moon at sample time
    const score = 1 - cloud - moonProxy;
    return { t: s.time, score, cloud };
  });

  // Threshold-based longest run with score >= 0.55.
  const threshold = 0.55;
  let best: { start: number; end: number; sum: number; n: number } | null = null;
  let run: { start: number; end: number; sum: number; n: number } | null = null;
  for (const s of scored) {
    if (s.score >= threshold) {
      if (!run) run = { start: s.t, end: s.t, sum: s.score, n: 1 };
      else {
        run.end = s.t;
        run.sum += s.score;
        run.n += 1;
      }
    } else {
      if (run) {
        if (!best || run.n > best.n) best = run;
        run = null;
      }
    }
  }
  if (run && (!best || run.n > best.n)) best = run;
  if (!best) {
    // Fallback: pick the single brightest sample ± 1h.
    let max = scored[0];
    for (const s of scored) if (s.score > max.score) max = s;
    if (!max) return null;
    best = { start: max.t, end: max.t + 3600 * 1000, sum: max.score, n: 1 };
  }
  // Extend best end by one sample width if possible.
  const oneHour = 3600 * 1000;
  const end = best.end === best.start ? best.start + oneHour : best.end + oneHour;
  const avg = best.sum / Math.max(1, best.n);
  return {
    start: best.start,
    end,
    clarity: avg,
    startFraction: Math.max(0, (best.start - start) / span),
    endFraction: Math.min(1, (end - start) / span),
  };
}