import { TestBed } from '@angular/core/testing';
import { MotionService } from '../core/ui/motion.service';
import { formatDuration, formatPeriod } from './pipes/period';
import { AsyncStateComponent } from './ui/async-state';

describe('period formatting', () => {
  it('respects the stored precision', () => {
    expect(formatPeriod('2022-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', { precision: 'YEAR', presentLabel: 'Actualidad' })).toBe(
      '2022 — 2024',
    );
    expect(
      formatPeriod('2026-02-01T00:00:00.000Z', null, { precision: 'MONTH', isCurrent: true, presentLabel: 'Actualidad' }),
    ).toMatch(/^feb 2026 — Actualidad$/i);
  });

  it('computes durations counting the start month', () => {
    expect(formatDuration('2025-02-01T00:00:00Z', '2026-01-01T00:00:00Z')).toBe('1 año');
    expect(formatDuration('2024-08-01T00:00:00Z', '2024-10-01T00:00:00Z')).toBe('3 meses');
    expect(formatDuration('2026-02-01T00:00:00Z', null, new Date('2026-11-15T00:00:00Z'))).toBe('10 meses');
  });
});

describe('AsyncStateComponent', () => {
  it('announces loading politely and errors assertively, with retry', () => {
    const fixture = TestBed.createComponent(AsyncStateComponent);
    fixture.componentRef.setInput('state', 'loading');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]').textContent).toContain('Cargando');

    const retry = jasmine.createSpy('retry');
    fixture.componentInstance.retry.subscribe(retry);
    fixture.componentRef.setInput('state', 'error');
    fixture.componentRef.setInput('errorText', 'Falló la carga');
    fixture.detectChanges();
    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.textContent).toContain('Falló la carga');
    alert.querySelector('button')!.click();
    expect(retry).toHaveBeenCalled();
  });
});

describe('MotionService', () => {
  it('reflects prefers-reduced-motion from the OS', () => {
    spyOn(window, 'matchMedia').and.returnValue({
      matches: true,
      addEventListener: () => undefined,
    } as unknown as MediaQueryList);
    expect(TestBed.inject(MotionService).reduced()).toBeTrue();
  });
});
