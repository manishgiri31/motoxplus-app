import { zodResolver } from '@hookform/resolvers/zod';
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
import { CheckoutField } from '@/src/components/checkout/CheckoutField';
import { InlineBanner } from '@/src/components/checkout/InlineBanner';
import { ResultLayout } from '@/src/components/checkout/ResultLayout';
import { SuccessCheck } from '@/src/components/checkout/SuccessCheck';
import { Button, Chip, GroupedList } from '@/src/components/ui';
import { colors, font, screenPaddingX, sectionGap, space, textStyles } from '@/src/theme';

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
// Laid out like Checkout: grouped rows, with the send button at the end.
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
      <ResultLayout
        icon={<SuccessCheck />}
        title="Message sent"
        message="Thanks for reaching out. Our team will get back to you soon."
        actions={<Button label="Done" variant="primary" fullWidth onPress={() => router.back()} />}
      />
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro} maxFontSizeMultiplier={1.2}>
            Questions about an order, your account or our parts? Write to us.
          </Text>

          <View style={styles.subjectBlock}>
            <Text style={styles.groupHeader} maxFontSizeMultiplier={1.2}>
              Subject
            </Text>
            <Controller
              control={form.control}
              name="subject"
              render={({ field }) => (
                <View style={styles.chips} accessibilityRole="radiogroup">
                  {SUBJECTS.map((s) => (
                    <Chip key={s.value} label={s.label} selected={field.value === s.value} onPress={() => field.onChange(s.value)} />
                  ))}
                </View>
              )}
            />
          </View>

          <GroupedList header="Your details">
            <CheckoutField control={form.control} name="name" label="Name" autoComplete="name" textContentType="name" />
            <CheckoutField
              control={form.control}
              name="email"
              label="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
            <CheckoutField
              control={form.control}
              name="phone"
              label="Phone (optional)"
              keyboardType="phone-pad"
              autoComplete="tel"
              textContentType="telephoneNumber"
              maxLength={15}
            />
          </GroupedList>

          <GroupedList header="Message">
            <CheckoutField
              control={form.control}
              name="message"
              label="How can we help?"
              multiline
              numberOfLines={5}
              maxLength={2000}
              textAlignVertical="top"
            />
          </GroupedList>

          {formError && <InlineBanner title="Message not sent" message={formError} />}

          <Button
            label="Send message"
            variant="primary"
            fullWidth
            onPress={form.handleSubmit(onSubmit)}
            loading={form.formState.isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: screenPaddingX, paddingTop: space.xl, paddingBottom: sectionGap, gap: sectionGap },
  intro: { ...textStyles.body, color: colors.ink2 },
  subjectBlock: { gap: space.sm },
  // Matches GroupedList's own header so the three blocks line up.
  groupHeader: { ...font(600), paddingHorizontal: space.lg, fontSize: 14, lineHeight: 20, color: colors.ink2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
