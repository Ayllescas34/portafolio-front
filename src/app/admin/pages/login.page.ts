import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ApiError } from '../../core/http/api-error';
import { SeoService } from '../../core/seo/seo.service';
import { IconComponent } from '../../shared/ui/icon';

/** Only internal admin paths are accepted as return targets (no open redirects). */
export function safeReturnUrl(value: string | undefined | null): string {
  return value && /^\/admin(\/|$|\?)/.test(value) && !value.startsWith('//') && !value.startsWith('/admin/login')
    ? value
    : '/admin';
}

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  template: `
    <main class="login">
      <div class="card panel">
        <a routerLink="/" class="home"><app-icon name="arrow-left" [size]="16" />Volver al sitio</a>
        <h1>Administración</h1>
        <p class="muted">Acceso restringido al propietario del portafolio.</p>

        @if (expired()) {
          <p class="alert" role="status">Tu sesión expiró o se cerró. Inicia sesión de nuevo.</p>
        }
        @if (changed()) {
          <p class="alert alert-success" role="status">Contraseña actualizada. Inicia sesión con la nueva contraseña.</p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="field">
            <label class="field-label" for="login-email">Correo</label>
            <input id="login-email" class="input" type="email" formControlName="email" autocomplete="username" [attr.aria-invalid]="invalid('email')" />
            @if (invalid('email')) {
              <p class="field-error">Escribe un correo válido.</p>
            }
          </div>
          <div class="field">
            <label class="field-label" for="login-password">Contraseña</label>
            <div class="password">
              <input
                id="login-password"
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                [attr.aria-invalid]="invalid('password')"
              />
              <button
                type="button"
                class="btn btn-ghost btn-sm btn-icon"
                (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                [attr.aria-pressed]="showPassword()"
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" [size]="18" />
              </button>
            </div>
            @if (invalid('password')) {
              <p class="field-error">La contraseña es obligatoria.</p>
            }
          </div>

          @if (error(); as error) {
            <div class="alert alert-error" role="alert"><app-icon name="alert" /><span>{{ error }}</span></div>
          }

          <button type="submit" class="btn btn-primary submit" [disabled]="loading()">
            {{ loading() ? 'Verificando…' : 'Iniciar sesión' }}
          </button>
        </form>
      </div>
    </main>
  `,
  styles: `
    .login { min-height: 100dvh; display: grid; place-items: center; padding: 1.5rem; background: var(--hero-glow), var(--bg); }
    .panel { width: min(420px, 100%); padding: 2rem; }
    .home { display: inline-flex; align-items: center; gap: 0.35rem; margin-bottom: 1.25rem; color: var(--text-muted); font-size: 0.88rem; text-decoration: none; }
    h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
    form { display: grid; gap: 1rem; margin-top: 1.25rem; }
    .password { position: relative; }
    .password .input { padding-right: 3rem; }
    .password button { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); }
    .field-error { margin: 0; }
    .submit { width: 100%; }
    .alert { margin: 1rem 0 0; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  readonly returnUrl = input<string>();
  readonly expired = input<string>();
  readonly changed = input<string>();

  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showPassword = signal(false);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor() {
    inject(SeoService).set({ title: 'Administración', description: 'Acceso administrativo', noIndex: true });
  }

  invalid(name: 'email' | 'password'): boolean {
    const control = this.form.controls[name];
    return control.invalid && control.touched;
  }

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl(safeReturnUrl(this.returnUrl()));
    } catch (error) {
      this.error.set(ApiError.from(error).message);
      this.form.controls.password.reset();
    } finally {
      this.loading.set(false);
    }
  }
}
