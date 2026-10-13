import { Component, AfterViewInit, HostListener } from '@angular/core';

/**
 * Blurred nebula blobs, baked once into the canvas (re-baked on a width change).
 * The slow drift and "breathing" are CSS animations of transform/opacity on the
 * canvas (nebula.component.scss), so they run on the compositor with no
 * per-frame main-thread drawing. The canvas is 48px oversized so the drift never
 * exposes an edge.
 */
@Component({
  selector: 'app-nebula',
  templateUrl: './nebula.component.html',
  standalone: true,
  styleUrls: ['./nebula.component.scss']
})
export class NebulaComponent implements AfterViewInit {
  private canvas!: HTMLCanvasElement;
  private lastW = -1;   // last width — re-bake only when it changes
  private static readonly BLEED = 48;

  ngAfterViewInit() {
    this.canvas = document.getElementById('nebulaCanvas') as HTMLCanvasElement;
    this.resizeCanvas();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    // Height-only changes (mobile URL bar) just stretch the blurred bitmap a
    // little via CSS — invisible, and it avoids a re-bake while scrolling.
    if (window.innerWidth === this.lastW) return;
    this.lastW = window.innerWidth;
    this.canvas.width = window.innerWidth + NebulaComponent.BLEED;
    this.canvas.height = window.innerHeight + NebulaComponent.BLEED;
    this.bake();
  }

  // The expensive blurred blobs, drawn once.
  private bake() {
    const w = this.canvas.width, h = this.canvas.height;
    const c = this.canvas.getContext('2d')!;
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

    // No `ctx.filter = 'blur()'`: Safari ignores it and the blobs come out as
    // hard-edged ellipses. Each blob is a unit radial gradient that falls off
    // smoothly to 0 at its edge, stretched into an ellipse with a transform.
    c.clearRect(0, 0, w, h);
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radiusX = Math.random() * 700 + 500;
      const radiusY = radiusX * 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const [r, g, b, a] = color.match(/[\d.]+/g)!.map(Number);
      const rgba = (k: number) => `rgba(${r}, ${g}, ${b}, ${(a * k).toFixed(3)})`;

      // Smooth, gaussian-like falloff instead of a linear one.
      const grad = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, rgba(1));
      grad.addColorStop(0.25, rgba(0.8));
      grad.addColorStop(0.5, rgba(0.42));
      grad.addColorStop(0.75, rgba(0.12));
      grad.addColorStop(1, rgba(0));

      c.save();
      c.translate(x, y);
      c.rotate(Math.random() * Math.PI);
      c.scale(radiusX * 0.9, radiusY * 0.9);
      c.fillStyle = grad;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
    }
  }
}
