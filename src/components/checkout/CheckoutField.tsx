import type { ReactNode } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { StyleSheet, Text, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';

import { InputField } from '@/src/components/ui/InputField';
import { colors, font, space } from '@/src/theme';

export interface CheckoutFieldProps<T extends FieldValues>
  extends Omit<TextInputProps, 'value' | 'onChangeText' | 'onBlur' | 'style'> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  /** Caption rendered under the field, inside the same list row. */
  children?: ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

// One inset row of a GroupedList form: a react-hook-form field rendered with
// InputField's `grouped` variant, its validation message printed under it.
export function CheckoutField<T extends FieldValues>({
  control,
  name,
  label,
  children,
  containerStyle,
  ...inputProps
}: CheckoutFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <View style={containerStyle}>
          <InputField
            variant="grouped"
            label={label}
            value={(field.value as string | undefined) ?? ''}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            invalid={!!fieldState.error}
            style={styles.input}
            {...inputProps}
          />
          {!!fieldState.error?.message && (
            <Text style={styles.error} accessibilityLiveRegion="polite" maxFontSizeMultiplier={1.2}>
              {fieldState.error.message}
            </Text>
          )}
          {children}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  // InputField's own vertical padding is sized for the boxed variant; inside a
  // grouped row the label above already supplies the breathing room.
  input: { paddingVertical: space.xs },
  error: {
    ...font(400),
    fontSize: 14,
    lineHeight: 20,
    color: colors.red,
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
});
