import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

interface BaseCardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children, ...rest }: BaseCardProps & ViewProps) {
  return (
    <View
      className={`bg-card rounded-lg border border-border ${className ?? ''}`}
      {...rest}
    >
      {children}
    </View>
  );
}

export function PressableCard({
  className,
  children,
  ...rest
}: BaseCardProps & Omit<PressableProps, 'children'>) {
  return (
    <Pressable
      className={`bg-card rounded-lg border border-border active:opacity-70 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
