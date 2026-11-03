import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import type { ApiResponse } from '../models/api.models';
import { SessionAdmin, SessionStore } from './session.store';

interface LoginResponse {
  admin: SessionAdmin;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionStore);

  async login(email: string, password: string): Promise<SessionAdmin> {
    const { data } = await firstValueFrom(
      this.http.post<ApiResponse<LoginResponse>>('/api/auth/login', { email, password }),
    );
    this.session.setAuthenticated(data.admin, data.expiresAt);
    return data.admin;
  }

  /** Server-side revocation first; local state is cleared even if it fails. */
  async logout(): Promise<void> {
    try {
      await firstValueFrom(this.http.post<void>('/api/auth/logout', {}));
    } finally {
      this.session.clear();
    }
  }

  /** Resolves the session from the cookie (used by the guard after a reload). */
  async restore(): Promise<boolean> {
    if (this.session.status() !== 'unknown') return this.session.isAuthenticated();
    const admin = await firstValueFrom(
      this.http.get<ApiResponse<SessionAdmin>>('/api/auth/me').pipe(
        map((res) => res.data),
        catchError(() => of(null)),
      ),
    );
    if (admin) this.session.setAuthenticated(admin);
    else this.session.clear();
    return !!admin;
  }
}
