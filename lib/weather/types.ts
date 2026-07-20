/**
 * Weather data contracts — frozen for v1.
 * UI depends only on these; provider implementations live elsewhere.
 */

export type CloudCover = number; // 0..1
export type VisibilityKm = number; // kilometers
export type PrecipProbability = number; // 0..1

export interface WeatherSample {
  /** UTC ms. */
  time: number;
  cloudCover: CloudCover;
  visibilityKm: VisibilityKm;
  precipProb: PrecipProbability;
}

/** Continuous-ish curve sampled hourly across a night. */
export interface NightWeatherCurve {
  siteId: string;
  /** Inclusive start (sunset) and end (sunrise) in UTC ms. */
  nightStart: number;
  nightEnd: number;
  /** Sorted ascending by time. Hourly is fine. */
  samples: WeatherSample[];
  /** True iff values are mocked, not live. */
  mocked: boolean;
}

/** User-facing visibility blend derived from a curve at one instant. */
export interface VisibilityState {
  cloudOpacity: number; // 0..1 — how much of the sky is occluded by cloud veil
  haze: number; // 0..1 — atmospheric haze warm wash
  moonWash: number; // 0..1 — moon illumination washing stars
  precipRisk: number; // 0..1
  /** Composite "sky clarity" — higher is better viewing. */
  clarity: number;
  /** Mocked flag for honesty label. */
  mocked: boolean;
  /**
   * BACKLOG hook (optional, not required by v1 UI):
   * Artificial sky brightness 0..1 from a light-pollution dataset.
   * Stub providers leave this undefined; a real provider can populate it and
   * the sky can paint a horizon glow without changing other fields.
   */
  lightPollution?: number;
}