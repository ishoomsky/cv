import { Routes } from '@angular/router';

// Componentless routes — they exist only to drive UI state (the CV / portfolio
// popups) from the URL. /resume opens the dossier, /portfolio opens the project
// portfolio, / closes both. Only one path is active at a time, so the two
// panels are mutually exclusive for free.
export const routes: Routes = [
  { path: 'resume', children: [] },
  { path: 'portfolio', children: [] },
  { path: '', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
