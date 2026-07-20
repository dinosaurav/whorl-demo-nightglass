import type { LocationProvider } from "./LocationProvider";
import type {
  BrowserLocationStatus,
  LocationPreset,
  LocationSearchResult,
  ObservingSite,
} from "./types";

const PRESETS: LocationPreset[] = [
  {
    id: "joshua-tree",
    name: "Joshua Tree · California",
    shortName: "Joshua Tree",
    lat: 33.8734,
    lon: -115.901,
    timezone: "America/Los_Angeles",
    vibe: "High desert dark sky — crisp, dry, Milky Way overhead.",
  },
  {
    id: "reykjavik",
    name: "Reykjavík · Iceland",
    shortName: "Reykjavík",
    lat: 64.1466,
    lon: -21.9426,
    timezone: "Atlantic/Reykjavik",
    vibe: "Sub-arctic summer — long twilights, low moon, elusive stars.",
  },
  {
    id: "brooklyn",
    name: "Brooklyn · New York",
    shortName: "Brooklyn",
    lat: 40.6782,
    lon: -73.9442,
    timezone: "America/New_York",
    vibe: "Light-polluted — only the brightest stars punch through.",
  },
];

export const stubLocationProvider: LocationProvider = {
  presets() {
    return PRESETS;
  },

  search(query: string): LocationSearchResult[] {
    const q = query.trim().toLowerCase();
    if (!q) return PRESETS.map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      timezone: p.timezone,
      source: "preset",
    }));
    const matched = PRESETS.filter((p) =>
      p.name.toLowerCase().includes(q) || (p.shortName?.toLowerCase().includes(q) ?? false)
    );
    return matched.map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      timezone: p.timezone,
      source: "preset",
    }));
  },

  async requestBrowserLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { status: "unavailable" as BrowserLocationStatus, error: "No geolocation API" };
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const site: ObservingSite = {
            id: `geo-${pos.coords.latitude.toFixed(3)},${pos.coords.longitude.toFixed(3)}`,
            name: "My location",
            shortName: "My location",
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          };
          resolve({ status: "granted", site });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            resolve({ status: "denied", error: "Permission denied" });
          } else {
            resolve({ status: "unavailable", error: err.message });
          }
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  },

  toSite(result: LocationSearchResult): ObservingSite {
    return {
      id: result.id,
      name: result.name,
      lat: result.lat,
      lon: result.lon,
      timezone: result.timezone,
    };
  },
};