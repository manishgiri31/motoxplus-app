import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

// forwardRef + plain TextInput props so this drops straight into React Hook
// Form's <Controller render={({ field }) => <Input {...field} />} /> pattern.
export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, helperText, leftElement, rightElement, className, onFocus, onBlur, ...rest }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const colors = useThemeColors();

    return (
      <View className="gap-xs">
        {label && <Text className="text-[13px] font-semibold text-text">{label}</Text>}
        <View
          className={`flex-row items-center h-12 rounded-md border px-md gap-sm ${
            error
              ? 'border-danger'
              : isFocused
                ? 'border-secondary'
                : 'border-border'
          } ${className ?? ''}`}
        >
          {leftElement}
          <TextInput
            ref={ref}
            placeholderTextColor={colors.muted}
            className="flex-1 text-[15px] text-text py-0"
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />
          {rightElement}
        </View>
        {error ? (
          <Text className="text-[12px] text-danger">{error}</Text>
        ) : helperText ? (
          <Text className="text-[12px] text-muted">{helperText}</Text>
        ) : null}
      </View>
    );
  }
);

Input.displayName = 'Input';
