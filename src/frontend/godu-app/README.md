# Steps frontend (Phase 1)

Angular 22 + Capacitor + Material dark UI. Playback spike only.

## Run locally

```bash
cd src/frontend/steps-app
npm start
```

Open http://localhost:4200/

## Test

```bash
cd src/frontend/steps-app
npx ng test --watch=false
```

## Notes

- Demo Steps are hard-coded (fitness + recipe TikTok embeds).
- Timestamps are approximate — tweak in `demo-steps.service.ts` if segments feel off.
- TikTok embed may require a tap to start audio (browser autoplay policy).
