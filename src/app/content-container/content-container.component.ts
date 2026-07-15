import { Component, OnDestroy, HostListener, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import cvData from '../data/cv-data.json';
import { AnalyticsService } from '../analytics.service';

interface SkillGroup { label: string; items: string[]; }
interface Job { role: string; company: string; period: string; points: string[]; }
interface Project { name: string; tagline: string; flow: string[]; points: string[]; }
interface NavItem { label: string; action?: string; url?: string; icon?: string; }
interface Link { label: string; url: string; }

interface CvData {
  profile: {
    firstName: string; lastName: string; fullName: string;
    panelRole: string; resumeRole: string; dossierTitle: string;
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
  portfolio: { title: string; projects: { name: string; company: string; description: string; images: string[]; }[]; };
  education: { title: string; org: string; year: string; }[];
  languages: string[];
}

// Simple Icons path data (viewBox 0 0 24 24), shared by the nav and the
// dossier contact rail so the markup only carries an icon name.
const ICONS: Record<string, string> = {
  linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  github: 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z',
};

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
  // Which nav action's panel is currently open, so the nav can show an
  // "active/selected" state. Driven by the route (see syncFromUrl).
  activeAction: 'cv' | 'portfolio' | 'contact' | '' = '';
  // Sticky sub-header (name/role) fades in once the dossier body scrolls
  // past the rail identity block.
  modalScrolled = false;

  icon(name: string | undefined): string {
    return name ? ICONS[name] ?? '' : '';
  }

  onModalScroll(e: Event) {
    this.modalScrolled = (e.target as HTMLElement).scrollTop > 48;
  }

  private router = inject(Router);
  readonly analytics = inject(AnalyticsService);
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
    this.activeAction = path === '/resume' ? 'cv'
      : path === '/portfolio' ? 'portfolio'
      : path === '/contact' ? 'contact'
      : '';
    // Keyboard focus follows the dialog: move into it on open, restore on close.
    if (this.cvOpen && !wasOpen) this.focusModal();
    else if (!this.cvOpen && wasOpen) this.restoreFocus();
    if (this.cvOpen !== wasOpen) this.modalScrolled = false;
  }

  // Esc closes the dossier on mobile/tablet, where it's still a true popup.
  // On desktop (see the `desktop` mixin in _design-tokens.scss — keep this
  // breakpoint in sync with it) the dossier is a persistent side panel: it
  // only closes via the close button or an actual route change.
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.cvOpen && !window.matchMedia('(min-width: 1200px)').matches) this.closeCv();
  }

  openCv()  { this.opener = document.activeElement as HTMLElement; this.router.navigate(['/resume']); }
  closeCv() { this.router.navigate(['/']); }

  openPortfolio() { this.router.navigate(['/portfolio']); }

  openContact() { this.router.navigate(['/contact']); }

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
}
