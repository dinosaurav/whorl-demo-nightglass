"use client";

import { useEffect, useMemo, useState } from "react";
import { providers } from "@/lib/providers";
import type { ObservingSite } from "@/lib/location/types";
import type { NightInstant } from "@/lib/astronomy/types";

export interface NightWindow {
  start: number; // utc ms
  end: number; // utc ms
  duration: number; // ms
}

export interface NightTimeState {
  window: NightWindow | null;
  /** Current UTC ms displayed by the scrub (driven by user). */
  time: number;
  /** Fraction 0..1 across the night. */
  fraction: number;
  setTime: (utcMs: number) => void;
  setFraction: (f: number) => void;
  /** A list of labeled steps for the timeline axis. */
  markers: NightInstant[];
  /** Whether the displayed time is "now" within the night window. */
  isNow: boolean;
  jumpToNow: () => void;
  /** Recompute for a new site (and optional base date). */
  refreshFor: (site: ObservingSite, utcMs?: number) => void;
}

/** Manage the night window and the current scrub position for a site. */
export function useNightTime(site: ObservingSite | null, baseUtcMs?: number): NightTimeState {
  // Hour-round the seed so SSR markup and client hydration agree (raw
  // Date.now() differs across them → hydration mismatches on time labels).
  const seedBase = () => baseUtcMs ?? Math.floor(Date.now() / 3600000) * 3600000;
  const [window, setWindow] = useState<NightWindow | null>(() => {
    if (!site) return null;
    try {
      const w = providers.astronomy.nightWindow(site, seedBase());
      return { start: w.start, end: w.end, duration: w.end - w.start };
    } catch {
      return null;
    }
  });
  const [time, setTime] = useState<number>(() => seedBase());

  const refreshFor = (s: ObservingSite, base = baseUtcMs ?? Date.now()) => {
    const w = providers.astronomy.nightWindow(s, base);
    const nw: NightWindow = { start: w.start, end: w.end, duration: w.end - w.start };
    setWindow(nw);
    // Default to start of night if currently daytime / outside.
    if (base < nw.start || base > nw.end) {
      setTime(nw.start + nw.duration * 0.35);
    } else {
      setTime(base);
    }
  };

  useEffect(() => {
    if (!site) return;
    refreshFor(site);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site?.id]);

  const fraction = useMemo(() => {
    if (!window || window.duration <= 0) return 0;
    return Math.max(0, Math.min(1, (time - window.start) / window.duration));
  }, [time, window]);

  const setFraction = (f: number) => {
    if (!window) return;
    const t = window.start + Math.max(0, Math.min(1, f)) * window.duration;
    setTime(t);
  };

  const markers: NightInstant[] = useMemo(() => {
    if (!window) return [];
    const steps = 6;
    const arr: NightInstant[] = [];
    for (let i = 0; i <= steps; i++) {
      const f = i / steps;
      const utc = window.start + f * window.duration;
      arr.push({ utc, nightFraction: f, label: formatLocal(site, utc, i, steps) });
    }
    return arr;
  }, [window, site?.id]);

  const now = Date.now();
  const isNow = window ? Math.abs(time - now) < 10 * 60 * 1000 : false;

  const jumpToNow = () => {
    if (!window) return;
    const n = Date.now();
    if (n < window.start || n > window.end) {
      setTime(window.start + window.duration * 0.35);
    } else {
      setTime(n);
    }
  };

  return {
    window,
    time,
    fraction,
    setTime,
    setFraction,
    markers,
    isNow,
    jumpToNow,
    refreshFor,
  };
}

function formatLocal(site: ObservingSite | null, utcMs: number, i: number, steps: number): string {
  try {
    const d = new Date(utcMs);
    const tz = site?.timezone || "UTC";
    const opt: Intl.DateTimeFormatOptions =
      i === 0
        ? { hour: "numeric", timeZone: tz }
        : i === steps
        ? { hour: "numeric", timeZone: tz }
        : { hour: "numeric", minute: "2-digit", timeZone: tz };
    const fmt = new Intl.DateTimeFormat("en-US", opt);
    const parts = fmt.formatToParts(d);
    const hour = parts.find((p) => p.type === "hour")?.value ?? "";
    const period = parts.find((p) => p.type === "dayPeriod")?.value ?? "";
    if (!hour || period === undefined) {
      return new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: tz }).format(d);
    }
    return `${hour}${period !== "" ? ` ${period}` : ""}`.trim() || "—";
  } catch {
    return `+${Math.round(i * (12 / steps))}h`;
  }
}