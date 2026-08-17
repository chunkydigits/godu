export const environment = {
  production: true,
  apiBaseUrl: 'https://api.godu.it',
  auth0: {
    domain: 'godu.uk.auth0.com',
    clientId: '7LwaVrb1418enC9cZE2e2fWXA9lCTyiF', // set at deploy time
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
