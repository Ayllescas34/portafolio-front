import { FormArray } from '@angular/forms';
import { applyServerErrors, buildForm, controlError, patchForm, toPayload } from './form-model';
import type { FieldDef } from './resource.types';
import { resourceByKey, RESOURCES } from './resources';

const fields: FieldDef[] = [
  { key: 'title', label: 'Título', type: 'text', required: true, maxLength: 10 },
  { key: 'slug', label: 'Slug', type: 'text' },
  { key: 'startDate', label: 'Inicio', type: 'date' },
  { key: 'years', label: 'Años', type: 'number' },
  { key: 'url', label: 'URL', type: 'url' },
  { key: 'isPublished', label: 'Publicado', type: 'checkbox' },
  { key: 'responsibilities', label: 'Responsabilidades', type: 'list' },
  { key: 'technologyIds', label: 'Tecnologías', type: 'technologies' },
  { key: 'images', label: 'Imágenes', type: 'images' },
];

describe('admin form model', () => {
  it('maps API records into the form (dates, relations, lists)', () => {
    const form = buildForm(fields);
    patchForm(form, fields, {
      title: 'Hola',
      startDate: '2025-02-01T00:00:00.000Z',
      isPublished: true,
      responsibilities: ['Uno', 'Dos'],
      technologies: [{ id: 't1' }, { id: 't2' }],
      images: [{ imageUrl: 'https://x.dev/a.png', altText: 'Alt', caption: null }],
    });
    expect(form.get('startDate')!.value).toBe('2025-02-01');
    expect(form.get('technologyIds')!.value).toEqual(['t1', 't2']);
    expect((form.get('responsibilities') as FormArray).length).toBe(2);
    expect(form.pristine).toBeTrue();
  });

  it('builds a clean payload: trims, clears empty optionals, omits empty slug', () => {
    const form = buildForm(fields);
    patchForm(form, fields, { title: '  Proyecto  ', years: '', responsibilities: [' a ', ''] });
    const payload = toPayload(form, fields);
    expect(payload['title']).toBe('Proyecto');
    expect(payload['startDate']).toBeNull();
    expect(payload['years']).toBeNull();
    expect('slug' in payload).toBeFalse();
    expect(payload['responsibilities']).toEqual(['a']);
    expect(payload['isPublished']).toBeFalse();
  });

  it('validates required, length and URL fields with readable messages', () => {
    const form = buildForm(fields);
    form.get('title')!.setValue('');
    form.get('url')!.setValue('javascript:alert(1)');
    form.markAllAsTouched();
    expect(controlError(form.get('title'), fields[0])).toBe('Este campo es obligatorio.');
    expect(controlError(form.get('url'), fields[4])).toContain('https://');
    form.get('title')!.setValue('demasiado largo');
    expect(controlError(form.get('title'), fields[0])).toBe('Máximo 10 caracteres.');
  });

  it('attaches server validation errors to nested controls', () => {
    const form = buildForm(fields);
    patchForm(form, fields, { images: [{ imageUrl: 'https://x.dev/a.png', altText: 'Alt', caption: null }] });
    const unmatched = applyServerErrors(form, [
      { field: 'title', errors: ['debe ser único'] },
      { field: 'images.0.altText', errors: ['es obligatorio'] },
      { field: 'unknown', errors: ['x'] },
    ]);
    expect(controlError(form.get('title'))).toBe('debe ser único');
    expect(controlError(form.get(['images', '0', 'altText']))).toBe('es obligatorio');
    expect(unmatched).toEqual(['unknown: x']);
  });

  it('every admin resource has a unique route key and at least one required field', () => {
    const keys = RESOURCES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const resource of RESOURCES) expect(resource.fields.some((f) => f.required)).withContext(resource.key).toBeTrue();
    expect(() => resourceByKey('no-existe')).toThrow();
  });
});
