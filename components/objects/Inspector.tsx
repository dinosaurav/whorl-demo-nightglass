"use client";

import type { SkySnapshot } from "@/lib/astronomy/types";
import type { ObservingSite } from "@/lib/location/types";
import { providers } from "@/lib/providers";
import styles from "./Inspector.module.css";

interface InspectorProps {
  site: ObservingSite;
  snapshot: SkySnapshot;
  focusedId: string | null;
  onClose: () => void;
  utcMs: number;
}

export default function Inspector({ site, snapshot, focusedId, onClose, utcMs }: InspectorProps) {
  if (!focusedId) return null;
  const pc = snapshot.constellations.find((c) => c.constellation.id === focusedId);
  if (!pc) return null;
  const c = pc.constellation;
  const hint = providers.astronomy.facingHint(site, c.id, utcMs);
  const majorStars = pc.points
    .map((p) => snapshot.stars.find((s) => s.star.id === p.starId))
    .filter(Boolean)
    .sort((a, b) => (a!.star.magnitude - b!.star.magnitude))
    .slice(0, 4);

  return (
    <div className={styles.panel} role="region" aria-label={`${c.name} inspector`}>
      <header className={styles.head}>
        <div>
          <span className={styles.abbr}>{c.abbreviation}</span>
          <h2 className={styles.name}>{c.name}</h2>
          {c.longName && <p className={styles.longName}>{c.longName}</p>}
        </div>
        <button className={styles.close} onClick={onClose} aria-label="Close inspector">×</button>
      </header>

      <div className={styles.facing}>
        <span className={styles.facingIcon} aria-hidden>●</span>
        <span className={styles.facingText}>{hint.label}</span>
      </div>

      {c.blurb && <p className={styles.blurb}>{c.blurb}</p>}

      {majorStars.length > 0 && (
        <ul className={styles.stars}>
          {majorStars.map((s) => (
            <li key={s!.star.id}>
              <span className={styles.starName}>{s!.star.name ?? s!.star.bayer ?? s!.star.id}</span>
              <span className={styles.starMag}>mag {s!.star.magnitude.toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}