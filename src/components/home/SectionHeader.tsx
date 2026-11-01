import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { screenPaddingX, textStyles } from '@/src/theme';

export interface SectionHeaderProps {
  title: string;
  /** Shows a "See all" link on the right when given. */
  onSeeAll?: () => void;
}

// 21pt section title with an optional blue "See all" link.
export function SectionHeader({ title, onSeeAll }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {title}
      </Text>
      {onSeeAll && <Button label="See all" variant="link" onPress={onSeeAll} accessibilityLabel={`See all ${title}`} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingLeft: screenPaddingX,
    paddingRight: screenPaddingX - 8,
  },
  title: { flex: 1, ...textStyles.cardTitle },
});
