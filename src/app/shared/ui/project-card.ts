import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import type { Project } from '../../core/models/portfolio.models';
import { IconComponent, IconName } from './icon';

const KIND_ICON: Record<Project['kind'], IconName> = {
  PROFESSIONAL: 'briefcase',
  PERSONAL: 'code',
  ACADEMIC: 'graduation',
  DEMO: 'layers',
};

export type ProjectCardData = Pick<
  Project,
  'title' | 'slug' | 'shortDescription' | 'kind' | 'status' | 'coverImageUrl' | 'coverImageAlt' | 'technologies' | 'isFeatured'
> &
  Partial<Pick<Project, 'context' | 'solution' | 'role' | 'responsibilities'>>;

/** Case-study card used by the public grid, the featured slot and the admin live preview. */
@Component({
  selector: 'app-project-card',
  imports: [RouterLink, IconComponent],
  template: `
    @let p = project();
    @if (variant() === 'featured') {
      <article class="featured">
        <div class="lead-col">
          <p class="kind"><app-icon [name]="icon()" [size]="15" />{{ t().enums.projectKind[p.kind] }} · {{ t().enums.projectStatus[p.status] }}</p>
          <h3>
            @if (linkable()) {
              <a [routerLink]="['/proyectos', p.slug]">{{ p.title }}</a>
            } @else {
              {{ p.title }}
            }
          </h3>
          <p class="description">{{ p.shortDescription }}</p>
          @if (p.role) {
            <p class="role"><span>{{ t().projects.role }}:</span> {{ p.role }}</p>
          }
          <ul class="tech" [attr.aria-label]="t().projects.technologies">
            @for (tech of p.technologies; track tech.slug) {
              <li>{{ tech.name }}</li>
            }
          </ul>
          @if (linkable()) {
            <a class="btn btn-primary" [routerLink]="['/proyectos', p.slug]" [attr.aria-label]="t().projects.details + ': ' + p.title">
              {{ t().projects.details }}<app-icon name="arrow-right" />
            </a>
          }
        </div>
        <dl class="facts">
          @if (p.context) {
            <div><dt>{{ t().projects.context }}</dt><dd>{{ p.context }}</dd></div>
          }
          @if (p.solution) {
            <div><dt>{{ t().projects.solution }}</dt><dd>{{ p.solution }}</dd></div>
          }
          @if (participation().length) {
            <div>
              <dt>{{ t().projects.participation }}</dt>
              <dd>
                <ul class="participation">
                  @for (line of participation(); track $index) {
                    <li>{{ line }}</li>
                  }
                </ul>
              </dd>
            </div>
          }
        </dl>
      </article>
    } @else {
      <article class="project">
        <div class="media" [class.professional]="p.kind === 'PROFESSIONAL'">
          @if (p.coverImageUrl) {
            <img [src]="p.coverImageUrl" [alt]="p.coverImageAlt ?? ''" loading="lazy" decoding="async" width="640" height="360" />
          } @else {
            <div class="generated" aria-hidden="true">
              <app-icon [name]="icon()" [size]="34" />
            </div>
          }
        </div>
        <div class="content">
          <h3>
            @if (linkable()) {
              <a class="stretched" [routerLink]="['/proyectos', p.slug]">{{ p.title }}</a>
            } @else {
              {{ p.title }}
            }
          </h3>
          <p class="kind">{{ t().enums.projectKind[p.kind] }} · {{ t().enums.projectStatus[p.status] }}</p>
          <p class="description">{{ p.shortDescription }}</p>
          <ul class="tech" [attr.aria-label]="t().projects.technologies">
            @for (tech of visibleTech(); track tech.slug) {
              <li>{{ tech.name }}</li>
            }
            @if (hiddenTech() > 0) {
              <li>+{{ hiddenTech() }}</li>
            }
          </ul>
        </div>
      </article>
    }
  `,
  styleUrl: './project-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  readonly project = input.required<ProjectCardData>();
  readonly variant = input<'default' | 'featured'>('default');
  readonly linkable = input(true);
  protected readonly t = inject(I18nService).t;

  protected readonly visibleTech = computed(() => this.project().technologies.slice(0, 5));
  protected readonly hiddenTech = computed(() => Math.max(0, this.project().technologies.length - 5));
  protected readonly participation = computed(() => (this.project().responsibilities ?? []).slice(0, 5));
  protected readonly icon = computed(() => KIND_ICON[this.project().kind]);
}
