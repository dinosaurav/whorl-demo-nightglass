# NIGHTGLASS

A personal star chart for **tonight**. Nightglass turns the sky above your
location into an explorable constellation map — what you can see and when the
clouds will clear.

> v1 ships with **sample sky + stub weather**. Real providers (Open-Meteo,
> Astronomy Engine, browser geolocation, light-pollution data) are stubbed
> behind clean interfaces and listed in the backlog below.

---

## Use this template

**Prefer “Use this template → private”** over forking — it gives you a clean
repo with no upstream history, which is the right shape for the demo.

To run locally:

```bash
# After creating your private repo from this template:
git clone https://github.com/<you>/<your-repo>.git
cd <your-repo>            # repo dir name (was whorl-demo-nightglass)
bun install
bun dev
```

Then open http://localhost:3000.

Requirements: **Node 18+** and **bun** (npm/pnpm work too — adjust the install
command). `bun install && bun dev` is the only verified happy path.

## Stack

- **Next.js** 14 (App Router) + **TypeScript** + **React 18**
- Plain **CSS modules** with design tokens (`styles/tokens.css`)
- Expressive typography via `next/font`: **Cormorant Garamond** (display) +
  **Space Grotesk** (UI). No Inter/Roboto.
- No auth. No backend in v1. All providers are stubs behind interfaces.

## What works in v1

- Full-bleed interactive **sky dome** — drag to rotate, hover/tap to identify
- **Tonight timeline** scrub (sunset → sunrise). Sky + cloud cover update
  continuously. A highlighted **best window** shows the clearest darkest span.
- **Set location** flow: search / geolocation / 3 presets
  (Joshua Tree, Reykjavík, Brooklyn — each with a different cloud/moon vibe)
- **Focus a constellation** → isolate its lines, label major stars, see a
  facing hint ("Look NNE · 35° above horizon")
- **Visibility layers** painted onto the sky itself (clouds, moon, lines,
  labels, planets) — no number tiles in the hero
- **Tonight route**: 3–5 guided steps (Find north → Big Dipper → Polaris …)
- **Footer honesty** — what's real now vs. what's on the backlog
- Respects `prefers-reduced-motion`; works on mobile (touch rotate + scrub)

## File boundaries

Each subtree has one owner — keep edits within your lane.

| Lane | Own |
|------|-----|
| Shell | `app/page.tsx`, `app/layout.tsx`, `app/page.module.css` |
| Sky | `components/sky/*` |
| Astronomy | `lib/astronomy/*`, `data/*.json` |
| Timeline | `components/timeline/*`, `hooks/useNightTime.ts`, `hooks/bestWindow.ts` |
| Location | `components/location/*`, `lib/location/*` |
| Weather | `lib/weather/*` |
| Objects | `components/objects/*` |
| Brand | `styles/tokens.css`, `app/globals.css`, `components/brand/*` |

### Integration rules

- **Shared types land first.** Each lane depends on `lib/*/types.ts` only —
  no cross-lane edits of owned files.
- The **shell owns composition**, not logic — it pulls components together.
- **UI must keep going through `lib/providers.ts` only** — never import a
  specific API SDK or a concrete `stub*Provider` directly. Do not collapse
  the provider layer.
- Default UI shows constellation lines + labels + timeline. Extra layers
  are opt-in toggles.

## Data contracts (frozen)

```ts
// lib/astronomy/types.ts
Star, Constellation, SkyObject, HorizonCoords, NightInstant,
EquatorialCoords, SkySnapshot, ProjectedStar, ProjectedConstellation,
MoonRenderState, PlanetRenderState

// lib/weather/types.ts
WeatherSample { time, cloudCover, visibility, precipProb }, NightWeatherCurve, VisibilityState

// lib/location/types.ts
ObservingSite { id, name, lat, lon, timezone }, LocationPreset, LocationSearchResult
```

Provider interfaces:

```ts
AstronomyProvider.skyAt(site, time) → SkySnapshot
AstronomyProvider.nightWindow(site, utcMs) → { start, end }
AstronomyProvider.facingHint(site, constellationId, utcMs) → { azimuth, altitude, label }

WeatherProvider.curveFor(site, nightStart, nightEnd) → Promise<NightWeatherCurve>
WeatherProvider.sampleAt(curve, utcMs, moonIllumination) → VisibilityState

LocationProvider.presets() / search(query) / requestBrowserLocation() / toSite(result)
```

To swap stubs for real providers, edit `lib/providers.ts` only.

## Backlog (not blocking v1)

Each item is anchored to a `SWAP:[stub:…]` marker in code so Whorl can spawn
`[stub:…]` / real tasks against a known path.

- [ ] **Open-Meteo** hourly cloud / visibility / precip —
      `SWAP:[stub:weather]` in `lib/weather/stubWeatherProvider.ts` →
      implement `WeatherProvider`, swap in `lib/providers.ts` only.
- [ ] **Astronomy Engine** (`astronomy-engine`) for accurate positions & rise/set —
      `SWAP:[stub:astronomy]` in `lib/astronomy/stubAstronomyProvider.ts`.
- [ ] **Browser Geolocation + reverse geocode** for arbitrary sites —
      `SWAP:[stub:location]` in `lib/location/stubLocationProvider.ts`.
      (Browser geolocation already works via `requestBrowserLocation()`.)
- [ ] **Light-pollution dataset** — optional `VisibilityState.lightPollution`
      (already in the contract as an optional field). Drive a horizon-glow
      layer per site without changing other fields.
- [ ] Expanded star / DSO catalogs
- [ ] Multi-night planner (explicitly **out of scope** for v1)

## Out of scope for v1

Accounts, social, AR camera, telescope control, payment, multi-night dashboards.

## Design non-negotiables (enforced)

- First viewport = **one composition**, not a dashboard
- `NIGHTGLASS` is hero-level, not nav chrome
- Dominant visual = **full-bleed sky dome** edge-to-edge
- First viewport contains ONLY: brand, one headline, one short supporting
  line, one CTA group, and the sky. No cards, badges, chips, or forecast
  overlays on the dome.
- Weather **expresses itself by changing the sky** (cloud opacity, haze,
  moonlight wash) — not by number tiles.
- No purple-glow AI aesthetic, no cream/terracotta brochure look, no dense
  newspaper layouts.
- 2–3 intentional motions: sky parallax/rotate, timeline scrub morph,
  constellation focus isolate. Respects `prefers-reduced-motion`.

## License

Private template.