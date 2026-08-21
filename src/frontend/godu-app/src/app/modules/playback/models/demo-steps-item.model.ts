import { StepsItem } from './steps-item.model';

export type DemoCategory = 'Fitness' | 'Cooking';

export interface DemoStepsItem extends StepsItem {
  category: DemoCategory;
  /** When false, the item is only used for “More from this creator” stubs. */
  listed: boolean;
}
