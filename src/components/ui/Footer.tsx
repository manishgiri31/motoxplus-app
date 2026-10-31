import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, tracking } from '@/src/theme';

export interface FooterProps {
  /** Legal line shown under the top border. */
  legal?: string;
}

// Grey (#f5f5f7) footer band: 12px secondary text, with the legal line set
// off by a 1px top border.
export function Footer({ legal = `© ${new Date().getFullYear()} MotoXPlus. All rights reserved.` }: FooterProps) {
  return (
    <View style={styles.footer} accessibilityRole="summary">
      <View style={styles.legalRow}>
        <Text style={styles.legal}>{legal}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: { backgroundColor: colors.card, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  legalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 16 },
  legal: { fontFamily: fonts.body.regular, fontSize: 12, lineHeight: 16, letterSpacing: tracking.caption, color: colors.muted },
});
