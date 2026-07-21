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
  const lastAngle = useRef<number | null>(null);
  const downPos = useRef<{ x: number; y: number } | null>(null);
  const dragMoved = useRef(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const primitives: RenderPrimitives | null = useMemo(() => {
    if (!snapshot || !visibility) return null;
    return buildPrimitives(snapshot, visibility, rotation);
  }, [snapshot, visibility, rotation]);

  // Compute the dome-space coords of a pointer event for hit-testing.
  const pointerToDome = useCallback((e: PointerEvent | React.PointerEvent): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    // px per viewBox unit under preserveAspectRatio="meet": the 2.2-unit
    // viewBox is scaled to the smaller viewport dimension.
    const r = Math.min(rect.width, rect.height) / VIEWBOX;
    const dx = (e.clientX - cx) / r;
    const dy = (e.clientY - cy) / r;
    // Primitives are stored in screen space (y-down) — see buildPrimitives.
    return { x: dx, y: dy };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    setPointerActive(true);
    // Baseline the angle relative to the dome center — using raw clientX/Y
    // (screen origin) made the first drag delta huge, lurching the sky.
    const svg = svgRef.current;
    if (svg) {
      const rect = svg.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      lastAngle.current = Math.atan2(e.clientY - cy, e.clientX - cx);
    } else {
      lastAngle.current = null;
    }
    downPos.current = { x: e.clientX, y: e.clientY };
    dragMoved.current = false;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerActive && onChangeRotation) {
        // Track movement so we can tell a drag from a tap — the synthetic
        // click after a drag should NOT focus a constellation.
        if (downPos.current) {
          const dpx = Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y);
          if (dpx > 5) dragMoved.current = true;
        }
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
          // Negate so the sky is dragged-along with the pointer (like grabbing a
// physical wheel) rather than counter-rotating against it.
onChangeRotation(rotation - d);
          lastAngle.current = ang;
        }
      } else if (!scrubbing) {
        const p = pointerToDome(e);
        if (!p) return;
        if (!primitives || !inDome(p.x, p.y)) {
          setHoverId(null);
          return;
        }
        const id = hitTestConstellation(primitives, p.x, p.y);
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
      // Suppress focus when the pointer just finished a drag — otherwise
      // releasing a drag would snap the inspector open at the release point.
      if (dragMoved.current) return;
      const fake = {
        clientX: e.clientX,
        clientY: e.clientY,
      } as unknown as PointerEvent;
      const p = pointerToDome(fake);
      if (!p || !primitives) {
        onFocusConstellation(null);
        return;
      }
      // Click on empty space (no constellation within tolerance) just clears
      // focus — it never lurches to a random constellation.
      const id = inDome(p.x, p.y) ? hitTestConstellation(primitives, p.x, p.y) : null;
      onFocusConstellation(id);
    },
    [onFocusConstellation, primitives, pointerToDome]
  );

  const reduced = prefersReducedMotion.current;

  return (
    <div className={styles.domeWrap} ref={containerRef}>
      <svg
        ref={svgRef}
        viewBox={`-${VIEWBOX / 2} -${VIEWBOX / 2} ${VIEWBOX} ${VIEWBOX}`}
        preserveAspectRatio="xMidYMid meet"
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
                {/* Deep zenith at center → luminous horizon at the rim */}
                <stop offset="0%" stopColor={primitives.sky.zenith} />
                <stop offset="55%" stopColor={primitives.sky.mid} />
                <stop offset="88%" stopColor={primitives.sky.horizon} />
                <stop offset="100%" stopColor={primitives.sky.horizon} />
              </>
            )}
          </radialGradient>
          <radialGradient id="cloud-veil" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(214,222,236,0.10)" />
            <stop offset="55%" stopColor="rgba(210,218,232,0.30)" />
            <stop offset="100%" stopColor="rgba(190,200,224,0.62)" />
          </radialGradient>
          <radialGradient id="haze-layer" cx="50%" cy="90%" r="80%">
            <stop offset="0%" stopColor="rgba(126,148,190,0.55)" />
            <stop offset="60%" stopColor="rgba(70,90,132,0.26)" />
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
          {/* Stars + constellations dim as cloud cover thickens */}
          <g
            style={{
              opacity:
                layers.clouds && visibility
                  ? 1 - visibility.cloudOpacity * 0.55
                  : 1,
              transition: reduced ? undefined : "opacity 480ms var(--ease-out)",
            }}
          >
          {/* Stars */}
          {primitives &&
            primitives.stars.map((s) => {
              if (!s.aboveHorizon && !reduced) return null;
              const dim =
                focusedConstellationId &&
                s.star.constellationId !== focusedConstellationId
                  ? styles.dimmed
                  : "";
              const halo = s.star.magnitude < 0.6;
              return (
                <g key={s.star.id} className={dim}>
                  {halo && (
                    <circle
                      cx={s.x}
                      cy={s.y}
                      r={s.r * 2.6}
                      fill={s.fill}
                      opacity={0.22}
                      className={reduced ? "" : styles.starTwinkle}
                    />
                  )}
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={s.r}
                    fill={s.fill}
                    className={`${styles.star} ${reduced ? "" : styles.starTwinkle}`}
                    data-constellation={s.star.constellationId ?? ""}
                  />
                </g>
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
          </g>
          {/* end cloud-dimmed stars+lines group */}

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

        {/* Cardinal markers — rotate with the sky so the rose tracks the star field
            (drag = spin the whole dome, horizon directions included). */}
        <g
          transform={`rotate(${(-rotation * 180 / Math.PI).toFixed(3)})`}
          style={{ transition: reduced ? undefined : "transform 60ms linear" }}
        >
          <Cardinals />
        </g>

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
  // Screen space: y-down. North at top.
  const firms = [
    { l: "N", x: 0, y: -1.06 },
    { l: "E", x: 1.06, y: 0 },
    { l: "S", x: 0, y: 1.06 },
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