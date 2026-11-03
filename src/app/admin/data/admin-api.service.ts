import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ApiResponse, Paginated } from '../../core/models/api.models';
import type { AdminRecord } from '../resources/resource.types';

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isPublished?: boolean;
  [filter: string]: string | number | boolean | undefined;
}

/** Thin, typed client for /api/admin/<endpoint>. */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);

  list<T = AdminRecord>(endpoint: string, params: ListParams = {}): Promise<Paginated<T>> {
    let query = new HttpParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') query = query.set(key, String(value));
    }
    return firstValueFrom(this.http.get<Paginated<T>>(this.url(endpoint), { params: query }));
  }

  async get<T = AdminRecord>(endpoint: string, id?: string): Promise<T> {
    const res = await firstValueFrom(this.http.get<ApiResponse<T>>(this.url(endpoint, id)));
    return res.data;
  }

  async create<T = AdminRecord>(endpoint: string, body: AdminRecord): Promise<T> {
    return (await firstValueFrom(this.http.post<ApiResponse<T>>(this.url(endpoint), body))).data;
  }

  async update<T = AdminRecord>(endpoint: string, id: string, body: AdminRecord): Promise<T> {
    return (await firstValueFrom(this.http.patch<ApiResponse<T>>(this.url(endpoint, id), body))).data;
  }

  /** Singletons (profile, site settings) are replaced with PUT. */
  async replace<T = AdminRecord>(endpoint: string, body: AdminRecord): Promise<T> {
    return (await firstValueFrom(this.http.put<ApiResponse<T>>(this.url(endpoint), body))).data;
  }

  async remove(endpoint: string, id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(this.url(endpoint, id)));
  }

  async reorder(endpoint: string, ids: string[]): Promise<void> {
    await firstValueFrom(this.http.put<void>(this.url(endpoint, 'order'), { ids }));
  }

  async upload(file: File, kind: 'image' | 'document'): Promise<{ url: string }> {
    const body = new FormData();
    body.append('file', file);
    const res = await firstValueFrom(
      this.http.post<ApiResponse<{ url: string }>>('/api/admin/media', body, { params: { kind } }),
    );
    return res.data;
  }

  private url(endpoint: string, id?: string): string {
    return `/api/admin/${endpoint}${id ? `/${encodeURIComponent(id)}` : ''}`;
  }
}
