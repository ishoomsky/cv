import { Component, AfterViewInit, OnDestroy, HostListener, inject } from '@angular/core';
import { SpaceService } from '../space.service';

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  twPhase: number;   // twinkle phase offset
  twSpeed: number;   // twinkle frequency
  speed: number;     // horizontal drift (0 for far/static stars)
  color: string;     // "r,g,b"
  glow: boolean;     // bright "hero" star with halo + spikes
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  progress: number;  // 0..1 across its lifetime
  life: number;      // seconds elapsed
  max: number;       // seconds total
}

@Component({
  selector: 'app-star-field',
  templateUrl: './star-field.component.html',
  standalone: true,
  styleUrls: ['./star-field.component.scss']
})
export class StarFieldComponent implements AfterViewInit, OnDestroy {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private meteors: Meteor[] = [];
  private frameId = 0;
  private start = performance.now();
  private nextMeteor = 1.5; // seconds until the first meteor
  private lastW = -1;       // last width — recreate stars only when it changes
  private w = 0;            // canvas size in CSS px (the backing store is DPR-scaled)
  private h = 0;
  // Decorative layer: capped at ~30fps — halves the loop's main-thread cost
  // and slow drift/twinkle can't tell the difference. Motion below is scaled
  // by dt (in 60fps-frame units) so the visual speed stays what it was tuned
  // to at 60fps.
  private static readonly FRAME_MS = 1000 / 30;
  private lastFrame = 0;
  private space = inject(SpaceService);
  // Pre-rendered halo per star colour: a radial gradient drawn once and then
  // blitted, instead of a new gradient object per glow star per frame.
  private glowSprites = new Map<string, HTMLCanvasElement>();
  private static readonly GLOW_SPRITE_R = 32;
  // Users who asked for less motion get a still starfield (no drift/twinkle/meteors).
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  // Depth layers: [count, driftSpeed]. Far layers barely move (parallax).
  private readonly layers: { count: number; speed: number }[] = [
    { count: 110, speed: 0.0 },   // distant, fixed field
    { count: 50,  speed: 0.06 },
    { count: 30,  speed: 0.13 },
    { count: 16,  speed: 0.24 },
    { count: 7,   speed: 0.40 },  // near, fast
  ];

  private readonly palette = ['255,255,255', '255,255,255', '186,214,255', '255,226,184'];
  // Rare "signal" stars in the panel's two accent hues — sparse (~3.5% of the
  // field) so the starfield still reads as white/blue, not tinted.
  private readonly accentPalette = ['0,212,255', '34,197,94'];

  ngAfterViewInit() {
    this.canvas = document.getElementById('starCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    if (this.reduceMotion) this.renderStatic();
    else this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
  }

  @HostListener('window:resize')
  resizeCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    // DPR-scaled backing store so sub-pixel stars stay crisp on retina instead of
    // being upscaled into soft blobs. Resizing resets the transform, so reapply it.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Only repopulate on a real width change (orientation/desktop resize).
    // Mobile URL-bar show/hide changes height only — skip to avoid flicker.
    if (w !== this.lastW) {
      this.lastW = w;
      this.createStars();
    }
    // The rAF loop is off in reduced-motion mode, so repaint the still frame here.
    if (this.reduceMotion) this.renderStatic();
  }

