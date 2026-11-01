import { StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, fonts, layout, tracking } from '@/src/theme';

export interface PageHeaderProps {
  title: string;
  /** One calm gray line under the title. */
  subtitle?: string;
  /** Small line above the title (greeting, section name). */
  eyebrow?: string;
  /** 'center' for hero-style pages (auth, empty states). */
  align?: 'left' | 'center';
  numberOfLines?: number;
  style?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}

// The big semi-bold page title with a gray subtitle that opens every page of
// the store this design follows ("Store" + one line of context). 40px on
// phones, 56px from the tablet breakpoint, tight leading and tracking.
export function PageHeader({
  title,
  subtitle,
  eyebrow,
  align = 'left',
  numberOfLines = 2,
  style,
  titleStyle,
}: PageHeaderProps) {
  const { width } = useWindowDimensions();
  const large = width >= layout.breakpoints.tablet;
  const centered = align === 'center';

  return (
    <View style={[styles.wrap, centered && styles.centered, style]}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Text
        accessibilityRole="header"
        aria-level={1}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={[
          styles.title,
          large ? styles.titleLarge : styles.titleSmall,
          centered && styles.textCentered,
          titleStyle,
        ]}
      >
        {title}
      </Text>
      {!!subtitle && <Text style={[styles.subtitle, centered && styles.textCentered]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  centered: { alignItems: 'center' },
  textCentered: { textAlign: 'center' },
  eyebrow: {
    fontFamily: fonts.body.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: { fontFamily: fonts.display.bold, color: colors.ink },
  titleSmall: { fontSize: 40, lineHeight: 42, letterSpacing: tracking.title1 },
  titleLarge: { fontSize: 56, lineHeight: 59, letterSpacing: tracking.display },
  subtitle: {
    fontFamily: fonts.body.regular,
    fontSize: 17,
    lineHeight: 25,
    letterSpacing: tracking.body,
    color: colors.muted,
  },
});
