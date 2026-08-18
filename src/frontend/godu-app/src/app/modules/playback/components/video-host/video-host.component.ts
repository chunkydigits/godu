import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { VideoProvider } from '../../models/video-provider.enum';
import { ControllableVideoPlayer } from '../../models/video-player.interface';
import { TikTokVideoPlayer } from '../../video/providers/tiktok/tiktok-video-player';

@Component({
  selector: 'app-video-host',
  templateUrl: './video-host.component.html',
  styleUrl: './video-host.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoHostComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly ngZone = inject(NgZone);

  @ViewChild('mount', { static: true }) mountRef!: ElementRef<HTMLDivElement>;

  @Input({ required: true }) provider!: VideoProvider;
  @Input({ required: true }) externalVideoId!: string;

  @Output() readonly playerReady = new EventEmitter<ControllableVideoPlayer>();

  private player: ControllableVideoPlayer | null = null;
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    void this.recreatePlayer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.viewReady) {
      return;
    }
    if (changes['provider'] || changes['externalVideoId']) {
      void this.recreatePlayer();
    }
  }

  ngOnDestroy(): void {
    void this.destroyPlayer();
  }

  private async recreatePlayer(): Promise<void> {
    await this.destroyPlayer();

    if (!this.externalVideoId) {
      return;
    }

    if (this.provider !== VideoProvider.TikTok) {
      throw new Error(`Video provider not implemented: ${this.provider}`);
    }

    this.player = new TikTokVideoPlayer(
      this.mountRef.nativeElement,
      this.externalVideoId,
      this.ngZone,
    );
    this.playerReady.emit(this.player);
  }

  private async destroyPlayer(): Promise<void> {
    if (this.player) {
      await this.player.destroy();
      this.player = null;
    }
  }
}
