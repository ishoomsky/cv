import { Component, AfterViewInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-planet',
  templateUrl: './planet.component.html',
  standalone: true,
  styleUrls: ['./planet.component.scss']
})
export class PlanetComponent implements AfterViewInit {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private angle: number = 0;
  private planetImage: HTMLImageElement | null = null;

  ngAfterViewInit() {
    this.canvas = document.getElementById('planetCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resizeCanvas();
    this.loadPlanetImage(() => this.animatePlanet());
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.loadPlanetImage();
  }

  private loadPlanetImage(callback?: () => void) {
    const svgElement = document.getElementById('earthSVG') as unknown as SVGSVGElement;
    if (!svgElement) return;

    svgElement.setAttribute('width', '600');
    svgElement.setAttribute('height', '600');
    svgElement.setAttribute('viewBox', '0 0 300 300');

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const url = URL.createObjectURL(new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' }));

    const img = new Image();
    img.onload = () => {
      this.planetImage = img;
      URL.revokeObjectURL(url);
      callback?.();
    };
    img.src = url;
  }

  animatePlanet() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const planetRadius = this.canvas.width * 0.35;
    const planetX = this.canvas.width * 0.6;
    const planetY = this.canvas.height * 0.65;
    const movement = Math.sin(this.angle) * 3;
    this.angle += 0.01;

    this.drawAtmosphere(planetX + movement, planetY, planetRadius);

    if (this.planetImage) {
      this.ctx.drawImage(
        this.planetImage,
        planetX + movement - planetRadius,
        planetY - planetRadius,
        planetRadius * 2,
        planetRadius * 2
      );
    }

    requestAnimationFrame(() => this.animatePlanet());
  }

  drawAtmosphere(x: number, y: number, radius: number) {
    // Outer diffuse halo
    const outer = this.ctx.createRadialGradient(x, y, radius * 0.88, x, y, radius * 1.55);
    outer.addColorStop(0, 'rgba(80, 180, 255, 0.90)');
    outer.addColorStop(0.18, 'rgba(60, 150, 240, 0.55)');
    outer.addColorStop(0.45, 'rgba(30, 100, 210, 0.20)');
    outer.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.beginPath();
    this.ctx.fillStyle = outer;
    this.ctx.arc(x, y, radius * 1.55, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
