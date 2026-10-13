import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CV } from '../cv';
import { PageComponent } from '../page/page.component';
import { AnalyticsService } from '../analytics.service';

interface ContactMethod {
  label: string;
  value: string;
  href: string;
  icon: string;       // monochrome SVG under public/, painted via CSS mask
  external?: boolean; // opens in a new tab; tel:/mailto: navigate in place
  // Confirm dialog: spells out what happens before the channel opens.
  title: string;
  message: string;
  event: string;      // analytics event, fired on confirm
}

const c = CV.contact, cs = CV.contacts;

const METHODS: ContactMethod[] = [
  { label: 'WhatsApp', value: c.whatsapp, href: c.whatsappUrl, icon: 'icons/chat.svg', external: true,
    title: 'Message me', message: "Let's chat on WhatsApp — fastest way to reach me.", event: 'whatsapp-click' },
  { label: 'Email', value: cs.email, href: 'mailto:' + cs.email, icon: 'icons/mail.svg',
    title: 'Email me', message: 'Starts a new email to me. Say hi!', event: 'email-click' },
  { label: 'LinkedIn', value: cs.linkedin.label, href: cs.linkedin.url, icon: 'icons/linkedin.svg', external: true,
    title: 'My LinkedIn', message: 'Opens my LinkedIn in a new tab.', event: 'linkedin-click' },
];

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [PageComponent],
  template: `
    <app-page>
      <section class="section">
        <div class="inner">
          <h1 class="kicker" data-reveal>Contact</h1>
          <p class="contact-intro" data-reveal>Feel free to contact me:</p>

          <div class="contact-list">
            @for (m of methods; track m.label) {
              <a class="c-card" data-reveal [href]="m.href" [attr.target]="m.external ? '_blank' : null"
                 [attr.rel]="m.external ? 'noopener' : null" (click)="ask(m, $event)">
                <!-- Relative url() in an inline style resolves against <base href>, so
                     the icon works on both dev (/) and Pages (/cv/). -->
                <span class="c-icon" aria-hidden="true" [style.mask-image]="'url(' + m.icon + ')'" [style.-webkit-mask-image]="'url(' + m.icon + ')'"></span>
                <span class="c-text">
                  <span class="c-label">{{ m.label }}</span>
                  <span class="c-value">{{ m.value }}</span>
                </span>
                <span class="c-arrow" aria-hidden="true">↗</span>
              </a>
            }
          </div>
        </div>
      </section>
    </app-page>

    <!-- Native modal dialog: focus trap, Esc to close and an inert page come free.
         A click on the backdrop lands on the <dialog> itself and cancels. The
         content is always rendered so [autofocus] exists when showModal() runs. -->
    <dialog class="confirm" #dialog aria-labelledby="confirm-title" (click)="$event.target === dialog && cancel()">
      <h2 class="cf-title" id="confirm-title">{{ pending?.title }}</h2>
      <p class="cf-msg">{{ pending?.message }}</p>
      <div class="cf-actions">
        <button type="button" class="btn ghost" (click)="cancel()">Cancel</button>
        <button type="button" class="btn primary" autofocus (click)="confirm()">Continue <span aria-hidden="true">→</span></button>
      </div>
    </dialog>
  `,
})
export class ContactComponent {
  readonly methods = METHODS;
  private analytics = inject(AnalyticsService);
  @ViewChild('dialog', { static: true }) dialog!: ElementRef<HTMLDialogElement>;

  // Kept after closing (not cleared) so the dialog never flashes empty text.
  pending?: ContactMethod;

  // Intercept a plain click: ask first, spelling out what happens next. Modified
  // clicks (new tab / window, middle button) behave like ordinary links.
  ask(m: ContactMethod, e: MouseEvent) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    this.pending = m;
    this.dialog.nativeElement.showModal();
  }

  confirm() {
    const p = this.pending;
    this.dialog.nativeElement.close();
    if (!p) return;
    this.analytics.event(p.event);
    if (p.external) window.open(p.href, '_blank', 'noopener');
    else window.location.href = p.href;
  }

  cancel() {
    this.dialog.nativeElement.close();
  }
}
