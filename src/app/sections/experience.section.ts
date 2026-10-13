import { Component } from '@angular/core';
import { CV } from '../cv';

@Component({
  selector: 'section[cvExperience]',
  standalone: true,
  host: { class: 'section', id: 'experience' },
  template: `
    <div class="inner">
      <h2 class="kicker" data-reveal>Experience</h2>
      <div class="jobs">
        @for (j of cv.experience; track j.company) {
          <article class="job" data-reveal>
            <div class="job-head">
              <span class="period" data-reveal>{{ j.period }}</span>
              <h3 class="company" data-reveal>{{ j.company }}</h3>
              <p class="job-role" data-reveal>{{ j.role }}</p>
            </div>
            <ul>
              @for (p of j.points; track p) { <li data-reveal>{{ p }}</li> }
            </ul>
          </article>
        }
      </div>
    </div>
  `,
})
export class ExperienceSection {
  readonly cv = CV;
}
