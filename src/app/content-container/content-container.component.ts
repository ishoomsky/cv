import { Component, OnDestroy, HostListener, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import cvData from '../data/cv-data.json';

interface SkillGroup { label: string; items: string[]; }
interface Job { role: string; company: string; period: string; points: string[]; }
interface Project { name: string; tagline: string; flow: string[]; points: string[]; }
interface NavItem { label: string; action?: string; url?: string; icon?: string; }
interface Link { label: string; url: string; }

interface CvData {
  profile: {
    firstName: string; lastName: string; fullName: string;
    identityTag: string; panelRole: string; resumeRole: string; dossierTitle: string;
  };
  contacts: { location: string; email: string; phone: string; linkedin: Link; github: Link; };
  status: string;
  pdf: string;
  nav: NavItem[];
  stackTicker: string[];
  summary: string;
  skills: SkillGroup[];
  experience: Job[];
  projects: Project[];
  education: { title: string; org: string; year: string; }[];
  languages: string[];
}

@Component({
  selector: 'app-content-container',
  standalone: true,
  imports: [],
  templateUrl: './content-container.component.html',
  styleUrl: './content-container.component.scss'
})
export class ContentContainerComponent implements OnDestroy {
  // Single source of truth — all page content lives in cv-data.json.
  readonly cv = cvData as unknown as CvData;

  // Pre-built endless-marquee string for the STACK readout.
  readonly ticker = this.cv.stackTicker.join('  ·  ') + '  ·  ';

  cvOpen = false;
  openJob = 0;           // expanded role in the experience timeline

  private router = inject(Router);
  private sub: Subscription;

  constructor() {
    // The popup is derived from the route: /cv → open, anything else → closed.
    this.syncFromUrl();
    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.syncFromUrl());
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private syncFromUrl() {
    const path = this.router.url.split(/[?#]/)[0].replace(/\/+$/, '');
    const wasOpen = this.cvOpen;
    this.cvOpen = path === '/resume';
    // Keyboard focus follows the dialog: move into it on open, restore on close.
    if (this.cvOpen && !wasOpen) this.focusModal();
    else if (!this.cvOpen && wasOpen) this.restoreFocus();
  }

  // Esc closes the dossier — expected keyboard behaviour for a modal dialog.
  @HostListener('document:keydown.escape')
  onEscape() { if (this.cvOpen) this.closeCv(); }

  openCv()  { this.opener = document.activeElement as HTMLElement; this.router.navigate(['/resume']); }
  closeCv() { this.router.navigate(['/']); }

  private opener: HTMLElement | null = null;

  private focusModal() {
    // Wait a frame so the dialog is in the DOM, then focus its first control.
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.modal .close-btn')?.focus();
    });
  }

  private restoreFocus() {
    this.opener?.focus();
    this.opener = null;
  }

  toggleJob(i: number) {
    this.openJob = this.openJob === i ? -1 : i;
  }
}
