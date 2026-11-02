import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { getErrorMessage } from '@/api/errors';
import { authService } from '@/api/services/authService';
import { emailSchema, type EmailFormValues } from '@/auth/validation';
import { useAuth } from '@/auth/useAuth';
import { FormScreen } from '@/src/components/auth/FormScreen';
import { Button, GroupedList, InputField } from '@/src/components/ui';

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

  const message = form.formState.errors.email?.message ?? formError;

  return (
    <FormScreen
      navTitle="Change email"
      title="Change email"
      subtitle={`Current email: ${user?.email}. You'll need to verify the new address before you can order again.`}
      onBack={() => router.back()}
      action={
        <Button
          label="Save and verify"
          variant="primary"
          fullWidth
          onPress={form.handleSubmit(onSubmit)}
          loading={form.formState.isSubmitting}
        />
      }
    >
      <GroupedList footer={message} footerTone="danger">
        <Controller
          control={form.control}
          name="email"
          render={({ field, fieldState }) => (
            <InputField
              variant="grouped"
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
              invalid={!!fieldState.error || !!formError}
            />
          )}
        />
      </GroupedList>
    </FormScreen>
  );
}
