import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
}

const containerByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-primary active:bg-brandred-600',
  secondary: 'bg-secondary active:opacity-90',
  outline: 'bg-transparent border border-secondary active:bg-surface',
  ghost: 'bg-transparent active:bg-surface',
  destructive: 'bg-danger active:opacity-90',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-text',
  ghost: 'text-text',
  destructive: 'text-white',
};

const sizeStyles: Record<ButtonSize, { container: string; label: string }> = {
  sm: { container: 'h-9 px-md rounded-md', label: 'text-[13px]' },
  md: { container: 'h-12 px-lg rounded-md', label: 'text-[15px]' },
  lg: { container: 'h-14 px-xl rounded-lg', label: 'text-[17px]' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  ...pressableProps
}: ButtonProps & { className?: string }) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;

  // primary/destructive both use primaryForeground — white in both themes.
  const spinnerColor =
    variant === 'outline' || variant === 'ghost'
      ? colors.text
      : variant === 'secondary'
        ? colors.secondaryForeground
        : colors.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-sm ${containerByVariant[variant]} ${sizeStyles[size].container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...pressableProps}
    >
      {loading && <ActivityIndicator size="small" color={spinnerColor} />}
      <Text className={`font-semibold ${labelByVariant[variant]} ${sizeStyles[size].label}`}>{label}</Text>
    </Pressable>
  );
}
