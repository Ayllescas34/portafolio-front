import { DOCUMENT } from '@angular/common';
import { effect, inject, Injectable, signal } from '@angular/core';
import type { ThemePreference } from '../models/api.models';

export type Theme = 'dark' | 'light';
const STORAGE_KEY = 'portfolio.theme';

function readStored(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null; // storage blocked (private mode, policies)
  }
}

/**
 * Resolution order: the visitor's explicit choice (persisted) → the site
 * default configured in the admin panel → the OS preference.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly explicit = signal<Theme | null>(readStored());
  private readonly siteDefault = signal<Theme | null>(null);
  private readonly systemPrefersLight = signal(
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches,
  );

  readonly theme = signal<Theme>(this.resolve());

  constructor() {
    if (typeof matchMedia === 'function') {
      matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        this.systemPrefersLight.set(e.matches);
        this.theme.set(this.resolve());
      });
    }
    effect(() => {
      const theme = this.theme();
      const root = this.document.documentElement;
      root.dataset['theme'] = theme;
      root.style.colorScheme = theme;
      this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f6f7f9');
    });
  }

  /** Applies the default chosen in "Configuración del sitio" (SYSTEM = follow the OS). */
  useSiteDefault(preference: ThemePreference): void {
    this.siteDefault.set(preference === 'DARK' ? 'dark' : preference === 'LIGHT' ? 'light' : null);
    this.theme.set(this.resolve());
  }

  toggle(): void {
    const next: Theme = this.theme() === 'dark' ? 'light' : 'dark';
    this.explicit.set(next);
    this.theme.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore: preference simply won't persist */
    }
  }

  private resolve(): Theme {
    return this.explicit() ?? this.siteDefault() ?? (this.systemPrefersLight() ? 'light' : 'dark');
  }
}
