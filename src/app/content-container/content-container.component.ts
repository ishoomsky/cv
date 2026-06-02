import { Component } from '@angular/core';
import cvData from '../data/cv-data.json';

interface SkillGroup { label: string; items: string[]; }
interface Job { role: string; company: string; period: string; points: string[]; }
interface Project { name: string; tagline: string; flow: string[]; points: string[]; }
interface NavItem { label: string; action?: string; url?: string; }
interface Link { label: string; url: string; }

interface CvData {
  profile: {
    firstName: string; lastName: string; fullName: string;
    identityTag: string; panelRole: string; resumeRole: string; dossierTitle: string;
  };
  contacts: { location: string; email: string; phone: string; linkedin: Link; github: Link; };
  status: string;
  pdf: string;
  nav: NavItem[];
  stackTicker: string[];
  summary: string;
  skills: SkillGroup[];
  experience: Job[];
  projects: Project[];
  education: { title: string; org: string; year: string; }[];
  languages: string[];
}

@Component({
  selector: 'app-content-container',
  standalone: true,
  imports: [],
  templateUrl: './content-container.component.html',
  styleUrl: './content-container.component.scss'
})
export class ContentContainerComponent {
  // Single source of truth — all page content lives in cv-data.json.
  readonly cv = cvData as unknown as CvData;

  // Pre-built endless-marquee string for the STACK readout.
  readonly ticker = this.cv.stackTicker.join('  ·  ') + '  ·  ';

  cvOpen = false;
  openJob = 0;           // expanded role in the experience timeline

  openCv() {
    this.cvOpen = true;
  }

  closeCv() {
    this.cvOpen = false;
  }

  toggleJob(i: number) {
    this.openJob = this.openJob === i ? -1 : i;
  }
}
