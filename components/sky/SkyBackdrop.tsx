import styles from "./SkyBackdrop.module.css";

/**
 * Static, decorative starfield rendered on the server while the interactive
 * SkyDome hydrates client-side. Positions come from a seeded PRNG evaluated at
 * module scope, so server and client markup always agree — no hydration drift.
 */

function mulberry(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const STARS = (() => {
  const rng = mulberry(1337);
  return Array.from({ length: 72 }, () => ({
    x: rng() * 100,
    y: rng() * 100,
    r: 1 + rng() * 1.8,
    d: rng() * 6,
    o: 0.3 + rng() * 0.65,
  }));
})();

export default function SkyBackdrop() {
  return (
    <div className={styles.backdrop} aria-hidden="true">
      {STARS.map((s, i) => (
        <span
          key={i}
          className={styles.star}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.r,
            height: s.r,
            opacity: s.o,
            animationDelay: `${s.d}s`,
          }}
        />
      ))}
    </div>
  );
}