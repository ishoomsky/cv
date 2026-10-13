import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { CV } from '../cv';
import { LeavingPage, PageTransitionService } from './page-transition.service';

gsap.registerPlugin(ScrollTrigger);

/**
 * Wraps every routed page: a full-screen scroller with Lenis smooth scrolling and
 * the declarative scroll effects, plus a "next page" link at the bottom.
 *
 *   [data-reveal]  an "atom": staggers in on arrival / when scrolled into view,
 *                  and staggers out when leaving the page
 *   [data-exit]    leaves with the others but has its own entrance (Home intro)
 *   [data-speed]   depth drift relative to its section (bigger = closer)
 *   .work-img      image moves inside its frame
 *
 * Page changes are atom by atom, in the direction of travel: the visible atoms
 * fly off one after another (leave(), awaited by the `leavePage` guard), then the
 * new page's atoms fly in from the other side.
 */
@Component({
  selector: 'app-page',
  standalone: true,
  imports: [RouterLink],
  host: { class: 'page' },
  template: `
    <div class="scroller" #scroller>
      <main class="content" #content>
        <ng-content />
        <a class="next-page" data-reveal [routerLink]="next.path">
          <span class="next-label">Next</span>
          <span class="next-title">{{ next.label }} <span aria-hidden="true">→</span></span>
        </a>
      </main>
    </div>
  `,
})
export class PageComponent implements AfterViewInit, OnDestroy, LeavingPage {
  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: true }) content!: ElementRef<HTMLElement>;

  private zone = inject(NgZone);
  private route = inject(ActivatedRoute);
  private transitions = inject(PageTransitionService);
  private reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private lenis?: Lenis;
  private ctx?: gsap.Context;
  private tick = (t: number) => this.lenis?.raf(t * 1000);

  /** The page after this one in nav order; Contact wraps back to Home. */
  readonly next = (() => {
    const path = this.route.snapshot.routeConfig?.path ?? '';
    const i = CV.nav.findIndex(n => n.target === path);
    const n = CV.nav[i + 1];
    if (!n) return { path: '/', label: 'Back to start' };
    return { path: '/' + n.target, label: titleCase(n.label) };
  })();

  ngAfterViewInit() {
    if (this.reduce) return;
    this.transitions.current = this;
    // The scroll loop runs every frame — keep it out of Angular's change detection.
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy() {
    if (this.transitions.current === this) this.transitions.current = undefined;
    this.ctx?.revert();
    gsap.ticker.remove(this.tick);
    this.lenis?.destroy();
  }

  private init() {
    const scroller = this.scroller.nativeElement;
    const root = this.content.nativeElement;

    this.lenis = new Lenis({ wrapper: scroller, content: root, lerp: 0.09 });
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(this.tick);
    gsap.ticker.lagSmoothing(0);

    const q = <T extends Element>(sel: string) => gsap.utils.toArray<T>(sel, root);

    this.ctx = gsap.context(() => {
      // ── Atoms. Hidden up front; ScrollTrigger.batch then staggers in whatever
      // enters together. The first batch is what's on screen on arrival: after a
      // page change those slide in sideways from the direction of travel,
      // otherwise everything rises in.
      const atoms = q<HTMLElement>('[data-reveal]');
      const dir = this.transitions.dir;
      gsap.set(atoms, { opacity: 0, y: 28 });
      if (dir) gsap.set(atoms.filter(onScreen), { y: 0, x: dir * 64 });
      ScrollTrigger.batch(atoms, {
        scroller, start: 'top 94%', once: true,
        onEnter: batch => gsap.to(batch, {
          opacity: 1, x: 0, y: 0, duration: 0.7, ease: 'power3.out', overwrite: true,
          stagger: Math.min(0.06, 0.6 / batch.length),
        }),
      });

      // ── Depth drift ──────────────────────────────────────────────────────
      q<HTMLElement>('[data-speed]').forEach(el => {
        const speed = parseFloat(el.dataset['speed'] ?? '1');
        const trigger = el.closest('section') ?? el;
        gsap.fromTo(el, { y: () => speed * 120 }, {
          y: () => speed * -120, ease: 'none',
          scrollTrigger: { scroller, trigger, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        });
      });

      // ── Images move inside their frames ──────────────────────────────────
      q<HTMLElement>('.work-img').forEach(img => {
        gsap.fromTo(img, { yPercent: -9 }, {
          yPercent: 9, ease: 'none',
          scrollTrigger: { scroller, trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });
    }, root);
  }

  /** Staggered exit, top to bottom: each visible atom flies off against the
   *  direction of travel. Resolves when the last one is gone — or after 1s
   *  regardless, so a stalled animation (hidden tab: no rAF) can't block routing. */
  leave(dir: 1 | -1): Promise<void> {
    const atoms = gsap.utils.toArray<HTMLElement>('[data-reveal], [data-exit]', this.content.nativeElement)
      .filter(el => onScreen(el) && +getComputedStyle(el).opacity > 0);
    if (!atoms.length) return Promise.resolve();
    return new Promise(resolve => this.zone.runOutsideAngular(() => {
      setTimeout(resolve, 1000);
      gsap.to(atoms, {
        x: -dir * 64, opacity: 0, duration: 0.32, ease: 'power2.in', overwrite: true,
        stagger: Math.min(0.035, 0.4 / atoms.length),
        onComplete: () => resolve(),
      });
    }));
  }
}

function onScreen(el: Element) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
