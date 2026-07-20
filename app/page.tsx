"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Wordmark from "@/components/brand/Wordmark";
import SkyDome from "@/components/sky/SkyDome";
import WeatherLayer from "@/components/sky/WeatherLayer";
import LayerToggles, { type SkyLayers } from "@/components/sky/LayerToggles";
import NightTimeline from "@/components/timeline/NightTimeline";
import LocationFlow from "@/components/location/LocationFlow";
import Inspector from "@/components/objects/Inspector";
import TonightRoute from "@/components/objects/TonightRoute";
import { useNightTime } from "@/hooks/useNightTime";
import { computeBestWindow } from "@/hooks/bestWindow";
import { providers } from "@/lib/providers";
import type { ObservingSite } from "@/lib/location/types";
import type { SkySnapshot } from "@/lib/astronomy/types";
import type { NightWeatherCurve, VisibilityState } from "@/lib/weather/types";
import styles from "./page.module.css";

const DEFAULT_SITE = providers.location.presets()[0];

export default function Home() {
  const [site, setSite] = useState<ObservingSite>(DEFAULT_SITE);
  const [showSample, setShowSample] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [layers, setLayers] = useState<SkyLayers>({
    clouds: true,
    moon: true,
    lines: true,
    labels: true,
    planets: true,
  });
  const [reduced, setReduced] = useState(false);
  const [skyReady, setSkyReady] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = () => setReduced(mql.matches);
    handler();
    mql.addEventListener?.("change", handler);
    return () => mql.removeEventListener?.("change", handler);
  }, []);

  const night = useNightTime(site);

  // Snapshot + weather per current site & time.
  const [curve, setCurve] = useState<NightWeatherCurve | null>(null);
  const [snapshot, setSnapshot] = useState<SkySnapshot | null>(() => {
    return providers.astronomy.skyAt(DEFAULT_SITE, Date.now());
  });
  const [visibility, setVisibility] = useState<VisibilityState | null>(() => {
    const snap = providers.astronomy.skyAt(DEFAULT_SITE, Date.now());
    return {
      cloudOpacity: 0.3,
      haze: 0.12,
      moonWash: snap.moon.illumination,
      precipRisk: 0.05,
      clarity: 0.65,
      mocked: true,
    };
  });
  const [scrubbing, setScrubbing] = useState(false);
  const computeTimer = useRef<number | null>(null);

  // Recompute whenever site/time/rotation(rotation doesn't affect positions) changes.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!night.window) return;
      const c = await providers.weather.curveFor(
        site,
        night.window.start,
        night.window.end
      );
      if (cancelled) return;
      setCurve(c);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [site.id, night.window?.start, night.window?.end]);

  useEffect(() => {
    if (!night.time) return;
    const snap = providers.astronomy.skyAt(site, night.time);
    setSnapshot(snap);
    setSkyReady(true);
    if (curve) {
      const v = providers.weather.sampleAt(curve, night.time, snap.moon.illumination);
      setVisibility(v);
    }
  }, [site.id, night.time, curve]);

  // Cloud sparkline for the timeline (peak samples simplified).
  const cloudCurve = useMemo(() => {
    if (!curve) return null;
    return curve.samples.map((s) => ({ t: s.time, cloud: s.cloudCover }));
  }, [curve]);

  const bestWindow = useMemo(
    () => (curve && night.window ? computeBestWindow(curve, night.window.duration) : null),
    [curve, night.window]
  );

  const onScrubStart = useCallback(() => setScrubbing(true), []);
  const onScrubEnd = useCallback(() => setScrubbing(false), []);

  // "Explore sample sky" cycles the rote between presets.
  const exploreSample = () => {
    setShowSample(true);
    const presets = providers.location.presets();
    const i = presets.findIndex((p) => p.id === site.id);
    const next = presets[(i + 1) % presets.length];
    setSite({ ...next });
  };

  return (
    <main className={styles.hero}>
      {/* Full-bleed sky dome */}
      <div className={styles.skyStage}>
        <SkyDome
          snapshot={snapshot}
          visibility={visibility}
          rotation={rotation}
          onChangeRotation={setRotation}
          focusedConstellationId={focused}
          onFocusConstellation={setFocused}
          layers={layers}
          scrubbing={scrubbing}
        />
        <WeatherLayer
          visibility={visibility}
          showClouds={layers.clouds}
          showMoonWash={layers.moon}
        />
      </div>

      {/* Sky dim gradient for text legibility at top-left */}
      <div className={styles.skyShade} aria-hidden="true" />

      {/* Layer toggles */}
      <div className={styles.layerRail}>
        <LayerToggles layers={layers} onChange={setLayers} />
      </div>

      {/* Hero brand + headline + CTAs (first-viewport composition) */}
      <section className={styles.heroCopy}>
        <Wordmark size="lg" tagline />
        <h1 className={styles.headline}>
          Tonight, the sky above <span className={styles.placeName}>{site.shortName ?? site.name}</span>
        </h1>
        <p className={styles.support}>
          An explorable star chart for your corner of the night — drag the dome,
          scrub the hours, and find when the clouds will clear.
        </p>
        <div className={styles.ctas}>
          <button className={styles.primary} onClick={() => setLocationOpen(true)}>
            Set my location
          </button>
          <button className={styles.secondary} onClick={exploreSample}>
            Explore sample sky
          </button>
        </div>
        <p className={styles.stubFlag}>sample sky · stub weather</p>
      </section>

      {/* Visibility panel — only base layer (no dashboard-y tiles) */}
      <div className={styles.layerPane} aria-hidden={!!focused}>
        <div className={styles.layerPaneInner}>
          <span className={styles.layerPaneLabel}>tonight clarity</span>
          <span className={styles.layerPaneValue}>
            {visibility ? `${Math.round(visibility.clarity * 100)}%` : "—"}
          </span>
        </div>
      </div>

      {/* Inspector once focused */}
      {snapshot && (
        <Inspector
          site={site}
          snapshot={snapshot}
          focusedId={focused}
          onClose={() => setFocused(null)}
          utcMs={night.time}
        />
      )}

      {/* Tonight route */}
      <TonightRoute
        site={site}
        focusedId={focused}
        open={routeOpen}
        onToggle={() => setRouteOpen((v) => !v)}
      />

      {/* Bottom timeline dock */}
      <div className={styles.dock}>
        <NightTimeline
          fraction={night.fraction}
          onChangeFraction={night.setFraction}
          onScrubStart={onScrubStart}
          onScrubEnd={onScrubEnd}
          markers={night.markers}
          cloudCurve={cloudCurve}
          bestWindow={bestWindow}
          isNow={night.isNow}
          onJumpToNow={night.jumpToNow}
          reducedMotion={reduced}
        />
      </div>

      {/* Footer honesty — out of first viewport */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <Wordmark size="sm" tagline={false} />
            <p className={styles.footerTag}>a personal star chart for tonight</p>
          </div>
          <div className={styles.honestyGrid}>
            <div>
              <h3 className={styles.h3}>what's real now</h3>
              <ul>
                <li>3 curated presets (Joshua Tree, Reykjavík, Brooklyn)</li>
                <li>30 catalog stars + 15 constellations</li>
                <li>Deterministic sky projection from lat + time</li>
                <li>Stabbed hourly cloud curves per preset vibe</li>
                <li>Darg-rotate dome, timeline scrub, focus isolate</li>
              </ul>
            </div>
            <div>
              <h3 className={styles.h3}>on the backlog</h3>
              <ul>
                <li>Open-Meteo live cloud / visibility / precip</li>
                <li>Astronomy Engine for accurate planet & moon positions</li>
                <li>Browser geolocation + reverse geocode</li>
                <li>Light-pollution dataset</li>
                <li>Expanded star / DSO catalogs</li>
              </ul>
            </div>
          </div>
          <p className={styles.stamp}>
            v1 · sample sky · stub weather · no accounts · made under the stars
          </p>
        </div>
      </footer>

      {/* Location modal */}
      <LocationFlow
        open={locationOpen}
        onClose={() => setLocationOpen(false)}
        onSelectSite={setSite}
        currentSite={site}
      />

      {showSample && !routeOpen && (
        <button className={styles.routeHint} onClick={() => setRouteOpen(true)}>
          see tonight's route
        </button>
      )}
    </main>
  );
}