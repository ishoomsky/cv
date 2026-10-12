import { Routes } from '@angular/router';

// Single-page landing: sections are reached by scrolling, not routing.
export const routes: Routes = [
  { path: '', pathMatch: 'full', children: [] },
  { path: '**', redirectTo: '' },
];
