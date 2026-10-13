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

Angular 18 standalone-component app (no NgModules) — a space-themed CV split into
three routed pages over a shared, always-live space background, with a
directional, atom-by-atom transition between them:
`/` (hero + About + Experience + Education), `/portfolio` (portfolio projects +
Built on my own) and `/contact`. It is served at the root of https://shumski.dev (Hetzner VPS: nginx container
behind the shared Caddy, see *Deploy*), so `<base href>` is `/`; asset paths stay relative anyway.

### Layer stack (bottom → top, in `app.component.html`)

| Component | Canvas / element | Role |
|---|---|---|
| `NebulaComponent` | `nebulaCanvas` | Blurred nebula blobs baked once (re-baked on width change); drift/breathe are CSS transform/opacity animations |
| `StarFieldComponent` | `starCanvas` | Animated multi-layer parallax star field via `requestAnimationFrame` |
| `PlanetComponent` | `planetCanvas` | **three.js** WebGL Earth — real day/night/specular/normal/cloud textures + custom shaders |
| shell | `.topbar` | Glass top bar: name + links on desktop; links only (pills) ≤820px; `routerLinkActive` |
| `<router-outlet>` | `app-page` (`src/app/pages/*`) | The current page, wrapped in `PageComponent`, composed of section components (`src/app/sections/*`) |

All **canvas** components (nebula, star-field) share one pattern:
implement `AfterViewInit` + grab the canvas via `document.getElementById` (not
`@ViewChild`), and implement `@HostListener('window:resize')` that resizes the
canvas and re-initialises state. Devicepixel ratio is clamped to `≤ 2`.

### Content is data-driven

All CV text (profile, contacts, skills, experience, projects, education,
languages, nav, stack ticker) lives in **`src/app/data/cv-data.json`** — the
single source of truth, typed and exported as `CV` from `src/app/cv.ts`. The
`nav` array drives the top bar and each page's (hidden) "Next" link. Edit the JSON to change page content; do
not hard-code copy in templates. The résumé PDF and tech-logo SVGs live under
`public/` and are referenced by relative path.

### Pages, scrolling and the warp transition

- **Routes** (`app.routes.ts`): one standalone component per page in
  `src/app/pages/`, built from attribute-selector section components
  (`<section cvAbout>`, `cvExperience`, `cvEducation`, `cvWork`, `cvProjects` in
  `src/app/sections/`; host class `section`). Section numbers in the kickers run
  01–06 across the whole site. Each route's `data.planet` is the pose the globe
  flies to (`x` = fraction of visible half-width, `y` in scene units, `scale`,
  `opacity`); on Home, `HomeComponent` additionally dims the globe as the hero
  scrolls away and lifts it over the page. Route order is reading order; the
  `nav` entry for Home has `target: ""` (links use `routerLinkActiveOptions`
  exact).
- **`PageComponent`** (`<app-page>`, `src/app/page/`) wraps every page: a fixed
  `.scroller` (the document itself never scrolls) driven by **Lenis**, plus
  **GSAP ScrollTrigger** effects with `scroller` passed explicitly. Effects are
  declarative in page templates: `data-reveal` = fade/rise in, `data-speed="n"` =
  depth drift, `.work-img` = image moves in its frame. It also renders a "Next" link, currently hidden via `SHOW_NEXT_LINK = false`. All of it runs outside the
  Angular zone; `prefers-reduced-motion` skips Lenis/GSAP.
- **Page styles are global** (`src/app/pages/_pages.scss`, loaded from
  `styles.scss`); shared tokens live in `src/app/_layout.scss`. Shell styles are
  in `app.component.scss`.
- **One type & spacing system** (`_layout.scss`) — use it, don't invent values:
  every text is a display heading (`.kicker` h2, or `%heading-3`: Orbitron 700,
  `$fs-h3`, `$lh-heading`), body copy (`$fs-body`, `$lh-body`), a lead line
  (`$fs-lead-sm`, `$lh-lead`), mono UI text (`$fs-ui`/`$fs-label`, `$ls-ui`) or
  a label (`@include label($color)` — cyan for company/year/number, `$text` for
  group headings). Spacing comes from `$space-xs/s/m/l`, `$col-gap`; cards use
  `%card` (`$card-pad`, `$card-radius`, `$card-gap`); sections are separated
  by `$section-gap`, and only a page's first section adds `$page-top`.
- **Page transition (atom by atom, directional, never blocking)**. Every
  `[data-reveal]` element is an "atom" — keep them fine-grained (single chips,
  list items, links), not whole blocks. On `NavigationStart` `AppComponent`
  compares `pageIndex()` of the target vs the page on screen / being flown to
  and stores the direction (1 forward / -1 back) in `PageTransitionService.dir`
  and `SpaceService.warpDir`. Every route has `canDeactivate: [leavePage]`,
  which calls the current page's `leave()`: it clones the page as it looks now
  into an inert `.page-ghost` overlay, hides the real one and resolves at once.
  The router swaps immediately, the new `PageComponent` staggers its on-screen
  atoms in from the other side while the ghost's atoms fly off — overlapping.
  Staggers are capped (`cappedStagger`: only the first 8 atoms cascade).
  Meanwhile `SpaceService.warp` pulses — `StarFieldComponent` streaks the stars
  sideways — and `ActivationEnd` sets `SpaceService.planet` from route data.
  No View Transitions API.
