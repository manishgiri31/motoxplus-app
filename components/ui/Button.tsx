import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';

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
  primary: 'bg-brandred-500 active:bg-brandred-600',
  secondary: 'bg-black active:bg-graytone-800',
  outline: 'bg-transparent border border-black active:bg-graytone-100',
  ghost: 'bg-transparent active:bg-graytone-100',
  destructive: 'bg-danger active:bg-red-700',
};

const labelByVariant: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-black',
  ghost: 'text-black',
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
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-sm ${containerByVariant[variant]} ${sizeStyles[size].container} ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      {...pressableProps}
    >
      {loading && (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? '#0A0A0A' : '#FFFFFF'} />
      )}
      <Text className={`font-semibold ${labelByVariant[variant]} ${sizeStyles[size].label}`}>{label}</Text>
    </Pressable>
  );
}
