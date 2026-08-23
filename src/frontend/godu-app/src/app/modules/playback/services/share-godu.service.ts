import { Injectable, inject } from '@angular/core';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import {
  ShareMethod,
  ShareableGodu,
  shareOrCopyUrl,
  shareableGoduUrl,
} from '../models/share-godu';

@Injectable({ providedIn: 'root' })
export class ShareGoduService {
  private readonly analytics = inject(AnalyticsService);

  async share(item: ShareableGodu): Promise<ShareMethod | null> {
    const url = shareableGoduUrl(item);
    const method = await shareOrCopyUrl(url, item.title);
    if (method) {
      this.analytics.trackShare(method, {
        goduId: item.id,
        platform: item.video?.provider || 'tiktok',
      });
    }
    return method;
  }
}
