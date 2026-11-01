import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/src/components/ui/Button';
import { InputField } from '@/src/components/ui/InputField';
import { Sheet } from '@/src/components/ui/Sheet';
import { colors, space, textStyles } from '@/src/theme';

export interface PasswordConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  /** Label of the destructive confirm button. */
  confirmLabel: string;
  password: string;
  onPasswordChange: (value: string) => void;
  error?: string | null;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

// Re-enter-your-password sheet for destructive actions. Opens at the tall (90%)
// detent so the field and both buttons stay above the keyboard.
export function PasswordConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  password,
  onPasswordChange,
  error,
  loading = false,
  onConfirm,
  onClose,
}: PasswordConfirmSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title={title} initialDetent={1} scrollable>
      <Text style={styles.message} maxFontSizeMultiplier={1.2}>
        {message}
      </Text>
      <InputField
        label="Password"
        secureTextEntry
        autoFocus
        autoCapitalize="none"
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={onConfirm}
        value={password}
        onChangeText={onPasswordChange}
        error={error ?? undefined}
      />
      <View style={styles.actions}>
        <Button label={confirmLabel} variant="destructive" fullWidth loading={loading} onPress={onConfirm} />
        <Button label="Cancel" variant="secondary" fullWidth disabled={loading} onPress={onClose} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  message: { ...textStyles.callout, color: colors.ink2 },
  actions: { gap: space.md },
});
