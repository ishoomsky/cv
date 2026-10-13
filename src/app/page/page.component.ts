import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { CV } from '../cv';
import { LeavingPage, PageTransitionService } from './page-transition.service';
import { MOTION, dist, dur } from '../motion.config';
import { SpaceService } from '../space.service';

gsap.registerPlugin(ScrollTrigger);

// The "Next →" link at the bottom of every page. Hidden for now (the top bar is
// the navigation); flip to true to bring it back — markup and styles are kept.
const SHOW_NEXT_LINK = false;

/**
 * Wraps every routed page: a full-screen scroller with Lenis smooth scrolling and
 * the declarative scroll effects, plus a "next page" link at the bottom
 * (currently hidden — see SHOW_NEXT_LINK).
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
        @if (showNext) {
          <a class="next-page" data-reveal [routerLink]="next.path">
            <span class="next-label">Next</span>
            <span class="next-title">{{ next.label }} <span aria-hidden="true">→</span></span>
          </a>
        }
      </main>
    </div>
  `,
})
export class PageComponent implements AfterViewInit, OnDestroy, LeavingPage {
  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: true }) content!: ElementRef<HTMLElement>;

  private zone = inject(NgZone);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private route = inject(ActivatedRoute);
  private transitions = inject(PageTransitionService);
  private space = inject(SpaceService);
  private reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private destroyed = false;
  private lenis?: Lenis;
  private ctx?: gsap.Context;
  private tick = (t: number) => this.lenis?.raf(t * 1000);

  /** The page after this one in nav order; Contact wraps back to Home. */
  readonly showNext = SHOW_NEXT_LINK;
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
    this.destroyed = true;
    if (this.transitions.current === this) this.transitions.current = undefined;
    this.ctx?.revert();
    gsap.ticker.remove(this.tick);
    this.lenis?.destroy();
  }

  private init() {
    const scroller = this.scroller.nativeElement;
    const root = this.content.nativeElement;

    this.lenis = new Lenis({ wrapper: scroller, content: root, lerp: 0.09 });
    this.lenis.on('scroll', () => {
      ScrollTrigger.update();
      this.space.markScrolling();
    });
    gsap.ticker.add(this.tick);
    gsap.ticker.lagSmoothing(0);

    const q = <T extends Element>(sel: string) => gsap.utils.toArray<T>(sel, root);

    this.ctx = gsap.context(() => {
      // ── Atoms. Hidden up front; ScrollTrigger.batch then staggers in whatever
      // enters together. The first batch is what's on screen on arrival: after a
      // page change those slide in sideways from the direction of travel,
      // otherwise everything rises in (on the first load, once the spinner
      // lifts). Speed/strength come from MOTION.
      const atoms = q<HTMLElement>('[data-reveal]');
      const dir = this.transitions.dir;
      gsap.set(atoms, { opacity: 0, y: dist(28) });
      if (dir) gsap.set(atoms.filter(onScreen), { y: 0, x: dir * dist(64) });
      const reveals = () => ScrollTrigger.batch(atoms, {
        scroller, start: 'top 94%', once: true,
        onEnter: batch => gsap.to(batch, {
          opacity: 1, x: 0, y: 0, duration: dur(0.55), ease: 'power3.out', overwrite: true,
          stagger: cappedStagger(0.04),
        }),
      });
      // After a page change, wait for the old page to mostly leave first.
      if (dir) gsap.delayedCall(dur(MOTION.pageEnterDelay), reveals);
      else this.atIntro(reveals);

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

  /** Run `fn` (in this page's GSAP context) once the intro spinner lifts. */
  private atIntro(fn: () => void) {
    this.space.introReady.then(() => {
      if (!this.destroyed) this.ctx?.add(fn);
    });
  }

  /** Exit without holding up the route change: the page is cloned as it looks
   *  right now (mid-animation included, same scroll position) into an inert
   *  "ghost" overlay, the real page is hidden, and the guard resolves at once —
   *  so the next page starts flying in immediately while the ghost's on-screen
   *  atoms fly off against the direction of travel, overlapping. A click on
   *  another page mid-transition just ghosts whatever is on screen at that
   *  moment, so transitions can be interrupted and retargeted freely. */
  leave(dir: 1 | -1): Promise<void> {
    const page = this.host.nativeElement;
    const atomSel = '[data-reveal], [data-exit]';
    const live = Array.from(page.querySelectorAll<HTMLElement>(atomSel));
    const leaving = new Set(live.filter(el => onScreen(el) && +getComputedStyle(el).opacity > 0));
    const scrollTop = this.scroller.nativeElement.scrollTop;

    const ghost = page.cloneNode(true) as HTMLElement;
    ghost.classList.add('page-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    document.body.appendChild(ghost);
    ghost.querySelector<HTMLElement>('.scroller')!.scrollTop = scrollTop;
    page.style.visibility = 'hidden';
    // If the navigation didn't go through after all, bring the page back.
    setTimeout(() => { if (!this.destroyed) page.style.visibility = ''; }, 600);

    // Clone order matches the live order, so indices map atom → ghost atom.
    const ghostAtoms = Array.from(ghost.querySelectorAll<HTMLElement>(atomSel)).filter((_, i) => leaving.has(live[i]));
    this.zone.runOutsideAngular(() => {
      const remove = () => ghost.remove();
      setTimeout(remove, 1500);  // never leave a ghost behind (hidden tab: no rAF)
      if (!ghostAtoms.length) return remove();
      gsap.to(ghostAtoms, {
        x: -dir * dist(64), opacity: 0, duration: dur(0.3), ease: 'power2.in',
        stagger: cappedStagger(0.025),
        onComplete: remove,
      });
    });
    return Promise.resolve();
  }
}

/** Stagger only the first few elements, then let the rest go together, so a
 *  long page doesn't turn into a slow cascade. */
export function cappedStagger(each: number, first = 8) {
  return (i: number) => Math.min(i, first) * dur(each);
}

function onScreen(el: Element) {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight;
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
