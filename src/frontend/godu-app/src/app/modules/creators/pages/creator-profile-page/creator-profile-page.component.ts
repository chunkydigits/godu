import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { platformLabel } from '../../../playback/models/creator-link';
import { CreatorProfile } from '../../models/creator-profile.model';
import { CreatorProfileApiService } from '../../services/creator-profile-api.service';

interface CreatorProfileView {
  loading: boolean;
  profile: CreatorProfile | null;
  error: string | null;
}

@Component({
  selector: 'app-creator-profile-page',
  imports: [PageTemplateComponent, MaterialModule, AsyncPipe, RouterLink],
  templateUrl: './creator-profile-page.component.html',
  styleUrl: './creator-profile-page.component.scss',
})
export class CreatorProfilePageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CreatorProfileApiService);

  readonly view$: Observable<CreatorProfileView> = this.route.paramMap.pipe(
    map((params) => params.get('userId')),
    switchMap((userId) => {
      if (!userId) {
        return of({ loading: false, profile: null, error: 'Creator not found.' });
      }
      return this.api.get(userId).pipe(
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
}
