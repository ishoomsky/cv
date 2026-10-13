import { Component, inject, isDevMode } from '@angular/core';
import { ActivationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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

  constructor() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const router = inject(Router);
    let first = true;

    router.events.subscribe(e => {
      // Every in-app navigation (not the initial load) gets a direction from
      // reading order — the page atoms fly out/in along it — and a sideways
      // warp pulse while the pages swap.
      if (e instanceof NavigationStart && !first && !reduce) {
        const dir = pageIndex(e.url) >= pageIndex(router.url) ? 1 : -1;
        this.transitions.dir = dir;
        this.space.pulseWarp(dir);
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
