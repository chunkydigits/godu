import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, catchError, combineLatest, map, of, startWith, switchMap, tap } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { platformLabel } from '../../../playback/models/creator-link';
import { PlatformMarkComponent } from '../../../playback/components/platform-mark/platform-mark.component';
import {
  publicAlias,
  publicCreatorPath,
  publicViewerPath,
  shouldReplaceCanonicalPath,
} from '../../../playback/models/public-path';
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
  private readonly router = inject(Router);
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
        tap((view) => this.replaceAliasHandle(view.profile, provider, username)),
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

  initial(name: string): string {
    const trimmed = name.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
  }

  itemPath(item: PublicStepsSummary): string | null {
    return publicViewerPath(item);
  }

  private replaceAliasHandle(
    profile: CreatorProfile | null,
    provider: string,
    username: string | null,
  ): void {
    if (!profile || !username) {
      return;
    }

    const social =
      profile.socials.find((item) => publicAlias(item.provider) === publicAlias(provider)) ??
      profile.socials[0];
    const canonical = social ? publicCreatorPath(social.provider, social.username) : null;
    if (shouldReplaceCanonicalPath(this.router.url, canonical)) {
      void this.router.navigateByUrl(canonical!, { replaceUrl: true });
    }
  }
}
