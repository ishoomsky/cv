import { Component, OnDestroy, HostListener, NgZone, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import cvData from '../data/cv-data.json';
import { PanelService } from '../panel.service';

interface PortfolioProject { name: string; company: string; description: string; images: string[]; }
interface PortfolioData { title: string; projects: PortfolioProject[]; }

// How many gradient placeholder slides to show for a project that has no real
// images yet — enough to exercise the slider (arrows/dots/swipe) before assets
// land in public/portfolio/. Once `images` is populated the real files win.
const PLACEHOLDER_SLIDES = 3;

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss'
})
export class PortfolioComponent implements OnDestroy {
  // Single source of truth — all content lives in cv-data.json; the portfolio
  // panel reads its `portfolio` section.
  readonly portfolio = (cvData as { portfolio: PortfolioData }).portfolio;

  portfolioOpen = false;
  // Image srcs are withheld from the template until the panel is first opened,
  // so the screenshots (the heaviest assets on the site) never load for a
  // visitor who doesn't open the portfolio. Never reset once true — reopening
  // must not flash placeholders over already-cached images.
  assetsRequested = false;
  // Current slide index per project (indexed by project position).
  slide: number[] = this.portfolio.projects.map(() => 0);
  // Which card is "in focus" (nearest the centre of the scroll area). The rest
  // are dimmed; scrolling moves the focus and un-dims the card that enters it.
  focusedIndex = 0;

  // ── Focus tracking on scroll ────────────────────────────────────────────────
  // The scroll listener runs OUTSIDE Angular's zone and is coalesced to one
  // measurement per animation frame, so fast scrolling (esp. on mobile) never
  // fires a synchronous getBoundingClientRect storm + change-detection pass on
  // every pixel. Change detection is re-entered only when the focused card
  // actually changes.
  private zone = inject(NgZone);
  private scrollEl: HTMLElement | null = null;
  private readonly onScroll = () => this.scheduleMeasure();
  private rafId = 0;

  private attachScroll() {
    this.zone.runOutsideAngular(() => {
      // Wait a frame so the conditionally-rendered modal body is in the DOM.
      requestAnimationFrame(() => {
        this.scrollEl = document.querySelector<HTMLElement>('.pf-modal .modal-body');
        this.scrollEl?.addEventListener('scroll', this.onScroll, { passive: true });
      });
    });
  }

  private detachScroll() {
    this.scrollEl?.removeEventListener('scroll', this.onScroll);
    this.scrollEl = null;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
  }

  private scheduleMeasure() {
    if (this.rafId) return; // one measurement per frame
    this.rafId = requestAnimationFrame(() => {
      this.rafId = 0;
      this.measureFocus();
    });
  }

  // Recompute the focused card from scroll position: the card whose centre is
  // closest to the scroll container's centre wins.
  private measureFocus() {
    const container = this.scrollEl;
    if (!container) return;
    const cards = container.querySelectorAll<HTMLElement>('.pf-card');
    if (!cards.length) return;

    let next: number;
    // Edge clamp: a first/last card that's taller-adjacent to the viewport edge
    // never reaches the centre, so pin focus to it at the scroll extremes.
    const top = container.scrollTop;
    const max = container.scrollHeight - container.clientHeight;
    const EDGE = 24;
    if (top <= EDGE) {
      next = 0;
    } else if (top >= max - EDGE) {
      next = cards.length - 1;
    } else {
      const rect = container.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((card, i) => {
        const r = card.getBoundingClientRect();
        const dist = Math.abs(r.top + r.height / 2 - centerY);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      next = best;
    }

    // Re-enter Angular only when the highlight actually moves.
    if (next !== this.focusedIndex) {
      this.zone.run(() => { this.focusedIndex = next; });
    }
  }

  // Returns the slides to render for a project: real image paths when present,
  // otherwise a fixed run of nulls that render as gradient placeholders.
  slidesFor(p: PortfolioProject): (string | null)[] {
    return p.images.length ? p.images : new Array(PLACEHOLDER_SLIDES).fill(null);
  }

  private count(i: number): number {
    return this.slidesFor(this.portfolio.projects[i]).length;
  }

  prev(i: number) { const n = this.count(i); this.slide[i] = (this.slide[i] - 1 + n) % n; }
  next(i: number) { const n = this.count(i); this.slide[i] = (this.slide[i] + 1) % n; }
  goTo(i: number, n: number) { this.slide[i] = n; }

  // ── Swipe (touch / pointer) ────────────────────────────────────────────────
  private swipeStartX = 0;
  private swipeStartY = 0;
  private swiping = false;

  onPointerDown(e: PointerEvent) {
    this.swipeStartX = e.clientX;
    this.swipeStartY = e.clientY;
    this.swiping = true;
  }

  onPointerUp(e: PointerEvent, i: number) {
    if (!this.swiping) return;
    this.swiping = false;
    const dx = e.clientX - this.swipeStartX;
    const dy = e.clientY - this.swipeStartY;
    // Only act on a mostly-horizontal drag so vertical scrolling keeps working.
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    if (dx < 0) this.next(i); else this.prev(i);
  }

  private router = inject(Router);
  private panels = inject(PanelService);
  private sub = new Subscription();

  constructor() {
    // Open state comes from the panel coordinator, which sequences panel→panel
    // switches so this panel opens only after the outgoing one finishes closing.
    this.sub.add(this.panels.visible$.subscribe(v => {
      const wasOpen = this.portfolioOpen;
      this.portfolioOpen = v === 'portfolio';
      // Keyboard focus follows the dialog; the scroll listener is bound/unbound
      // with the open state.
      if (this.portfolioOpen && !wasOpen) { this.assetsRequested = true; this.focusModal(); this.focusedIndex = 0; this.attachScroll(); }
      else if (!this.portfolioOpen && wasOpen) { this.restoreFocus(); this.detachScroll(); }
    }));
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.detachScroll();
  }

  // Esc closes the panel on mobile/tablet, where it's still a true popup. On
  // desktop (see the `desktop` mixin in _design-tokens.scss — keep this
  // breakpoint in sync with it) it's a persistent side panel: it only closes
  // via the close button or an actual route change.
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.portfolioOpen && !window.matchMedia('(min-width: 1200px)').matches) this.closePortfolio();
  }

  closePortfolio() { this.router.navigate(['/']); }

  private opener: HTMLElement | null = null;

  private focusModal() {
    this.opener = document.activeElement as HTMLElement;
    // Wait a frame so the dialog is in the DOM, then focus its first control.
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('.pf-modal .close-btn')?.focus();
    });
  }

  private restoreFocus() {
    this.opener?.focus();
    this.opener = null;
  }
}
