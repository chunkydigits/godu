import { bootstrapApplication } from '@angular/platform-browser';
import {
  isTikTokOAuthCallback,
  tikTokOAuthApiCallbackTarget,
} from './app/core/auth/tiktok-oauth-callback';
import { appConfig } from './app/app.config';
import { App } from './app/app';

if (isTikTokOAuthCallback) {
  window.location.replace(tikTokOAuthApiCallbackTarget());
} else {
  bootstrapApplication(App, appConfig).catch((err) => console.error(err));
}
