import { Feather } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useServiceability } from '@/api/hooks/useShipping';
import type { ShippingServiceabilityResponse } from '@/api/types';
import { colors, fonts, radii } from '@/src/theme';

interface Props {
  /** Current pincode value from the parent form (raw keystrokes are fine). */
  pincode: string;
  /**
   * Fired whenever the resolved result changes — `null` while the pincode is
   * incomplete or still loading, the Delhivery result once it resolves. The
   * parent uses this to auto-fill city and to show a non-blocking
   * "outside courier coverage" notice near the Place order button.
   */
  onResult?: (result: ShippingServiceabilityResponse | null) => void;
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

export function PincodeServiceability({ pincode, onResult }: Props) {
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
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.muted} />
        <Text style={styles.checking}>Checking delivery availability…</Text>
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
      <View style={[styles.card, styles.cardOk]}>
        <Feather name="check-circle" size={15} color={colors.ink} />
        <Text style={styles.okText}>
          Deliverable{city ? ` — ${city}` : ''}
          {days ? ` · ~${days} business days` : ''}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardWarn]}>
      <Feather name="alert-circle" size={15} color={colors.red} />
      <Text style={styles.warnText}>
        {result.error ?? 'Delivery not available to this pincode.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  checking: { fontFamily: fonts.body.regular, fontSize: 12.5, color: colors.muted },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  cardOk: { backgroundColor: colors.card, borderColor: colors.line },
  cardWarn: { backgroundColor: colors.redSoft, borderColor: colors.redSoft },
  okText: { flex: 1, fontFamily: fonts.body.medium, fontSize: 12.5, color: colors.ink },
  warnText: { flex: 1, fontFamily: fonts.body.medium, fontSize: 12.5, color: colors.red },
});
