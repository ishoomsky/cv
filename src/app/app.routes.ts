import { Routes } from '@angular/router';
import { PlanetPose } from './space.service';
import { HomeComponent } from './pages/home.component';
import { PortfolioComponent } from './pages/portfolio.component';
import { ContactComponent } from './pages/contact.component';
import { leavePage } from './page/page-transition.service';

/** Per-page route data: the planet pose the globe flies to on arrival. */
export interface PageData { planet: PlanetPose; }

const page = (planet: PlanetPose): PageData => ({ planet });
// Every page plays its staggered exit before the router swaps it out.
const leave = { canDeactivate: [leavePage] };

// Order matters: it's the reading order ("next" links, transition direction).
export const routes: Routes = [
  // Home = hero + About + Experience + Education; the globe dims and rises as you
  // scroll past the hero (HomeComponent adjusts this pose).
  { path: '',        component: HomeComponent,     title: 'Ivan Shumski',          data: page({ x: 0.63, y: -0.25, scale: 1.05, opacity: 1 }),   ...leave },
  { path: 'portfolio', component: PortfolioComponent, title: 'Portfolio · Ivan Shumski', data: page({ x: -1.0, y: -1.15, scale: 1.0,  opacity: 0.4 }), ...leave },
  { path: 'contact', component: ContactComponent,  title: 'Contact · Ivan Shumski', data: page({ x: 0,    y: -2.0,  scale: 1.6,  opacity: 0.7 }), ...leave },
  { path: 'work', redirectTo: 'portfolio' },  // old name
  { path: '**', redirectTo: '' },
];

/** Index of a URL's page in reading order (unknown paths count as Home). Used to
 *  tell forward from backward navigation for the directional transition. */
export function pageIndex(url: string): number {
  const path = url.split(/[?#]/)[0].replace(/^\//, '');
  return Math.max(0, routes.findIndex(r => r.path === path));
}
