import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, combineLatest, map, of, startWith, switchMap } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { platformLabel } from '../../../playback/models/creator-link';
import { PlatformMarkComponent } from '../../../playback/components/platform-mark/platform-mark.component';
import { publicViewerPath } from '../../../playback/models/public-path';
import { CreatorProfile, PublicStepsSummary } from '../../models/creator-profile.model';
import { CreatorProfileApiService } from '../../services/creator-profile-api.service';

interface CreatorProfileView {
  loading: boolean;
  profile: CreatorProfile | null;
  error: string | null;
}

@Component({
  selector: 'app-creator-profile-page',
  imports: [PageTemplateComponent, MaterialModule, AsyncPipe, RouterLink, PlatformMarkComponent],
  templateUrl: './creator-profile-page.component.html',
  styleUrl: './creator-profile-page.component.scss',
})
export class CreatorProfilePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CreatorProfileApiService);

  readonly view$: Observable<CreatorProfileView> = combineLatest([
    this.route.paramMap,
    this.route.data,
  ]).pipe(
    switchMap(([params, data]) => {
      const userId = params.get('userId');
      const username = params.get('username');
      const provider = (data['provider'] as string | undefined) ?? 'tiktok';

      const request$ = userId
        ? this.api.get(userId)
        : username
          ? this.api.getByHandle(provider, username)
          : null;

      if (!request$) {
        return of({ loading: false, profile: null, error: 'Creator not found.' });
      }

      return request$.pipe(
        map((profile) => ({ loading: false, profile, error: null })),
        startWith({ loading: true, profile: null, error: null }),
        catchError(() =>
          of({
            loading: false,
            profile: null,
            error: 'This creator profile is not available yet.',
          }),
        ),
      );
    }),
  );

  platformName(provider: string): string {
    return platformLabel(provider);
  }

  itemPath(item: PublicStepsSummary): string | null {
    return publicViewerPath(item);
  }
}
