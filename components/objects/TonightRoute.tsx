"use client";

import type { ObservingSite } from "@/lib/location/types";
import styles from "./TonightRoute.module.css";

interface TonightRouteProps {
  site: ObservingSite;
  /** Constellation we built the route around (or Polaris if none). */
  focusedId: string | null;
  open: boolean;
  onToggle: () => void;
}

interface Step {
  title: string;
  detail: string;
}

const ROUTES: Record<string, Step[]> = {
  default: [
    { title: "1 · Find north", detail: "Face the 'N' marker on the dome. Polaris sits just above it at your latitude." },
    { title: "2 · Trace the Big Dipper", detail: "From Polaris, scan right to the Big Dipper's bowl. Its pointer stars aim back at Polaris." },
    { title: "3 · Hop to a target", detail: "Arc from the Dipper's handle to Arcturus, then 'spike' south to Spica." },
    { title: "4 · Wait for the clear window", detail: "Scrub the timeline to the highlighted best window and step out then." },
  ],
  ori: [
    { title: "1 · Face south", detail: "Orion is brightest south of the zenith in winter — look for his three-star belt." },
    { title: "2 · Walk the belt", detail: "Mintaka → Alnilam → Alnitak runs east-to-west. Up-left of belt = Betelgeuse." },
    { title: "3 · Find Rigel", detail: "Mirror down from Betelgeuse through the belt to blue-white Rigel." },
    { title: "4 · Sword of the hunter", detail: "Just below the belt hangs the Orion Nebula (M42) — visible to the naked eye." },
  ],
};

export default function TonightRoute({ site, focusedId, open, onToggle }: TonightRouteProps) {
  const steps = ROUTES[focusedId ?? "default"] ?? ROUTES.default;
  if (!open) {
    return (
      <button className={styles.toggleBtn} onClick={onToggle} aria-expanded={false}>
        tonight route
      </button>
    );
  }
  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <h2 className={styles.title}>Tonight's route</h2>
        <button className={styles.close} onClick={onToggle} aria-label="Close" aria-expanded={true}>×</button>
      </header>
      <ol className={styles.steps}>
        {steps.map((s, i) => (
          <li key={i}>
            <span className={styles.stepTitle}>{s.title}</span>
            <span className={styles.stepDetail}>{s.detail}</span>
          </li>
        ))}
      </ol>
      <p className={styles.site}>at {site.shortName ?? site.name}</p>
    </div>
  );
}