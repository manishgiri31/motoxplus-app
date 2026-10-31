import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors as themeColors } from '@/src/theme';

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

    return (
      <View className="gap-xs">
        {label && <Text className="text-[14px] font-semibold tracking-[-0.016em] text-text">{label}</Text>}
        <View
          // 12px radius, 1px #d2d2d7 border; focus swaps the border to the
          // accent and adds a 4px ring (box-shadow works on iOS, Android and web).
          style={isFocused ? { boxShadow: `0 0 0 4px ${themeColors.focusRing}` } : undefined}
          className={`flex-row items-center min-h-[48px] rounded-md border bg-background px-[14px] py-[12px] gap-sm ${
            error
              ? 'border-danger'
              : isFocused
                ? 'border-primary'
                : 'border-border'
          } ${className ?? ''}`}
        >
          {leftElement}
          <TextInput
            ref={ref}
            placeholderTextColor={themeColors.subtle}
            className="flex-1 text-[17px] tracking-[-0.022em] text-text py-0"
            maxLength={500}
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
