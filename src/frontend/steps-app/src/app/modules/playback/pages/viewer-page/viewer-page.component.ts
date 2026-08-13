import { AsyncPipe } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subject,
  catchError,
  map,
  of,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { PageTemplateComponent } from '../../../../components/page-template/page-template.component';
import { MaterialModule } from '../../../../core/material.module';
import { CompletionPanelComponent } from '../../components/completion-panel/completion-panel.component';
import { StepNavigatorComponent } from '../../components/step-navigator/step-navigator.component';
import { VideoHostComponent } from '../../components/video-host/video-host.component';
import { StepsItem } from '../../models/steps-item.model';
import { ControllableVideoPlayer } from '../../models/video-player.interface';
import { DemoStepsService } from '../../services/demo-steps.service';
import {
  PlaybackState,
  StepPlaybackService,
} from '../../services/step-playback.service';

@Component({
  selector: 'app-viewer-page',
  imports: [
    PageTemplateComponent,
    MaterialModule,
    RouterLink,
    AsyncPipe,
    VideoHostComponent,
    StepNavigatorComponent,
    CompletionPanelComponent,
  ],
  providers: [StepPlaybackService],
  templateUrl: './viewer-page.component.html',
  styleUrl: './viewer-page.component.scss',
})
export class ViewerPageComponent implements OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly demoSteps = inject(DemoStepsService);
  private readonly playback = inject(StepPlaybackService);
  private readonly destroy$ = new Subject<void>();

  private pendingItem: StepsItem | null = null;
  private playerAttached = false;

  readonly error$ = new BehaviorSubject<string | null>(null);

  readonly item$: Observable<StepsItem | null> = this.route.paramMap.pipe(
    map((params) => params.get('id')),
    switchMap((id) => {
      if (!id) {
        return of(null);
      }
      return this.demoSteps.getById(id).pipe(
        tap((item) => {
          this.pendingItem = item;
          this.error$.next(null);
          if (this.playerAttached) {
            void this.playback.load(item);
          }
        }),
        catchError((err: Error) => {
          this.error$.next(err.message);
          return of(null);
        }),
      );
    }),
    takeUntil(this.destroy$),
  );

  readonly state$: Observable<PlaybackState> = this.playback.state$;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    void this.playback.destroy();
  }

  async onPlayerReady(player: ControllableVideoPlayer): Promise<void> {
    await this.playback.attachPlayer(player);
    this.playerAttached = true;
    if (this.pendingItem) {
      await this.playback.load(this.pendingItem);
    }
  }

  start(): void {
    // Keep this sync from the click handler so TikTok can unlock autoplay.
    void this.playback.start();
  }

  selectStep(index: number): void {
    void this.playback.selectStep(index);
  }

  previous(): void {
    void this.playback.previous();
  }

  next(): void {
    void this.playback.next();
  }

  togglePause(state: PlaybackState): void {
    if (state.phase === 'playing') {
      void this.playback.pause();
    } else if (state.phase === 'paused') {
      void this.playback.resume();
    }
  }

  replay(): void {
    void this.playback.restart();
  }

  formatRemaining(seconds: number | null): string {
    if (seconds == null) {
      return 'Untimed';
    }
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
