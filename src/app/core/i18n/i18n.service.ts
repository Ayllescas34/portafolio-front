import { Injectable, signal } from '@angular/core';
import { Dictionary, es } from './es';

export type Locale = 'es';

const DICTIONARIES: Record<Locale, Dictionary> = { es };

/**
 * Holds the active UI dictionary as a signal. Components read `i18n.t()`
 * so a future locale switch updates every template at once.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly locale = signal<Locale>('es');
  private readonly dictionary = signal<Dictionary>(DICTIONARIES.es);

  /** Current dictionary (call inside templates: `i18n.t().nav.home`). */
  readonly t = this.dictionary.asReadonly();

  /** BCP 47 tag for Intl APIs. */
  get intlLocale(): string {
    return this.locale() === 'es' ? 'es-GT' : this.locale();
  }

  use(locale: Locale): void {
    this.locale.set(locale);
    this.dictionary.set(DICTIONARIES[locale]);
    document.documentElement.lang = locale;
  }
}
