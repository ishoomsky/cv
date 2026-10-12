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

// Floating tech tiles in the hero. `speed` is the parallax depth: bigger
// numbers travel further as you scroll, so they read as closer to the camera.
const TILES = [
  { icon: 'icons/typescript.svg', x: '58%', y: '14%', size: 112, rot: -14, speed: 1.4 },
  { icon: 'icons/angular.svg',    x: '78%', y: '30%', size: 150, rot: 12,  speed: 0.8 },
  { icon: 'icons/nodedotjs.svg',  x: '64%', y: '58%', size: 124, rot: 18,  speed: 1.8 },
  { icon: 'icons/anthropic.svg',  x: '88%', y: '70%', size: 96,  rot: -10, speed: 1.1 },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  readonly cv = cvData as unknown as CvData;
  readonly tiles = TILES;
  readonly ticker = [...this.cv.stackTicker, ...this.cv.stackTicker, ...this.cv.stackTicker];
  readonly work = this.cv.portfolio.projects.filter(p => p.images.length);
  readonly letters = this.cv.profile.firstName.split('');
  readonly lastLetters = this.cv.profile.lastName.split('');

  @ViewChild('scroller', { static: true }) scroller!: ElementRef<HTMLElement>;
  @ViewChild('content', { static: true }) content!: ElementRef<HTMLElement>;

  private zone = inject(NgZone);
  private lenis?: Lenis;
  private ctx?: gsap.Context;
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
    this.zone.runOutsideAngular(() => this.init());
  }

  ngOnDestroy() {
    this.ctx?.revert();
    gsap.ticker.remove(this.tick);
    this.lenis?.destroy();
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
      // ── Intro: name letters rise in, tiles pop ───────────────────────────
      gsap.from('.hero .ch', { yPercent: 110, opacity: 0, duration: 1.1, ease: 'expo.out', stagger: 0.04, delay: 0.4 });
      gsap.from('.hero .fade-in', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12, delay: 0.9 });
      gsap.from('.tile', { scale: 0.4, opacity: 0, duration: 1.2, ease: 'back.out(1.6)', stagger: 0.12, delay: 0.7 });

      // ── Hero layer: pinned (sticky) and receding as the next card slides over it
      gsap.to('.hero-inner', {
        scale: 0.92, opacity: 0.15, yPercent: -8, ease: 'none',
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

      // ── Tiles also spin slowly with scroll ───────────────────────────────
      q<HTMLElement>('.tile-spin').forEach((el, i) => {
        gsap.to(el, {
          rotation: (i % 2 ? -1 : 1) * 40, ease: 'none',
          scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true },
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
          y: 56, opacity: 0, duration: 0.9, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
        });
      });

      // ── Background layers (fixed canvases from other components) ─────────
      const vh = window.innerHeight;
      const stars = document.getElementById('starCanvas');
      const planet = document.getElementById('planetCanvas');
      const bg = { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true };
      if (stars) gsap.fromTo(stars, { scale: 1.2, y: 0 }, { y: -vh * 0.08, ease: 'none', scrollTrigger: bg });
      if (planet) gsap.to(planet, { y: -vh * 0.35, ease: 'none', scrollTrigger: bg });
    }, root);
  }
}
