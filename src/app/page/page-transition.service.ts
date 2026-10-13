import { Injectable, inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/** The page currently on screen, as far as exit animations are concerned. */
export interface LeavingPage { leave(dir: 1 | -1): Promise<void>; }

/**
 * Coordinates the atom-by-atom page transition. AppComponent records the travel
 * direction on NavigationStart; the `leavePage` guard plays the current page's
 * staggered exit before the router swaps components; the next PageComponent
 * reads `dir` to stagger its atoms in from the opposite side.
 */
@Injectable({ providedIn: 'root' })
export class PageTransitionService {
  /** 1 = forward in reading order, -1 = back, 0 = initial load (no navigation). */
  dir: 0 | 1 | -1 = 0;
  current?: LeavingPage;
}

/** canDeactivate on every page: wait for the staggered exit, then let the route change. */
export const leavePage: CanDeactivateFn<unknown> = async () => {
  const t = inject(PageTransitionService);
  if (t.current && t.dir) await t.current.leave(t.dir);
  return true;
};
