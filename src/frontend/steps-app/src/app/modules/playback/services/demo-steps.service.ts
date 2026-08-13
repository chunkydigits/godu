import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { StepsItem } from '../models/steps-item.model';
import { StepsItemStatus } from '../models/steps-item-status.enum';
import { StepsVisibility } from '../models/steps-visibility.enum';
import { VideoProvider } from '../models/video-provider.enum';

const DEMO_ITEMS: StepsItem[] = [
  {
    id: 'steps_demo_fitness',
    createdByUserId: 'usr_demo',
    linkedPlatformAccountId: null,
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Discipline Drive Mobility',
    description: 'Hard-coded Phase 1 fitness demo with timed and untimed steps.',
    creatorDisplayName: '@mydisciplinedrive',
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '7668570367119691030',
      sourceUrl: 'https://www.tiktok.com/@mydisciplinedrive/video/7668570367119691030',
      creatorUsername: 'mydisciplinedrive',
      durationSeconds: 60,
    },
    steps: [
      {
        id: 'step_1',
        order: 1,
        title: 'Lymphatic Hops',
        description: 'Hopping with loose arms',
        startSeconds: 6,
        endSeconds: 9,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_2',
        order: 2,
        title: 'Body Waves',
        description: 'Stay with the primary drill.',
        startSeconds: 10,
        endSeconds: 15,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_3',
        order: 3,
        title: 'Trunk Twists',
        description: 'Twisting with tight arms pointing your elbows outward.',
        startSeconds: 16,
        endSeconds: 20,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_4',
        order: 4,
        title: 'Arm Swings',
        description: 'Alternatively swinging your arms up and down to the front.',
        startSeconds: 22,
        endSeconds: 26,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_5',
        order: 5,
        title: 'Dead Arms',
        description: 'Keeping your arms floppy, rotate torso from side to side.',
        startSeconds: 28,
        endSeconds: 33,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_6',
        order: 6,
        title: 'Golf Swings',
        description: 'Golf swings from side to side with a wide stance',
        startSeconds: 35,
        endSeconds: 39,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_7',
        order: 7,
        title: 'Marches',
        description: 'Marching legs with high knees and giant claps timed to meet in the middle.',
        startSeconds: 41,
        endSeconds: 46,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_8',
        order: 8,
        title: 'Ballet Squats',
        description: 'Ballet squats with wide arms going from down to up and back again',
        startSeconds: 47,
        endSeconds: 53,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_9',
        order: 9,
        title: 'Horseback Stance',
        description: 'Holding in a horseback stance with hands together in prayer',
        startSeconds: 54,
        endSeconds: 59,
        durationSeconds: 60,
        autoAdvance: true,
      },
    ],
    createdUtc: '2026-08-13T08:00:00Z',
    updatedUtc: '2026-08-13T08:00:00Z',
  },
  {
    id: 'steps_demo_recipe',
    createdByUserId: 'usr_demo',
    linkedPlatformAccountId: null,
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Lagom Chef Recipe',
    description: 'Hard-coded Phase 1 recipe demo — mostly untimed cooking steps.',
    creatorDisplayName: '@lagomchef',
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '7667587928620600609',
      sourceUrl: 'https://www.tiktok.com/@lagomchef/video/7667587928620600609',
      creatorUsername: 'lagomchef',
      durationSeconds: 55,
    },
    steps: [
      {
        id: 'step_1',
        order: 1,
        title: 'Prep ingredients',
        startSeconds: 1,
        endSeconds: 12,
        durationSeconds: null,
        autoAdvance: false,
      },
      {
        id: 'step_2',
        order: 2,
        title: 'Cook',
        startSeconds: 12,
        endSeconds: 30,
        durationSeconds: null,
        autoAdvance: false,
      },
      {
        id: 'step_3',
        order: 3,
        title: 'Rest timer',
        description: 'Short timed pause before plating.',
        startSeconds: 30,
        endSeconds: 40,
        durationSeconds: 15,
        autoAdvance: true,
      },
      {
        id: 'step_4',
        order: 4,
        title: 'Plate & finish',
        startSeconds: 40,
        endSeconds: 50,
        durationSeconds: null,
        autoAdvance: false,
      },
    ],
    createdUtc: '2026-08-13T08:00:00Z',
    updatedUtc: '2026-08-13T08:00:00Z',
  },
];

@Injectable({ providedIn: 'root' })
export class DemoStepsService {
  list(): Observable<StepsItem[]> {
    return of(DEMO_ITEMS);
  }

  getById(id: string): Observable<StepsItem> {
    const item = DEMO_ITEMS.find((x) => x.id === id);
    if (!item) {
      return throwError(() => new Error(`Demo StepsItem not found: ${id}`));
    }
    return of(item);
  }
}
