import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';

interface Body {
  kind: 'rock' | 'tech';
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vrot: number;       // tumble speed (rocks)
  swayPhase: number;  // gentle sway (tech tiles stay readable)
  depth: number;      // 0.35..1 → size / speed / opacity
  icon?: HTMLImageElement;
  brand?: string;
  verts?: number[];
  craters?: { x: number; y: number; r: number }[];
}

@Component({
  selector: 'app-asteroids',
  templateUrl: './asteroids.component.html',
  standalone: true,
  styleUrls: ['./asteroids.component.scss']
})
export class AsteroidsComponent implements AfterViewInit, OnDestroy {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private bodies: Body[] = [];
  private icons: { img: HTMLImageElement; brand: string }[] = [];
  private frameId = 0;
  private start = performance.now();
  private W = 0;
  private H = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Tech debris carries the CV's actual stack.
  private readonly iconDefs = [
    { src: '/icons/typescript.svg', brand: '#3178C6' },
    { src: '/icons/angular.svg',    brand: '#DD0031' },
    { src: '/icons/nodedotjs.svg',  brand: '#5FA04E' },
    { src: '/icons/anthropic.svg',  brand: '#D97757' },
  ];

  ngAfterViewInit() {
    this.canvas = document.getElementById('asteroidCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.loadIcons();
    this.resizeCanvas();
    this.spawnBodies();
    this.animate();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.frameId);
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * this.dpr;
    this.canvas.height = this.H * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private loadIcons() {
    this.icons = this.iconDefs.map(d => {
      const img = new Image();
      img.src = d.src;
      return { img, brand: d.brand };
    });
  }

  private spawnBodies() {
    this.bodies = [];
    // One tech tile per stack icon.
    for (const ic of this.icons) {
      this.bodies.push(this.makeBody('tech', ic.img, ic.brand));
    }
    // A scatter of rocky asteroids for ambiance.
    for (let i = 0; i < 5; i++) {
      this.bodies.push(this.makeBody('rock'));
    }
    // Distribute across the whole screen instead of all at one edge.
    for (const b of this.bodies) {
      b.x = Math.random() * this.W;
      b.y = Math.random() * this.H;
    }
  }

  private makeBody(kind: 'rock' | 'tech', icon?: HTMLImageElement, brand?: string): Body {
    const depth = 0.4 + Math.random() * 0.6;
    const base = kind === 'tech' ? 19 : 16;
    const size = base * (0.7 + depth * 0.85);
    const horiz = Math.random() < 0.5 ? 1 : -1;

    const body: Body = {
      kind,
      x: 0,
      y: 0,
      vx: horiz * (0.1 + depth * 0.5),
      vy: (Math.random() - 0.5) * 0.3 * depth,
      size,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.012,
      swayPhase: Math.random() * Math.PI * 2,
      depth,
      icon,
      brand,
    };

    if (kind === 'rock') {
      const n = 9 + Math.floor(Math.random() * 3);
      body.verts = Array.from({ length: n }, () => 0.72 + Math.random() * 0.28);
      body.craters = Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({
        x: (Math.random() - 0.5) * 0.9,
        y: (Math.random() - 0.5) * 0.9,
        r: 0.08 + Math.random() * 0.12,
      }));
    }
    return body;
  }

  private animate = () => {
    const t = (performance.now() - this.start) / 1000;
    this.ctx.clearRect(0, 0, this.W, this.H);

    for (const b of this.bodies) {
      b.x += b.vx;
      b.y += b.vy;
      b.rot += b.vrot;
      this.wrap(b);
      this.drawBody(b, t);
    }
    this.frameId = requestAnimationFrame(this.animate);
  };

  private wrap(b: Body) {
    const m = b.size * 1.8;
    if (b.x < -m) b.x = this.W + m;
    if (b.x > this.W + m) b.x = -m;
    if (b.y < -m) b.y = this.H + m;
    if (b.y > this.H + m) b.y = -m;
  }

  private drawBody(b: Body, t: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.45 + b.depth * 0.55;
    ctx.translate(b.x, b.y);
    // Rocks tumble freely; tech tiles only sway so logos stay readable.
    const rot = b.kind === 'tech' ? Math.sin(t * 0.35 + b.swayPhase) * 0.25 : b.rot;
    ctx.rotate(rot);
    b.kind === 'rock' ? this.drawRock(b) : this.drawTech(b);
    ctx.restore();
  }

  private drawRock(b: Body) {
    const ctx = this.ctx;
    const s = b.size;
    const v = b.verts!;
    const n = v.length;

    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = s * v[i];
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();

    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#6c7079');
    g.addColorStop(0.5, '#3d404a');
    g.addColorStop(1, '#1f2228');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(15,17,22,0.85)';
    ctx.stroke();

    for (const c of b.craters!) {
      ctx.beginPath();
      ctx.arc(c.x * s, c.y * s, c.r * s, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();
    }
  }

  private drawTech(b: Body) {
    const ctx = this.ctx;
    const s = b.size;
    const rad = s * 0.28;

    ctx.beginPath();
    ctx.roundRect(-s, -s, s * 2, s * 2, rad);

    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#2b3140');
    g.addColorStop(1, '#11141b');
    ctx.fillStyle = g;
    ctx.shadowColor = b.brand!;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = 1.3;
    ctx.strokeStyle = b.brand!;
    ctx.globalAlpha *= 0.8;
    ctx.stroke();
    ctx.globalAlpha /= 0.8;

    const img = b.icon;
    if (img && img.complete && img.naturalWidth) {
      const isz = s * 1.15;
      ctx.drawImage(img, -isz / 2, -isz / 2, isz, isz);
    }
  }
}
