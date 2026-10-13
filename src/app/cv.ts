import cvData from './data/cv-data.json';

interface Link { label: string; url: string; }
interface Job { role: string; company: string; period: string; points: string[]; }
interface Project { name: string; tagline: string; flow: string[]; points: string[]; url?: string; images: string[]; }
interface Work { name: string; company: string; description: string; url?: string; images: string[]; }

export interface CvData {
  profile: { firstName: string; lastName: string; fullName: string; panelRole: string; resumeRole: string; };
  contacts: { location: string; email: string; phone: string; linkedin: Link; github: Link; };
  status: string;
  nav: { label: string; target: string; }[];
  contact: { whatsapp: string; whatsappUrl: string; phone: string; phoneUrl: string; };
  summary: string;
  skills: { label: string; items: string[]; }[];
  experience: Job[];
  projects: Project[];
  portfolio: { projects: Work[]; };
  education: { title: string; org: string; year: string; }[];
  languages: string[];
}

/** All CV copy, typed. `data/cv-data.json` is the single source of truth. */
export const CV = cvData as unknown as CvData;
