import { Component } from '@angular/core';
import { tikTokOAuthApiCallbackTarget } from '../../../../core/auth/tiktok-oauth-callback';

@Component({
  selector: 'app-tiktok-oauth-callback',
  template: '',
})
export class TikTokOAuthCallbackComponent {
  constructor() {
    window.location.replace(tikTokOAuthApiCallbackTarget());
  }
}
