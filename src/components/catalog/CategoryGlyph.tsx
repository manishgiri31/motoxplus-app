import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';

import { useCategoryCover } from '@/api/hooks/useCategoryCover';
import type { Category } from '@/api/types';
import { getImageSource } from '@/utils/image';
import { categoryIcon } from '@/utils/categoryIcon';

// Icon for a category, chosen from the category name (see categoryIcon).
export function CategoryGlyph({ name, size, color }: { name: string; size: number; color: string }) {
  const glyph = categoryIcon(name);
  if ('lucide' in glyph) {
    const Icon = glyph.lucide;
    return <Icon size={size} color={color} />;
  }
  return <Feather name={glyph.feather} size={size} color={color} />;
}

// What a category disc shows: a real photo of one of its products, or the
// icon while that loads, when the category is empty, or if no product in it
// has a photo. Rendered inside the caller's disc, so the layout is unchanged.
export function CategoryVisual({
  category,
  photoSize,
  iconSize,
  color,
}: {
  category: Category;
  photoSize: number;
  iconSize: number;
  color: string;
}) {
  const hasProducts = category._count.products > 0;
  const own = category.image?.trim() || null;
  const cover = useCategoryCover(category.slug, hasProducts && !own);
  const url = own ?? cover.data ?? null;

  if (!url) return <CategoryGlyph name={category.name} size={iconSize} color={color} />;
  return (
    <Image
      source={getImageSource(url)}
      style={{ width: photoSize, height: photoSize, borderRadius: photoSize / 2 }}
      contentFit="contain"
      cachePolicy="memory-disk"
      transition={150}
      accessibilityIgnoresInvertColors
    />
  );
}
