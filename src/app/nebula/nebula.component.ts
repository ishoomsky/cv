import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';

@Component({
  selector: 'app-nebula',
  templateUrl: './nebula.component.html',
  standalone: true,
  styleUrls: ['./nebula.component.scss']
})
export class NebulaComponent implements AfterViewInit, OnDestroy {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private offscreen!: HTMLCanvasElement; // pre-rendered blurred nebula
  private frameId = 0;
  private start = performance.now();
  private lastW = -1;   // last width — re-bake the nebula only when it changes
  // The drift is a minutes-long sine — between 60fps frames it moves by a
  // sub-pixel amount, so redrawing that often is pure waste. ~15fps keeps the
  // breathe/drift visually identical at a quarter of the cost.
  private static readonly FRAME_MS = 1000 / 15;
  private lastFrame = 0;
  // Reduced-motion: bake once and hold still, like the other canvas layers.
  private reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  ngAfterViewInit() {
    this.canvas = document.getElementById('nebulaCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.offscreen = document.createElement('canvas');
    this.resizeCanvas();
    if (this.reduceMotion) this.renderStatic();
    else this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Re-bake blobs only on a real width change; the drift draw already
    // oversizes the baked image, so a height-only change still covers.
    if (this.canvas.width !== this.lastW) {
      this.lastW = this.canvas.width;
      this.prerender();
    }
    // The rAF loop is off in reduced-motion mode, so repaint the still frame here.
    if (this.reduceMotion) this.renderStatic();
  }

  // Single still frame at base position/opacity (no drift, no breathe).
  private renderStatic() {
    const w = this.canvas.width, h = this.canvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.drawImage(this.offscreen, -24, -24, w + 48, h + 48);
  }

  // Bake the expensive blurred blobs once into an offscreen canvas.
  private prerender() {
    const w = this.canvas.width, h = this.canvas.height;
    this.offscreen.width = w;
    this.offscreen.height = h;
    const c = this.offscreen.getContext('2d')!;
    // 5 colours, 5 blobs per bake → each shows up roughly once. The CTA
    // green sits at a lower alpha so it reads as a sparse accent, not a
    // second dominant hue competing with the panel's cyan chrome.
    const colors = [
      'rgba(50, 150, 255, 0.55)',
      'rgba(0, 212, 255, 0.4)',
      'rgba(160, 60, 255, 0.5)',
      'rgba(80, 90, 255, 0.42)',
      'rgba(34, 197, 94, 0.3)',
    ];

    c.clearRect(0, 0, w, h);
    c.filter = 'blur(80px)';
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radiusX = Math.random() * 700 + 500;
      const radiusY = radiusX * 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      const grad = c.createRadialGradient(x, y, 0, x, y, radiusX);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      c.fillStyle = grad;
      c.beginPath();
      c.ellipse(x, y, radiusX * 0.6, radiusY * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      c.fill();
    }
    c.filter = 'none';
  }

  // Slowly drift and "breathe" the baked nebula so the backdrop feels alive.
  private animate = (now = performance.now()) => {
    this.frameId = requestAnimationFrame(this.animate);
    if (now - this.lastFrame < NebulaComponent.FRAME_MS) return;
    this.lastFrame = now;

    const t = (now - this.start) / 1000;
    const w = this.canvas.width, h = this.canvas.height;

    const dx = Math.sin(t * 0.03) * 18;
    const dy = Math.cos(t * 0.022) * 12;
    const breathe = 0.88 + 0.12 * Math.sin(t * 0.15);

    this.ctx.clearRect(0, 0, w, h);
    this.ctx.globalAlpha = breathe;
    // Draw slightly oversized so the drift never exposes a hard edge.
    this.ctx.drawImage(this.offscreen, dx - 24, dy - 24, w + 48, h + 48);
    this.ctx.globalAlpha = 1;
  };
}
