import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { emailSchema, type EmailFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

export default function ChangeEmailScreen() {
  const { user, refreshUser } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: EmailFormValues) => {
    setFormError(null);
    try {
      await authService.changeEmail({ newEmail: values.email });
      // Backend clears emailVerified on the new address — resync local state
      // before routing to verification so the app knows it's unverified again.
      await refreshUser();
      router.replace('/verify-email');
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not update your email'));
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Change email</Text>
            <Text style={styles.subtitle}>
              Current email: {user?.email}. You&apos;ll need to verify the new address before you can order again.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label="New email address"
                  autoFocus
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="go"
                  onSubmitEditing={form.handleSubmit(onSubmit)}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            {formError && <Text style={styles.error}>{formError}</Text>}
            <Button
              label="Save and verify"
              variant="brand"
              fullWidth
              onPress={form.handleSubmit(onSubmit)}
              loading={form.formState.isSubmitting}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  backButton: { alignSelf: 'flex-start', marginLeft: 16, marginTop: 8, padding: 4 },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 32 },
  header: { gap: 6 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 30, lineHeight: 36, color: colors.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 16, color: colors.muted, marginTop: 4 },
  form: { gap: 16 },
  error: { fontFamily: fonts.body.regular, fontSize: 13, color: colors.red },
});
