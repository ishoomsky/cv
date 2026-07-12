import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, skip } from 'rxjs';

// GoatCounter's count.js attaches this to window once it loads (async).
declare global {
  interface Window {
    goatcounter?: {
      count: (vars?: { path?: string; title?: string; event?: boolean }) => void;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private router = inject(Router);

  constructor() {
    // The GoatCounter script auto-counts the initial page load. This is an SPA,
    // so in-app route changes (/resume, /portfolio) don't reload the page —
    // count them manually. Skip the first NavigationEnd: it maps to the initial
    // view that was already auto-counted, so this avoids double counting.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), skip(1))
      .subscribe(() => this.pageview());
  }

  private pageview() {
    // Guard: count.js loads async and may not be ready on the first navigations.
    window.goatcounter?.count({ path: location.pathname + location.search });
  }

  /** Track a custom event (e.g. a PDF download) as a named GoatCounter hit. */
  event(name: string) {
    window.goatcounter?.count({ path: name, event: true });
  }
}
