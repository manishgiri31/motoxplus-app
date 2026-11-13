import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

// Longest side of an uploaded document photo. 2000px keeps GST/PAN text
// sharp while a phone photo (3-8 MB at 4000px+) drops to a few hundred KB,
// which matters on slow connections: a 2 MB upload took ~55 s in testing.
const MAX_SIDE = 2000;
const JPEG_QUALITY = 0.7;

export interface CompressedImage {
  uri: string;
  mimeType: 'image/jpeg';
}

/**
 * Resizes (if larger than MAX_SIDE) and re-encodes a picked image as JPEG.
 * Returns null on web or if the image can't be processed; the caller then
 * uploads the original.
 */
export async function compressImage(uri: string, width?: number, height?: number): Promise<CompressedImage | null> {
  if (Platform.OS === 'web') return null;
  try {
    const context = ImageManipulator.manipulate(uri);
    if (width && height && Math.max(width, height) > MAX_SIDE) {
      context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
    return { uri: result.uri, mimeType: 'image/jpeg' };
  } catch {
    return null;
  }
}
