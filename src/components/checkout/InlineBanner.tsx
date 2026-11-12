import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { alpha, colors, font, radii, space } from '@/src/theme';

export interface InlineBannerProps {
  title: string;
  message: string;
}

// Danger banner: red icon on a 8% red wash. Body text stays ink so it keeps
// contrast at 14pt; red is only the icon and the title.
export function InlineBanner({ title, message }: InlineBannerProps) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.banner}>
      <Feather name="alert-circle" size={20} color={colors.red} style={styles.icon} />
      <View style={styles.text}>
        <Text style={styles.title} maxFontSizeMultiplier={1.2}>
          {title}
        </Text>
        <Text style={styles.message} maxFontSizeMultiplier={1.2}>
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.lg,
    borderRadius: radii.card,
    backgroundColor: alpha(colors.red, 0.08),
  },
  icon: { marginTop: 1 },
  text: { flex: 1, gap: 2 },
  title: { ...font(600), fontSize: 14, lineHeight: 20, color: colors.red },
  message: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink },
});
