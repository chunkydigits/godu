import { environment } from '../../../../environments/environment';
import { StepsItem } from './steps-item.model';

/** Creator flag AND environment feature flag must both be on. */
export function isContinuousSoundtrackEnabled(item: StepsItem | null | undefined): boolean {
  return (
    !!environment.features.continuousSoundtrack && !!item?.continuousSoundtrack
  );
}
