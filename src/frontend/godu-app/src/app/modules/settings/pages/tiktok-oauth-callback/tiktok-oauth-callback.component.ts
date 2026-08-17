import { Component } from '@angular/core';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-tiktok-oauth-callback',
  template: '',
})
export class TikTokOAuthCallbackComponent {
  constructor() {
    const target = `${environment.apiBaseUrl}/api/me/platform-accounts/tiktok/callback${window.location.search}`;
    window.location.replace(target);
  }
}
