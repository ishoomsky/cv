import { Routes } from '@angular/router';

// Componentless routes — they exist only to drive UI state (the CV popup)
// from the URL. /resume opens the dossier, / closes it.
export const routes: Routes = [
  { path: 'resume', children: [] },
  { path: '', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
