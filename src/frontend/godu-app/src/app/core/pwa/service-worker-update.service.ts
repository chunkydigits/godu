import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * App-shell updates only. Reloads on the next navigation so a playing
 * session is not interrupted the moment a deploy lands.
 */
@Injectable({ providedIn: 'root' })
export class ServiceWorkerUpdateService {
  private readonly updates = inject(SwUpdate);
  private readonly router = inject(Router);
  private reloadOnNextNavigation = false;

  initialize(): void {
    if (!this.updates.isEnabled) {
      return;
    }

    void this.updates.checkForUpdate();

    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.reloadOnNextNavigation = true;
      });

    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      if (!this.reloadOnNextNavigation) {
        return;
      }
      this.reloadOnNextNavigation = false;
      void this.updates.activateUpdate().then(() => {
        document.location.reload();
      });
    });
  }
}
