import { Component, OnDestroy, HostListener, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import cvData from '../data/cv-data.json';
import { AnalyticsService } from '../analytics.service';

interface ContactData {
  title: string;
  intro: string;
  whatsapp: string;
  whatsappUrl: string;
  email: string;
}

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnDestroy {
  // Single source of truth — all content lives in cv-data.json; the contact
  // panel reads its `contact` section.
  readonly contact = (cvData as { contact: ContactData }).contact;
  readonly analytics = inject(AnalyticsService);

  contactOpen = false;

  private router = inject(Router);
  private sub: Subscription;

  constructor() {
    // The panel is derived from the route: /contact → open, anything else → closed.
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
    const wasOpen = this.contactOpen;
    this.contactOpen = path === '/contact';
    // Keyboard focus follows the dialog: move into it on open, restore on close.
    if (this.contactOpen && !wasOpen) this.focusModal();
    else if (!this.contactOpen && wasOpen) this.restoreFocus();
  }

  // Esc closes the panel on mobile/tablet, where it's still a true popup. On
  // desktop (min-width: 1200px — keep in sync with the `desktop` mixin in
  // _design-tokens.scss) it's a persistent side panel: it only closes via the
  // close button or an actual route change.
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.contactOpen && !window.matchMedia('(min-width: 1200px)').matches) this.closeContact();
  }

  closeContact() { this.router.navigate(['/']); }

  private opener: HTMLElement | null = null;

  private focusModal() {
    this.opener = document.activeElement as HTMLElement;
    // Wait a frame so the dialog is in the DOM, then focus its first control.
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.ct-modal .close-btn')?.focus();
    });
  }

  private restoreFocus() {
    this.opener?.focus();
    this.opener = null;
  }
}
