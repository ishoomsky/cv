import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PlanetComponent } from "./planet/planet.component";
import { StarFieldComponent } from "./star-field/star-field.component";
import { NebulaComponent } from "./nebula/nebula.component";
import { ContentContainerComponent } from "./content-container/content-container.component";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PlanetComponent, StarFieldComponent, NebulaComponent, ContentContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'cv';
}
