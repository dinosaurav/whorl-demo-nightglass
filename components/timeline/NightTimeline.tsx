"use client";

import { useCallback, useRef, useState } from "react";
import styles from "./NightTimeline.module.css";
import type { BestWindow } from "@/hooks/bestWindow";

interface NightTimelineProps {
  fraction: number;
  onChangeFraction: (f: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
  markers: Array<{ utc: number; nightFraction: number; label: string }>;
  cloudCurve: Array<{ t: number; cloud: number }> | null;
  bestWindow: BestWindow | null;
  isNow: boolean;
  onJumpToNow: () => void;
  /** When reduced motion is preferred, disable shimmer animations. */
  reducedMotion?: boolean;
}

export default function NightTimeline({
  fraction,
  onChangeFraction,
  onScrubStart,
  onScrubEnd,
  markers,
  cloudCurve,
  bestWindow,
  isNow,
  onJumpToNow,
  reducedMotion = false,
}: NightTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const setFracFromEvent = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const f = (clientX - r.left) / r.width;
      const clamped = Math.max(0, Math.min(1, f));
      onChangeFraction(clamped);
      return clamped;
    },
    [onChangeFraction]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    onScrubStart?.();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setFracFromEvent(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setFracFromEvent(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    onScrubEnd?.();
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  // Build a sparkline of cloud cover across the night (0..1 left to right).
  const sparkPath = (() => {
    if (!cloudCurve || cloudCurve.length < 2) return null;
    const w = 1000;
    const h = 28;
    let d = "";
    cloudCurve.forEach((p, i) => {
      const x = (i / (cloudCurve.length - 1)) * w;
      const y = h - Math.max(0, Math.min(1, p.cloud)) * h;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    return d.trim();
  })();

  return (
    <div className={`${styles.wrap} ${reducedMotion ? styles.reduced : ""}`}>
      <div className={styles.head}>
        <span className={styles.label}>tonight · sunset → sunrise</span>
        <div className={styles.headRight}>
          <span className={styles.hint}>drag sky · tap to focus</span>
          <button className={styles.nowBtn} onClick={onJumpToNow} disabled={isNow}>
            {isNow ? "now" : "jump to now"}
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className={`${styles.track} ${dragging ? styles.dragging : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={1}
        aria-valuenow={Math.round(fraction * 100)}
        aria-label="Tonight timeline scrub"
      >
        {/* Cloud cover sparkline */}
        {sparkPath && (
          <svg className={styles.spark} viewBox="0 0 1000 28" preserveAspectRatio="none">
            <path d={sparkPath} fill="none" stroke="var(--ink-line)" strokeWidth={1.4} />
          </svg>
        )}

        {/* Best window highlight */}
        {bestWindow && (
          <div
            className={styles.bestWindow}
            style={{
              left: `${bestWindow.startFraction * 100}%`,
              width: `${(bestWindow.endFraction - bestWindow.startFraction) * 100}%`,
            }}
            aria-label={`Best viewing window, clarity ${Math.round(bestWindow.clarity * 100)}%`}
          >
            <span className={styles.bestLabel}>best window</span>
          </div>
        )}

        {/* Markers */}
        <div className={styles.markers}>
          {markers.map((m, i) => (
            <span
              key={i}
              className={styles.marker}
              style={{ left: `${m.nightFraction * 100}%` }}
            >
              <span className={styles.tick} />
              <span className={styles.markerLabel}>{m.label}</span>
            </span>
          ))}
        </div>

        {/* Thumb */}
        <div
          className={`${styles.thumb} ${dragging ? styles.thumbActive : ""}`}
          style={{ left: `${fraction * 100}%` }}
        >
          <span className={styles.thumbDot} />
        </div>

        {/* Progress fill */}
        <div className={styles.progress} style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  );
}