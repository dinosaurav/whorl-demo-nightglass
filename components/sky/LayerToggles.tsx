"use client";

import styles from "./LayerToggles.module.css";

export interface SkyLayers {
  clouds: boolean;
  moon: boolean;
  lines: boolean;
  labels: boolean;
  planets: boolean;
}

interface LayerTogglesProps {
  layers: SkyLayers;
  onChange: (next: SkyLayers) => void;
}

const LABELS: Array<{ key: keyof SkyLayers; label: string }> = [
  { key: "clouds", label: "Clouds" },
  { key: "moon", label: "Moon" },
  { key: "lines", label: "Lines" },
  { key: "labels", label: "Labels" },
  { key: "planets", label: "Planets" },
];

export default function LayerToggles({ layers, onChange }: LayerTogglesProps) {
  const toggle = (key: keyof SkyLayers) => {
    onChange({ ...layers, [key]: !layers[key] });
  };
  return (
    <div className={styles.wrap} role="group" aria-label="Sky visibility layers">
      {LABELS.map((l) => (
        <button
          key={l.key}
          className={`${styles.toggle} ${layers[l.key] ? styles.on : ""}`}
          onClick={() => toggle(l.key)}
          aria-pressed={layers[l.key]}
        >
          <span className={styles.dot} />
          {l.label}
        </button>
      ))}
    </div>
  );
}