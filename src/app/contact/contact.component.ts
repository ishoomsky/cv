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
  phone: string;
  phoneUrl: string;
  email: string;
  linkedin: string;
  linkedinUrl: string;
}

type ChannelKey = 'whatsapp' | 'email' | 'linkedin';

// The confirm dialog shown before a contact channel is opened.
interface Pending {
  title: string;
  message: string;
  url: string;
  newTab: boolean;      // external links open a tab; tel:/mailto: navigate
  event: string;        // analytics event name
  accent: 'green' | 'cyan';
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

  // When set, a confirm dialog is shown clarifying what opening a channel does.
  pending: Pending | null = null;

  // Intercept a channel button: instead of following the link straight away,
  // ask the user to confirm and spell out what happens next.
  ask(type: ChannelKey, e: Event) {
    e.preventDefault();
    const c = this.contact;
    const map: Record<ChannelKey, Pending> = {
      whatsapp: {
        title: 'MESSAGE ME',
        message: "Let's chat on WhatsApp — fastest way to reach me.",
        url: c.whatsappUrl, newTab: true, event: 'whatsapp-click', accent: 'green',
      },
      email: {
        title: 'EMAIL ME',
        message: 'Starts a new email to me. Say hi!',
        url: 'mailto:' + c.email, newTab: false, event: 'email-click', accent: 'cyan',
      },
      linkedin: {
        title: 'MY LINKEDIN',
        message: 'Opens my LinkedIn in a new tab.',
        url: c.linkedinUrl, newTab: true, event: 'linkedin-click', accent: 'cyan',
      },
    };
    this.pending = map[type];
    requestAnimationFrame(() => document.querySelector<HTMLElement>('.ct-confirm .cf-yes')?.focus());
  }

  confirm() {
    const p = this.pending;
    if (!p) return;
    this.analytics.event(p.event);
    this.pending = null;
    if (p.newTab) window.open(p.url, '_blank', 'noopener');
    else window.location.href = p.url;
  }

  cancel() { this.pending = null; }

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
    else if (!this.contactOpen && wasOpen) { this.restoreFocus(); this.pending = null; }
  }

  // Esc closes the panel on mobile/tablet, where it's still a true popup. On
  // desktop (min-width: 1200px — keep in sync with the `desktop` mixin in
  // _design-tokens.scss) it's a persistent side panel: it only closes via the
  // close button or an actual route change.
  @HostListener('document:keydown.escape')
  onEscape() {
    // A live confirm dialog swallows Esc first, then the panel (mobile only).
    if (this.pending) { this.cancel(); return; }
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
