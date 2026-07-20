import type { AstronomyProvider } from "@/lib/astronomy/AstronomyProvider";
import type { WeatherProvider } from "@/lib/weather/WeatherProvider";
import type { LocationProvider } from "@/lib/location/LocationProvider";
import { stubAstronomyProvider } from "@/lib/astronomy/stubAstronomyProvider";
import { stubWeatherProvider } from "@/lib/weather/stubWeatherProvider";
import { stubLocationProvider } from "@/lib/location/stubLocationProvider";

/**
 * Provider registry. UI imports FROM this module — never a specific SDK.
 * Swap stubs for real providers **here only**.
 *
 * Stub → real swap points (Whorl demo seed spawns tasks against these):
 *   • astronomy : stubAstronomyProvider → https://github.com/cosinekitty/astronomy (astronomy-engine)
 *   • weather   : stubWeatherProvider   → Open-Meteo hourly cloud/visibility/precip
 *   • location  : stubLocationProvider  → browser geolocation + reverse geocode (search/presets already stubbed)
 *   • (optional) light-pollution layer behind the same VisibilityState contract
 */
export const providers: {
  astronomy: AstronomyProvider;
  weather: WeatherProvider;
  location: LocationProvider;
} = {
  // SWAP:[stub:astronomy] stubAstronomyProvider → astronomy-engine
  astronomy: stubAstronomyProvider,
  // SWAP:[stub:weather] stubWeatherProvider → Open-Meteo
  weather: stubWeatherProvider,
  // SWAP:[stub:location] stubLocationProvider → browser geolocation + reverse geocode
  location: stubLocationProvider,
};