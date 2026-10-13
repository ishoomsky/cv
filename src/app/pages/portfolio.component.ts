import { Component } from '@angular/core';
import { PageComponent } from '../page/page.component';
import { WorkSection } from '../sections/work.section';
import { ProjectsSection } from '../sections/projects.section';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [PageComponent, WorkSection, ProjectsSection],
  template: `
    <app-page>
      <section cvWork></section>
      <section cvProjects></section>
    </app-page>
  `,
})
export class PortfolioComponent {}
