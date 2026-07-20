import type {
  BrowserLocationStatus,
  LocationPreset,
  LocationSearchResult,
  ObservingSite,
} from "./types";

export interface LocationProvider {
  presets(): LocationPreset[];
  search(query: string): LocationSearchResult[];
  requestBrowserLocation(): Promise<{
    status: BrowserLocationStatus;
    site?: ObservingSite;
    error?: string;
  }>;
  /** Map a search result → ready ObservingSite. */
  toSite(result: LocationSearchResult): ObservingSite;
}