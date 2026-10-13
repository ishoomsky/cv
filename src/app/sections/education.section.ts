import { Component } from '@angular/core';
import { CV } from '../cv';

@Component({
  selector: 'section[cvEducation]',
  standalone: true,
  host: { class: 'section', id: 'education' },
  template: `
    <div class="inner">
      <h2 class="kicker" data-reveal>Education</h2>
    </div>
    <div class="inner two-col">
      <div>
        @for (e of cv.education; track e.title) {
          <div class="edu" data-reveal>
            <span class="year" data-reveal>{{ e.year }}</span>
            <div><strong data-reveal>{{ e.title }}</strong><small data-reveal>{{ e.org }}</small></div>
          </div>
        }
      </div>
      <div>
        <h3 class="sub-h" data-reveal>Languages</h3>
        <div class="chips">
          @for (l of cv.languages; track l) { <span class="chip" data-reveal>{{ l }}</span> }
        </div>
      </div>
    </div>
  `,
})
export class EducationSection {
  readonly cv = CV;
}
