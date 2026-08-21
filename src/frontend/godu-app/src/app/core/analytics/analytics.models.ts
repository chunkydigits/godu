export interface AnalyticsTrackProperties {
  goduId?: string | null;
  platform?: string | null;
  sourceCreatorHandle?: string | null;
  [key: string]: string | number | boolean | null | undefined;
}

export interface IngestAnalyticsEventRequest {
  eventName: string;
  anonymousId: string;
  sessionId: string;
  goduId?: string | null;
  platform?: string | null;
  sourceCreatorHandle?: string | null;
  referrer?: string | null;
  path?: string | null;
  properties?: Record<string, string | number | boolean | null>;
}
