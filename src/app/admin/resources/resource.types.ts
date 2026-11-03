import type { IconName } from '../../shared/ui/icon';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'date'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'list' // ordered list of text lines
  | 'technologies' // multi-select of /admin/technologies
  | 'category' // select of /admin/skill-categories
  | 'media' // upload + URL
  | 'images'; // gallery of { imageUrl, altText, caption }

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  min?: number;
  hint?: string;
  placeholder?: string;
  options?: FieldOption[];
  mediaKind?: 'image' | 'document';
  rows?: number;
  /** Takes the full width of the two-column form grid. */
  wide?: boolean;
  /** Starts a new titled group in the form. */
  group?: string;
}

export type ColumnKind = 'text' | 'date' | 'enum' | 'count' | 'boolean';

export interface ColumnDef {
  key: string;
  label: string;
  kind?: ColumnKind;
  options?: FieldOption[];
}

export type AdminRecord = Record<string, unknown> & { id?: string };

export interface ResourceConfig {
  /** Route segment under /admin. */
  key: string;
  /** API path under /api/admin. */
  endpoint: string;
  title: string;
  singular: string;
  icon: IconName;
  description?: string;
  fields: FieldDef[];
  columns: ColumnDef[];
  /** Main text of a row (used in lists and confirmation dialogs). */
  primary: (record: AdminRecord) => string;
  secondary?: (record: AdminRecord) => string | null;
  searchable?: boolean;
  publishable?: boolean;
  orderable?: boolean;
  /** Singletons (profile, settings) have no list: GET/PUT on the endpoint. */
  singleton?: boolean;
  defaults?: AdminRecord;
  /** Public page to preview the record, if any. */
  publicUrl?: (record: AdminRecord) => string | null;
  /** Shows a live preview of the public card while editing. */
  preview?: 'project';
}
