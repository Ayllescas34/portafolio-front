import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import type { Project } from '../../core/models/portfolio.models';
import { IconComponent, IconName } from './icon';

const CATEGORY_ICON: Record<Project['category'], IconName> = {
  WEB_APP: 'globe',
  MOBILE_APP: 'phone',
  API: 'code',
  DATABASE: 'database',
  DESKTOP: 'grid',
  TOOL: 'settings',
  OTHER: 'layers',
};

export type ProjectCardData = Pick<
  Project,
  'title' | 'slug' | 'shortDescription' | 'category' | 'status' | 'coverImageUrl' | 'coverImageAlt' | 'technologies' | 'isFeatured'
> &
  Partial<Pick<Project, 'problem' | 'solution' | 'role'>>;

/** Used by the public grid, the featured slot and the admin live preview. */
@Component({
  selector: 'app-project-card',
  imports: [RouterLink, IconComponent],
  template: `
    @let p = project();
    <article class="card project" [class.featured]="variant() === 'featured'">
      <div class="media">
        @if (p.coverImageUrl) {
          <img [src]="p.coverImageUrl" [alt]="p.coverImageAlt ?? ''" loading="lazy" decoding="async" width="640" height="360" />
        } @else {
          <div class="placeholder" aria-hidden="true">
            <app-icon [name]="icon()" [size]="40" />
            <span class="mono">{{ p.slug }}</span>
          </div>
        }
      </div>
      <div class="content">
        <div class="tags">
          <span class="chip">{{ t().enums.projectCategory[p.category] }}</span>
          <span class="badge">{{ t().enums.projectStatus[p.status] }}</span>
        </div>
        <h3>
          @if (linkable()) {
            <a class="stretched" [routerLink]="['/proyectos', p.slug]">{{ p.title }}</a>
          } @else {
            {{ p.title }}
          }
        </h3>
        <p class="description">{{ p.shortDescription }}</p>

        @if (variant() === 'featured') {
          <dl class="facts">
            @if (p.problem) {
              <div><dt>{{ t().projects.problem }}</dt><dd>{{ p.problem }}</dd></div>
            }
            @if (p.solution) {
              <div><dt>{{ t().projects.solution }}</dt><dd>{{ p.solution }}</dd></div>
            }
          </dl>
        }

        <ul class="chip-list" [attr.aria-label]="t().projects.technologies">
          @for (tech of visibleTech(); track tech.slug) {
            <li class="chip">{{ tech.name }}</li>
          }
          @if (hiddenTech() > 0) {
            <li class="chip">+{{ hiddenTech() }}</li>
          }
        </ul>
        @if (linkable()) {
          <span class="more" aria-hidden="true">{{ t().projects.details }} <app-icon name="arrow-right" [size]="16" /></span>
        }
      </div>
    </article>
  `,
  styleUrl: './project-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent {
  readonly project = input.required<ProjectCardData>();
  readonly variant = input<'default' | 'featured'>('default');
  readonly linkable = input(true);
  protected readonly t = inject(I18nService).t;

  private readonly limit = computed(() => (this.variant() === 'featured' ? 10 : 5));
  protected readonly visibleTech = computed(() => this.project().technologies.slice(0, this.limit()));
  protected readonly hiddenTech = computed(() => Math.max(0, this.project().technologies.length - this.limit()));
  protected readonly icon = computed(() => CATEGORY_ICON[this.project().category]);
}
