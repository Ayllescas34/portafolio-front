import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { ApiError } from '../../core/http/api-error';
import type { ProjectKind, ProjectStatus } from '../../core/models/api.models';
import { ToastService } from '../../core/ui/toast.service';
import { AsyncStateComponent } from '../../shared/ui/async-state';
import { IconComponent } from '../../shared/ui/icon';
import { ProjectCardComponent, ProjectCardData } from '../../shared/ui/project-card';
import { AdminApiService } from '../data/admin-api.service';
import { LookupService } from '../data/lookup.service';
import { applyServerErrors, buildForm, patchForm, toPayload } from '../resources/form-model';
import type { AdminRecord, FieldDef, ResourceConfig } from '../resources/resource.types';
import { ConfirmService } from '../ui/confirm-dialog';
import { DynamicFieldComponent } from '../ui/dynamic-field';

interface FieldGroup {
  title: string | null;
  fields: FieldDef[];
}

@Component({
  selector: 'app-resource-form-page',
  imports: [ReactiveFormsModule, RouterLink, IconComponent, AsyncStateComponent, DynamicFieldComponent, ProjectCardComponent],
  templateUrl: './resource-form.page.html',
  styleUrl: './resource-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceFormPage {
  readonly resource = input.required<ResourceConfig>();
  /** Route param; "nuevo" (or absent for singletons) means create. */
  readonly id = input<string | undefined>(undefined);

  private readonly api = inject(AdminApiService);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly lookups = inject(LookupService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = signal<FormGroup>(new FormGroup({}));
  readonly record = signal<AdminRecord | null>(null);
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly formError = signal<string | null>(null);
  readonly loadError = signal('');

  readonly isNew = computed(() => !this.resource().singleton && (!this.id() || this.id() === 'nuevo'));
  readonly heading = computed(() => {
    const r = this.resource();
    if (r.singleton) return r.title;
    return this.isNew() ? `Nuevo ${r.singular}` : `Editar ${r.singular}`;
  });
  readonly groups = computed<FieldGroup[]>(() => {
    const groups: FieldGroup[] = [{ title: null, fields: [] }];
    for (const field of this.resource().fields) {
      if (field.group) groups.push({ title: field.group, fields: [] });
      groups[groups.length - 1].fields.push(field);
    }
    return groups.filter((g) => g.fields.length);
  });
  readonly publicUrl = computed(() => {
    const record = this.record();
    return record ? (this.resource().publicUrl?.(record) ?? null) : null;
  });

  /** Live value for the preview card. */
  private readonly value = signal<Record<string, unknown>>({});
  readonly preview = computed<ProjectCardData | null>(() => {
    if (this.resource().preview !== 'project') return null;
    const v = this.value();
    const techIds = (v['technologyIds'] as string[] | undefined) ?? [];
    return {
      title: String(v['title'] || 'Título del proyecto'),
      slug: String(v['slug'] || 'vista-previa'),
      shortDescription: String(v['shortDescription'] || 'La descripción corta aparecerá aquí.'),
      kind: (v['kind'] as ProjectKind) || 'PERSONAL',
      status: (v['status'] as ProjectStatus) || 'IN_PROGRESS',
      context: (v['context'] as string) || null,
      solution: (v['solution'] as string) || null,
      role: (v['role'] as string) || null,
      responsibilities: ((v['responsibilities'] as string[] | undefined) ?? []).filter(Boolean),
      coverImageUrl: (v['coverImageUrl'] as string) || null,
      coverImageAlt: (v['coverImageAlt'] as string) || null,
      isFeatured: !!v['isFeatured'],
      technologies: this.lookups
        .technologies()
        .filter((t) => techIds.includes(t.id))
        .map((t) => ({ ...t, slug: t.id, icon: null })),
    };
  });

  constructor() {
    effect(() => {
      const resource = this.resource();
      const id = this.id();
      untracked(() => void this.init(resource, id));
    });
  }

  async init(resource: ResourceConfig, id: string | undefined): Promise<void> {
    const form = buildForm(resource.fields);
    this.form.set(form);
    this.formError.set(null);
    form.valueChanges
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.value.set(form.getRawValue()));

    if (this.isNew()) {
      patchForm(form, resource.fields, resource.defaults ?? {});
      this.record.set(null);
      this.state.set('ready');
      return;
    }
    this.state.set('loading');
    try {
      const record = resource.singleton
        ? await this.api.get(resource.endpoint)
        : await this.api.get(resource.endpoint, id);
      this.record.set(record);
      patchForm(form, resource.fields, record);
      this.state.set('ready');
    } catch (error) {
      const apiError = ApiError.from(error);
      // A singleton that does not exist yet is simply created on save.
      if (resource.singleton && apiError.status === 404) {
        patchForm(form, resource.fields, resource.defaults ?? {});
        this.state.set('ready');
        return;
      }
      this.loadError.set(apiError.message);
      this.state.set('error');
    }
  }

  async save(): Promise<void> {
    const form = this.form();
    const resource = this.resource();
    this.formError.set(null);
    if (form.invalid) {
      form.markAllAsTouched();
      this.formError.set('Revisa los campos marcados.');
      queueMicrotask(() => document.querySelector<HTMLElement>('.form [aria-invalid="true"]')?.focus());
      return;
    }
    this.saving.set(true);
    try {
      const payload = toPayload(form, resource.fields);
      let saved: AdminRecord;
      if (resource.singleton) saved = await this.api.replace(resource.endpoint, payload);
      else if (this.isNew()) saved = await this.api.create(resource.endpoint, payload);
      else saved = await this.api.update(resource.endpoint, this.id()!, payload);

      if (resource.endpoint === 'technologies' || resource.endpoint === 'skill-categories') this.lookups.invalidate();
      this.toasts.success(this.isNew() ? 'Registro creado.' : 'Cambios guardados.');
      this.record.set(saved);
      form.markAsPristine();
      if (this.isNew() && saved.id) {
        await this.router.navigate(['/admin', resource.key, saved.id], { replaceUrl: true });
      } else {
        patchForm(form, resource.fields, saved);
      }
    } catch (error) {
      const apiError = ApiError.from(error);
      const unmatched = applyServerErrors(form, apiError.details);
      this.formError.set([apiError.message, ...unmatched].join(' · '));
    } finally {
      this.saving.set(false);
    }
  }

  async remove(): Promise<void> {
    const resource = this.resource();
    const record = this.record();
    if (!record?.id) return;
    const ok = await this.confirm.ask({
      title: `Eliminar ${resource.singular}`,
      message: `"${resource.primary(record)}" se eliminará de forma permanente. Esta acción no se puede deshacer.`,
      confirmText: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await this.api.remove(resource.endpoint, record.id);
      this.form().markAsPristine();
      this.toasts.success('Registro eliminado.');
      await this.router.navigate(['/admin', resource.key]);
    } catch (error) {
      this.toasts.error(ApiError.from(error).message);
    }
  }

  /** Used by the unsaved-changes guard. */
  hasUnsavedChanges(): boolean {
    return this.form().dirty && !this.saving();
  }
}