  // Single static frame: every star at its base brightness, no motion.
  private renderStatic() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    for (const s of this.stars) this.drawStar(s, s.baseAlpha);
  }

  private createStars() {
    this.stars = [];
    for (const layer of this.layers) {
      for (let i = 0; i < layer.count; i++) {
        // Radius ~0.35–1.3px: fine pin-points; nearer layers only slightly larger.
        const size = Math.random() * 0.55 + 0.35 + layer.speed * 0.9;
        this.stars.push({
          x: Math.random() * this.w,
          y: Math.random() * this.h,
          size,
          baseAlpha: Math.random() * 0.45 + 0.45,
          twPhase: Math.random() * Math.PI * 2,
          twSpeed: Math.random() * 1.8 + 0.5,
          speed: layer.speed + Math.random() * 0.05,
          color: Math.random() < 0.035
            ? this.accentPalette[Math.floor(Math.random() * this.accentPalette.length)]
            : this.palette[Math.floor(Math.random() * this.palette.length)],
          glow: size > 1 && Math.random() < 0.4,
        });
      }
    }
  }

  private animate = (now = performance.now()) => {
    this.frameId = requestAnimationFrame(this.animate);
    const warp = this.space.warp;
    const elapsed = now - this.lastFrame;
    // Full frame rate while warping — streaks stutter visibly at 30fps.
    if (elapsed < (warp > 0 ? 1000 / 60 : StarFieldComponent.FRAME_MS)) return;
    this.lastFrame = now;
    // Clamped so a background-tab pause doesn't teleport everything on return.
    const dt = Math.min(elapsed / (1000 / 60), 4);

    const t = (now - this.start) / 1000;
    this.ctx.clearRect(0, 0, this.w, this.h);

    if (warp > 0.02) {
      this.drawWarp(warp, dt);
      return;
    }

    // Stars: drift + twinkle.
    for (const s of this.stars) {
      if (s.speed > 0) {
        s.x += s.speed * dt;
        if (s.x > this.w + 4) s.x = -4;
      }
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * s.twSpeed + s.twPhase));
      this.drawStar(s, s.baseAlpha * tw);
    }

    // Meteors: spawn on a random schedule, then streak and fade.
    if (t > this.nextMeteor) {
      this.spawnMeteor();
      this.nextMeteor = t + 2.5 + Math.random() * 4.5;
    }
    this.updateMeteors(dt);
  };

  // Page-change "hyperspace": the view flies sideways in the direction of travel
  // (SpaceService.warpDir), so every star streams the opposite way — nearer
  // (bigger) ones faster — drawn as a streak whose length tracks its speed. Stars
  // that leave the frame re-enter at the leading edge at a random height, so the
  // field is still evenly spread when the warp settles back to a drift.
  private drawWarp(warp: number, dt: number) {
    const { ctx, w, h } = this;
    const dir = this.space.warpDir;
    ctx.lineCap = 'round';
    for (const s of this.stars) {
      const v = warp * (0.4 + s.size) * 26 * dt;
      s.x -= dir * v;
      if (s.x < -40 || s.x > w + 40) {
        s.x = dir > 0 ? w + Math.random() * 40 : -Math.random() * 40;
        s.y = Math.random() * h;
        continue;
      }
      const len = v * 3.2;
      ctx.strokeStyle = `rgba(${s.color},${Math.min(1, s.baseAlpha * (0.6 + warp))})`;
      ctx.lineWidth = s.size * (1 + warp * 0.6);
      ctx.beginPath();
      ctx.moveTo(s.x + dir * len, s.y);  // tail trails behind the motion
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
  }

  private drawStar(s: Star, alpha: number) {
    const { ctx } = this;
    if (s.glow) {
      const r = s.size * 5;
      ctx.globalAlpha = alpha;
      ctx.drawImage(this.glowSprite(s.color), s.x - r, s.y - r, r * 2, r * 2);
      ctx.globalAlpha = 1;

      // Faint diffraction spikes (cross), like bright stars through a lens.
      ctx.strokeStyle = `rgba(${s.color},${alpha * 0.35})`;
      ctx.lineWidth = 0.5;
      const spike = s.size * 6;
      ctx.beginPath();
      ctx.moveTo(s.x - spike, s.y); ctx.lineTo(s.x + spike, s.y);
      ctx.moveTo(s.x, s.y - spike); ctx.lineTo(s.x, s.y + spike);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${s.color},${alpha})`;
    ctx.fill();
  }

  private glowSprite(color: string) {
    let c = this.glowSprites.get(color);
    if (!c) {
      const R = StarFieldComponent.GLOW_SPRITE_R;
      c = document.createElement('canvas');
      c.width = c.height = R * 2;
      const g2 = c.getContext('2d')!;
      const g = g2.createRadialGradient(R, R, 0, R, R, R);
      g.addColorStop(0, `rgba(${color},0.5)`);
      g.addColorStop(1, `rgba(${color},0)`);
      g2.fillStyle = g;
      g2.fillRect(0, 0, R * 2, R * 2);
      this.glowSprites.set(color, c);
    }
    return c;
  }

  private spawnMeteor() {
    const { w, h } = this;
    const fromLeft = Math.random() < 0.5;
    const angle = Math.PI * (0.16 + Math.random() * 0.12); // shallow downward
    const speed = 7 + Math.random() * 5;
    const dir = fromLeft ? 1 : -1;
    this.meteors.push({
      x: fromLeft ? -40 : w + 40,
      y: Math.random() * h * 0.45,
      vx: Math.cos(angle) * speed * dir,
      vy: Math.sin(angle) * speed,
      len: 90 + Math.random() * 140,
      progress: 0,
      life: 0,
      max: 1.1 + Math.random() * 0.7,
    });
  }

  private updateMeteors(dt: number) {
    const { ctx } = this;
    this.meteors = this.meteors.filter(m => {
      m.life += dt / 60;
      m.progress = m.life / m.max;
      if (m.progress >= 1) return false;
      m.x += m.vx * dt;
      m.y += m.vy * dt;

      // Fade in then out across the lifetime.
      const fade = Math.sin(m.progress * Math.PI);
      const mag = Math.hypot(m.vx, m.vy);
      const tx = m.x - (m.vx / mag) * m.len;
      const ty = m.y - (m.vy / mag) * m.len;

      const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
      grad.addColorStop(0, `rgba(255,255,255,${0.9 * fade})`);
      grad.addColorStop(0.3, `rgba(190,220,255,${0.4 * fade})`);
      grad.addColorStop(1, 'rgba(190,220,255,0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Bright head.
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.fill();
      return true;
    });
  }
}
