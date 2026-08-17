export const environment = {
  production: true,
  apiBaseUrl: 'https://api.godu.uk',
  auth0: {
    domain: 'godu.uk.auth0.com',
    clientId: '', // set at deploy time
    audience: 'https://api.godu.uk',
  },
  features: {
    /**
     * Dual-embed continuous soundtrack. Off by default — visual sync is unstable.
     * See specifications/field-feedback.md §5.
     */
    continuousSoundtrack: false,
  },
};
