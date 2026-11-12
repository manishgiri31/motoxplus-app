import type Feather from '@expo/vector-icons/Feather';
import type { ComponentType } from 'react';

import { Eye } from '@/components/icons/Eye';
import { LayoutGrid } from '@/components/icons/LayoutGrid';
import { Package } from '@/components/icons/Package';
import type { IconProps } from '@/components/icons/types';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

/** A Lucide component where the icon set has a clear match, else the old Feather glyph. */
export type CategoryGlyph = { lucide: ComponentType<IconProps> } | { feather: FeatherName };

// The backend has no icon per category, so pick a fitting glyph from the name.
// Order matters: the first keyword that appears in the name wins.
const ICON_RULES: [string[], FeatherName][] = [
  [['brake', 'disc', 'pad'], 'disc'],
  [['engine', 'piston', 'cylinder', 'valve', 'gasket'], 'cpu'],
  [['electric', 'wiring', 'ignition', 'spark', 'switch', 'relay'], 'zap'],
  [['battery'], 'battery'],
  [['light', 'lamp', 'bulb', 'indicator', 'headlight'], 'sun'],
  [['tyre', 'tire', 'wheel', 'rim', 'tube'], 'circle'],
  [['oil', 'lube', 'lubric', 'fluid', 'coolant'], 'droplet'],
  [['filter'], 'filter'],
  [['chain', 'sprocket', 'drive', 'belt', 'clutch', 'gear'], 'link'],
  [['suspension', 'shock', 'fork', 'absorber'], 'activity'],
  [['mirror', 'visor', 'glass'], 'eye'],
  [['body', 'fairing', 'cover', 'panel', 'guard', 'mudguard', 'visor'], 'shield'],
  [['cable', 'wire'], 'git-commit'],
  [['accessor', 'carrier', 'rack'], 'package'],
];

// Only glyphs with an exact equivalent in components/icons are swapped; the
// rest stay Feather until the icon set grows to cover them.
const LUCIDE_EQUIVALENT: Partial<Record<FeatherName, ComponentType<IconProps>>> = {
  eye: Eye,
  package: Package,
};

export function categoryIcon(name: string): CategoryGlyph {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of ICON_RULES) {
    if (keywords.some((k) => lower.includes(k))) {
      const lucide = LUCIDE_EQUIVALENT[icon];
      return lucide ? { lucide } : { feather: icon };
    }
  }
  return { lucide: LayoutGrid };
}
