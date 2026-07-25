import { Text, View } from 'react-native';

export interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 48 }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-secondary items-center justify-center"
    >
      <Text className="text-secondary-foreground font-bold" style={{ fontSize: size * 0.35 }}>
        {initial}
      </Text>
    </View>
  );
}
