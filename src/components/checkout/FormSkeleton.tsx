import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/src/components/ui/Skeleton';
import { colors, radii, sectionGap, space } from '@/src/theme';

// Same shape as the real content (a header line, then grouped blocks of rows),
// so nothing jumps when the data arrives. `groups` is the number of blocks and
// `rows` the rows in each.
export function FormSkeleton({ groups = 3, rows = 3 }: { groups?: number; rows?: number }) {
  return (
    <View accessible accessibilityLabel="Loading" accessibilityRole="progressbar" style={styles.wrap}>
      {Array.from({ length: groups }, (_, g) => (
        <View key={g} style={styles.section}>
          <Skeleton height={14} width={120} style={styles.header} />
          <View style={styles.group}>
            {Array.from({ length: rows }, (_, r) => (
              <View key={r} style={styles.row}>
                <Skeleton height={12} width={72} />
                <Skeleton height={17} width={r % 2 ? '70%' : '50%'} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: sectionGap },
  section: { gap: space.sm },
  header: { marginLeft: space.lg },
  group: { backgroundColor: colors.bgAlt, borderRadius: radii.card, overflow: 'hidden' },
  row: { minHeight: 64, paddingHorizontal: space.lg, paddingVertical: space.md, justifyContent: 'center', gap: space.sm },
});
