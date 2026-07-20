"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { SkySnapshot } from "@/lib/astronomy/types";
import type { VisibilityState } from "@/lib/weather/types";
import {
  buildPrimitives,
  hitTestConstellation,
  inDome,
  type RenderPrimitives,
} from "./sky-renderer";
import styles from "./SkyDome.module.css";

export interface SkyDomeProps {
  snapshot: SkySnapshot | null;
  visibility: VisibilityState | null;
  /** Rotation around zenith (rad). Pointer-drag updates this from the parent. */
  rotation: number;
  onChangeRotation?: (rad: number) => void;
  focusedConstellationId: string | null;
  onFocusConstellation?: (id: string | null) => void;
  /** Layers visibility toggles from parent. */
  layers: { clouds: boolean; moon: boolean; lines: boolean; labels: boolean; planets: boolean };
  /** Whether scrub animation is happening — disables expensive interactions */
  scrubbing?: boolean;
}

const VIEWBOX = 2.2; // -1.1..1.1 → comfortable padding around the dome disc.

export default function SkyDome({
  snapshot,
  visibility,
  rotation,
  onChangeRotation,
  focusedConstellationId,
  onFocusConstellation,
  layers,
  scrubbing = false,
}: SkyDomeProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [pointerActive, setPointerActive] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [domeSize, setDomeSize] = useState(600);
  const lastAngle = useRef<number | null>(null);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Observe container size for sizing star radii in dome units.
  const containerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const s = Math.min(e.contentRect.width, e.contentRect.height);
        setDomeSize(s || 600);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const primitives: RenderPrimitives | null = useMemo(() => {
    if (!snapshot || !visibility) return null;
    return buildPrimitives(snapshot, visibility, rotation, domeSize);
  }, [snapshot, visibility, rotation, domeSize]);

  // Compute the dome-space coords of a pointer event for hit-testing.
  const pointerToDome = useCallback((e: PointerEvent | React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = Math.min(rect.width, rect.height) / 2 / VIEWBOX;
    const dx = (e.clientX - cx) / r;
    const dy = (e.clientY - cy) / r;
    return { x: dx, y: -dy }; // screen y inverted vs dome y.
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setPointerActive(true);
    lastAngle.current = Math.atan2(e.clientY, e.clientX);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerActive && onChangeRotation) {
        const svg = svgRef.current;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
          const prev = lastAngle.current ?? ang;
          let d = ang - prev;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          onChangeRotation(rotation + d);
          lastAngle.current = ang;
        }
      } else if (!scrubbing) {
        const p = pointerToDome(e);
        if (!p) return;
        if (!primitives || !inDome(p.x, p.y)) {
          setHoverId(null);
          return;
        }
        const id = hitTestConstellation(primitives, p.x, p.y, 0.09);
        setHoverId(id);
      }
    },
    [pointerActive, rotation, onChangeRotation, primitives, scrubbing, pointerToDome]
  );

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    setPointerActive(false);
    lastAngle.current = null;
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (!onFocusConstellation) return;
      const fake = {
        clientX: e.clientX,
        clientY: e.clientY,
      } as unknown as PointerEvent;
      const p = pointerToDome(fake);
      if (!p || !primitives) {
        onFocusConstellation(null);
        return;
      }
      const id = inDome(p.x, p.y)
        ? hitTestConstellation(primitives, p.x, p.y, 0.09)
        : null;
      onFocusConstellation(id ?? null);
    },
    [onFocusConstellation, primitives, pointerToDome]
  );

  const reduced = prefersReducedMotion.current;

  return (
    <div className={styles.domeWrap} ref={containerRef}>
      <svg
        ref={svgRef}
        viewBox={`-${VIEWBOX / 2} -${VIEWBOX / 2} ${VIEWBOX} ${VIEWBOX}`}
        preserveAspectRatio="xMidYMid slice"
        className={`${styles.svg} ${pointerActive ? styles.dragging : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
        role="img"
        aria-label="Interactive night sky dome. Drag to rotate, click to focus a constellation."
      >
        <defs>
          <radialGradient id="sky-grad" cx="50%" cy="50%" r="50%">
            {primitives && (
              <>
                <stop offset="0%" stopColor={primitives.sky.zenith} />
                <stop offset="70%" stopColor={primitives ? primitives.sky.horizon : "#16243f"} />
                <stop offset="100%" stopColor="#050811" />
              </>
            )}
          </radialGradient>
          <radialGradient id="cloud-veil" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(220,225,235,0.0)" />
            <stop offset="55%" stopColor="rgba(220,225,235,0.06)" />
            <stop offset="100%" stopColor="rgba(200,210,230,0.18)" />
          </radialGradient>
          <radialGradient id="haze-layer" cx="50%" cy="90%" r="80%">
            <stop offset="0%" stopColor="rgba(120,140,180,0.45)" />
            <stop offset="60%" stopColor="rgba(60,80,120,0.18)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffdf0" />
            <stop offset="45%" stopColor="#f2ecd2" />
            <stop offset="100%" stopColor="rgba(242,236,210,0)" />
          </radialGradient>
          <clipPath id="dome-clip">
            <circle cx="0" cy="0" r={1} />
          </clipPath>
          <filter id="soft-blur"><feGaussianBlur stdDeviation="0.012" /></filter>
        </defs>

        {/* Sky background */}
        <circle cx="0" cy="0" r="1.1" fill="url(#sky-grad)" />

        <g clipPath="url(#dome-clip)">
          {/* Stars */}
          {primitives &&
            primitives.stars.map((s) => {
              if (!s.aboveHorizon && !reduced) return null;
              const dim =
                focusedConstellationId &&
                s.star.constellationId !== focusedConstellationId
                  ? styles.dimmed
                  : "";
              return (
                <circle
                  key={s.star.id}
                  cx={s.x}
                  cy={s.y}
                  r={s.r}
                  fill={s.fill}
                  className={`${styles.star} ${dim} ${styles.starTwinkle}`}
                  data-constellation={s.star.constellationId ?? ""}
                />
              );
            })}

          {/* Constellation lines */}
          {primitives && layers.lines &&
            primitives.constellations.map((c) => {
              const isFocused = focusedConstellationId === c.id;
              const isDim = focusedConstellationId && focusedConstellationId !== c.id;
              return (
                <g
                  key={c.id}
                  className={`${styles.constellationG} ${
                    isFocused ? styles.constellationFocused : isDim ? styles.constellationDim : ""
                  } ${reduced ? "" : styles.lineMorph}`}
                >
                  {c.lines.map((l, i) =>
                    l.visible ? (
                      <line
                        key={i}
                        x1={l.x1}
                        y1={l.y1}
                        x2={l.x2}
                        y2={l.y2}
                        className={styles.constellationLine}
                      />
                    ) : null
                  )}
                </g>
              );
            })}

          {/* Planets */}
          {primitives && layers.planets &&
            primitives.planets.map((p) =>
              p.aboveHorizon ? (
                <g key={p.id}>
                  <circle cx={p.x} cy={p.y} r="0.012" fill={p.fill} />
                  {layers.labels && (
                    <text
                      x={p.x}
                      y={p.y - 0.02}
                      className={styles.planetLabel}
                      textAnchor="middle"
                    >
                      {p.name}
                    </text>
                  )}
                </g>
              ) : null
            )}

          {/* Moon */}
          {primitives && layers.moon && primitives.moon.aboveHorizon && (
            <g className={reduced ? "" : styles.moonFloat}>
              <circle cx={primitives.moon.x} cy={primitives.moon.y} r={primitives.moon.radius * 2.6} fill="url(#moon-glow)" opacity={0.45} />
              <circle cx={primitives.moon.x} cy={primitives.moon.y} r={primitives.moon.radius} fill="#fffdf0" />
              {primitives.moon.illumination < 0.98 && (
                <circle
                  cx={primitives.moon.x + primitives.moon.radius * (1 - primitives.moon.illumination) * 0.6}
                  cy={primitives.moon.y}
                  r={primitives.moon.radius * 1.04}
                  fill="var(--sky-deep)"
                  opacity={0.85}
                />
              )}
            </g>
          )}

          {/* Haze — warms/browns the horizon */}
          {primitives && visibility && visibility.haze > 0.02 && (
            <rect
              x="-1.2"
              y="-1.2"
              width="2.4"
              height="2.4"
              fill="url(#haze-layer)"
              opacity={visibility.haze}
              pointerEvents="none"
            />
          )}

          {/* Hover highlight */}
          {primitives && hoverId && !scrubbing && (
            <HoverHighlight pr={primitives} id={hoverId} />
          )}

          {/* Focused constellation label cluster */}
          {primitives && focusedConstellationId && (
            <FocusCluster pr={primitives} id={focusedConstellationId} showLongName={layers.labels} />
          )}
        </g>

        {/* Horizon ring */}
        <circle cx="0" cy="0" r="1" className={styles.horizonRing} />

        {/* Cardinal markers */}
        <Cardinals />

        {/* Cloud veil (outside dome-clip so it can wash the disc edges) */}
        {primitives && layers.clouds && visibility && visibility.cloudOpacity > 0.02 && (
          <circle
            cx="0"
            cy="0"
            r="1.05"
            fill="url(#cloud-veil)"
            opacity={visibility.cloudOpacity}
            className={reduced ? "" : styles.cloudShift}
            pointerEvents="none"
          />
        )}
      </svg>

      {/* Helm guide */}
      <div className={styles.hint} aria-hidden="true">
        drag to rotate · tap to focus
      </div>
    </div>
  );
}

function HoverHighlight({ pr, id }: { pr: RenderPrimitives; id: string }) {
  const c = pr.constellations.find((x) => x.id === id);
  if (!c) return null;
  return (
    <g pointerEvents="none" className={styles.hoverG}>
      {c.lines.map((l, i) =>
        l.visible ? (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="var(--accent-strong)" strokeWidth={0.006} opacity={0.9} />
        ) : null
      )}
      <circle cx={c.centroid.x} cy={c.centroid.y} r={0.04} fill="none" stroke="var(--accent-strong)" strokeWidth={0.003} opacity={0.6} />
    </g>
  );
}

function FocusCluster({
  pr,
  id,
  showLongName,
}: {
  pr: RenderPrimitives;
  id: string;
  showLongName: boolean;
}) {
  const c = pr.constellations.find((x) => x.id === id);
  if (!c) return null;
  return (
    <g pointerEvents="none">
      <text x={c.centroid.x} y={c.centroid.y - 0.05} className={styles.constellationLabel} textAnchor="middle">
        {showLongName && c.longName ? c.longName : c.name}
      </text>
    </g>
  );
}

function Cardinals() {
  const firms = [
    { l: "N", x: 0, y: 1.06 },
    { l: "E", x: 1.06, y: 0 },
    { l: "S", x: 0, y: -1.06 },
    { l: "W", x: -1.06, y: 0 },
  ];
  return (
    <g className={styles.cardinals}>
      {firms.map((f) => (
        <text key={f.l} x={f.x} y={f.y} textAnchor="middle" dominantBaseline="middle">
          {f.l}
        </text>
      ))}
    </g>
  );
}