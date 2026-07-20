import type { NightWeatherCurve, VisibilityState } from "./types";
import type { ObservingSite } from "../location/types";

export interface WeatherProvider {
  curveFor(
    site: ObservingSite,
    nightStart: number,
    nightEnd: number
  ): Promise<NightWeatherCurve>;
  /** Sample a curve at an instant + blend in moon influence → VisibilityState. */
  sampleAt(
    curve: NightWeatherCurve,
    utcMs: number,
    moonIllumination: number
  ): VisibilityState;
}