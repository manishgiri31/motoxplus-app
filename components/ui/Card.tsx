import { Pressable, View, type PressableProps, type ViewProps } from 'react-native';

interface BaseCardProps {
  className?: string;
  children: React.ReactNode;
}

export function Card({ className, children, ...rest }: BaseCardProps & ViewProps) {
  return (
    <View
      className={`bg-white rounded-lg border border-graytone-200 ${className ?? ''}`}
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
      className={`bg-white rounded-lg border border-graytone-200 active:opacity-70 ${className ?? ''}`}
      {...rest}
    >
      {children}
    </Pressable>
  );
}
