import { Feather } from '@expo/vector-icons';
import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image';
import { cssInterop } from 'nativewind';
import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

// expo-image's <Image> is a third-party component, not a react-native core
// primitive — NativeWind only auto-intercepts className on core RN
// components (View, Text, Image, ...), so without this registration
// `className` is silently accepted as an unknown prop and produces no
// style at all. The result isn't an error or a broken network request; the
// image fetches fine but renders at zero size, i.e. invisible. Register it
// exactly once here and import Image from this module everywhere instead
// of from 'expo-image' directly, so no call site can reintroduce the gap.
cssInterop(ExpoImage, { className: 'style' });

export type { ImageSource } from 'expo-image';

export interface ImageProps extends ExpoImageProps {
  className?: string;
}

// Thin wrapper over expo-image with two app-wide defaults so no call site
// has to repeat them:
//  - a fade-in transition, so a network image doesn't pop in abruptly once
//    it finishes loading (the visible "flicker" on slower connections);
//  - a graceful icon fallback (matching the "box" glyph already used for a
//    missing source in search.tsx) when there's no source at all, or a
//    provided source's request actually fails (bad URL, 404, offline) —
//    instead of expo-image's default of silently showing nothing forever.
export function Image({ transition, onError, source, className, style, ...rest }: ImageProps) {
  const colors = useThemeColors();
  const [failed, setFailed] = useState(false);
  const hasSource = source != null && (typeof source !== 'object' || Object.keys(source).length > 0);
  const sourceKey = JSON.stringify(source);

  // Resets the failure flag when the source changes so a recycled FlatList
  // row (same component instance, new `source` via recyclingKey) doesn't
  // keep showing a previous item's failure.
  useEffect(() => {
    setFailed(false);
  }, [sourceKey]);

  if (!hasSource || failed) {
    return (
      <View className={`items-center justify-center ${className ?? ''}`} style={style as StyleProp<ViewStyle>}>
        <Feather name="box" size={20} color={colors.muted} />
      </View>
    );
  }

  return (
    <ExpoImage
      source={source}
      transition={transition ?? 150}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
      className={className}
      style={style}
      {...rest}
    />
  );
}
