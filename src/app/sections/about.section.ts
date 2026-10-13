import { Component } from '@angular/core';
import { CV } from '../cv';

@Component({
  selector: 'section[cvAbout]',
  standalone: true,
  host: { class: 'section', id: 'about' },
  template: `
    <div class="inner">
      <h2 class="kicker" data-reveal>About</h2>
    </div>
    <!-- The first summary paragraph is the greeting in the hero above. -->
    <div class="inner two-col">
      @for (p of paragraphs.slice(1); track $index) {
        <p class="body" data-reveal>{{ p }}</p>
      }
    </div>

    <div class="inner skills">
      @for (g of cv.skills; track g.label) {
        <div class="skill-group">
          <h3 data-reveal>{{ g.label }}</h3>
          <div class="chips">
            @for (s of g.items; track s) { <span class="chip" data-reveal>{{ s }}</span> }
          </div>
        </div>
      }
    </div>
  `,
})
export class AboutSection {
  readonly cv = CV;
  readonly paragraphs = CV.summary.split('\n\n');
}
