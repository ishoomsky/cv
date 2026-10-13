import { Injectable, NgZone, inject } from '@angular/core';
import gsap from 'gsap';
import { MOTION, dur } from './motion.config';

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

  private resolveIntro!: () => void;
  /** Resolves when the intro spinner starts fading out — the moment the
   *  first-load content intro should play. */
  readonly introReady = new Promise<void>(r => (this.resolveIntro = r));
  markIntroReady() { this.resolveIntro(); }
  /** Target pose; the planet eases towards it. */
  planet: PlanetPose = { x: 0.63, y: -0.25, scale: 1.05, opacity: 1 };

  private zone = inject(NgZone);

  /** Stars streak into hyperspace in `dir` and settle back to a drift. The peak
   *  follows MOTION.strength, the timing MOTION.speed. */
  pulseWarp(dir: 1 | -1) {
    this.warpDir = dir;
    this.zone.runOutsideAngular(() => {
      gsap.killTweensOf(this, 'warp');
      gsap.timeline()
        .to(this, { warp: MOTION.strength, duration: dur(0.35), ease: 'power2.in' })
        .to(this, { warp: 0, duration: dur(1.1), ease: 'power3.out' });
    });
  }
}
