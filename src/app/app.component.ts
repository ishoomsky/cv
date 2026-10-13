import { Component, NgZone, inject, isDevMode } from '@angular/core';
import { ActivationEnd, NavigationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { PlanetComponent } from './planet/planet.component';
import { StarFieldComponent } from './star-field/star-field.component';
import { NebulaComponent } from './nebula/nebula.component';
import { CV } from './cv';
import { SpaceService } from './space.service';
import { PageData, pageIndex } from './app.routes';
import { PageTransitionService } from './page/page-transition.service';
import { MotionTunerComponent } from './motion-tuner.component';

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

  /** Route path of the page on screen — or being flown to mid-transition. */
  private target = '';
  /** The link a mouse pointerdown already navigated: swallow its click. */
  private pressed: HTMLAnchorElement | null = null;

  constructor() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const router = inject(Router);
    const zone = inject(NgZone);
    let first = true;

    // Transitions never block: the exiting page becomes a ghost (PageComponent
    // .leave), so a click on another page mid-transition simply retargets.
    // Clicks on the page we're already on / flying to are swallowed.
    // Capture phase on the document runs before RouterLink's own click handler.
    document.addEventListener('click', e => {
      const a = internalLink(e.target);
      if (!a) return;
      if (a === this.pressed || linkPath(a) === this.target) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.pressed = null;
    }, true);

    // Mouse: start on press, not release (~100ms sooner). Touch keeps tap/click
    // semantics so a scroll gesture can't trigger a page change.
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = internalLink(e.target);
      if (!a || linkPath(a) === this.target) return;
      this.pressed = a;
      zone.run(() => router.navigateByUrl('/' + linkPath(a)));
    }, true);

    router.events.subscribe(e => {
      // Every in-app navigation to another page (not the initial load) gets a
      // direction from reading order — relative to the page being shown or flown
      // to — and a sideways warp pulse while the pages swap.
      if (e instanceof NavigationStart && !first && pathOf(e.url) !== this.target) {
        const dir = pageIndex(e.url) >= pageIndex('/' + this.target) ? 1 : -1;
        this.target = pathOf(e.url);
        highlightNav(this.target);  // instant feedback, before the swap
        if (!reduce) {
          this.transitions.dir = dir;
          this.space.pulseWarp(dir);
        }
      }
      if (e instanceof NavigationEnd) this.target = pathOf(router.url);
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

/** The in-app link (same origin, same tab) an event landed on, if any. */
function internalLink(target: EventTarget | null): HTMLAnchorElement | null {
  const a = (target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  return a && !a.target && a.origin === location.origin ? a : null;
}

/** An in-app link's route path, relative to <base href> (/ on dev, /cv/ on Pages). */
function linkPath(a: HTMLAnchorElement) {
  const base = new URL(document.baseURI).pathname;
  const path = a.pathname.startsWith(base) ? a.pathname.slice(base.length) : a.pathname.replace(/^\//, '');
  return path.replace(/\/$/, '');
}

/** Move the nav's active state to `path` right away (RouterLinkActive catches
 *  up when the navigation ends). */
function highlightNav(path: string) {
  document.querySelectorAll<HTMLAnchorElement>('.topbar nav a').forEach(a => a.classList.toggle('active', linkPath(a) === path));
}
