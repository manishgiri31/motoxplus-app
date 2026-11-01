import { useEffect, type ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CircleCheck } from '@/components/icons/CircleCheck';
import { Clock } from '@/components/icons/Clock';
import { iconSizes } from '@/components/icons/iconSizes';
import type { IconProps } from '@/components/icons/types';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, font, motion } from '@/src/theme';

export type TimelineState = 'done' | 'current' | 'upcoming';

export interface TimelineItem {
  key: string;
  title: string;
  detail?: string;
  meta?: string;
  state: TimelineState;
  /** Replaces the marker of a completed entry (e.g. a truck for a shipped event). */
  icon?: ComponentType<IconProps>;
  iconColor?: string;
}

export interface TimelineProps {
  items: readonly TimelineItem[];
  /**
   * check  progress steps: completed = accent CircleCheck, upcoming = ink3 Clock.
   * dot    event logs: completed entries are a small grey dot (or the item's own icon).
   * The current entry is a pulsing accent dot either way.
   */
  markers?: 'check' | 'dot';
}

const MARKER = 24;
const CORE = 10;
const PULSE_MS = 1400;

const STATE_LABEL: Record<TimelineState, string> = {
  done: 'completed',
  current: 'current step',
  upcoming: 'upcoming',
};

// Vertical timeline: a 24pt marker rail on the left joined by 2pt connectors,
// title / detail / meta on the right.
export function Timeline({ items, markers = 'check' }: TimelineProps) {
  return (
    <View>
      {items.map((item, i) => {
        const last = i === items.length - 1;
        const connector = markers === 'check' && item.state === 'done' ? colors.accent : colors.line;
        const label = [
          item.title,
          markers === 'check' ? STATE_LABEL[item.state] : undefined,
          item.detail,
          item.meta,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <View key={item.key} style={styles.row} accessible accessibilityLabel={label}>
            <View style={styles.rail}>
              <View style={styles.markerBox}>
                <Marker state={item.state} variant={markers} icon={item.icon} iconColor={item.iconColor} />
              </View>
              {!last && <View style={[styles.connector, { backgroundColor: connector }]} />}
            </View>
            <View style={[styles.body, !last && styles.bodyGap]}>
              <Text
                style={[styles.title, item.state === 'upcoming' && styles.titleUpcoming]}
                maxFontSizeMultiplier={1.2}
              >
                {item.title}
              </Text>
              {!!item.detail && (
                <Text style={styles.detail} maxFontSizeMultiplier={1.2}>
                  {item.detail}
                </Text>
              )}
              {!!item.meta && (
                <Text style={styles.meta} maxFontSizeMultiplier={1.2}>
                  {item.meta}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Marker({
  state,
  variant,
  icon: CustomIcon,
  iconColor = colors.ink2,
}: {
  state: TimelineState;
  variant: 'check' | 'dot';
  icon?: ComponentType<IconProps>;
  iconColor?: string;
}) {
  if (state === 'current') return <PulsingDot />;
  if (state === 'upcoming') return <Clock size={MARKER} color={colors.ink3} />;
  if (CustomIcon) return <CustomIcon size={iconSizes.inList} color={iconColor} />;
  if (variant === 'dot') return <View style={styles.smallDot} />;
  return <CircleCheck size={MARKER} color={colors.accent} />;
}

// Accent core with a soft ring that swells and fades. Reduce Motion leaves the
// ring static instead of looping.
function PulsingDot() {
  const reduceMotion = useReduceMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(withTiming(1, { duration: PULSE_MS, easing: motion.easing }), -1, false);
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const ringStyle = useAnimatedStyle(() => {
    if (reduceMotion) return { opacity: 0.25, transform: [{ scale: 1.6 }] };
    return {
      opacity: interpolate(pulse.value, [0, 1], [0.4, 0], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 2.2], Extrapolation.CLAMP) }],
    };
  });

  return (
    <View style={styles.pulseWrap}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <View style={styles.core} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 16 },
  rail: { width: MARKER, alignItems: 'center' },
  markerBox: { width: MARKER, height: MARKER, alignItems: 'center', justifyContent: 'center' },
  connector: { width: 2, flex: 1, minHeight: 12, marginVertical: 4, borderRadius: 1 },
  body: { flex: 1, paddingTop: 1, gap: 2 },
  bodyGap: { paddingBottom: 20 },
  title: { ...font(600), fontSize: 17, lineHeight: 22, letterSpacing: -0.34, color: colors.ink },
  titleUpcoming: { ...font(400), color: colors.ink3 },
  detail: { ...font(400), fontSize: 14, lineHeight: 20, color: colors.ink2 },
  meta: { ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink2 },

  smallDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.ink3 },
  pulseWrap: { width: MARKER, height: MARKER, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: CORE,
    height: CORE,
    borderRadius: CORE / 2,
    backgroundColor: colors.accent,
  },
  core: { width: CORE, height: CORE, borderRadius: CORE / 2, backgroundColor: colors.accent },
});
