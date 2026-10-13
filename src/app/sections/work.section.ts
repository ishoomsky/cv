import { Component } from '@angular/core';
import { CV } from '../cv';

@Component({
  selector: 'section[cvWork]',
  standalone: true,
  host: { class: 'section', id: 'work' },
  template: `
    <div class="inner">
      <h1 class="kicker" data-reveal>Portfolio</h1>
      <div class="works">
        @for (w of work; track w.name; let i = $index) {
          <article class="work" [class.flip]="i % 2">
            <div class="work-frame" data-reveal>
              <img class="work-img" [src]="w.images[0]" [alt]="w.name + ' screenshot'" loading="lazy" decoding="async" />
            </div>
            <div class="work-info">
              <span class="work-co" data-reveal>{{ w.company }}</span>
              <h3 data-reveal>{{ w.name }}</h3>
              <p data-reveal>{{ w.description }}</p>
            </div>
          </article>
        }
      </div>
    </div>
  `,
})
export class WorkSection {
  readonly work = CV.portfolio.projects.filter(p => p.images.length);
}
