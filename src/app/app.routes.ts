import { Routes } from '@angular/router';

// Componentless routes — they exist only to drive UI state (the CV popup)
// from the URL. /cv opens the dossier, / closes it.
export const routes: Routes = [
  { path: 'cv', children: [] },
  { path: '', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
