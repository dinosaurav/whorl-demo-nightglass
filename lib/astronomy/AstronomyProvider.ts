import type {
  ObservingSite,
  SkySnapshot,
} from "./types";

/** Astronomy provider — abstracted so a real engine (e.g. astronomy-engine) can drop in. */
export interface AstronomyProvider {
  /** Project the full sky for a site + UTC instant. */
  skyAt(site: ObservingSite, timeUtcMs: number): SkySnapshot;
  /** Compute the local night window (sunset→sunrise) for a given date. */
  nightWindow(site: ObservingSite, utcMs: number): { start: number; end: number };
  /** Facing hint for a constellation at a site (e.g. "Look NNE, 35° up"). */
  facingHint(site: ObservingSite, constellationId: string, utcMs: number): {
    azimuth: number;
    altitude: number;
    label: string;
  };
}