- **Clicks**: a click on another page mid-transition just retargets (the
  current state is ghosted); clicks on the page on screen / being flown to are
  swallowed (capture-phase document listener in `AppComponent`). With a mouse,
  navigation starts on `pointerdown` (its click is swallowed); touch and
  keyboard use the normal click. The nav's active state moves on
  `NavigationStart` (`highlightNav`).
- **Deep links** work via the SPA fallback in `deploy/nginx.conf` (unknown paths → `index.html`).

### Planet (three.js) specifics

`PlanetComponent` builds an Earth in `buildEarth()`: a `SphereGeometry` with a
custom `ShaderMaterial` that blends a daytime map with a night-lights map based
on the sun direction, plus a separate cloud sphere and an additive-blended
back-side atmosphere shell. Notes when editing:
- The intro loader is just a spinner (`#app-loader` in `index.html`). It stays
  up until the textures finish loading (`THREE.LoadingManager`); a 9 s
  `setTimeout` safety-net hides it even if assets fail — keep that fallback
  intact so a slow/failed asset can never trap the user. `hideLoader()` also
  calls `SpaceService.markIntroReady()`, which starts the first-load intro.
- Texture paths are **relative** (`textures/planet/…`) on purpose so they resolve
  against `<base href>` on any base (dev `/`, prod `/`). Don't make them
  absolute.
- The globe's position/scale/opacity come from the page pose (see above); it's
  tilted 23.5° and rotated so Israel's longitude (~35°E) faces the camera (see
  `ANCHOR_LON`). It's hidden (and not rendered) on phones ≤700px.
- **Currently disabled** via `PLANET_ENABLED = false` (top of
  `planet.component.ts`): nothing is initialised or downloaded, the canvas is
  hidden and the intro loader is dismissed immediately. Set it to `true` to
  restore the globe (route poses / Home scroll logic are still wired).
- With the planet enabled, `planet.component.spec.ts` fails in headless Chrome:
  there is no WebGL context there. That's environmental, not a regression.

### Motion tuning

`src/app/motion.config.ts` holds the global knobs for page transitions and the
first-load intro: `MOTION.speed` (time scale), `MOTION.strength` (travel
distance, warp intensity) and `MOTION.pageEnterDelay` (how long a new page
waits before its elements fly in after a page change — the route switches at
once regardless). Use `dur()` / `dist()` for any new transition
timing/distance so the knobs apply. First load: spinner only, no star warp; the
content intro (hero letters rise, blocks fade up) starts when the spinner lifts
(`SpaceService.introReady`). In dev builds a **Motion** panel (currently hidden via `SHOW_MOTION_TUNER = false` in `app.component.ts`) (bottom-left,
`MotionTunerComponent`, `isDevMode()` only) edits the knobs live, persists them
to localStorage, test-fires the sideways warp, replays the first load and
copies the values for pasting into the config.

### Performance rules (the space layers animate behind everything)

- No `backdrop-filter` over the space layers (top bar, buttons): the blur is
  recomputed on the GPU every frame because the canvases underneath never stop
  changing — use a denser fill. (The confirm dialog's backdrop is the exception:
  it only exists while open.)
- Prefer compositor-only motion (CSS `transform`/`opacity`) over per-frame
  canvas redraws for slow ambient effects (see the nebula).
- `PlanetComponent` renders at pixel ratio ≤ 1.5 (MSAA only on 1x screens),
  15fps at rest and 30fps while the globe moves (`flying()`); hidden ≤700px.
- `StarFieldComponent` blits cached glow sprites — don't create gradients per
  star per frame. Its canvas is DPR ≤ 1.5 and ~24fps at rest (a full-screen
  canvas is re-uploaded to the GPU every frame — the biggest cost on the page),
  and it holds its last frame while a page scrolls (`SpaceService.scrolling`,
  set from Lenis in `PageComponent`). Batching the warp strokes into one path
  per colour was measured slower — keep one short stroke per star.
- three.js is dynamically imported by `PlanetComponent` (its own lazy chunk)
  and only when `PLANET_ENABLED`; keep it out of the initial bundle.

### Mobile / resize care

Recent work targeted mobile scroll/resize jank (planet crop, star-field redraw)
and keeping the CV popup inside the iOS safe area. When touching layout or resize
handlers, re-check behaviour on mobile viewports and across orientation changes.

### Deploy

Push to `main` → `.github/workflows/deploy.yml`: builds with `--base-href=/`,
`rsync`s `dist/cv/browser` to `~/cv-site/site/` on the Hetzner server (secrets
`SSH_HOST`, `SSH_USER`, `SSH_KEY`) and reloads the `cv-web` nginx container
(`deploy/docker-compose.prod.yml`, on the shared `expense-tracker_default` network).
The shared Caddy (`~/expense-tracker/Caddyfile`) proxies `shumski.dev` / `www.` to
`cv-web:80`. The old GitHub Pages site (`ishoomsky.github.io/cv/`) only serves a
redirect stub to shumski.dev (`deploy/pages-redirect/`). Server architecture:
`../hosted-on-hetzner/CLAUDE.md`.
