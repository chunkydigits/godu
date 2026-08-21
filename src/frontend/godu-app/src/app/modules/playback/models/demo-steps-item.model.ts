import { StepsItem } from './steps-item.model';

export type DemoCategory =
  | 'Fitness'
  | 'Cooking'
  | 'Cook'
  | 'Train'
  | 'Style'
  | 'Dance'
  | 'Makeup'
  | 'Fix'
  | 'Make'
  | 'Play'
  | 'Care'
  | 'Learn';

export interface DemoStepsItem extends StepsItem {
  category: DemoCategory;
  /** When false, the item is only used for “More from this creator” stubs. */
  listed: boolean;
}
