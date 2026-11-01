import { Children, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { motion } from '@/src/theme';

export interface StepStageProps {
  /** Which child is showing. Changing it slides the track to that child. */
  index: number;
  /** One child per step, each rendered at the full width of the stage. */
  children: ReactNode;
}

// A multi-step flow on one screen: the steps sit side by side on a horizontal
// track and the track slides (base 280ms, the shared ease) to the active one.
// Every step stays mounted, so going back keeps what was typed; the steps that
// are off-screen are removed from touch and from the screen-reader tree.
// With Reduce Motion on, the track jumps instead of sliding.
export function StepStage({ index, children }: StepStageProps) {
  const panels = Children.toArray(children);
  const reduceMotion = useReduceMotion();
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(windowWidth);
  const x = useSharedValue(-index * width);

  useEffect(() => {
    const target = -index * width;
    x.value = reduceMotion ? target : withTiming(target, { duration: motion.duration.base, easing: motion.easing });
  }, [index, width, reduceMotion, x]);

  const trackStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== width) setWidth(w);
  };

  return (
    <View style={styles.stage} onLayout={onLayout}>
      <Animated.View style={[styles.track, { width: width * panels.length }, trackStyle]}>
        {panels.map((panel, i) => {
          const active = i === index;
          return (
            <View
              key={i}
              style={{ width }}
              pointerEvents={active ? 'auto' : 'none'}
              accessibilityElementsHidden={!active}
              importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
            >
              {panel}
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, overflow: 'hidden' },
  track: { flex: 1, flexDirection: 'row' },
});
