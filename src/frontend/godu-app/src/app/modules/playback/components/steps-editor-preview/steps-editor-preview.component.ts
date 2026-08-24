import { AsyncPipe } from '@angular/common';
import { Component, Input, NgZone, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject, takeUntil } from 'rxjs';
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
  private readonly ngZone = inject(NgZone);

  private readonly destroy$ = new Subject<void>();
  private player: ControllableVideoPlayer | null = null;
  private lastUpdate: VideoPlayerTimeUpdate = { currentTime: 0, duration: 0 };
  private clipStartSeconds = 0;
  private stopAtSeconds: number | null = null;
  private readonly clockSubject = new BehaviorSubject<{ current: string; duration: string }>({
    current: '0:00',
    duration: '0:00',
  });

  videoId: string | null = null;
  @Input() lookupPending = false;

  @Input() set externalVideoId(value: string | null) {
    this.videoId = value?.trim() || null;
  }

  readonly clock$: Observable<{ current: string; duration: string }> =
    this.clockSubject.asObservable();

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
    await player.initialise();
    player.timeUpdates.pipe(takeUntil(this.destroy$)).subscribe((update) => {
      this.lastUpdate = update;
      this.ngZone.run(() => this.publishClock(update));
      this.maybeStopAtEnd(update.currentTime);
    });
  }

  play(): void {
    this.clearClipStop();
    this.playFrom(this.lastUpdate.currentTime || 0);
  }

  playFrom(seconds: number, stopAtSeconds?: number): void {
    if (!this.player) {
      return;
    }
    const start = Math.max(0, seconds);
    this.clipStartSeconds = start;
    this.stopAtSeconds =
      stopAtSeconds != null && stopAtSeconds > start ? stopAtSeconds : null;
    this.lastUpdate = { ...this.lastUpdate, currentTime: start };
    this.publishClock(this.lastUpdate);
    this.player.kickstartFromUserGesture(start);
  }

  pause(): void {
    this.clearClipStop();
    void this.player?.pause();
  }

  seekBack(): void {
    void this.seekBy(-1);
  }

  seekForward(): void {
    void this.seekBy(1);
  }

  private async seekBy(delta: number): Promise<void> {
    if (!this.player) {
      return;
    }
    this.clearClipStop();

    const current = await this.player.getCurrentTime();
    const duration = this.lastUpdate.duration;
    let next = current + delta;
    if (next < 0) {
      next = 0;
    }
    if (duration > 0 && next > duration) {
      next = duration;
    }

    await this.player.seek(next);
    this.lastUpdate = { ...this.lastUpdate, currentTime: next };
    this.publishClock(this.lastUpdate);
  }

  private maybeStopAtEnd(currentTime: number): void {
    if (this.stopAtSeconds == null || !this.player) {
      return;
    }
    if (currentTime + 0.05 < this.clipStartSeconds) {
      return;
    }
    if (currentTime < this.stopAtSeconds) {
      return;
    }
    this.clearClipStop();
    void this.player.pause();
  }

  private clearClipStop(): void {
    this.stopAtSeconds = null;
  }

  private publishClock(update: VideoPlayerTimeUpdate): void {
    this.clockSubject.next({
      current: formatClock(update.currentTime),
      duration: formatClock(update.duration),
    });
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
