import { Injectable, inject } from '@angular/core';
import { AuthService } from '@auth0/auth0-angular';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';
import { MeApiService } from './me-api.service';
import { MeProfile } from './me.model';

@Injectable({ providedIn: 'root' })
export class CurrentUserService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(MeApiService);
  private readonly profileSubject = new BehaviorSubject<MeProfile | null>(null);
  private started = false;

  readonly profile$ = this.profileSubject.asObservable();
  readonly isAdmin$ = this.profile$.pipe(map((profile) => !!profile?.isAdmin));

  initialize(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.auth.isAuthenticated$.pipe(distinctUntilChanged()).subscribe((authenticated) => {
      if (!authenticated) {
        this.profileSubject.next(null);
        return;
      }

      this.api.get().subscribe({
        next: (profile) => this.profileSubject.next(profile),
        error: () => this.profileSubject.next(null),
      });
    });
  }

  refresh(): void {
    this.api.get().subscribe({
      next: (profile) => this.profileSubject.next(profile),
      error: () => this.profileSubject.next(null),
    });
  }
}
