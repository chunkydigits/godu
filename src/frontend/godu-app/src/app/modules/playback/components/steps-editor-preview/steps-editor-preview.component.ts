import { AsyncPipe } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  map,
  of,
  switchMap,
  takeUntil,
} from 'rxjs';
import { MaterialModule } from '../../../../core/material.module';
import { VideoProvider } from '../../models/video-provider.enum';
import {
  ControllableVideoPlayer,
  VideoPlayerTimeUpdate,
} from '../../models/video-player.interface';
import { VideoHostComponent } from '../video-host/video-host.component';

@Component({
  selector: 'app-steps-editor-preview',
  imports: [MaterialModule, VideoHostComponent, AsyncPipe],
  templateUrl: './steps-editor-preview.component.html',
  styleUrl: './steps-editor-preview.component.scss',
})
export class StepsEditorPreviewComponent implements OnDestroy {
  readonly provider = VideoProvider.TikTok;

  private readonly destroy$ = new Subject<void>();
  private readonly player$ = new BehaviorSubject<ControllableVideoPlayer | null>(null);
  private player: ControllableVideoPlayer | null = null;
  private lastUpdate: VideoPlayerTimeUpdate = { currentTime: 0, duration: 0 };

  videoId: string | null = null;

  @Input() set externalVideoId(value: string | null) {
    this.videoId = value?.trim() || null;
  }

  readonly clock$: Observable<{ current: string; duration: string }> = this.player$.pipe(
    switchMap((player) => {
      if (!player) {
        return of({ current: '0:00', duration: '0:00' });
      }
      return player.timeUpdates.pipe(
        map((update) => {
          this.lastUpdate = update;
          return {
            current: formatClock(update.currentTime),
            duration: formatClock(update.duration),
          };
        }),
      );
    }),
  );

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    void this.player?.destroy();
    this.player = null;
  }

  async onPlayerReady(player: ControllableVideoPlayer): Promise<void> {
    if (this.player && this.player !== player) {
      await this.player.destroy();
    }
    this.player = player;
    this.player$.next(player);
    await player.initialise();
    player.timeUpdates.pipe(takeUntil(this.destroy$)).subscribe((update) => {
      this.lastUpdate = update;
    });
  }

  play(): void {
    if (!this.player) {
      return;
    }
    this.player.kickstartFromUserGesture(this.lastUpdate.currentTime || 0);
  }

  pause(): void {
    void this.player?.pause();
  }

  seekBack(): void {
    void this.player?.seek(Math.max(0, this.lastUpdate.currentTime - 1));
  }

  seekForward(): void {
    void this.player?.seek(this.lastUpdate.currentTime + 1);
  }
}

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
