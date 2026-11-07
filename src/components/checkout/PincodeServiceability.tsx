import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useServiceability } from '@/api/hooks/useShipping';
import type { ShippingServiceabilityResponse } from '@/api/types';
import { CircleCheck } from '@/components/icons/CircleCheck';
import { colors, font, space } from '@/src/theme';

interface Props {
  /** Current pincode value from the parent form (raw keystrokes are fine). */
  pincode: string;
  /**
   * Fired whenever the resolved result changes — `null` while the pincode is
   * incomplete or still loading, the Delhivery result once it resolves. The
   * parent uses this to auto-fill city.
   */
  onResult?: (result: ShippingServiceabilityResponse | null) => void;
  /** Drop the list-row padding, for use inside a block that pads itself (product page). */
  inline?: boolean;
}

const PINCODE_REGEX = /^\d{6}$/;

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Caption that sits under the pincode field, inside its list row.
export function PincodeServiceability({ pincode, onResult, inline = false }: Props) {
  const debounced = useDebouncedValue(pincode.trim(), 500);
  const valid = PINCODE_REGEX.test(debounced);
  const { data, isFetching, isError } = useServiceability(valid ? debounced : undefined);

  // Keep the callback in a ref so firing it from the effect below doesn't
  // depend on the parent memoizing it (same pattern as the web PincodeChecker).
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    if (!valid) {
      onResultRef.current?.(null);
      return;
    }
    // Surface a synthetic "check failed" result rather than nothing, so the
    // parent doesn't sit on a stale serviceable=true from a previous pincode.
    if (isError) {
      onResultRef.current?.({
        serviceable: false,
        estimatedDeliveryDays: null,
        availableServices: [],
        city: null,
        state: null,
        error: 'Could not check delivery for this pincode.',
      });
      return;
    }
    onResultRef.current?.(data ?? null);
  }, [valid, isError, data]);

  if (!valid) return null;

  if (isFetching && !data) {
    return (
      <View style={[styles.caption, inline && styles.inline]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color={colors.ink3} />
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>
          Checking delivery availability…
        </Text>
      </View>
    );
  }

  const result = isError
    ? { serviceable: false, error: 'Could not check delivery for this pincode.' }
    : data;
  if (!result) return null;

  if (result.serviceable) {
    const city = data?.city;
    const days = data?.estimatedDeliveryDays;
    return (
      <View style={[styles.caption, inline && styles.inline]} accessibilityLiveRegion="polite">
        <CircleCheck size={16} color={colors.success} />
        <Text style={styles.text} maxFontSizeMultiplier={1.2}>
          Deliverable{city ? ` — ${city}` : ''}
          {days ? ` · ~${days} business days` : ''}
        </Text>
      </View>
    );
  }

  // Non-blocking: the order still goes through and the team arranges delivery.
  return (
    <View style={[styles.caption, inline && styles.inline]} accessibilityLiveRegion="polite">
      <Feather name="alert-circle" size={14} color={colors.warning} />
      <Text style={styles.text} maxFontSizeMultiplier={1.2}>
        {result.error ?? 'Delivery may not be available to this pincode.'} Your order will still be placed and our
        team will arrange delivery.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
  },
  inline: { paddingHorizontal: 0, paddingBottom: 0 },
  text: { flex: 1, ...font(400), fontSize: 12, lineHeight: 16, color: colors.ink2 },
});
