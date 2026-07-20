import type { AstronomyProvider } from "@/lib/astronomy/AstronomyProvider";
import type { WeatherProvider } from "@/lib/weather/WeatherProvider";
import type { LocationProvider } from "@/lib/location/LocationProvider";
import { stubAstronomyProvider } from "@/lib/astronomy/stubAstronomyProvider";
import { stubWeatherProvider } from "@/lib/weather/stubWeatherProvider";
import { stubLocationProvider } from "@/lib/location/stubLocationProvider";

/**
 * Provider registry. UI imports FROM this module — never a specific SDK.
 * Swap stubs for real providers here only.
 */
export const providers: {
  astronomy: AstronomyProvider;
  weather: WeatherProvider;
  location: LocationProvider;
} = {
  astronomy: stubAstronomyProvider,
  weather: stubWeatherProvider,
  location: stubLocationProvider,
};