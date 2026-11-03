import { computed, Injectable, signal } from '@angular/core';

export interface SessionAdmin {
  id: string;
  name: string;
  email: string;
}

type SessionState =
  | { status: 'unknown' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; admin: SessionAdmin; expiresAt?: string };

/**
 * In-memory view of the admin session. The credential itself is an httpOnly
 * cookie the browser manages; nothing sensitive is stored in JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly state = signal<SessionState>({ status: 'unknown' });

  readonly status = computed(() => this.state().status);
  readonly isAuthenticated = computed(() => this.state().status === 'authenticated');
  readonly admin = computed(() => {
    const state = this.state();
    return state.status === 'authenticated' ? state.admin : null;
  });

  setAuthenticated(admin: SessionAdmin, expiresAt?: string): void {
    this.state.set({ status: 'authenticated', admin, expiresAt });
  }

  clear(): void {
    this.state.set({ status: 'anonymous' });
  }
}
