import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/src/components/ui';
import { radii, screenPaddingX, space } from '@/src/theme';

// Placeholder with the same shapes and spacing as the loaded cart (benefit
// card, delivery card, three lines, summary group) so nothing jumps when the
// data arrives. The large title is rendered by the screen itself.
export function CartSkeleton() {
  return (
    <View style={styles.wrap} accessibilityLabel="Loading your cart" accessibilityLiveRegion="polite">
      <View style={styles.cards}>
        <Skeleton height={104} radius={radii.card} />
        <Skeleton height={80} radius={radii.card} />
      </View>

      <View>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.line}>
            <Skeleton width={64} height={64} radius={radii.sm} />
            <View style={styles.lineMain}>
              <View style={styles.lineTop}>
                <View style={styles.lineTitle}>
                  <Skeleton height={17} width="90%" />
                  <Skeleton height={14} width="45%" />
                </View>
                <Skeleton height={17} width={64} />
              </View>
              <Skeleton height={36} width={124} radius={radii.pill} />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.summary}>
        <Skeleton height={52 * 4} radius={radii.card} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xl },
  cards: { paddingHorizontal: screenPaddingX, gap: space.md },
  line: { flexDirection: 'row', gap: space.md, paddingHorizontal: screenPaddingX, paddingVertical: space.lg },
  lineMain: { flex: 1, gap: space.md },
  lineTop: { flexDirection: 'row', gap: space.md },
  lineTitle: { flex: 1, gap: space.sm },
  summary: { paddingHorizontal: screenPaddingX },
});
