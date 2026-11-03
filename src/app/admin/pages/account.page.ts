import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { SessionStore } from '../../core/auth/session.store';
import { ApiError } from '../../core/http/api-error';
import { IconComponent } from '../../shared/ui/icon';

function strongPassword(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '');
  return /[a-zA-Z]/.test(value) && /\d/.test(value) ? null : { weak: true };
}

@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, IconComponent],
  template: `
    <header class="page-head">
      <div>
        <h1>Cuenta</h1>
        <p class="muted">{{ session.admin()?.email }}</p>
      </div>
    </header>
    <form class="card panel" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <h2>Cambiar contraseña</h2>
      <p class="muted">Al cambiarla se cierran todas las sesiones abiertas.</p>
      <div class="field">
        <label class="field-label" for="current">Contraseña actual</label>
        <input id="current" class="input" type="password" formControlName="currentPassword" autocomplete="current-password" />
      </div>
      <div class="field">
        <label class="field-label" for="next">Nueva contraseña</label>
        <input id="next" class="input" type="password" formControlName="newPassword" autocomplete="new-password" aria-describedby="next-hint" />
        <p class="field-hint" id="next-hint">Mínimo 12 caracteres, combinando letras y números.</p>
        @if (form.controls.newPassword.touched && form.controls.newPassword.invalid) {
          <p class="field-error">La contraseña no cumple los requisitos.</p>
        }
      </div>
      <div class="field">
        <label class="field-label" for="confirm">Repite la nueva contraseña</label>
        <input id="confirm" class="input" type="password" formControlName="confirm" autocomplete="new-password" />
        @if (form.controls.confirm.touched && form.value.confirm !== form.value.newPassword) {
          <p class="field-error">Las contraseñas no coinciden.</p>
        }
      </div>
      @if (error(); as error) {
        <div class="alert alert-error" role="alert"><app-icon name="alert" /><span>{{ error }}</span></div>
      }
      <button type="submit" class="btn btn-primary" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Actualizar contraseña' }}</button>
    </form>
  `,
  styles: `
    .panel { display: grid; gap: 1rem; max-width: 520px; padding: 1.5rem; }
    h2 { margin: 0; font-size: 1.15rem; }
    .muted { margin: 0; }
    .field-hint, .field-error { margin: 0; }
    button { justify-self: start; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountPage {
  protected readonly session = inject(SessionStore);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = inject(FormBuilder).nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128), strongPassword]],
    confirm: ['', Validators.required],
  });

  async submit(): Promise<void> {
    this.error.set(null);
    const { currentPassword, newPassword, confirm } = this.form.getRawValue();
    if (this.form.invalid || newPassword !== confirm) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      await firstValueFrom(this.http.patch('/api/admin/account/password', { currentPassword, newPassword }));
      this.session.clear();
      await this.router.navigate(['/admin/login'], { queryParams: { changed: 1 } });
    } catch (error) {
      this.error.set(ApiError.from(error).message);
    } finally {
      this.saving.set(false);
    }
  }
}
