import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

import { useFocusRing } from '@/hooks/use-focus-ring';
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
  // Press = scale 0.98 plus a darker fill; hover (web) lightens to the hover blue.
  primary: 'bg-primary hover:bg-primary-hover active:bg-primary-active active:scale-[0.98]',
  secondary: 'bg-secondary active:opacity-90 active:scale-[0.98]',
  outline: 'bg-transparent border border-primary hover:bg-primary/10 active:bg-primary/20 active:scale-[0.98]',
  ghost: 'bg-transparent hover:bg-surface active:bg-surface active:scale-[0.98]',
  destructive: 'bg-danger active:opacity-90 active:scale-[0.98]',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-link',
  ghost: 'text-link',
  destructive: 'text-white',
};

const sizeStyles: Record<ButtonSize, { container: string; label: string }> = {
  sm: { container: 'h-9 px-lg rounded-full', label: 'text-[14px]' },
  md: { container: 'h-12 px-2xl rounded-full', label: 'text-[17px]' },
  lg: { container: 'h-14 px-3xl rounded-full', label: 'text-[17px]' },
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  className,
  style,
  onFocus,
  onBlur,
  ...pressableProps
}: ButtonProps & { className?: string }) {
  const colors = useThemeColors();
  const focusRing = useFocusRing();
  const isDisabled = disabled || loading;

  // primary/destructive both use primaryForeground — white in both themes.
  const spinnerColor =
    variant === 'outline' || variant === 'ghost'
      ? colors.primary
      : variant === 'secondary'
        ? colors.secondaryForeground
        : colors.primaryForeground;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      // 'sm' renders at 36px tall (below the 44x44 touch-target minimum) —
      // hitSlop extends the tappable area without changing the visual size.
      hitSlop={size === 'sm' ? 8 : undefined}
      className={`min-w-[44px] flex-row items-center justify-center gap-sm ${containerByVariant[variant]} ${sizeStyles[size].container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      onFocus={(e) => {
        focusRing.onFocus();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focusRing.onBlur();
        onBlur?.(e);
      }}
      style={(state) => [typeof style === 'function' ? style(state) : style, focusRing.ringStyle]}
      {...pressableProps}
    >
      {loading && <ActivityIndicator size="small" color={spinnerColor} />}
      <Text className={`font-semibold tracking-[-0.02em] ${labelByVariant[variant]} ${sizeStyles[size].label}`}>
        {label}
      </Text>
    </Pressable>
  );
}
