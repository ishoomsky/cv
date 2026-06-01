import { Component, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-content-container',
  standalone: true,
  imports: [],
  templateUrl: './content-container.component.html',
  styleUrl: './content-container.component.scss'
})
export class ContentContainerComponent {
  private san = inject(DomSanitizer);

  cvOpen = false;
  readonly cvUrl: SafeResourceUrl =
    this.san.bypassSecurityTrustResourceUrl('/assets/CV-Ivan-Shumski.pdf');

  openCv()  { this.cvOpen = true;  }
  closeCv() { this.cvOpen = false; }
}
