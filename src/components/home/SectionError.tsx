import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { colors, radii, screenPaddingX, textStyles } from '@/src/theme';

export interface SectionErrorProps {
  /** What failed, e.g. "your account summary". */
  what: string;
  onRetry: () => void;
}

// Inline failure for one section: the rest of the screen keeps working.
export function SectionError({ what, onRetry }: SectionErrorProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.card} accessibilityLiveRegion="polite">
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>
          Couldn&apos;t load {what}
        </Text>
        <Button label="Retry" variant="secondary" onPress={onRetry} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: screenPaddingX },
  card: {
    alignItems: 'center',
    gap: 12,
    padding: 20,
    borderRadius: radii.card,
    backgroundColor: colors.bgAlt,
  },
  text: { ...textStyles.callout },
});
