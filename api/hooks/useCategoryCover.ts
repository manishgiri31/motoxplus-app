import { useQuery } from '@tanstack/react-query';

import { productService } from '../services/productService';

// Categories have no image of their own (Category.image is empty for every
// category in production), so a category is shown with a real photo of one of
// its products: the primary image of the first product that has one.
const SAMPLE_SIZE = 6;

export function useCategoryCover(slug: string, enabled = true) {
  return useQuery({
    queryKey: ['categories', 'cover', slug] as const,
    queryFn: async () => {
      const { products } = await productService.list({ category: slug, pageSize: SAMPLE_SIZE });
      const withPhoto = products.find((p) => (p.productImages?.length ?? 0) > 0);
      const image = withPhoto?.productImages.find((i) => i.isPrimary) ?? withPhoto?.productImages[0];
      return image?.imageUrl ?? null;
    },
    enabled,
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}
