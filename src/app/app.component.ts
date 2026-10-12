import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { PlanetComponent } from "./planet/planet.component";
import { StarFieldComponent } from "./star-field/star-field.component";
import { NebulaComponent } from "./nebula/nebula.component";
import { LandingComponent } from "./landing/landing.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PlanetComponent, StarFieldComponent, NebulaComponent, LandingComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'cv';
  // Instantiate the analytics service so it wires up SPA route tracking.
  private analytics = inject(AnalyticsService);
}
