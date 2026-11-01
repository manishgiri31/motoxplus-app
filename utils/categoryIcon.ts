import type { Feather } from '@expo/vector-icons';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

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

export function categoryIcon(name: string): FeatherName {
  const lower = name.toLowerCase();
  for (const [keywords, icon] of ICON_RULES) {
    if (keywords.some((k) => lower.includes(k))) return icon;
  }
  return 'tool';
}
