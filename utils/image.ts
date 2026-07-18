import type { ImageSource } from '@/components/ui/Image';

/**
 * Single choke point for turning a backend-supplied image URL into an
 * expo-image source. The backend (Cloudflare R2) always returns fully
 * qualified URLs, so there's no relative-path prefixing to do — this exists
 * so "is this URL usable" (missing, empty, or whitespace-only) is answered
 * once instead of a `primaryImage ? { uri: primaryImage.imageUrl } : undefined`
 * ternary duplicated at every call site, several of which only checked that
 * the object existed and not that the string inside it was non-empty.
 */
export function getImageSource(url: string | null | undefined): ImageSource | undefined {
  const trimmed = url?.trim();
  return trimmed ? { uri: trimmed } : undefined;
}
