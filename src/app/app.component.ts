import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './analytics.service';
import { PlanetComponent } from "./planet/planet.component";
import { StarFieldComponent } from "./star-field/star-field.component";
import { NebulaComponent } from "./nebula/nebula.component";
import { AsteroidsComponent } from "./asteroids/asteroids.component";
import { ContentContainerComponent } from "./content-container/content-container.component";
import { PortfolioComponent } from "./portfolio/portfolio.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PlanetComponent, StarFieldComponent, NebulaComponent, AsteroidsComponent, ContentContainerComponent, PortfolioComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'cv';
  // Instantiate the analytics service so it wires up SPA route tracking.
  private analytics = inject(AnalyticsService);
}
