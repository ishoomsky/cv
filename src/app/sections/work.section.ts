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
        <!-- Layout is a grid with named areas (see .work): desktop = text left,
             photo right; mobile = company, title, photo, description. -->
        @for (w of work; track w.name) {
          <article class="work" data-reveal>
            <span class="work-co" data-reveal>{{ w.company }}</span>
            <div class="work-frame" data-reveal>
              <img class="work-img" [src]="w.images[0]" [alt]="w.name + ' screenshot'" loading="lazy" decoding="async" />
            </div>
            <h3 class="work-title" data-reveal>{{ w.name }}</h3>
            <p class="work-desc" data-reveal>{{ w.description }}</p>
          </article>
        }
      </div>
    </div>
  `,
})
export class WorkSection {
  readonly work = CV.portfolio.projects.filter(p => p.images.length);
}
