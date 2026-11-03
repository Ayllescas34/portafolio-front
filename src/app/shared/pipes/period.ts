import { inject, Pipe, PipeTransform } from '@angular/core';
import type { DatePrecision } from '../../core/models/api.models';
import { I18nService } from '../../core/i18n/i18n.service';

/** Formats an ISO date (stored at UTC midnight) respecting its precision. */
export function formatDate(iso: string, precision: DatePrecision, locale = 'es-GT'): string {
  const date = new Date(iso);
  if (precision === 'YEAR') return String(date.getUTCFullYear());
  const options: Intl.DateTimeFormatOptions =
    precision === 'MONTH'
      ? { month: 'short', year: 'numeric', timeZone: 'UTC' }
      : { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(locale, options).format(date).replace('.', '');
}

/** "feb 2025 — ene 2026", "feb 2026 — Actualidad", "2022 — 2024". */
export function formatPeriod(
  start: string | null,
  end: string | null,
  options: { isCurrent?: boolean; precision: DatePrecision; presentLabel: string; locale?: string },
): string {
  const from = start ? formatDate(start, options.precision, options.locale) : null;
  const to = options.isCurrent ? options.presentLabel : end ? formatDate(end, options.precision, options.locale) : null;
  if (from && to) return from === to ? from : `${from} — ${to}`;
  return from ?? to ?? '';
}

/** Whole months between two dates (inclusive of the start month), e.g. "1 año y 2 meses". */
export function formatDuration(start: string, end: string | null, now = new Date()): string {
  const s = new Date(start);
  const e = end ? new Date(end) : now;
  const months = Math.max(1, (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth()) + 1);
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const y = years === 0 ? '' : years === 1 ? '1 año' : `${years} años`;
  const m = rest === 0 ? '' : rest === 1 ? '1 mes' : `${rest} meses`;
  return [y, m].filter(Boolean).join(' y ');
}

@Pipe({ name: 'period' })
export class PeriodPipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  // `datePrecision` accepts a plain string so templates can pass literals like 'MONTH'.
  transform(
    value: { startDate: string | null; endDate: string | null; isCurrent?: boolean; datePrecision: DatePrecision | string },
  ): string {
    return formatPeriod(value.startDate, value.endDate, {
      isCurrent: value.isCurrent,
      precision: value.datePrecision as DatePrecision,
      presentLabel: this.i18n.t().experience.present,
      locale: this.i18n.intlLocale,
    });
  }
}
