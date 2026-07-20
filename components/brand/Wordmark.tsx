import styles from "./Wordmark.module.css";

interface WordmarkProps {
  /** "lg" hero size, "sm" footer. */
  size?: "lg" | "sm";
  tagline?: boolean;
}

/** NIGHTGLASS wordmark — display serif with optical kerning via tspan. */
export default function Wordmark({ size = "lg", tagline = true }: WordmarkProps) {
  return (
    <div className={`${styles.wrap} ${size === "lg" ? styles.lg : styles.sm}`}>
      <span className={styles.mark} aria-label="Nightglass">
        <span className={styles.n}>NIGHT</span>
        <span className={styles.g}>GLASS</span>
      </span>
      {tagline && <span className={styles.tagline}>tonight's sky · in your hands</span>}
    </div>
  );
}