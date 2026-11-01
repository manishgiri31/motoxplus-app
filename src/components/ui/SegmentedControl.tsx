import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useFocusRing } from '@/hooks/use-focus-ring';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, font, motion, radii } from '@/src/theme';
import { HapticService } from '@/utils/haptics';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}

const TRACK_PADDING = 2;

// Selected state is a raised white thumb on the grey track that slides between
// segments (240ms, shared ease). No accent color: the accent is reserved for
// primary buttons.
export function SegmentedControl<T extends string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const reduceMotion = useReduceMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const segmentWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / options.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    const target = index * segmentWidth;
    offset.value = reduceMotion ? target : withTiming(target, { duration: motion.duration.fast, easing: motion.easing });
  }, [index, segmentWidth, reduceMotion, offset]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  return (
    <View accessibilityRole="tablist" onLayout={onLayout} style={[styles.track, style]}>
      {segmentWidth > 0 && <Animated.View pointerEvents="none" style={[styles.thumb, { width: segmentWidth }, thumbStyle]} />}
      {options.map((option) => (
        <Segment
          key={option.value}
          label={option.label}
          selected={option.value === value}
          onPress={() => {
            if (option.value === value) return;
            HapticService.light();
            onChange(option.value);
          }}
        />
      ))}
    </View>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const focusRing = useFocusRing();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      // The track is 40 tall; hitSlop brings the tap target to the 44pt minimum.
      hitSlop={{ top: 2, bottom: 2 }}
      onFocus={focusRing.onFocus}
      onBlur={focusRing.onBlur}
      style={({ pressed }) => [styles.segment, focusRing.ringStyle, pressed && !selected && styles.segmentPressed]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 40,
    padding: TRACK_PADDING,
    borderRadius: radii.sm,
    backgroundColor: colors.bgAlt,
  },
  thumb: {
    position: 'absolute',
    top: TRACK_PADDING,
    bottom: TRACK_PADDING,
    left: TRACK_PADDING,
    borderRadius: radii.sm - TRACK_PADDING,
    backgroundColor: colors.white,
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm - TRACK_PADDING },
  segmentPressed: { opacity: 0.6 },
  label: { ...font(400), fontSize: 14, color: colors.ink2 },
  labelSelected: { ...font(600), color: colors.ink },
});
