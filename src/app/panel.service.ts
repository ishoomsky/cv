import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, filter } from 'rxjs';

// Which route-driven side panel a component represents. '' means "none open".
export type PanelKey = 'cv' | 'portfolio' | 'contact' | '';

// How long to let an outgoing panel finish its exit animation before the
// incoming one starts opening, so a panel→panel switch never overlaps two
// panels in the same slot. Keep in sync with $motion-exit in _design-tokens.scss.
const EXIT_MS = 180;

// Central coordinator for the three mutually-exclusive panels (resume /
// portfolio / contact). Each panel derives its open state from `visible$`
// instead of reading the route directly, so switching straight from one panel
// to another closes the current one first, waits for its exit, then opens the
// next — rather than swapping instantly.
@Injectable({ providedIn: 'root' })
export class PanelService {
  // Immediate route target — for instant UI feedback that shouldn't wait for the
  // panel swap (e.g. the nav "active" highlight).
  private readonly _target = new BehaviorSubject<PanelKey>('');
  readonly target$ = this._target.asObservable();

  // The panel allowed to be OPEN right now (drives each panel's .open class). On
  // a direct panel→panel switch it drops to '' first and flips to the new key
  // only after the outgoing exit finishes.
  private readonly _visible = new BehaviorSubject<PanelKey>('');
  readonly visible$ = this._visible.asObservable();

  private router = inject(Router);
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.sync();
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.sync());
  }

  private sync() {
    const path = this.router.url.split(/[?#]/)[0].replace(/\/+$/, '');
    const next: PanelKey =
      path === '/resume' ? 'cv'
      : path === '/portfolio' ? 'portfolio'
      : path === '/contact' ? 'contact'
      : '';
    this._target.next(next);

    const cur = this._visible.value;
    if (next === cur) return;
    clearTimeout(this.timer);

    // Direct swap between two open panels: close the current one and let its
    // exit play out before opening the next. Opening from / or closing to /
    // (one side is '') needs no wait — and neither does reduced motion, where
    // transitions are already ~instant.
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (cur !== '' && next !== '' && !reduce) {
      this._visible.next('');
      this.timer = setTimeout(() => this._visible.next(next), EXIT_MS);
    } else {
      this._visible.next(next);
    }
  }
}
