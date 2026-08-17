import { Component, Input } from '@angular/core';
import { VideoProvider } from '../../models/video-provider.enum';

@Component({
  selector: 'app-platform-mark',
  templateUrl: './platform-mark.component.html',
  styleUrl: './platform-mark.component.scss',
})
export class PlatformMarkComponent {
  @Input({ required: true }) provider!: VideoProvider | string;

  get isTikTok(): boolean {
    return this.provider === VideoProvider.TikTok || this.provider === 'tiktok';
  }
}
