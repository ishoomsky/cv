import { Component, AfterViewInit, OnDestroy, HostListener } from '@angular/core';

interface Tile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  swayPhase: number;  // gentle sway so the logo stays readable
  depth: number;      // 0.4..1 → size / speed / opacity
  icon: HTMLImageElement;
  brand: string;
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
  private tiles: Tile[] = [];
  private icons: { img: HTMLImageElement; brand: string }[] = [];
  private frameId = 0;
  private start = performance.now();
  private W = 0;
  private H = 0;
  private dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Floating tech debris carries the CV's actual stack.
  private readonly iconDefs = [
    { src: 'icons/typescript.svg', brand: '#3178C6' },
    { src: 'icons/angular.svg',    brand: '#DD0031' },
    { src: 'icons/nodedotjs.svg',  brand: '#5FA04E' },
    { src: 'icons/anthropic.svg',  brand: '#D97757' },
  ];

  ngAfterViewInit() {
    this.canvas = document.getElementById('asteroidCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.loadIcons();
    this.resizeCanvas();
    this.spawnTiles();
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

  private spawnTiles() {
    this.tiles = this.icons.map(ic => this.makeTile(ic.img, ic.brand));
    // Distribute across the whole screen instead of all at one edge.
    for (const t of this.tiles) {
      t.x = Math.random() * this.W;
      t.y = Math.random() * this.H;
    }
  }

  private makeTile(icon: HTMLImageElement, brand: string): Tile {
    const depth = 0.4 + Math.random() * 0.6;
    const horiz = Math.random() < 0.5 ? 1 : -1;
    return {
      x: 0,
      y: 0,
      vx: horiz * (0.1 + depth * 0.5),
      vy: (Math.random() - 0.5) * 0.3 * depth,
      size: 19 * (0.7 + depth * 0.85),
      swayPhase: Math.random() * Math.PI * 2,
      depth,
      icon,
      brand,
    };
  }

  private animate = () => {
    const t = (performance.now() - this.start) / 1000;
    this.ctx.clearRect(0, 0, this.W, this.H);

    for (const tile of this.tiles) {
      tile.x += tile.vx;
      tile.y += tile.vy;
      this.wrap(tile);
      this.drawTile(tile, t);
    }
    this.frameId = requestAnimationFrame(this.animate);
  };

  private wrap(t: Tile) {
    const m = t.size * 1.8;
    if (t.x < -m) t.x = this.W + m;
    if (t.x > this.W + m) t.x = -m;
    if (t.y < -m) t.y = this.H + m;
    if (t.y > this.H + m) t.y = -m;
  }

  private drawTile(t: Tile, time: number) {
    const ctx = this.ctx;
    const s = t.size;
    ctx.save();
    ctx.globalAlpha = 0.45 + t.depth * 0.55;
    ctx.translate(t.x, t.y);
    ctx.rotate(Math.sin(time * 0.35 + t.swayPhase) * 0.25); // gentle sway

    ctx.beginPath();
    ctx.roundRect(-s, -s, s * 2, s * 2, s * 0.28);

    const g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, '#2b3140');
    g.addColorStop(1, '#11141b');
    ctx.fillStyle = g;
    ctx.shadowColor = t.brand;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.lineWidth = 1.3;
    ctx.strokeStyle = t.brand;
    ctx.globalAlpha *= 0.8;
    ctx.stroke();
    ctx.globalAlpha /= 0.8;

    const img = t.icon;
    if (img && img.complete && img.naturalWidth) {
      const isz = s * 1.15;
      ctx.drawImage(img, -isz / 2, -isz / 2, isz, isz);
    }
    ctx.restore();
  }
}
