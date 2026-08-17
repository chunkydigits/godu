export const environment = {
  production: false,
  apiBaseUrl: 'https://localhost:7166',
  auth0: {
    domain: 'godu.uk.auth0.com',
    clientId: '7LwaVrb1418enC9cZE2e2fWXA9lCTyiF', // set via Auth0 SPA application Client ID
    audience: 'https://api.godu.it',
  },
  features: {
    /**
     * Dual-embed continuous soundtrack. Off by default — visual sync is unstable.
     * See specifications/field-feedback.md §5.
     */
    continuousSoundtrack: false,
  },
};
