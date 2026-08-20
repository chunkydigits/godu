export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:7300',
  auth0: {
    domain: 'godu.uk.auth0.com',
    clientId: '7LwaVrb1418enC9cZE2e2fWXA9lCTyiF', // set via Auth0 SPA application Client ID
    audience: 'https://api.godu.uk',
  },
  features: {
    /**
     * Dual-embed continuous soundtrack. Off by default — visual sync is unstable.
     * See specifications/field-feedback.md §5.
     */
    continuousSoundtrack: false,
  },
  playback: {
    /**
     * Between-step gaps at or below this (seconds) start the next clip immediately.
     * Longer gaps wait until gapPrerollLeadSeconds before the gap ends.
     */
    gapPrerollImmediateMaxSeconds: 15,
    /**
     * For gaps longer than gapPrerollImmediateMaxSeconds, start the next clip
     * this many seconds before the gap ends.
     */
    gapPrerollLeadSeconds: 10,
    /**
     * Between-step gaps shorter than this only say “Go” when the step timer starts.
     * Longer gaps say “{title} for {n} seconds, Go”, timed to land on the timer start.
     */
    gapGoCueMaxSeconds: 10,
  },
};
