# Godu frontend

Angular 22 + Capacitor + Material dark UI.

## Run locally

```bash
cd src/frontend/godu-app
npm start
```

Open http://localhost:4300/

## Test

```bash
cd src/frontend/godu-app
npx ng test --watch=false
```

## Notes

- Demo Steps are hard-coded (fitness + recipe TikTok embeds).
- Timestamps are approximate — tweak in `demo-steps.service.ts` if segments feel off.
- TikTok embed may require a tap to start audio (browser autoplay policy).
