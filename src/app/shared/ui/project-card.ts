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
    <article class="project" [class.featured]="variant() === 'featured'" [class.with-media]="!!p.coverImageUrl">
      @if (p.coverImageUrl) {
        <div class="media">
          <img [src]="p.coverImageUrl" [alt]="p.coverImageAlt ?? ''" loading="lazy" decoding="async" width="640" height="360" />
        </div>
      }
      <div class="content">
        <div class="tags">
          <span class="kind"><app-icon [name]="icon()" [size]="15" />{{ t().enums.projectKind[p.kind] }}</span>
          <span class="status">{{ t().enums.projectStatus[p.status] }}</span>
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
        }

        <div class="footer">
          @if (p.role) {
            <p class="role"><span>{{ t().projects.role }}:</span> {{ p.role }}</p>
          }
          <ul class="tech" [attr.aria-label]="t().projects.technologies">
            @for (tech of visibleTech(); track tech.slug) {
              <li>{{ tech.name }}</li>
            }
            @if (hiddenTech() > 0) {
              <li>+{{ hiddenTech() }}</li>
            }
          </ul>
          @if (linkable()) {
            <span class="more" aria-hidden="true">{{ t().projects.details }} <app-icon name="arrow-right" [size]="16" /></span>
          }
        </div>
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
  protected readonly participation = computed(() => (this.project().responsibilities ?? []).slice(0, 5));
  protected readonly icon = computed(() => KIND_ICON[this.project().kind]);
}
