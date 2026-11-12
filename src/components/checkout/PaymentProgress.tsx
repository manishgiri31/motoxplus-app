import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { colors, font, motion, radii, space } from '@/src/theme';

export type StepState = 'pending' | 'active' | 'done' | 'failed';

export interface ProgressStep {
  label: string;
  state: StepState;
}

const ICON = 28;

const STATE_LABEL: Record<StepState, string> = {
  pending: 'waiting',
  active: 'in progress',
  done: 'done',
  failed: 'failed',
};

// Vertical step list: a spinner on the step in flight, a check once it's done,
// a danger cross on the one that failed. A hairline joins the icons.
export function PaymentProgress({ steps }: { steps: ProgressStep[] }) {
  const reduceMotion = useReduceMotion();

  return (
    <View style={styles.card} accessibilityLiveRegion="polite">
      {steps.map((step, i) => (
        <View
          key={step.label}
          accessible
          accessibilityLabel={`${step.label}, ${STATE_LABEL[step.state]}`}
          style={styles.row}
        >
          <View style={styles.iconColumn}>
            <StepIcon state={step.state} animate={!reduceMotion} />
            {i < steps.length - 1 && (
              <View style={[styles.connector, step.state === 'done' && styles.connectorDone]} />
            )}
          </View>
          <Text
            maxFontSizeMultiplier={1.2}
            style={[
              styles.label,
              step.state === 'pending' && styles.labelPending,
              step.state === 'active' && styles.labelActive,
              step.state === 'failed' && styles.labelFailed,
            ]}
          >
            {step.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function StepIcon({ state, animate }: { state: StepState; animate: boolean }) {
  // Keyed on state so the new icon fades in over 240ms when a step advances.
  const entering = animate ? FadeIn.duration(motion.duration.fast) : undefined;

  if (state === 'active') {
    return (
      <Animated.View key="active" entering={entering} style={styles.icon}>
        <ActivityIndicator size="small" color={colors.ink2} />
      </Animated.View>
    );
  }
  if (state === 'done') {
    return (
      <Animated.View key="done" entering={entering} style={[styles.icon, styles.iconDone]}>
        <Feather name="check" size={16} color={colors.white} />
      </Animated.View>
    );
  }
  if (state === 'failed') {
    return (
      <Animated.View key="failed" entering={entering} style={[styles.icon, styles.iconFailed]}>
        <Feather name="x" size={16} color={colors.white} />
      </Animated.View>
    );
  }
  return <View key="pending" style={[styles.icon, styles.iconPending]} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.bgAlt, borderRadius: radii.card, paddingHorizontal: space.lg, paddingVertical: space.lg },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  iconColumn: { alignItems: 'center', alignSelf: 'stretch' },
  icon: { width: ICON, height: ICON, borderRadius: ICON / 2, alignItems: 'center', justifyContent: 'center' },
  iconPending: { borderWidth: 1.5, borderColor: colors.line },
  iconDone: { backgroundColor: colors.success },
  iconFailed: { backgroundColor: colors.red },
  connector: { width: 2, minHeight: space.lg, flexGrow: 1, marginVertical: 2, backgroundColor: colors.lineSoft },
  connectorDone: { backgroundColor: colors.success },
  label: {
    flex: 1,
    ...font(400),
    fontSize: 17,
    lineHeight: ICON,
    letterSpacing: -0.34,
    color: colors.ink,
    paddingBottom: space.lg,
  },
  labelPending: { color: colors.ink3 },
  labelActive: { ...font(600) },
  labelFailed: { ...font(600), color: colors.red },
});
