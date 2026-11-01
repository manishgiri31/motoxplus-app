/** Icon edge lengths (px) by usage. */
export const iconSizes = {
  /** Bottom tab bar. */
  tabBar: 24,
  /** Row/list leading or trailing icons. */
  inList: 20,
  /** Leading icon inside a 28x28 tinted tile in a grouped list. */
  tile: 16,
  /** Success / access-denied hero illustrations. */
  hero: 64,
  /** Inside buttons and chips. */
  inline: 18,
} as const;

/** Stroke widths. Tab bar: selected 2, unselected 1.8. */
export const iconStroke = {
  default: 1.8,
  selected: 2,
} as const;

/**
 * Grouped-list tile: a 28x28 rounded square filled with the icon colour at
 * 12% opacity (use `alpha(color, iconTile.tint)` from the theme), holding a
 * `iconSizes.tile` icon.
 */
export const iconTile = {
  box: 28,
  tint: 0.12,
} as const;
