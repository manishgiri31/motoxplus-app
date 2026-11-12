import Feather from '@expo/vector-icons/Feather';
import { Children, Fragment, isValidElement } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { alpha, colors, font, radii } from '@/src/theme';

type IconName = React.ComponentProps<typeof Feather>['name'];

export interface GroupedListProps {
  children: React.ReactNode;
  /** Small label above the group. */
  header?: string;
  /** Small note under the group (helper text, or an error message). */
  footer?: string | null;
  footerTone?: 'neutral' | 'danger';
  style?: StyleProp<ViewStyle>;
}

// Rounded bgAlt group; a hairline separator, inset 16px from the left, sits
// between rows. Rows can be ListRow or any element (e.g. an InputField with
// variant="grouped").
export function GroupedList({ children, header, footer, footerTone = 'neutral', style }: GroupedListProps) {
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={style}>
      {!!header && (
        <Text accessibilityRole="header" style={styles.header} maxFontSizeMultiplier={1.2}>
          {header}
        </Text>
      )}
      <View style={styles.group}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {i > 0 && <View style={styles.separator} />}
            {row}
          </Fragment>
        ))}
      </View>
      {!!footer && (
        <Text
          accessibilityLiveRegion={footerTone === 'danger' ? 'polite' : 'none'}
          style={[styles.footer, footerTone === 'danger' && styles.footerDanger]}
          maxFontSizeMultiplier={1.2}
        >
          {footer}
        </Text>
      )}
    </View>
  );
}

export interface ListRowProps {
  label: string;
  /** 28px rounded-square tinted icon on the left. */
  icon?: IconName;
  /** Muted value on the right. */
  value?: string;
  /** Trailing chevron — implied when `onPress` is set and no `value` is given. */
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Tint for the icon tile: the tile is this color at 12%, the icon is the full color. */
  iconColor?: string;
  /** Red label (sign out, delete). */
  destructive?: boolean;
  /** Centered label with no icon or chevron, for action groups. */
  centered?: boolean;
  /** Small ink2 line under the label. */
  subtitle?: string;
  /** Custom content after the label/value (a status badge, say). */
  trailing?: React.ReactNode;
}

export function ListRow({
  label,
  icon,
  value,
  chevron,
  onPress,
  accessibilityLabel,
  iconColor,
  destructive,
  centered,
  subtitle,
  trailing,
}: ListRowProps) {
  const showChevron = !centered && (chevron ?? (!!onPress && value == null && !trailing));
  const content = (
    <>
      {icon && !centered && (
        <View style={[styles.iconTile, iconColor ? { backgroundColor: alpha(iconColor, 0.12) } : null]}>
          <Feather name={icon} size={16} color={iconColor ?? colors.ink2} />
        </View>
      )}
      {subtitle ? (
        <View style={styles.labelBlock}>
          <Text style={[styles.label, styles.labelInBlock, destructive && styles.labelDestructive]} maxFontSizeMultiplier={1.2}>
            {label}
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.2}>
            {subtitle}
          </Text>
        </View>
      ) : (
        <Text
          style={[styles.label, destructive && styles.labelDestructive, centered && styles.labelCentered]}
          maxFontSizeMultiplier={1.2}
        >
          {label}
        </Text>
      )}
      {value != null && (
        <Text style={styles.value} numberOfLines={1} maxFontSizeMultiplier={1.2}>
          {value}
        </Text>
      )}
      {trailing}
      {showChevron && <Feather name="chevron-right" size={18} color={colors.ink3} />}
    </>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? (value ? `${label}, ${value}` : label)} style={styles.row}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      // Press feedback on list rows is opacity 0.6.
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radii.card, backgroundColor: colors.bgAlt, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: colors.line },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowPressed: { opacity: 0.6 },
  header: { ...font(600), marginBottom: 8, paddingHorizontal: 16, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  footer: { ...font(400), marginTop: 8, paddingHorizontal: 16, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  footerDanger: { color: colors.red },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: alpha(colors.ink, 0.06),
  },
  label: { ...font(400), flex: 1, fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  labelDestructive: { color: colors.red },
  labelCentered: { textAlign: 'center' },
  labelBlock: { flex: 1, gap: 2 },
  labelInBlock: { flex: 0 },
  subtitle: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  value: { ...font(400), flexShrink: 1, fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink2 },
});
