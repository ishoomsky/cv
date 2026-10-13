import { AfterViewInit, Component, ElementRef, inject, signal } from '@angular/core';
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
            <!-- Skeleton (shimmer) until the screenshot has loaded — or failed, so
                 the shimmer never spins forever. -->
            <div class="work-frame" data-reveal [class.loading]="!settled().has(w.name)" [class.failed]="failed().has(w.name)">
              <img class="work-img" [src]="w.images[0]" [alt]="w.name + ' screenshot'" [attr.data-name]="w.name"
                   loading="lazy" decoding="async" (load)="settle(w.name)" (error)="fail(w.name)" />
            </div>
            <h3 class="work-title" data-reveal>{{ w.name }}</h3>
            <p class="work-desc" data-reveal>{{ w.description }}</p>
          </article>
        }
      </div>
    </div>
  `,
})
export class WorkSection implements AfterViewInit {
  readonly work = CV.portfolio.projects.filter(p => p.images.length);
  /** Projects whose screenshot has finished loading (or failed). */
  readonly settled = signal<ReadonlySet<string>>(new Set());
  /** Projects whose screenshot failed: the frame stays empty, no broken-image icon. */
  readonly failed = signal<ReadonlySet<string>>(new Set());
  private host = inject<ElementRef<HTMLElement>>(ElementRef);

  settle(name: string) {
    if (!this.settled().has(name)) this.settled.update(s => new Set(s).add(name));
  }

  fail(name: string) {
    this.failed.update(s => new Set(s).add(name));
    this.settle(name);
  }

  // Images served from cache can finish before the (load) listener matters;
  // `complete` covers those (it's also true for a failed load).
  ngAfterViewInit() {
    this.host.nativeElement.querySelectorAll<HTMLImageElement>('.work-img').forEach(img => {
      if (!img.complete) return;
      if (img.naturalWidth) this.settle(img.dataset['name']!);
      else this.fail(img.dataset['name']!);
    });
  }
}
