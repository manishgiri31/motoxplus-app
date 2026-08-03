import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Micro-interactions (scale/translate) across src/components/ui read this and
// skip straight to the end state when true, per the OS "Reduce Motion" setting.
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
