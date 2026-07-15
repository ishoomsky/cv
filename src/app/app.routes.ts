import { Routes } from '@angular/router';

// Componentless routes — they exist only to drive UI state (the CV / portfolio /
// contact popups) from the URL. /resume opens the dossier, /portfolio opens the
// project portfolio, /contact opens the contact panel, / closes them. Only one
// path is active at a time, so the panels are mutually exclusive for free.
export const routes: Routes = [
  { path: 'resume', children: [] },
  { path: 'portfolio', children: [] },
  { path: 'contact', children: [] },
  { path: '', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
