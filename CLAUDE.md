# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server at http://localhost:4200 (auto-reloads)
npm run build      # production build → dist/
npm test           # unit tests via Karma/Jasmine (watch mode)
ng generate component <name>  # scaffold a new standalone component
```

## Architecture

Angular 18 standalone-component app — no NgModules. The app is a space-themed CV background composed of layered full-screen canvases.

### Layer stack (bottom → top)

| Component | Canvas ID | Role |
|---|---|---|
| `NebulaComponent` | `nebulaCanvas` | Static blurred nebula blobs drawn once (redrawn on resize) |
| `StarFieldComponent` | `starCanvas` | Animated multi-layer parallax star field using `requestAnimationFrame` |
| `PlanetComponent` | `planetCanvas` | Slowly bobbing Jupiter; currently **commented out** in `app.component.html` |
| `ContentContainerComponent` | — | Glassmorphism content overlay; currently **commented out** |

All canvas components share the same pattern:
- Implement `AfterViewInit` and grab their canvas via `document.getElementById` (not `@ViewChild`)
- Implement `@HostListener('window:resize')` that resizes the canvas and re-initialises state

### Planet rendering quirk

`PlanetComponent.drawPlanet()` serializes a hidden inline `<svg id="jupiterSVG">` in `planet.component.html` to a Blob URL, loads it as an `Image`, and paints it onto the canvas each animation frame. The SVG's `width`/`height` attributes are mutated before serialization to match the target pixel size — this avoids blurriness when the browser rasterizes the SVG.

### Enabling hidden components

`PlanetComponent` and `ContentContainerComponent` are imported in `AppComponent` but their tags are commented out in `app.component.html`. Uncomment them to enable.

