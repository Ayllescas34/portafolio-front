import type {
  DatePrecision,
  EducationStatus,
  EmploymentType,
  HighlightKind,
  ProjectCategory,
  ProjectKind,
  ProjectStatus,
  SocialPlatform,
  ThemePreference,
  WorkMode,
} from './api.models';

/** Shapes returned by /api/public/*. Dates arrive as ISO strings. */

export interface TechnologySummary {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

export interface SiteInfo {
  siteTitle: string;
  siteDescription: string;
  ogImageUrl: string | null;
  defaultTheme: ThemePreference;
  defaultLocale: string;
  contactFormEnabled: boolean;
}

export interface PublicProfile {
  fullName: string;
  professionalTitle: string;
  shortBio: string;
  tagline: string | null;
  longBio: string | null;
  location: string | null;
  publicEmail: string | null;
  phone: string | null;
  availability: string | null;
  profileImageUrl: string | null;
  profileImageAlt: string | null;
  cvFileUrl: string | null;
  updatedAt: string;
}

export interface Highlight {
  id: string;
  kind: HighlightKind;
  title: string;
  description: string;
}

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  location: string | null;
  employmentType: EmploymentType | null;
  workMode: WorkMode | null;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  datePrecision: DatePrecision;
  summary: string | null;
  displayOrder: number;
  responsibilities: string[];
  achievements: string[];
  technologies: TechnologySummary[];
}

export interface Education {
  id: string;
  institution: string;
  program: string;
  degree: string | null;
  status: EducationStatus;
  startDate: string | null;
  endDate: string | null;
  datePrecision: DatePrecision;
  description: string | null;
  displayOrder: number;
}

export interface Skill {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  proficiencyLabel: string | null;
  yearsOfExperience: number | null;
  icon: string | null;
  isFeatured: boolean;
}

export interface SkillCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  skills: Skill[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issueDate: string | null;
  expirationDate: string | null;
  datePrecision: DatePrecision;
  credentialId: string | null;
  credentialUrl: string | null;
  description: string | null;
}

export interface ProjectImage {
  id: string;
  imageUrl: string;
  altText: string;
  caption: string | null;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string | null;
  kind: ProjectKind;
  context: string | null;
  problem: string | null;
  solution: string | null;
  architecture: string | null;
  challenges: string | null;
  outcome: string | null;
  role: string | null;
  category: ProjectCategory;
  status: ProjectStatus;
  repositoryUrl: string | null;
  liveUrl: string | null;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  startDate: string | null;
  endDate: string | null;
  isFeatured: boolean;
  updatedAt: string;
  technologies: TechnologySummary[];
  responsibilities: string[];
  images: ProjectImage[];
}

export interface ProjectFilters {
  technologies: { name: string; slug: string; count: number }[];
  categories: { value: ProjectCategory; count: number }[];
  kinds: { value: ProjectKind; count: number }[];
}

export interface Portfolio {
  site: SiteInfo;
  profile: PublicProfile;
  highlights: Highlight[];
  socialLinks: SocialLink[];
  experiences: Experience[];
  education: Education[];
  skillCategories: SkillCategory[];
  certifications: Certification[];
  projects: Project[];
  projectFilters: ProjectFilters;
}

export interface ContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  /** Honeypot: always empty for humans. */
  website: string;
}
