import { Injectable } from '@angular/core';

/** Where the globe sits on a page. x is a fraction of the visible half-width (so it
 *  adapts to the aspect ratio), y is in scene units (visible half-height ≈ 1.24). */
export interface PlanetPose { x: number; y: number; scale: number; opacity: number; }

/**
 * Shared state for the fixed space layers. Written by the route transition logic,
 * read every frame by StarFieldComponent / PlanetComponent. Plain fields, not
 * signals: the render loops run outside Angular's change detection.
 */
@Injectable({ providedIn: 'root' })
export class SpaceService {
  /** 0 = calm drift, 1 = full hyperspace streaks. */
  warp = 0;
  /** Travel direction of the current warp: 1 = forward (to a later page, the view
   *  moves right so stars stream left), -1 = back. */
  warpDir: 1 | -1 = 1;
  /** Target pose; the planet eases towards it. */
  planet: PlanetPose = { x: 0.63, y: -0.25, scale: 1.05, opacity: 1 };
}
