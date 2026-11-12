import Feather from '@expo/vector-icons/Feather';
import { Image as ExpoImage, type ImageProps } from 'expo-image';
import { useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@/src/theme';

export type { ImageSource } from 'expo-image';

// Thin wrapper over expo-image with two app-wide defaults so no call site
// has to repeat them:
//  - a fade-in transition, so a network image doesn't pop in abruptly once
//    it finishes loading (the visible "flicker" on slower connections);
//  - a graceful "box" icon fallback when there's no source at all, or a
//    provided source's request actually fails (bad URL, 404, offline) —
//    instead of expo-image's default of silently showing nothing forever.
export function Image({ transition, onError, source, style, ...rest }: ImageProps) {
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
      <View style={[{ alignItems: 'center', justifyContent: 'center' }, style as StyleProp<ViewStyle>]}>
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
      style={style}
      {...rest}
    />
  );
}
