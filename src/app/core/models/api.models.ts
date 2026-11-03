/** Envelope used by every successful API response. */
export interface ApiResponse<T> {
  data: T;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiErrorDetail {
  field: string;
  errors: string[];
}

/** Envelope used by every error response. */
export interface ApiErrorBody {
  error: {
    statusCode: number;
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    path: string;
    timestamp: string;
  };
}

export type DatePrecision = 'YEAR' | 'MONTH' | 'DAY';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'FREELANCE' | 'INTERNSHIP' | 'TEMPORARY';
export type WorkMode = 'ONSITE' | 'HYBRID' | 'REMOTE';
export type EducationStatus = 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'INCOMPLETE';
export type ProjectStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'MAINTAINED' | 'ARCHIVED';
export type ProjectCategory = 'WEB_APP' | 'MOBILE_APP' | 'API' | 'DATABASE' | 'DESKTOP' | 'TOOL' | 'OTHER';
export type SocialPlatform = 'GITHUB' | 'LINKEDIN' | 'GITLAB' | 'X' | 'WEBSITE' | 'OTHER';
export type HighlightKind = 'WORK_STYLE' | 'INTEREST' | 'VALUE' | 'DELIVERY_STAGE';
export type ProjectKind = 'PROFESSIONAL' | 'PERSONAL' | 'ACADEMIC' | 'DEMO';
export type ThemePreference = 'DARK' | 'LIGHT' | 'SYSTEM';
export type ContactMessageStatus = 'NEW' | 'READ' | 'ARCHIVED';
