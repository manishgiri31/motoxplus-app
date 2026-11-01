import { iconMap } from './iconMap';
import type { IconName, IconProps } from './types';

type Props = IconProps & {
  /** Kebab-case Lucide name, e.g. "shopping-bag". */
  name: IconName;
};

/**
 * Dynamic lookup by kebab-case name. Prefer importing the icon component
 * directly (`import { House } from '@/components/icons/House'`) in screens
 * so unused icons can be dropped from the bundle; use this when the name
 * is data (e.g. a config array of tiles).
 */
export function Icon({ name, ...props }: Props) {
  const Component = iconMap[name];
  return <Component {...props} />;
}
