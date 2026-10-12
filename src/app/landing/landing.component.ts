import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild, inject } from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import cvData from '../data/cv-data.json';

interface Link { label: string; url: string; }
interface Job { role: string; company: string; period: string; points: string[]; }
interface Project { name: string; tagline: string; flow: string[]; points: string[]; url?: string; }
interface Work { name: string; company: string; description: string; url?: string; images: string[]; }

interface CvData {
  profile: { firstName: string; lastName: string; fullName: string; panelRole: string; resumeRole: string; };
  contacts: { location: string; email: string; phone: string; linkedin: Link; github: Link; };
  status: string;
  nav: { label: string; target: string; }[];
  contact: { title: string; intro: string; whatsappUrl: string; phone: string; phoneUrl: string; };
  stackTicker: string[];
  summary: string;
  skills: { label: string; items: string[]; }[];
  experience: Job[];
  projects: Project[];
  portfolio: { projects: Work[]; };
  education: { title: string; org: string; year: string; }[];
  languages: string[];
}

// Tech logos for the hero rail (an endless sideways slider).
const TECH_ICONS = [
  { icon: 'icons/angular.svg',    label: 'Angular' },
  { icon: 'icons/typescript.svg', label: 'TypeScript' },
  { icon: 'icons/nodedotjs.svg',  label: 'Node.js' },
  { icon: 'icons/anthropic.svg',  label: 'Claude API' },
];
// Sets per half of the loop — enough to cover a wide desktop viewport.
const RAIL_REPEAT = 3;

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly cv = cvData as unknown as CvData;
  readonly railItems = Array.from({ length: RAIL_REPEAT * 2 }, () => TECH_ICONS).flat();
  readonly ticker = [...this.cv.stackTicker, ...this.cv.stackTicker, ...this.cv.stackTicker];
  readonly work = this.cv.portfolio.projects.filter(p => p.images.length);
  readonly letters = this.cv.profile.firstName.split('');
  readonly lastLetters = this.cv.profile.lastName.split('');

  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: true }) content!: ElementRef<HTMLElement>;

  private zone = inject(NgZone);
  private lenis?: Lenis;
  private ctx?: gsap.Context;
  private roleFit?: ResizeObserver;
  private tick = (t: number) => this.lenis?.raf(t * 1000);

  scrollTo(target: string, e?: Event) {
    e?.preventDefault();
    const el = document.getElementById(target);
    if (!el) return;
    if (this.lenis) this.lenis.scrollTo(el, { offset: -8, duration: 1.4 });
    else el.scrollIntoView();
  }

  ngAfterViewInit() {
    // The scroll loop runs every frame — keep it out of Angular's change detection.
    this.zone.runOutsideAngular(() => {
      this.fitRole();
      this.init();
    });
  }

  ngOnDestroy() {
    this.roleFit?.disconnect();
    this.ctx?.revert();
    gsap.ticker.remove(this.tick);
    this.lenis?.destroy();
  }

  // Stretch the role line to exactly the width of the name above it by spreading
  // its letters; if it can't fit even unspaced (narrow phones), shrink the font.
  // Re-runs whenever the name's box changes: resize, rotation, web-font swap.
  private fitRole() {
    const root = this.content.nativeElement;
    const name = root.querySelector<HTMLElement>('.hero .name');
    const role = root.querySelector<HTMLElement>('.hero .role');
    if (!name || !role) return;
    const chars = role.textContent!.trim().length;
    const fit = () => {
      Object.assign(role.style, { letterSpacing: '0px', marginRight: '', fontSize: '' });
      // offsetWidth, not getBoundingClientRect: the hero is scaled on scroll.
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

  private init() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);
    const scroller = this.scroller.nativeElement;
    ScrollTrigger.defaults({ scroller });

    this.lenis = new Lenis({ wrapper: scroller, content: this.content.nativeElement, lerp: 0.09 });
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(this.tick);
    gsap.ticker.lagSmoothing(0);

    const root = this.content.nativeElement;
    const q = <T extends Element>(sel: string) => gsap.utils.toArray<T>(sel, root);

    this.ctx = gsap.context(() => {
      // ── Intro: name letters rise in, rail slides up ─────────────────────
      gsap.from('.hero .ch', { yPercent: 110, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04, delay: 0.4 });
      gsap.from('.hero .fade-in', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.9 });
      gsap.from('.rail', { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', delay: 1.1 });

      // ── Tech rail: endless loop that eases down to a crawl on hover (never stops)
      const rail = root.querySelector<HTMLElement>('.rail');
      const loop = gsap.to('.rail-track', { xPercent: -50, duration: 36, ease: 'none', repeat: -1 });
      const slow = () => gsap.to(loop, { timeScale: 0.25, duration: 0.6, ease: 'power2.out', overwrite: true });
      const normal = () => gsap.to(loop, { timeScale: 1, duration: 0.6, ease: 'power2.in', overwrite: true });
      rail?.addEventListener('pointerenter', slow);
      rail?.addEventListener('pointerleave', normal);

      // ── Hero layer: pinned (sticky) and receding as the next card slides over it
      // Fades out fully: the cards are translucent, so leftover hero copy would show through.
      gsap.to('.hero-inner', {
        scale: 0.92, opacity: 0, yPercent: -8, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });
      // On the track, not .rail — .rail already has the intro opacity tween.
      gsap.to('.rail-track', {
        opacity: 0, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      // ── Generic depth: [data-speed] drifts relative to its section ───────
      q<HTMLElement>('[data-speed]').forEach(el => {
        const speed = parseFloat(el.dataset['speed'] ?? '1');
        const trigger = el.closest('section') ?? el;
        gsap.fromTo(el, { y: () => speed * 120 }, {
          y: () => speed * -120, ease: 'none',
          scrollTrigger: { trigger, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true },
        });
      });

      // ── Images move inside their frames (the classic window parallax) ────
      q<HTMLElement>('.work-img').forEach(img => {
        gsap.fromTo(img, { yPercent: -9 }, {
          yPercent: 9, ease: 'none',
          scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      // ── Big marquee words slide sideways ─────────────────────────────────
      q<HTMLElement>('.marquee-row').forEach((row, i) => {
        gsap.fromTo(row, { xPercent: i % 2 ? -30 : 0 }, {
          xPercent: i % 2 ? 0 : -30, ease: 'none',
          scrollTrigger: { trigger: row.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      });

      // ── Reveals ──────────────────────────────────────────────────────────
      q<HTMLElement>('[data-reveal]').forEach(el => {
        gsap.from(el, {
          y: 32, opacity: 0, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 94%', once: true },
        });
      });

      // ── Scroll-spy: underline the nav link of the section in the middle of the viewport
      // Cards overlap slightly, so make the highlight exclusive rather than per-link.
      const links = Array.from(document.querySelectorAll<HTMLElement>('.topbar nav a[data-target]'));
      const setActive = (link?: HTMLElement) => links.forEach(l => l.classList.toggle('active', l === link));
      links.forEach(link => {
        const section = document.getElementById(link.dataset['target']!);
        if (!section) return;
        ScrollTrigger.create({
          trigger: section, start: 'top 50%', end: 'bottom 50%',
          onToggle: self => { if (self.isActive) setActive(link); else if (link.classList.contains('active')) setActive(); },
        });
      });

      // ── Background layers (fixed canvases from other components) ─────────
      const vh = window.innerHeight;
      const stars = document.getElementById('starCanvas');
      const planet = document.getElementById('planetCanvas');
      const bg = { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true };
      if (stars) gsap.fromTo(stars, { scale: 1.2, y: 0 }, { y: -vh * 0.08, ease: 'none', scrollTrigger: bg });
      // The globe overflows the canvas bottom (it sits lower-right), so it may only
      // sink: lifting the canvas would expose that cut edge. The top is empty sky.
      if (planet) gsap.to(planet, { y: vh * 0.2, ease: 'none', scrollTrigger: bg });
      // The cards are translucent, so dim the bright globe once copy scrolls over it.
      if (planet) gsap.to(planet, {
        opacity: 0.45, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
      });

      // Runs on ctx.revert(): drop the rail hover listeners added above.
      return () => {
        rail?.removeEventListener('pointerenter', slow);
        rail?.removeEventListener('pointerleave', normal);
      };
    }, root);
  }
}
