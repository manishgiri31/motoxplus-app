import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';

// expo-image's <Image> is a third-party component, not a react-native core
// primitive — NativeWind only auto-intercepts className on core RN
// components (View, Text, Image, ...), so without this registration
// `className` is silently accepted as an unknown prop and produces no
// style at all. The result isn't an error or a broken network request; the
// image fetches fine but renders at zero size, i.e. invisible. Register it
// exactly once here and import Image from this module everywhere instead
// of from 'expo-image' directly, so no call site can reintroduce the gap.
cssInterop(ExpoImage, { className: 'style' });

export const Image = ExpoImage;
export type { ImageProps, ImageSource } from 'expo-image';
