import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, MonoLabel } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

// Minimal order-confirmation screen — replaces the previous Alert-based
// confirmation. No native Razorpay SDK is wired up in this build (see
// api/services/paymentService.ts), so `pending` just carries the same
// "complete payment later" messaging the Alert used to show; the underlying
// order-creation/Razorpay-order-creation calls in app/checkout.tsx are unchanged.
export default function OrderPlacedScreen() {
  const { orderId, orderNumber, pending, amountDue } = useLocalSearchParams<{
    orderId: string;
    orderNumber: string;
    pending?: string;
    amountDue?: string;
  }>();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Animated.View entering={FadeIn.duration(220)} style={styles.check}>
          <Feather name="check" size={40} color="#FFFFFF" />
        </Animated.View>
        <Text style={styles.title}>Order placed</Text>
        <MonoLabel color="ink" style={styles.orderId}>{`#${orderNumber}`}</MonoLabel>
        {pending === '1' && !!amountDue && (
          <Text style={styles.note}>
            {`Payment of ${amountDue} is pending — complete it from the order details screen once online payment is available in this build.`}
          </Text>
        )}
        <Button
          label="View order"
          variant="solid"
          fullWidth
          onPress={() => router.replace(`/order/${orderId}`)}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  check: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: fonts.display.extraBold, fontSize: 24, color: colors.ink },
  orderId: { fontSize: 15, marginTop: 4 },
  note: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 8 },
  button: { marginTop: 24, width: '100%' },
});
