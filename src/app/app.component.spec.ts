import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { PlanetComponent } from './planet/planet.component';
import { StarFieldComponent } from './star-field/star-field.component';
import { NebulaComponent } from './nebula/nebula.component';
import { CV } from './cv';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([])],
    })
      // The space layers start WebGL/canvas loops — not what this spec is about.
      .overrideComponent(AppComponent, {
        remove: { imports: [PlanetComponent, StarFieldComponent, NebulaComponent] },
        add: { schemas: [CUSTOM_ELEMENTS_SCHEMA] },
      })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('links every page from the top bar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const hrefs = (sel: string) => Array.from(el.querySelectorAll(sel)).map(a => a.getAttribute('href'));
    const expected = CV.nav.map(n => '/' + n.target);
    expect(hrefs('.topbar nav a')).toEqual(expected);
  });
});
