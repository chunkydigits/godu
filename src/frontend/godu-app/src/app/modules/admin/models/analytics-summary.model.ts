export interface AnalyticsFunnelStep {
  eventName: string;
  label: string;
  count: number;
  conversionFromStart: number;
  conversionFromPrevious: number;
}

export interface AnalyticsDailyPoint {
  date: string;
  visitors: number;
  godusCreated: number;
  godusStarted: number;
  godusCompleted: number;
}

export interface AnalyticsSummary {
  fromUtc: string;
  toUtc: string;
  environment: string;
  uniqueVisitors: number;
  activeUsers: number;
  registeredUsers: number;
  goduCreationStarted: number;
  godusCreated: number;
  creationConversionRate: number;
  godusViewed: number;
  godusStarted: number;
  godusCompleted: number;
  completionRate: number;
  shares: number;
  returningUsers: number;
  repeatCreators: number;
  repeatCreatorRate: number;
  repeatConsumers: number;
  repeatConsumerRate: number;
  usersCreatingFirstGodu: number;
  usersCreatingSecondGodu: number;
  secondCreationRate: number;
  usersUsingFirstGodu: number;
  usersUsingSecondGodu: number;
  secondUsageRate: number;
  creationAbandoned: number;
  creationAbandonRate: number;
  usageAbandoned: number;
  usageAbandonRate: number;
  returnRate7Day: number;
  creationFunnel: AnalyticsFunnelStep[];
  usageFunnel: AnalyticsFunnelStep[];
  daily: AnalyticsDailyPoint[];
}
