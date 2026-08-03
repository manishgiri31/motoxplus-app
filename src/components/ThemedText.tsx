import { Text, type TextProps } from 'react-native';

import { colors, typography, type ThemeColor, type TypographyVariant } from '@/src/theme';

export type ThemedTextProps = TextProps & {
  variant?: TypographyVariant;
  color?: ThemeColor;
};

// Default text component for the redesign — always resolves to the theme's
// Inter/Schibsted Grotesk/IBM Plex Mono families via `variant`, so nothing
// built with it can silently fall back to the system font. Screens still on
// plain <Text> keep the system font until they're migrated in later phases.
export function ThemedText({ variant = 'body', color, style, ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[typography[variant], color ? { color: colors[color] } : null, style]}
      {...rest}
    />
  );
}
