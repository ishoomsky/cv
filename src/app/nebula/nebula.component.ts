import { Component, AfterViewInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-nebula',
  templateUrl: './nebula.component.html',
  standalone: true,
  styleUrls: ['./nebula.component.scss']
})
export class NebulaComponent implements AfterViewInit {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;

  ngAfterViewInit() {
    this.canvas = document.getElementById('nebulaCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.resizeCanvas();
    this.createNebulae();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createNebulae();
  }

  createNebulae() {
    const colors = ['rgba(50, 150, 255, 0.6)', 'rgba(200, 50, 255, 0.5)', 'rgba(255, 100, 100, 0.5)'];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.filter = "blur(80px)";

    for (let i = 0; i < 4; i++) {
      const x = Math.random() * this.canvas.width;
      const y = Math.random() * this.canvas.height;
      const radiusX = Math.random() * 700 + 500;
      const radiusY = radiusX * 0.5;
      const color = colors[Math.floor(Math.random() * colors.length)];

      this.drawNebula(x, y, radiusX, radiusY, color);
    }

    this.ctx.filter = "none";
  }

  drawNebula(x: number, y: number, width: number, height: number, color: string) {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, width);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, width * 0.6, height * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
