import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { emailSchema, type EmailFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button } from '@/src/components/ui';
import { useThemeColors } from '@/hooks/use-theme-colors';

export default function ChangeEmailScreen() {
  const colors = useThemeColors();
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
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="self-start ml-lg mt-sm p-xs"
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <ScrollView contentContainerClassName="flex-1 justify-center px-2xl gap-2xl" keyboardShouldPersistTaps="handled">
          <View className="gap-xs">
            <Text className="text-h1 font-bold text-text">Change email</Text>
            <Text className="text-body text-muted">
              Current email: {user?.email}. You&apos;ll need to verify the new address before you can order again.
            </Text>
          </View>

          <View className="gap-lg">
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
            {formError && <Text className="text-[13px] text-danger">{formError}</Text>}
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
