"use client";

import { useEffect, useRef, useState } from "react";
import { providers } from "@/lib/providers";
import type {
  BrowserLocationStatus,
  LocationPreset,
  ObservingSite,
} from "@/lib/location/types";
import styles from "./LocationFlow.module.css";

interface LocationFlowProps {
  open: boolean;
  onClose: () => void;
  onSelectSite: (site: ObservingSite) => void;
  currentSite: ObservingSite;
}

export default function LocationFlow({
  open,
  onClose,
  onSelectSite,
  currentSite,
}: LocationFlowProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationPreset[]>(providers.location.presets());
  const [status, setStatus] = useState<BrowserLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(providers.location.presets());
      setStatus("idle");
      setError(null);
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    const presets = providers.location.presets();
    const q = query.trim().toLowerCase();
    if (!q) {
      setResults(presets);
      return;
    }
    setResults(
      presets.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.shortName?.toLowerCase().includes(q) ?? false)
      )
    );
  }, [query]);

  if (!open) return null;

  const requestGeolocation = async () => {
    setStatus("requesting");
    setError(null);
    const res = await providers.location.requestBrowserLocation();
    setStatus(res.status);
    if (res.status === "granted" && res.site) {
      onSelectSite(res.site);
      onClose();
    } else if (res.status === "denied" || res.status === "unavailable") {
      setError(
        res.status === "denied"
          ? "Permission denied — search a place instead."
          : "Geolocation unavailable — search a place instead."
      );
    }
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.panel}>
        <header className={styles.head}>
          <h2 className={styles.title}>Set your observing site</h2>
          <button className={styles.close} onClick={onClose} aria-label="Close location">
            ×
          </button>
        </header>

        <div className={styles.row}>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            placeholder="Search a place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            className={styles.geoBtn}
            onClick={requestGeolocation}
            disabled={status === "requesting"}
          >
            {status === "requesting" ? "Locating…" : "Use my location"}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <ul className={styles.list}>
          {results.map((p) => (
            <li key={p.id}>
              <button
                className={`${styles.item} ${
                  p.id === currentSite.id ? styles.itemActive : ""
                }`}
                onClick={() => {
                  onSelectSite({
                    id: p.id,
                    name: p.name,
                    shortName: p.shortName,
                    lat: p.lat,
                    lon: p.lon,
                    timezone: p.timezone,
                  });
                  onClose();
                }}
              >
                <span className={styles.itemName}>{p.name}</span>
                {p.vibe && <span className={styles.itemVibe}>{p.vibe}</span>}
                {p.id === currentSite.id && <span className={styles.cur}>current</span>}
              </button>
            </li>
          ))}
          {results.length === 0 && (
            <li className={styles.empty}>
              No presets match — try Joshua Tree, Reykjavík, or Brooklyn. (Live geocoding is a v1 backlog item.)
            </li>
          )}
        </ul>

        <footer className={styles.foot}>
          <span className={styles.stubNote}>sample sky · stub weather</span>
        </footer>
      </div>
    </div>
  );
}