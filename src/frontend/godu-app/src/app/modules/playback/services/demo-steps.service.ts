import { Injectable } from '@angular/core';
import { Observable, of, throwError, map } from 'rxjs';
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
    title: 'Steps from @mydisciplinedrive',
    description:
      '418 days of moving my body. Every. Single. Day. 👊 It all started on 9th June 2025 with a simple challenge: 100 push-ups a day. That eventually turned into 100+ burpees a day. After a year of that, alongside heavy gym sessions and a physical job, I wrecked my shoulders. That’s when I found this Tai Chi-inspired movement routine. I’ve now been doing it for 2 months, and the reason I started—to get rid of my shoulder pain—has been a success. I no longer wake up with aching shoulders. But something else happened… This has become my daily practice for my mental health. Every morning I spend 9 minutes moving, visualising the day ahead, practising gratitude, and letting go of any negativity. My days are filled with so much more positivity, and when little problems crop up, I deal with them far better than I used to. If you’d like to join me: ⏱️ Do each movement for 60 seconds. When the video loops, move on to the next exercise. ✅ Lymphatic Hops ✅ Body Waves ✅ Trunk Twists ✅ Arm Swings ✅ Dead Arms ✅ Golf Swings ✅ Marches ✅ Ballet Squats ✅ Horseback Stance A quick reminder because I get asked every day… These movements aren’t what took me from 122.9kg to 77kg. My transformation came from: ✅ A high-protein diet ✅ Tirzepatide (Mounjaro) ✅ TRT (after discovering my testosterone was low) ✅ Weight training 3–4 times a week ✅ 12,000+ steps a day ✅ And, most importantly, 418 consecutive days of showing up for myself. 💾 Save this video, ❤️ follow along every morning, and 📤 share it with a friend who could use a more positive start to their day. Let’s keep moving—, one day at a time.',
    creatorDisplayName: '@mydisciplinedrive',
    continuousSoundtrack: false,
    gapSeconds: 5,
    gapMessage: 'Get ready to go ...',
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '7668570367119691030',
      sourceUrl: 'https://www.tiktok.com/@mydisciplinedrive/video/7668570367119691030',
      creatorUsername: 'mydisciplinedrive',
    },
    steps: [
      {
        id: 'step_01M0A1AAJ3RD3D0DNN31V1T1M0',
        order: 1,
        kind: 'gap',
        title: '',
        startSeconds: 0,
        endSeconds: 0,
        durationSeconds: 15,
        autoAdvance: true,
        message: 'Extra long gap for funsies',
      },
      {
        id: 'step_01M070XXDYZP2M1KKE0VCWK41Y',
        order: 2,
        kind: 'step',
        title: 'Lymphatic Hops',
        description: 'Jumping up and down with loose arms',
        startSeconds: 6,
        endSeconds: 7,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZPXN2YRZE2XXMPT0H',
        order: 3,
        kind: 'step',
        title: 'Body Waves',
        description: 'Mexican waves style double armed wave.',
        startSeconds: 10,
        endSeconds: 15,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZAPDWV0455HPGX8HA',
        order: 4,
        kind: 'step',
        title: 'Trunk Twists',
        description: 'Twisting with tight arms pointing your elbows outward.',
        startSeconds: 16,
        endSeconds: 20,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZQV2F7MZ53M12ZDNQ',
        order: 5,
        kind: 'step',
        title: 'Arm Swings',
        description: 'Alternatively swinging your arms up and down to the front.',
        startSeconds: 22,
        endSeconds: 26,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZCTPAKJ87RDK2EYS7',
        order: 6,
        kind: 'step',
        title: 'Dead Arms',
        description: 'Keeping your arms floppy, rotate torso from side to side.',
        startSeconds: 28,
        endSeconds: 33,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZMXPBGHC4JG7YRCE8',
        order: 7,
        kind: 'step',
        title: 'Golf Swings',
        description: 'Golf swings from side to side with a wide stance.',
        startSeconds: 35,
        endSeconds: 39,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZYK5ASS510ZH2AA47',
        order: 8,
        kind: 'step',
        title: 'Marches',
        description: 'Marching legs with high knees and giant claps timed to meet in the middle.',
        startSeconds: 41,
        endSeconds: 46,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZEMDJAYW8AYFCFMMA',
        order: 9,
        kind: 'step',
        title: 'Ballet Squats',
        description: 'Ballet squats with wide arms going from down to up and back again.',
        startSeconds: 47,
        endSeconds: 53,
        durationSeconds: 60,
        autoAdvance: true,
      },
      {
        id: 'step_01M070XXDZA4SHRAEY3PRHSA83',
        order: 10,
        kind: 'step',
        title: 'Horseback Stance',
        description: "Holding in a horseback stance with hands together in prayer'",
        startSeconds: 54,
        endSeconds: 59,
        durationSeconds: 60,
        autoAdvance: true,
      },
    ],
    createdUtc: '2026-08-17T04:50:56.5717563Z',
    updatedUtc: '2026-08-21T12:45:29.1309562Z',
    publishedUtc: '2026-08-17T04:50:56.5717563Z',
  },
  {
    id: 'steps_demo_fitness_core',
    createdByUserId: 'usr_demo',
    linkedPlatformAccountId: null,
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Core Finisher (stub)',
    description: 'Demo related Steps from the same creator — stub for “More from”.',
    creatorDisplayName: '@mydisciplinedrive',
    continuousSoundtrack: true,
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
        title: 'Plank hold',
        startSeconds: 10,
        endSeconds: 20,
        durationSeconds: 30,
        autoAdvance: true,
      },
      {
        id: 'step_2',
        order: 2,
        title: 'Side twists',
        startSeconds: 20,
        endSeconds: 35,
        durationSeconds: 30,
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
  {
    id: 'steps_demo_recipe_sides',
    createdByUserId: 'usr_demo',
    linkedPlatformAccountId: null,
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Quick Sides (stub)',
    description: 'Demo related Steps from the same creator — stub for “More from”.',
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
        title: 'Chop veg',
        startSeconds: 1,
        endSeconds: 15,
        durationSeconds: null,
        autoAdvance: false,
      },
      {
        id: 'step_2',
        order: 2,
        title: 'Pan fry',
        startSeconds: 15,
        endSeconds: 35,
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

  isDemo(id: string | null | undefined): boolean {
    return !!id && DEMO_ITEMS.some((item) => item.id === id);
  }

  /** Other demo items from the same platform username (Phase 1b stub). */
  getRelatedByCreator(item: StepsItem, limit = 3): Observable<StepsItem[]> {
    const username = item.video.creatorUsername?.toLowerCase();
    if (!username) {
      return of([]);
    }

    return of(DEMO_ITEMS).pipe(
      map((items) =>
        items
          .filter(
            (x) =>
              x.id !== item.id &&
              x.video.creatorUsername?.toLowerCase() === username &&
              x.status === StepsItemStatus.Published,
          )
          .slice(0, limit),
      ),
    );
  }
}
