import { zodResolver } from '@hookform/resolvers/zod';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { getErrorMessage } from '@/api/errors';
import { contactService } from '@/api/services/contactService';
import type { ContactSubject } from '@/api/types';
import { useAuth } from '@/auth/useAuth';
import { Input } from '@/components/ui';
import { Button, Chip } from '@/src/components/ui';
import { colors, fonts } from '@/src/theme';

const SUBJECTS: { value: ContactSubject; label: string }[] = [
  { value: 'dealer', label: 'Dealer enquiry' },
  { value: 'product', label: 'Product enquiry' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'other', label: 'Other' },
];

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  phone: z.string().trim().optional(),
  subject: z.enum(['dealer', 'product', 'partnership', 'other']),
  message: z.string().trim().min(1, 'Write a message').max(2000, 'Keep it under 2000 characters'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

// Same enquiry form as the web /contact page: it emails the MotoXPlus team.
export default function ContactScreen() {
  const { user, dealer } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: dealer?.ownerName ?? user?.name ?? '',
      email: user?.email ?? '',
      phone: dealer?.phone ?? '',
      subject: 'other',
      message: '',
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setFormError(null);
    try {
      await contactService.send({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        subject: values.subject,
        message: values.message,
      });
      setSent(true);
    } catch (err) {
      setFormError(getErrorMessage(err, "Couldn't send your message. Please try again."));
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.screen} edges={['bottom']}>
        <View style={styles.sentWrap} accessibilityLiveRegion="polite">
          <View style={styles.sentIcon}>
            <Feather name="check" size={32} color={colors.success} />
          </View>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Message sent
          </Text>
          <Text style={styles.sentBody}>Thanks for reaching out. Our team will get back to you soon.</Text>
          <Button label="Done" variant="brand" fullWidth onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text accessibilityRole="header" aria-level={1} style={styles.title}>
              Contact support
            </Text>
            <Text style={styles.subtitle}>Questions about an order, your account or our parts? Write to us.</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={form.control}
              name="subject"
              render={({ field }) => (
                <View style={styles.chips}>
                  {SUBJECTS.map((s) => (
                    <Chip key={s.value} label={s.label} selected={field.value === s.value} onPress={() => field.onChange(s.value)} />
                  ))}
                </View>
              )}
            />
            <Controller
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <Input
                  label="Name"
                  autoComplete="name"
                  textContentType="name"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  label="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="phone"
              render={({ field, fieldState }) => (
                <Input
                  label="Phone (optional)"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <Controller
              control={form.control}
              name="message"
              render={({ field, fieldState }) => (
                <Input
                  label="Message"
                  multiline
                  style={styles.messageInput}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            {formError && (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {formError}
              </Text>
            )}
            <Button label="Send message" variant="brand" fullWidth onPress={form.handleSubmit(onSubmit)} loading={form.formState.isSubmitting} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  content: { padding: 24, gap: 24 },
  header: { gap: 6 },
  title: { fontFamily: fonts.display.extraBold, fontSize: 28, lineHeight: 31, letterSpacing: -0.42, color: colors.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 17, letterSpacing: -0.374, color: colors.muted },
  form: { gap: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  messageInput: { minHeight: 112, textAlignVertical: 'top' },
  error: { fontFamily: fonts.body.regular, fontSize: 14, letterSpacing: -0.224, color: colors.red },
  sentWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  sentIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sentBody: { fontFamily: fonts.body.regular, fontSize: 17, letterSpacing: -0.374, color: colors.muted, textAlign: 'center', marginBottom: 12 },
});
