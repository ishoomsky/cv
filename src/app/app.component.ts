import { Component, NgZone, inject } from '@angular/core';
import { ActivationEnd, NavigationStart, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import gsap from 'gsap';
import { AnalyticsService } from './analytics.service';
import { PlanetComponent } from './planet/planet.component';
import { StarFieldComponent } from './star-field/star-field.component';
import { NebulaComponent } from './nebula/nebula.component';
import { CV } from './cv';
import { SpaceService } from './space.service';
import { PageData, pageIndex } from './app.routes';
import { PageTransitionService } from './page/page-transition.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PlanetComponent, StarFieldComponent, NebulaComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  readonly cv = CV;
  // Instantiate the analytics service so it wires up SPA route tracking.
  private analytics = inject(AnalyticsService);
  private space = inject(SpaceService);
  private transitions = inject(PageTransitionService);
  private zone = inject(NgZone);

  constructor() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const router = inject(Router);
    let first = true;

    router.events.subscribe(e => {
      // Every in-app navigation (not the initial load) gets a direction from
      // reading order — the page atoms fly out/in along it — and a warp pulse:
      // stars streak sideways while the pages swap, then settle back to a drift.
      if (e instanceof NavigationStart && !first && !reduce) {
        const dir = pageIndex(e.url) >= pageIndex(router.url) ? 1 : -1;
        this.transitions.dir = dir;
        this.space.warpDir = dir;
        this.zone.runOutsideAngular(() => {
          gsap.killTweensOf(this.space, 'warp');
          gsap.timeline()
            .to(this.space, { warp: 1, duration: 0.35, ease: 'power2.in' })
            .to(this.space, { warp: 0, duration: 1.1, ease: 'power3.out' });
        });
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
