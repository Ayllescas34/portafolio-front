import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ApiError } from '../../../core/http/api-error';
import { IconComponent, IconName } from '../../../shared/ui/icon';
import { RevealDirective } from '../../../shared/ui/reveal.directive';
import { PortfolioStore } from '../../data/portfolio.store';

type Field = 'name' | 'email' | 'subject' | 'message';
const LIMITS: Record<Field, { min: number; max: number }> = {
  name: { min: 2, max: 120 },
  email: { min: 3, max: 254 },
  subject: { min: 3, max: 160 },
  message: { min: 10, max: 5000 },
};
const SOCIAL_ICONS: Record<string, IconName> = { GITHUB: 'github', LINKEDIN: 'linkedin', WEBSITE: 'globe' };

@Component({
  selector: 'app-contact-section',
  imports: [ReactiveFormsModule, IconComponent, RevealDirective],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSectionComponent {
  private readonly store = inject(PortfolioStore);
  protected readonly t = inject(I18nService).t;
  protected readonly limits = LIMITS;

  protected readonly profile = this.store.profile;
  protected readonly socialLinks = computed(() => this.store.portfolio()?.socialLinks ?? []);
  protected readonly enabled = computed(() => this.store.portfolio()?.site.contactFormEnabled ?? true);
  protected readonly telHref = computed(() => `tel:${(this.profile()?.phone ?? '').replace(/[^\d+]/g, '')}`);

  readonly status = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');
  readonly errorMessage = signal('');
  /** Server-side validation messages keyed by field. */
  private readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(LIMITS.name.min), Validators.maxLength(LIMITS.name.max)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(LIMITS.email.max)]],
    subject: ['', [Validators.required, Validators.minLength(LIMITS.subject.min), Validators.maxLength(LIMITS.subject.max)]],
    message: ['', [Validators.required, Validators.minLength(LIMITS.message.min), Validators.maxLength(LIMITS.message.max)]],
    website: [''], // honeypot
  });

  protected icon(platform: string): IconName {
    return SOCIAL_ICONS[platform] ?? 'link';
  }

  /** Message for a field, shown only after the user interacted with it. */
  errorFor(field: Field): string | null {
    const control = this.form.controls[field];
    const server = this.serverErrors()[field];
    if (server) return server;
    if (!control.invalid || !(control.touched || control.dirty)) return null;
    const c = this.t().contact;
    if (control.hasError('required')) return c.required;
    if (control.hasError('email')) return c.invalidEmail;
    if (control.hasError('minlength')) return c.minLength(LIMITS[field].min);
    if (control.hasError('maxlength')) return c.maxLength(LIMITS[field].max);
    return null;
  }

  async submit(): Promise<void> {
    this.serverErrors.set({});
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Move focus to the first invalid field so keyboard and screen reader users find it.
      const first = (Object.keys(LIMITS) as Field[]).find((f) => this.form.controls[f].invalid);
      if (first) document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    this.status.set('sending');
    try {
      await this.store.sendMessage(this.form.getRawValue());
      this.form.reset();
      this.status.set('sent');
    } catch (error) {
      const apiError = ApiError.from(error);
      this.serverErrors.set(apiError.fieldErrors as Partial<Record<Field, string>>);
      this.errorMessage.set(apiError.message);
      this.status.set('error');
    }
  }
}
