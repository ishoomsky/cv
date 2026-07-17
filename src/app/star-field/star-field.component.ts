import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';

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
  // Decorative layer: capped at ~30fps — halves the loop's main-thread cost
  // and slow drift/twinkle can't tell the difference. Motion below is scaled
  // by dt (in 60fps-frame units) so the visual speed stays what it was tuned
  // to at 60fps.
  private static readonly FRAME_MS = 1000 / 30;
  private lastFrame = 0;
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
    this.canvas.width = w;
    this.canvas.height = h;
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const s of this.stars) this.drawStar(s, s.baseAlpha);
  }

  private createStars() {
    this.stars = [];
    for (const layer of this.layers) {
      for (let i = 0; i < layer.count; i++) {
        const size = Math.random() * 1.6 + 0.5 + layer.speed * 1.5;
        this.stars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size,
          baseAlpha: Math.random() * 0.45 + 0.45,
          twPhase: Math.random() * Math.PI * 2,
          twSpeed: Math.random() * 1.8 + 0.5,
          speed: layer.speed + Math.random() * 0.05,
          color: Math.random() < 0.035
            ? this.accentPalette[Math.floor(Math.random() * this.accentPalette.length)]
            : this.palette[Math.floor(Math.random() * this.palette.length)],
          glow: size > 1.9 && Math.random() < 0.5,
        });
      }
    }
  }

  private animate = (now = performance.now()) => {
    this.frameId = requestAnimationFrame(this.animate);
    const elapsed = now - this.lastFrame;
    if (elapsed < StarFieldComponent.FRAME_MS) return;
    this.lastFrame = now;
    // Clamped so a background-tab pause doesn't teleport everything on return.
    const dt = Math.min(elapsed / (1000 / 60), 4);

    const t = (now - this.start) / 1000;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Stars: drift + twinkle.
    for (const s of this.stars) {
      if (s.speed > 0) {
        s.x += s.speed * dt;
        if (s.x > this.canvas.width + 4) s.x = -4;
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

  private drawStar(s: Star, alpha: number) {
    const { ctx } = this;
    if (s.glow) {
      const r = s.size * 4.5;
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
      g.addColorStop(0, `rgba(${s.color},${alpha * 0.5})`);
      g.addColorStop(1, `rgba(${s.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Faint diffraction spikes (cross), like bright stars through a lens.
      ctx.strokeStyle = `rgba(${s.color},${alpha * 0.35})`;
      ctx.lineWidth = 0.6;
      const spike = s.size * 5;
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

  private spawnMeteor() {
    const w = this.canvas.width, h = this.canvas.height;
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
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      // Bright head.
      ctx.beginPath();
      ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.fill();
      return true;
    });
  }
}
