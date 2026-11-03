import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ApiError } from '../../core/http/api-error';
import { IconComponent } from '../../shared/ui/icon';
import { AdminApiService } from '../data/admin-api.service';
import { LookupService } from '../data/lookup.service';
import { controlError, ImageGroup, imageGroup, listItem } from '../resources/form-model';
import type { FieldDef } from '../resources/resource.types';

/** Renders one field definition with its label, hint, error and accessibility wiring. */
@Component({
  selector: 'app-dynamic-field',
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './dynamic-field.html',
  styleUrl: './dynamic-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DynamicFieldComponent {
  readonly field = input.required<FieldDef>();
  readonly form = input.required<FormGroup>();

  private readonly api = inject(AdminApiService);
  protected readonly lookups = inject(LookupService);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);

  protected readonly id = computed(() => `field-${this.field().key}`);
  protected readonly control = computed(() => this.form().get(this.field().key) as FormControl);
  protected readonly array = computed(() => this.form().get(this.field().key) as FormArray);
  protected readonly images = computed(() => this.form().get(this.field().key) as FormArray<ImageGroup>);

  constructor() {
    void this.lookups.ensureLoaded();
  }

  error(): string | null {
    return controlError(this.control(), this.field());
  }

  describedBy(): string | null {
    const ids = [this.field().hint ? `${this.id()}-hint` : null, this.error() ? `${this.id()}-error` : null];
    return ids.filter(Boolean).join(' ') || null;
  }

  itemError(index: number): string | null {
    return controlError(this.array().at(index), this.field());
  }

  imageError(index: number, key: 'imageUrl' | 'altText' | 'caption'): string | null {
    return controlError(this.images().at(index).get(key), this.field());
  }

  addLine(): void {
    this.array().push(listItem('', this.field().maxLength));
    this.array().markAsDirty();
    queueMicrotask(() => document.getElementById(`${this.id()}-${this.array().length - 1}`)?.focus());
  }

  removeAt(index: number): void {
    this.array().removeAt(index);
    this.array().markAsDirty();
  }

  move(index: number, delta: -1 | 1): void {
    const array = this.array();
    const target = index + delta;
    if (target < 0 || target >= array.length) return;
    const control = array.at(index);
    array.removeAt(index);
    array.insert(target, control);
    array.markAsDirty();
  }

  addImage(): void {
    this.images().push(imageGroup());
    this.images().markAsDirty();
  }

  isSelected(id: string): boolean {
    return (this.control().value as string[]).includes(id);
  }

  toggleTechnology(id: string, checked: boolean): void {
    const current = this.control().value as string[];
    this.control().setValue(checked ? [...current, id] : current.filter((v) => v !== id));
    this.control().markAsDirty();
  }

  async upload(event: Event, target: FormControl): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    try {
      const { url } = await this.api.upload(file, this.field().mediaKind ?? 'image');
      target.setValue(url);
      target.markAsDirty();
    } catch (error) {
      this.uploadError.set(ApiError.from(error).message);
    } finally {
      this.uploading.set(false);
      input.value = '';
    }
  }

  async uploadImageAt(event: Event, index: number): Promise<void> {
    await this.upload(event, this.images().at(index).controls.imageUrl);
  }
}
