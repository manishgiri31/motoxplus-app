import { useEffect, useRef, useState } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { motion } from '@/src/theme';

export interface RevealProps {
  children: React.ReactNode;
  /** Stagger between sibling reveals, in ms. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

const DISTANCE = 24;

// Fade-up, once. Wrap a section (not a whole screen) to have it ease in as it
// scrolls into view.
//   web     IntersectionObserver: starts hidden, reveals the first time it is
//           ≥12% on screen, then stops observing.
//   native  Reanimated's `entering` animation, which runs when the view mounts;
//           inside virtualised lists that is when the row scrolls into the
//           window, which is the closest native equivalent.
// With "Reduce Motion" on (OS setting / prefers-reduced-motion) children render
// immediately with no animation.
export function Reveal({ children, delay = 0, style }: RevealProps) {
  const reduceMotion = useReduceMotion();

  if (reduceMotion) return <View style={style}>{children}</View>;
  if (Platform.OS === 'web') return <WebReveal delay={delay} style={style}>{children}</WebReveal>;

  return (
    <Animated.View
      entering={FadeInUp.duration(motion.duration.slow).delay(delay).easing(motion.easing).withInitialValues({
        opacity: 0,
        transform: [{ translateY: DISTANCE }],
      })}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

function WebReveal({ children, delay, style }: RevealProps) {
  const ref = useRef<View>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current as unknown as Element | null;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const transition = {
    opacity: visible ? 1 : 0,
    transform: [{ translateY: visible ? 0 : DISTANCE }],
    transitionProperty: 'opacity, transform',
    transitionDuration: `${motion.duration.slow}ms`,
    transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.6, 1)',
    transitionDelay: `${delay ?? 0}ms`,
  } as unknown as ViewStyle;

  return (
    <View ref={ref} style={[style, transition]}>
      {children}
    </View>
  );
}
