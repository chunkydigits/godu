import { Injectable } from '@angular/core';
import { Observable, of, throwError, map } from 'rxjs';
import { CATALOGUE_DEMOS } from '../models/demo-catalogue';
import { DemoStepsItem } from '../models/demo-steps-item.model';
import { StepsItem } from '../models/steps-item.model';
import { StepsItemStatus } from '../models/steps-item-status.enum';
import { StepsVisibility } from '../models/steps-visibility.enum';
import { VideoProvider } from '../models/video-provider.enum';

const DEMO_ITEMS: DemoStepsItem[] = [
  {
    id: 'steps_demo_fitness',
    category: 'Fitness',
    listed: true,
    createdByUserId: 'usr_demo',
    linkedPlatformAccountId: null,
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Morning Tai Chi-inspired movement routine from @mydisciplinedrive',
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
    id: 'steps_demo_recipe',
    category: 'Cooking',
    listed: true,
    createdByUserId: 'usr_demo',
    linkedPlatformAccountId: null,
    visibility: StepsVisibility.Private,
    status: StepsItemStatus.Published,
    title: 'Slow Cooked Courgette Pasta from @lagomchef',
    description:
      'This is a fantastically simple dish from the book that teaches you a lot of lessons! And this is what the book is all about.. I help you unpack the recipes so that you can use the skills across other dishes… Time - is a great lesson in food, somethings just take way longer and that’s cool!  Taste - Taste your bloody food! Season, taste, adjust, season, taste  Go buy the book - leave me a review  It means a lot Big love  M #book #veg',
    creatorDisplayName: '@lagomchef',
    continuousSoundtrack: false,
    gapSeconds: null,
    gapMessage: null,
    playGapPriorToStart: false,
    video: {
      provider: VideoProvider.TikTok,
      externalVideoId: '7667587928620600609',
      sourceUrl: 'https://www.tiktok.com/@lagomchef/video/7667587928620600609',
      creatorUsername: 'lagomchef',
    },
    steps: [
      {
        id: 'step_01M0S0Y44K18Z1FSYCDGRNWRB6',
        order: 1,
        kind: 'step',
        title: 'Introduction',
        description:
          'Introduction to the new cookbook that he has coming out and explanation on the recipe and what it entails.',
        startSeconds: 0,
        endSeconds: 22,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S0Y44K44SQ1CJ92HWWJSS4',
        order: 2,
        kind: 'step',
        title: 'Grate the courgettes',
        description: 'Grate 2 courgettes per person',
        startSeconds: 22,
        endSeconds: 29.5,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S0Y44K6Q15JV6F3FJQKEYK',
        order: 3,
        kind: 'step',
        title: "Li'l bit o' lube",
        startSeconds: 29.5,
        endSeconds: 32.5235,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S0Y44KF5Y5K70W9XKFRGRE',
        order: 4,
        kind: 'step',
        title: 'Portion Information',
        description: 'Usually required 3 courgettes per person',
        startSeconds: 33.2,
        endSeconds: 44.15,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S0Y44KG4CPV1Q2YFVS7QZT',
        order: 5,
        kind: 'step',
        title: 'How it should look',
        description: 'Before and after shots of how it should be looking at this point.',
        startSeconds: 44.7,
        endSeconds: 58.25,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S2BXKYR6XPRCFWQNMAF9J7',
        order: 6,
        kind: 'step',
        title: 'Starting to layer the levels of flavour',
        description: 'Add more olive oil, sliced garlic and corriander or fennel seeds.',
        startSeconds: 58.3,
        endSeconds: 71.25,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S2BXKY5XTNXQD2JE436VPB',
        order: 7,
        kind: 'step',
        title: 'Layering flavour lesson',
        description:
          "An explanation of why we're adding the garlic in now and why it's sliced and not chopped.",
        startSeconds: 71.25,
        endSeconds: 90.5,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPS3Z8BVPCA6QQ15R4',
        order: 8,
        kind: 'step',
        title: 'What it should look like at this point',
        startSeconds: 90.5,
        endSeconds: 94.3,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPTDRHZD2T8FSN4DEB',
        order: 9,
        kind: 'step',
        title: 'Add a bit of salt',
        startSeconds: 103,
        endSeconds: 109,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPRAXYY3YMHV3TB0WB',
        order: 10,
        kind: 'step',
        title: 'Update on what it should look like at this point',
        description: 'Starting to change colour',
        startSeconds: 109,
        endSeconds: 118.9,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPJE8VYV5K3K71WYVG',
        order: 11,
        kind: 'step',
        title: 'More salt',
        description: 'Adding more salt because the courgette is a little bit "flabby"',
        startSeconds: 119,
        endSeconds: 124.5,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPMTRHE7F4W4839GD4',
        order: 12,
        kind: 'step',
        title: 'Add your lemon (zest and juice)',
        description: "Once added give it a taste and see how we're getting on ... could be time.",
        startSeconds: 124.5,
        endSeconds: 135,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPVHHSN95VMMCBDQER',
        order: 13,
        kind: 'step',
        title: 'Cook and add the pasta',
        description:
          'Add the pasta to boiling water, cook until done, drain and then combine with your mixture.',
        startSeconds: 135,
        endSeconds: 145,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
      {
        id: 'step_01M0S4F5QPDVEXQDT0NCG75KCR',
        order: 14,
        kind: 'step',
        title: 'Add some parmesan and roasted pine nuts',
        description: "Add the final touches and then enjoy! Be careful though, it's probably hot!",
        startSeconds: 145,
        endSeconds: 167,
        durationSeconds: null,
        autoAdvance: false,
        loopVideo: false,
      },
    ],
    createdUtc: '2026-08-24T04:37:23.217052Z',
    updatedUtc: '2026-08-24T05:39:07.638879Z',
    publishedUtc: '2026-08-24T04:37:23.217052Z',
  },
  ...CATALOGUE_DEMOS,
];

@Injectable({ providedIn: 'root' })
export class DemoStepsService {
  list(): Observable<DemoStepsItem[]> {
    return of(DEMO_ITEMS.filter((item) => item.listed));
  }

  getById(id: string): Observable<DemoStepsItem> {
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
