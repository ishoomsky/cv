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

    const planetRadius = this.canvas.width * 0.35; // Увеличиваем радиус (было 0.15)
    // Смещаем планету немного вниз и вправо, чтобы она не перекрывала весь центр
    const planetX = this.canvas.width * 0.6;
    const planetY = this.canvas.height * 0.65;

    const movement = Math.sin(this.angle) * 3; // Двигаем медленнее
    this.angle += 0.01;

    // Слегка увеличим радиус атмосферы пропорционально новой планете
    this.drawAtmosphere(planetX + movement, planetY, planetRadius + 40);
    this.drawPlanet(planetX + movement, planetY, planetRadius);

    requestAnimationFrame(() => this.animatePlanet());
  }

  drawAtmosphere(x: number, y: number, radius: number) {
    // Atmosphere is an outer glow. Draw exactly from planet edge to atmosphere edge
    const planetRadius = radius - 40; // reverse what we added
    const gradient = this.ctx.createRadialGradient(x, y, planetRadius * 0.95, x, y, radius);

    // Core atmosphere edge (opaque)
    gradient.addColorStop(0, 'rgba(230, 180, 130, 0.4)');
    // Atmosphere fades out
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.fillStyle = gradient;
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  drawPlanet(x: number, y: number, radius: number) {
    const svgElement = document.getElementById('jupiterSVG') as unknown as SVGSVGElement;
    if (!svgElement) return;

    // To prevent blurring when drawing SVG to Canvas, we need to temporarily set the SVG's 
    // internal width/height attributes to match the target canvas pixel size
    const diameter = radius * 2;
    svgElement.setAttribute('width', diameter.toString());
    svgElement.setAttribute('height', diameter.toString());
    svgElement.setAttribute('viewBox', '0 0 300 300');

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
