/**
 * Location data contracts — frozen for v1.
 */

export interface ObservingSite {
  id: string;
  /** Display name, e.g. "Joshua Tree · California". */
  name: string;
  /** Short label for hero, e.g. "Joshua Tree". */
  shortName?: string;
  lat: number;
  lon: number;
  /** IANA tz, e.g. "America/Los_Angeles". */
  timezone: string;
}

export interface LocationPreset extends ObservingSite {
  /** Blurb about its sky vibe. */
  vibe: string;
}

export interface LocationSearchResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  timezone: string;
  /** Source — informational. */
  source: "preset" | "geosearch" | "geolocation";
}

export type BrowserLocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unavailable"
  | "fallback";