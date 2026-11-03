import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApiError } from '../../core/http/api-error';
import type { ContactMessageStatus, PageMeta } from '../../core/models/api.models';
import { ToastService } from '../../core/ui/toast.service';
import { AsyncStateComponent } from '../../shared/ui/async-state';
import { IconComponent } from '../../shared/ui/icon';
import { AdminApiService } from '../data/admin-api.service';
import { ConfirmService } from '../ui/confirm-dialog';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  readAt: string | null;
}

const TABS: { value: ContactMessageStatus | 'ALL'; label: string }[] = [
  { value: 'NEW', label: 'Nuevos' },
  { value: 'READ', label: 'Leídos' },
  { value: 'ARCHIVED', label: 'Archivados' },
  { value: 'ALL', label: 'Todos' },
];

/** Messages received through the public contact form (stored locally, never emailed). */
@Component({
  selector: 'app-messages-page',
  imports: [AsyncStateComponent, IconComponent, DatePipe],
  templateUrl: './messages.page.html',
  styleUrl: './messages.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessagesPage {
  private readonly api = inject(AdminApiService);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly tabs = TABS;
  readonly tab = signal<ContactMessageStatus | 'ALL'>('NEW');
  readonly search = signal('');
  readonly items = signal<ContactMessage[]>([]);
  readonly meta = signal<PageMeta | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly errorText = signal('');
  readonly openId = signal<string | null>(null);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.load();
  }

  async load(page = 1): Promise<void> {
    this.state.set('loading');
    try {
      const res = await this.api.list<ContactMessage>('contact-messages', {
        page,
        pageSize: 20,
        status: this.tab() === 'ALL' ? undefined : this.tab(),
        search: this.search() || undefined,
      });
      this.items.set(res.data);
      this.meta.set(res.meta);
      this.state.set('ready');
    } catch (error) {
      this.errorText.set(ApiError.from(error).message);
      this.state.set('error');
    }
  }

  selectTab(value: ContactMessageStatus | 'ALL'): void {
    this.tab.set(value);
    this.openId.set(null);
    void this.load();
  }

  onSearch(value: string): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.search.set(value.trim());
      void this.load();
    }, 300);
  }

  async toggle(message: ContactMessage): Promise<void> {
    const opening = this.openId() !== message.id;
    this.openId.set(opening ? message.id : null);
    if (opening && message.status === 'NEW') await this.setStatus(message, 'READ', false);
  }

  async setStatus(message: ContactMessage, status: ContactMessageStatus, notify = true): Promise<void> {
    try {
      const updated = await this.api.update<ContactMessage>('contact-messages', message.id, { status });
      this.items.update((list) => list.map((m) => (m.id === message.id ? updated : m)));
      if (notify) this.toasts.success(status === 'ARCHIVED' ? 'Mensaje archivado.' : status === 'NEW' ? 'Marcado como nuevo.' : 'Marcado como leído.');
    } catch (error) {
      this.toasts.error(ApiError.from(error).message);
    }
  }

  async remove(message: ContactMessage): Promise<void> {
    const ok = await this.confirm.ask({
      title: 'Eliminar mensaje',
      message: `El mensaje de ${message.name} se eliminará de forma permanente.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.remove('contact-messages', message.id);
      this.toasts.success('Mensaje eliminado.');
      await this.load(this.meta()?.page ?? 1);
    } catch (error) {
      this.toasts.error(ApiError.from(error).message);
    }
  }

  replyHref(message: ContactMessage): string {
    return `mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`;
  }
}
