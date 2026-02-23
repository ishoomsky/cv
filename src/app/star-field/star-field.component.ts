import { Component, AfterViewInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-star-field',
  templateUrl: './star-field.component.html',
  standalone: true,
  styleUrls: ['./star-field.component.scss']
})
export class StarFieldComponent implements AfterViewInit {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private movingStars: { x: number; y: number; size: number; speed: number; alpha: number }[][] = [];
  private staticStars: { x: number; y: number; size: number; alpha: number }[] = [];

  starSpeed: number = 0.005; // speed
  starsPerLayer: number[] = [2, 5, 15, 30, 50]; // stars amount

  ngAfterViewInit() {
    this.canvas = document.getElementById('starCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.resizeCanvas();
    this.createStars(50, this.starsPerLayer.length); // 50 неподвижных звезд, количество слоев по длине starsPerLayer
    this.animateStars();
  }

  @HostListener('window:resize')
  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.createStars(50, this.starsPerLayer.length); // Обновляем при изменении размера
  }

  createStars(staticCount: number, layers: number) {
    this.movingStars = [];
    this.staticStars = [];

    for (let i = 0; i < staticCount; i++) {
      const star = {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 1.5 + 1, // Увеличиваем размер неподвижных звезд
        alpha: Math.random() * 0.5 + 0.5 // Прозрачность
      };
      this.staticStars.push(star); // Добавляем в статичные звезды
    }

    // Создание слоев движущихся звезд
    for (let layer = 0; layer < layers; layer++) {
      const layerStars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
      const layerSpeed = this.starSpeed * (layer + 1) * 0.5; // Разные скорости для разных слоев
      const starCount = this.starsPerLayer[layer]; // Количество звезд для текущего слоя

      for (let j = 0; j < starCount; j++) { // Используем starCount для количества звезд
        layerStars.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          size: Math.random() * 2 + 0.5, // Размер звезды
          speed: layerSpeed + Math.random() * 0.2, // Скорость звезд
          alpha: Math.random() * 0.5 + 0.5 // Прозрачность
        });
      }
      this.movingStars.push(layerStars); // Добавляем слой движущихся звезд
    }
  }

  animateStars() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Отрисовка неподвижных звезд
    this.staticStars.forEach(star => {
      this.drawSharpStar(star.x, star.y, star.size, star.alpha);
    });

    // Отрисовка движущихся звезд по слоям
    this.movingStars.forEach(layer => {
      layer.forEach(star => {
        star.x += star.speed;
        if (star.x > this.canvas.width) star.x = 0;

        // Эффект мерцания
        star.alpha = Math.abs(Math.sin(Date.now() * 0.001 * star.speed)) * 0.5 + 0.5;

        this.drawSharpStar(star.x, star.y, star.size, star.alpha);
      });
    });

    requestAnimationFrame(() => this.animateStars());
  }

  drawSharpStar(x: number, y: number, size: number, alpha: number) {
    this.ctx.beginPath();
    this.ctx.arc(x, y, size, 0, Math.PI * 2); // Уменьшаем радиус для более четких звезд
    this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`; // Четкий цвет звезды с учетом прозрачности
    this.ctx.fill();
  }
}
