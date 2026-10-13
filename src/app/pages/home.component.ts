import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CV } from '../cv';
import { PageComponent, cappedStagger } from '../page/page.component';
import { PlanetPose, SpaceService } from '../space.service';
import { MOTION, dist, dur } from '../motion.config';
import { PageTransitionService } from '../page/page-transition.service';
import { AboutSection } from '../sections/about.section';
import { ExperienceSection } from '../sections/experience.section';
import { EducationSection } from '../sections/education.section';

// Over the whole Home scroll the globe rises this far (scene units) — enough to
// carry it off the top — and it dims to this opacity while the hero scrolls away.
const RISE = 3.2;
const DIMMED = 0.45;

// Tech logos for the hero rail (an endless sideways slider).
const TECH_ICONS = [
  { icon: 'icons/angular.svg',    label: 'Angular' },
  { icon: 'icons/typescript.svg', label: 'TypeScript' },
  { icon: 'icons/nodedotjs.svg',  label: 'Node.js' },
  { icon: 'icons/anthropic.svg',  label: 'Claude API' },
  { icon: 'icons/gcp.svg',        label: 'GCP' },
];
// Sets per half of the loop — enough to cover a wide desktop viewport.
const RAIL_REPEAT = 3;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PageComponent, RouterLink, AboutSection, ExperienceSection, EducationSection],
  template: `
    <app-page>
      <section class="hero">
        <div class="hero-inner">
          <!-- One column exactly as wide as the name: the role is spaced to it, and
               the greeting + stack fill it without widening it (see .intro). -->
          <div class="hero-col">
            <h1 class="name" [attr.aria-label]="cv.profile.fullName">
              <span class="line" aria-hidden="true">@for (c of letters; track $index) {<span class="mask"><span class="ch" data-exit>{{ c }}</span></span>}<span class="accent"><span class="mask"><span class="ch" data-exit>.</span></span>@for (c of lastLetters; track $index) {<span class="mask"><span class="ch" data-exit>{{ c }}</span></span>}</span></span>
            </h1>
            <p class="role fade-in" data-exit>{{ cv.profile.panelRole }}</p>
            <p class="eyebrow fade-in" data-exit><span class="pulse" aria-hidden="true"></span>{{ cv.status }} · {{ cv.contacts.location }}</p>
            <!-- Greeting (first summary paragraph) + the stack under it, so "who I am"
                 is on the first screen. Both span the name's width. -->
            <div class="intro">
              <p class="greeting fade-in" data-exit>{{ greeting }}</p>

              <!-- Decorative — the same stack is listed as chips in About below. The
                   track repeats the set to fill the width, then doubles the run so a
                   -50% translate loops seamlessly. -->
              <div class="stack fade-in" data-exit aria-hidden="true">
                <p class="stack-label">My everyday stack:</p>
                <div class="rail">
                  <div class="rail-track">
                    @for (t of railItems; track $index) {
                      <div class="rail-item">
                        <span class="rail-icon"><img [src]="t.icon" alt="" /></span>
                        <span class="rail-label">{{ t.label }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
            <!-- Atoms are the wrappers: .btn's own transform transition (hover lift)
                 would otherwise fight the GSAP slide. -->
            <div class="hero-ctas fade-in">
              <span class="btn-atom" data-exit><a class="btn primary" routerLink="/contact">Let's talk <span aria-hidden="true">→</span></a></span>
              <span class="btn-atom" data-exit><a class="btn ghost" routerLink="/portfolio">View portfolio</a></span>
            </div>
          </div>
        </div>
      </section>

      <section cvAbout></section>
      <section cvExperience></section>
      <section cvEducation></section>
    </app-page>
  `,
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  readonly cv = CV;
  readonly railItems = Array.from({ length: RAIL_REPEAT * 2 }, () => TECH_ICONS).flat();
  readonly letters = CV.profile.firstName.split('');
  readonly lastLetters = CV.profile.lastName.split('');
  readonly greeting = CV.summary.split('\n\n')[0];

  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private zone = inject(NgZone);
  private space = inject(SpaceService);
  private transitions = inject(PageTransitionService);
  private pose = inject(ActivatedRoute).snapshot.data['planet'] as PlanetPose;
  private ctx?: gsap.Context;
  private roleFit?: ResizeObserver;

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      this.fitRole();
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) this.animate();
    });
  }

  ngOnDestroy() {
    this.roleFit?.disconnect();
    this.ctx?.revert();
  }

  // Stretch the role line to exactly the width of the name above it by spreading
  // its letters; if it can't fit even unspaced (narrow phones), shrink the font.
  // Re-runs whenever the name's box changes: resize, rotation, web-font swap.
  private fitRole() {
    const root = this.host.nativeElement;
    const name = root.querySelector<HTMLElement>('.name');
    const role = root.querySelector<HTMLElement>('.role');
    if (!name || !role) return;
    const chars = role.textContent!.trim().length;
    const fit = () => {
      Object.assign(role.style, { letterSpacing: '0px', marginRight: '', fontSize: '' });
      // offsetWidth, not getBoundingClientRect: transforms (intro, warp) would skew it.
      const target = name.offsetWidth, natural = role.offsetWidth;
      if (natural > target) {
        role.style.fontSize = `${parseFloat(getComputedStyle(role).fontSize) * target / natural}px`;
        return;
      }
      const spacing = (target - natural) / (chars - 1);
      // letter-spacing also trails the last glyph; cancel it so the right edges align.
      Object.assign(role.style, { letterSpacing: `${spacing}px`, marginRight: `${-spacing}px` });
    };
    this.roleFit = new ResizeObserver(fit);
    this.roleFit.observe(name);
    document.fonts?.ready.then(fit);
  }

  private animate() {
    const root = this.host.nativeElement;
    this.ctx = gsap.context(() => {
      const dir = this.transitions.dir;
      if (dir) {
        // ── Arriving from another page: the hero atoms (the same [data-exit] set
        // that leaves) slide in one by one from the direction of travel, like
        // every other page's atoms. Letters wipe in inside their masks.
        const atoms = gsap.utils.toArray<HTMLElement>('[data-exit]', root);
        gsap.from(atoms, {
          // lazy: false applies the start pose now, not on the next tick — no
          // one-frame flash of the hero in its final position.
          x: dir * dist(64), opacity: 0, duration: dur(0.55), ease: 'power3.out', lazy: false,
          stagger: cappedStagger(0.035),
        });
      } else {
        // ── First load intro: name letters rise in, then the rest fades up ───
        // Built paused (the from-states hide everything right away) and played
        // once the spinner lifts.
        const intro = gsap.timeline({ paused: true })
          .from('.ch', { yPercent: 110 * MOTION.strength, opacity: 0, duration: dur(1.1), ease: 'expo.out', stagger: dur(0.04) }, dur(0.4))
          .from('.fade-in', { y: dist(24), opacity: 0, duration: dur(1), ease: 'power3.out', stagger: dur(0.12) }, dur(0.9));
        this.space.introReady.then(() => intro.play());
      }

      // ── Tech rail: endless loop that eases down to a crawl on hover (never stops)
      const rail = root.querySelector<HTMLElement>('.rail');
      const loop = gsap.to('.rail-track', { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
      const slow = () => gsap.to(loop, { timeScale: 0.25, duration: 0.6, ease: 'power2.out', overwrite: true });
      const normal = () => gsap.to(loop, { timeScale: 1, duration: 0.6, ease: 'power2.in', overwrite: true });
      rail?.addEventListener('pointerenter', slow);
      rail?.addEventListener('pointerleave', normal);

      // ── Globe follows the scroll: dims as the hero leaves, rises over the page.
      // It's moved inside the WebGL scene (via SpaceService), never by shifting the
      // canvas — that would expose the canvas edge that cuts the globe off.
      const scroller = root.querySelector<HTMLElement>('.scroller')!;
      ScrollTrigger.create({
        scroller, start: 0, end: 'max',
        onUpdate: self => {
          const hero = Math.min(1, scroller.scrollTop / window.innerHeight);
          this.space.planet = {
            ...this.pose,
            y: this.pose.y + self.progress * RISE,
            opacity: this.pose.opacity - (this.pose.opacity - DIMMED) * hero,
          };
        },
      });

      // Runs on ctx.revert(): drop the rail hover listeners added above.
      return () => {
        rail?.removeEventListener('pointerenter', slow);
        rail?.removeEventListener('pointerleave', normal);
      };
    }, root);
  }
}
