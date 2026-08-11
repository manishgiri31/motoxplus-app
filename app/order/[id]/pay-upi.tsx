import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { useUpiOrderDetails, useSubmitUpiPayment, useUploadPaymentScreenshot } from '@/api/hooks/useUpi';
import type { UpiPaymentMethod } from '@/api/types';
import { upiPaymentProofSchema, type UpiPaymentProofFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Badge, Button, Card, ErrorState, MonoLabel } from '@/src/components/ui';
import { colors, fonts, radii } from '@/src/theme';
import { formatCurrency, normalizeMobileNumber } from '@/utils/format';
import { HapticService } from '@/utils/haptics';
import { upiService } from '@/api/services/upiService';

const METHODS: { label: string; value: UpiPaymentMethod }[] = [
  { label: 'UPI', value: 'UPI' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
];

export default function PayUpiScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, dealer } = useAuth();
  const { data, isLoading, isError, error, refetch } = useUpiOrderDetails(id);
  const uploadScreenshot = useUploadPaymentScreenshot();
  const submitPayment = useSubmitUpiPayment(id);

  const [method, setMethod] = useState<UpiPaymentMethod>('UPI');
  const [screenshot, setScreenshot] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Payment proof (UTR + screenshot) is sensitive enough to be worth
  // excluding from screenshots/screen recording while this screen is open.
  ScreenCapture.usePreventScreenCapture('pay-upi');

  const form = useForm<UpiPaymentProofFormValues>({
    resolver: zodResolver(upiPaymentProofSchema),
    defaultValues: {
      utrNumber: '',
      payerName: dealer?.ownerName ?? user?.name ?? '',
      payerEmail: user?.email ?? '',
      payerPhone: normalizeMobileNumber(dealer?.phone),
    },
  });

  const pickScreenshot = async () => {
    setPickerError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPickerError('Allow photo library access to attach a payment screenshot.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setScreenshot({
      uri: asset.uri,
      name: asset.fileName ?? `payment-screenshot-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
  };

  const onSubmit = async (values: UpiPaymentProofFormValues) => {
    if (!screenshot || !data) {
      setSubmitError('Attach a screenshot of the payment before submitting.');
      return;
    }
    setSubmitError(null);
    try {
      const uploaded = await uploadScreenshot.mutateAsync({ orderId: id, file: screenshot });
      await submitPayment.mutateAsync({
        orderId: id,
        paymentMethod: method,
        utrNumber: values.utrNumber,
        payerName: values.payerName,
        payerEmail: values.payerEmail,
        payerPhone: values.payerPhone,
        screenshotUrl: uploaded.url,
        screenshotKey: uploaded.key,
      });
      HapticService.success();
      setSubmitted(true);
    } catch (err) {
      setSubmitError(getErrorMessage(err, 'Could not submit payment details'));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center]} edges={['bottom']}>
        <ActivityIndicator color={colors.ink} />
      </SafeAreaView>
    );
  }

  if (isError || !data) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <ErrorState error={error} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const { order, paymentSettings } = data;
  const existingSubmission = order.paymentSubmissions[0];
  const isFinal = submitted || (existingSubmission && existingSubmission.status !== 'REJECTED');

  if (!paymentSettings.upiEnabled) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.content}>
          <Card>
            <Text style={styles.sectionTitle}>UPI payment unavailable</Text>
            <Text style={styles.muted}>
              Direct UPI/bank payment isn&apos;t available right now. Please contact support to complete this
              payment.
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (isFinal) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.content}>
          <Card style={styles.centerCard}>
            <Feather name="check-circle" size={40} color={colors.ink} />
            <Text style={styles.sectionTitle}>Payment submitted</Text>
            <Text style={styles.muted}>
              We&apos;ve received your payment details for order #{order.orderNumber}. Our accounts team verifies
              submissions within 1-2 business hours — you&apos;ll see the order move to Confirmed once it&apos;s
              checked.
            </Text>
            <Button label="Back to order" variant="brand" fullWidth onPress={() => router.replace(`/order/${order.id}`)} />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {existingSubmission?.status === 'REJECTED' && (
            <Card style={styles.rejectedCard}>
              <Badge label="Previous submission rejected" variant="neutral" />
              <Text style={styles.muted}>
                {existingSubmission.rejectionReason ?? 'The previous payment proof could not be verified.'} Please
                submit again with correct details.
              </Text>
            </Card>
          )}

          <Card style={styles.amountCard}>
            <Text style={styles.muted}>Amount due</Text>
            <MonoLabel color="ink" style={styles.amount}>
              {formatCurrency(order.amountDue)}
            </MonoLabel>
            <Text style={styles.orderRef}>Order #{order.orderNumber}</Text>
          </Card>

          <View style={styles.methodRow}>
            {METHODS.map((m) => {
              const active = method === m.value;
              return (
                <Pressable
                  key={m.value}
                  onPress={() => setMethod(m.value)}
                  style={[styles.methodChip, active && styles.methodChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.methodLabel, active && styles.methodLabelActive]}>{m.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {method === 'UPI' ? (
            <Card style={styles.payDetailsCard}>
              <Image
                source={{ uri: upiService.qrCodeUrl(order.amountDue) }}
                style={styles.qr}
                accessibilityLabel="UPI payment QR code"
              />
              <Text style={styles.payLabel}>UPI ID</Text>
              <Text selectable style={styles.payValue}>
                {paymentSettings.upiId}
              </Text>
              <Text style={styles.payLabel}>Payee name</Text>
              <Text selectable style={styles.payValue}>
                {paymentSettings.upiName}
              </Text>
            </Card>
          ) : (
            <Card style={styles.payDetailsCard}>
              <Text style={styles.payLabel}>Account name</Text>
              <Text selectable style={styles.payValue}>
                {paymentSettings.bankAccountName}
              </Text>
              <Text style={styles.payLabel}>Account number</Text>
              <Text selectable style={styles.payValue}>
                {paymentSettings.bankAccountNumber}
              </Text>
              <Text style={styles.payLabel}>IFSC</Text>
              <Text selectable style={styles.payValue}>
                {paymentSettings.bankIfsc}
              </Text>
            </Card>
          )}

          <Text style={styles.sectionTitle}>Confirm your payment</Text>
          <Text style={styles.muted}>
            After paying via the details above, enter the transaction reference and attach a screenshot for
            verification.
          </Text>

          <Controller
            control={form.control}
            name="utrNumber"
            render={({ field, fieldState }) => (
              <Input
                label={method === 'UPI' ? 'UPI transaction ID (UTR)' : 'Bank reference number'}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoCapitalize="characters"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="payerName"
            render={({ field, fieldState }) => (
              <Input
                label="Payer name"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="payerEmail"
            render={({ field, fieldState }) => (
              <Input
                label="Payer email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="payerPhone"
            render={({ field, fieldState }) => (
              <Input
                label="Payer phone"
                keyboardType="phone-pad"
                maxLength={10}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Text style={styles.sectionTitleSpaced}>Payment screenshot</Text>
          {screenshot ? (
            <Pressable onPress={pickScreenshot} accessibilityRole="button" accessibilityLabel="Change screenshot">
              <Image source={{ uri: screenshot.uri }} style={styles.screenshotPreview} />
            </Pressable>
          ) : (
            <Pressable onPress={pickScreenshot} style={styles.screenshotPicker} accessibilityRole="button" accessibilityLabel="Attach screenshot">
              <Feather name="upload" size={20} color={colors.muted} />
              <Text style={styles.muted}>Attach a screenshot of the payment</Text>
            </Pressable>
          )}
          {pickerError && <Text style={styles.errorText}>{pickerError}</Text>}

          {submitError && <Text style={styles.errorText}>{submitError}</Text>}

          <Button
            label="Submit payment details"
            variant="brand"
            fullWidth
            onPress={form.handleSubmit(onSubmit)}
            loading={uploadScreenshot.isPending || submitPayment.isPending}
            style={styles.submitButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  centerCard: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  sectionTitle: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink },
  sectionTitleSpaced: { fontFamily: fonts.display.bold, fontSize: 16, color: colors.ink, marginTop: 8 },
  muted: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.muted, textAlign: 'left' },
  amountCard: { alignItems: 'center', gap: 4 },
  amount: { fontSize: 24 },
  orderRef: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
  },
  methodChipActive: { borderColor: colors.red, backgroundColor: colors.redSoft },
  methodLabel: { fontFamily: fonts.body.semiBold, fontSize: 13, color: colors.ink },
  methodLabelActive: { color: colors.red },
  payDetailsCard: { gap: 6, alignItems: 'center' },
  qr: { width: 200, height: 200, marginBottom: 8, borderRadius: radii.sm },
  payLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.muted, alignSelf: 'flex-start' },
  payValue: { fontFamily: fonts.mono.medium, fontSize: 14, color: colors.ink, alignSelf: 'flex-start' },
  rejectedCard: { gap: 8 },
  screenshotPicker: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radii.md,
  },
  screenshotPreview: { width: '100%', height: 220, borderRadius: radii.md },
  errorText: { fontFamily: fonts.body.regular, fontSize: 12, color: colors.red },
  submitButton: { marginTop: 8 },
});
