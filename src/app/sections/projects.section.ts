import { Component } from '@angular/core';
import { CV } from '../cv';

@Component({
  selector: 'section[cvProjects]',
  standalone: true,
  host: { class: 'section', id: 'projects' },
  template: `
    <div class="inner">
      <!-- GitHub lives here, next to the projects whose code it holds. -->
      <div class="section-head">
        <h2 class="kicker" data-reveal>Built on my own</h2>
        <a class="gh-link" data-reveal [href]="cv.contacts.github.url" target="_blank" rel="noopener">
          <!-- Relative url() in an inline style resolves against <base href> (/cv/ on Pages). -->
          <span class="gh-icon" aria-hidden="true" style="mask-image: url(icons/github.svg); -webkit-mask-image: url(icons/github.svg)"></span>{{ cv.contacts.github.label }} <span aria-hidden="true">↗</span>
        </a>
      </div>
      <div class="projects">
        @for (pr of cv.projects; track pr.name; let i = $index) {
          <article class="project" data-reveal>
            <span class="p-num" data-reveal>0{{ i + 1 }}</span>
            <h3 data-reveal>{{ pr.name }}</h3>
            <p class="p-tag" data-reveal>{{ pr.tagline }}</p>
            <div class="flow">
              @for (n of pr.flow; track n; let last = $last) {
                <span class="chip" data-reveal>{{ n }}</span>@if (!last) {<span class="arrow" data-reveal aria-hidden="true">→</span>}
              }
            </div>
            <ul>
              @for (p of pr.points; track p) { <li data-reveal>{{ p }}</li> }
            </ul>
            @if (pr.url) {
              <a class="live" data-reveal [href]="pr.url" target="_blank" rel="noopener">Open live ↗</a>
            }
          </article>
        }
      </div>
    </div>
  `,
})
export class ProjectsSection {
  readonly cv = CV;
}
