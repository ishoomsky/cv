# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server at http://localhost:4200 (auto-reloads)
npm run build      # production build → dist/
npm run watch      # development build in watch mode
npm test           # unit tests via Karma/Jasmine (watch mode, headless Chrome)
ng generate component <name>  # scaffold a new standalone component
```

There is no lint script and no e2e setup. `npm test` runs every `*.spec.ts`; use
`ng test --include='**/planet.component.spec.ts'` to run a single spec file.

## Big picture

Angular 18 standalone-component app (no NgModules) — a single-page, space-themed
CV. The visible page is a stack of full-screen layers rendered behind a
glassmorphism HUD. It deploys to GitHub Pages under a sub-path (`/cv/`), which is
why several details below care about `<base href>`.

### Layer stack (bottom → top, all rendered together in `app.component.html`)

| Component | Canvas / element | Role |
|---|---|---|
| `NebulaComponent` | `nebulaCanvas` | Static blurred nebula blobs, drawn once (redrawn on resize) |
| `StarFieldComponent` | `starCanvas` | Animated multi-layer parallax star field via `requestAnimationFrame` |
| `AsteroidsComponent` | `asteroidCanvas` | Floating tech-logo tiles (TS/Angular/Node/Anthropic) drifting + wrapping across screen |
| `PlanetComponent` | `planetCanvas` | **three.js** WebGL Earth — real day/night/specular/normal/cloud textures + custom shaders |
| `ContentContainerComponent` | DOM (glass HUD) | The CV UI: nav, stack ticker, and the slide-in "dossier" popup |

All **canvas** components (nebula, star-field, asteroids) share one pattern:
implement `AfterViewInit` + grab the canvas via `document.getElementById` (not
`@ViewChild`), and implement `@HostListener('window:resize')` that resizes the
canvas and re-initialises state. Devicepixel ratio is clamped to `≤ 2`.

### Content is data-driven

All CV text (profile, contacts, skills, experience, projects, education,
languages, nav, stack ticker) lives in **`src/app/data/cv-data.json`** — the
single source of truth, imported directly into `ContentContainerComponent` and
typed there via the `CvData` interface. Edit the JSON to change page content; do
not hard-code copy in templates. The résumé PDF and tech-logo SVGs live under
`public/` and are referenced by relative path.

### Routing drives the popup, not navigation

`app.routes.ts` defines **componentless** routes — they exist only to reflect UI
state in the URL. `ContentContainerComponent` subscribes to `NavigationEnd` and
opens the dossier popup when the path is `/resume`, closes it otherwise
(`openCv()`/`closeCv()` just `router.navigate`). `/cv` in older commit messages
is the deploy sub-path, not this route — the route that opens the dossier is
`/resume`.

### Planet (three.js) specifics

`PlanetComponent` builds an Earth in `buildEarth()`: a `SphereGeometry` with a
custom `ShaderMaterial` that blends a daytime map with a night-lights map based
on the sun direction, plus a separate cloud sphere and an additive-blended
back-side atmosphere shell. Notes when editing:
- Textures load through a `THREE.LoadingManager` that drives the intro loader
  (`#app-loader`, `#ldr-fill`, `#ldr-pct` in `index.html`) from real download
  progress. A 9 s `setTimeout` safety-net hides the loader even if assets fail —
  keep that fallback intact so a slow/failed asset can never trap the user.
- Texture paths are **relative** (`textures/planet/…`) on purpose so they resolve
  against `<base href>` on both dev (`/`) and Pages (`/cv/`). Don't make them
  absolute.
- The globe is offset to the lower-right and tilted 23.5°; it's rotated so
  Israel's longitude (~35°E) faces the camera (see `ANCHOR_LON`).

### Mobile / resize care

Recent work targeted mobile scroll/resize jank (planet crop, star-field redraw)
and keeping the CV popup inside the iOS safe area. When touching layout or resize
handlers, re-check behaviour on mobile viewports and across orientation changes.