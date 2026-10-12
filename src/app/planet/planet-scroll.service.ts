import { Injectable } from '@angular/core';

/**
 * Landing scroll progress (0 at the top → 1 at the bottom), written by
 * LandingComponent and read every frame by PlanetComponent. A plain field, not a
 * signal: both sides run outside Angular's change detection.
 */
@Injectable({ providedIn: 'root' })
export class PlanetScroll {
  progress = 0;
}
