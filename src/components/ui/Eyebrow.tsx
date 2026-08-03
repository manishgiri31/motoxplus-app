import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { colors, typography } from '@/src/theme';

export interface EyebrowProps {
  children: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function Eyebrow({ children, style, textStyle }: EyebrowProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <Text style={[typography.eyebrow, textStyle]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  line: {
    width: 24,
    height: 1.5,
    backgroundColor: colors.red,
  },
});
