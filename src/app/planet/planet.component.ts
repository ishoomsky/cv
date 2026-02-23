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

  ngAfterViewInit() {
    this.canvas = document.getElementById('planetCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.resizeCanvas();
    this.animatePlanet();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  animatePlanet() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const planetRadius = this.canvas.width * 0.15;
    const planetX = this.canvas.width / 2;
    const planetY = this.canvas.height / 2;

    const movement = Math.sin(this.angle) * 3; // Двигаем медленнее
    this.angle += 0.01;

    this.drawAtmosphere(planetX + movement, planetY, planetRadius + 10);
    this.drawEarth(planetX + movement, planetY, planetRadius);

    requestAnimationFrame(() => this.animatePlanet());
  }

  drawAtmosphere(x: number, y: number, radius: number) {
    const gradient = this.ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius);
    gradient.addColorStop(0, 'rgba(135, 206, 250, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawEarth(x: number, y: number, radius: number) {
    const svgElement = document.getElementById('earthSVG') as unknown as SVGSVGElement;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const svgImage = new Image();
    svgImage.src = url;

    svgImage.onload = () => {
      this.ctx.drawImage(svgImage, x - radius, y - radius, radius * 2, radius * 2);
      URL.revokeObjectURL(url); // Освобождаем URL после использования
    };
  }
}
