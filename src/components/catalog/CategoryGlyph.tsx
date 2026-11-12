import Feather from '@expo/vector-icons/Feather';

import { categoryIcon } from '@/utils/categoryIcon';

// Icon for a category tile, chosen from the category name (see categoryIcon).
export function CategoryGlyph({ name, size, color }: { name: string; size: number; color: string }) {
  const glyph = categoryIcon(name);
  if ('lucide' in glyph) {
    const Icon = glyph.lucide;
    return <Icon size={size} color={color} />;
  }
  return <Feather name={glyph.feather} size={size} color={color} />;
}
