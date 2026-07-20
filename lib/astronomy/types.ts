/**
 * Astronomy data contracts — frozen for v1.
 * Do not import API SDKs here. UI/providers depend on these shapes only.
 */

export type Radians = number;
export type Degrees = number;

/** Equatorial coordinates (J2000-ish, stub epoch). */
export interface EquatorialCoords {
  /** Right ascension in radians. */
  ra: Radians;
  /** Declination in radians. */
  dec: Radians;
}

/** Horizontal/local coordinates as seen by an observer. */
export interface HorizonCoords {
  /** Azimuth from north, clockwise, radians. */
  az: Radians;
  /** Altitude above horizon, radians. */
  alt: Radians;
}

/** A single catalog star (curated, not exhaustive). */
export interface Star {
  id: string;
  /** Common name or null. */
  name?: string | null;
  /** Bayer designator e.g. "alpha" or display string "α UMa". */
  bayer?: string | null;
  /** Hipparcos / catalog id fallback. */
  catalogId?: string;
  equatorial: EquatorialCoords;
  /** Apparent visual magnitude (smaller = brighter). */
  magnitude: number;
  /** B-V color index for tinting. */
  colorIndex?: number;
  /** Constellation id this star belongs to (line group). */
  constellationId?: string | null;
}

export interface ConstellationLine {
  /** Indices into the constellation's `stars` array OR star ids. We use star ids for stability. */
  fromStarId: string;
  toStarId: string;
}

export interface Constellation {
  id: string;
  /** IAU three-letter abbreviation e.g. "UMa". */
  abbreviation: string;
  name: string;
  /** Long-form name for labels, e.g. "The Great Bear". */
  longName?: string | null;
  /** Stars making up the figure, referenced by id. */
  starIds: string[];
  lines: ConstellationLine[];
  /** Best facing azimuth (radians) for observing — informational. */
  facingAz?: Radians | null;
  /** Short lore / finder hint shown in inspector. */
  blurb?: string | null;
}

export type SkyObjectKind = "star" | "constellation" | "moon" | "planet" | "deepsky";

/** Anything renderable & selectable on the dome. */
export interface SkyObject {
  id: string;
  kind: SkyObjectKind;
  label: string;
  /** Projected screen position in -1..1 normalized dome coords (x right, y up). */
  xy?: { x: number; y: number };
  /** Whether the object is above the horizon at the current instant. */
  aboveHorizon: boolean;
  magnitude?: number;
  /** Reference back to source record when relevant. */
  constellationId?: string | null;
  starId?: string | null;
}

/** A single projected point on the dome for a star. */
export interface ProjectedStar {
  star: Star;
  xy: { x: number; y: number };
  altitude: Radians;
  aboveHorizon: boolean;
}

export interface ProjectedConstellation {
  constellation: Constellation;
  /** Same projection space as ProjectedStar.xy. */
  points: Array<{ starId: string; xy: { x: number; y: number } }>;
  /** Mean screen position for label anchor. */
  centroid: { x: number; y: number };
  /** Average altitude of member stars. */
  meanAltitude: Radians;
  visible: boolean;
}

export interface MoonRenderState {
  /** Phase 0..1 (0 = new, 0.5 = full, 1 = new again). */
  phase: number;
  /** Fraction illuminated 0..1. */
  illumination: number;
  xy: { x: number; y: number };
  altitude: Radians;
  aboveHorizon: boolean;
}

export interface PlanetRenderState {
  id: string;
  name: string;
  magnitude: number;
  xy: { x: number; y: number };
  altitude: Radians;
  aboveHorizon: boolean;
}

/** The full projected sky at a site + instant. Returned by AstronomyProvider. */
export interface SkySnapshot {
  site: ObservingSite;
  /** UTC ms. */
  time: number;
  stars: ProjectedStar[];
  constellations: ProjectedConstellation[];
  moon: MoonRenderState;
  planets: PlanetRenderState[];
  /** Rotation offset applied by projection (radians, used for parallax). */
  rotation: Radians;
  /** Sun altitude — for weather/sky brightness decisions. */
  sunAltitude: Radians;
}

/** Re-exported here so astronomy types stand alone for consumers. */
import type { ObservingSite } from "../location/types";
export type { ObservingSite };

export interface NightInstant {
  /** UTC ms. */
  utc: number;
  /** Fraction of the night 0..1 where 0 = sunset, 1 = sunrise. */
  nightFraction: number;
  label: string;
}