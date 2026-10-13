import { Component, inject, isDevMode } from '@angular/core';
import { ActivationEnd, NavigationCancel, NavigationEnd, NavigationError, NavigationSkipped, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { PlanetComponent } from './planet/planet.component';
import { StarFieldComponent } from './star-field/star-field.component';
import { NebulaComponent } from './nebula/nebula.component';
import { CV } from './cv';
import { SpaceService } from './space.service';
import { PageData, pageIndex } from './app.routes';
import { PageTransitionService } from './page/page-transition.service';
import { MotionTunerComponent } from './motion-tuner.component';
import { dur } from './motion.config';

// Dev-only Motion tuning panel (MotionTunerComponent); hidden for now.
const SHOW_MOTION_TUNER = false;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PlanetComponent, StarFieldComponent, NebulaComponent, MotionTunerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly cv = CV;
  /** The Motion tuning panel (dev builds only). Hidden for now — flip
   *  SHOW_MOTION_TUNER to bring it back. */
  readonly showTuner = SHOW_MOTION_TUNER && isDevMode();
  // Instantiate the analytics service so it wires up SPA route tracking.
  private analytics = inject(AnalyticsService);
  private space = inject(SpaceService);
  private transitions = inject(PageTransitionService);

  /** A page change is playing (exit → swap → entrance): in-app link clicks
   *  are swallowed until it settles, so repeated clicks can't stack
   *  navigations, exits and warps on top of each other. */
  private transitioning = false;
  private settleTimer = 0;
  private transitionId = -1;   // the navigation that owns the lock

  constructor() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const router = inject(Router);
    let first = true;

    // Capture phase on the document: runs before RouterLink's own click handler.
    document.addEventListener('click', e => {
      if (!this.transitioning) return;
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!a || a.target === '_blank' || a.origin !== location.origin) return;  // external: let it through
      e.preventDefault();
      e.stopPropagation();
    }, true);

    router.events.subscribe(e => {
      // Every in-app navigation to another page (not the initial load, not a
      // click on the current page) gets a direction from reading order — the
      // page atoms fly out/in along it — and a sideways warp pulse while the
      // pages swap.
      if (e instanceof NavigationStart && !first && pathOf(e.url) !== pathOf(router.url)) {
        this.transitioning = true;
        this.transitionId = e.id;
        clearTimeout(this.settleTimer);
        if (!reduce) {
          const dir = pageIndex(e.url) >= pageIndex(router.url) ? 1 : -1;
          this.transitions.dir = dir;
          this.space.pulseWarp(dir);
        }
      }
      // Unlock once the new page's entrance has played (or right away if the
      // navigation didn't go through).
      // Only the navigation that took the lock releases it — e.g. a browser Back
      // mid-transition cancels the old one but starts its own.
      if (e instanceof NavigationEnd && e.id === this.transitionId) {
        this.settleTimer = window.setTimeout(() => (this.transitioning = false), reduce ? 0 : dur(0.9) * 1000);
      }
      if ((e instanceof NavigationCancel || e instanceof NavigationError || e instanceof NavigationSkipped) && e.id === this.transitionId) {
        this.transitioning = false;
      }
      // The leaf route carries the planet pose for the page being entered.
      if (e instanceof ActivationEnd && !e.snapshot.firstChild) {
        const data = e.snapshot.data as Partial<PageData>;
        if (data.planet) this.space.planet = data.planet;
        first = false;
      }
    });
  }
}

/** The route path of a router URL, without query, fragment or leading slash. */
function pathOf(url: string) {
  return url.split(/[?#]/)[0].replace(/^\//, '');
}
