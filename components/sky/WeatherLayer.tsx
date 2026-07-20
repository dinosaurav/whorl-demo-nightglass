"use client";

import type { VisibilityState } from "@/lib/weather/types";
import styles from "./WeatherLayer.module.css";

interface WeatherLayerProps {
  visibility: VisibilityState | null;
  /** Hidden by user toggle. */
  showClouds: boolean;
  showMoonWash: boolean;
}

/**
 * Weather that *expresses itself* by changing the sky — not a number tile.
 * A thin horizon haze ribbon + a moonwash gradient across the dome.
 * The thick cloud veil lives inside SkyDome; this adds directional cues.
 */
export default function WeatherLayer({
  visibility,
  showClouds,
  showMoonWash,
}: WeatherLayerProps) {
  if (!visibility) return null;
  return (
    <div className={styles.overlay} aria-hidden="true">
      {showClouds && visibility.haze > 0.04 && (
        <div
          className={styles.haze}
          style={{ opacity: visibility.haze * 0.7 }}
        />
      )}
      {showMoonWash && visibility.moonWash > 0.05 && (
        <div
          className={styles.moonWash}
          style={{ opacity: visibility.moonWash * 0.55 }}
        />
      )}
    </div>
  );
}