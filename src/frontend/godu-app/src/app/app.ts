import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AnalyticsService } from './core/analytics/analytics.service';
import { CurrentUserService } from './core/auth/current-user.service';
import { PlayHistoryService } from './modules/playback/services/play-history.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    inject(AnalyticsService).initialize();
    inject(CurrentUserService).initialize();
    inject(PlayHistoryService).initialize();
  }
}
