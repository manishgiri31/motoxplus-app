import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { cartService, type AddToCartPayload } from '../services/cartService';
import type { Cart, CartItem, Product, ProductVariant } from '../types';

export function useCart() {
  return useQuery({
    queryKey: queryKeys.cart.detail(),
    queryFn: cartService.get,
  });
}

interface AddToCartContext {
  payload: AddToCartPayload;
  product: Product;
  variant?: ProductVariant;
}

/**
 * POST /cart doesn't return the updated cart (see docs/api.md §6), so the
 * optimistic item is synthesized from the Product/Variant the caller already
 * has in hand (e.g. from the product detail screen), then reconciled with a
 * refetch once the server call settles.
 */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const cartKey = queryKeys.cart.detail();

  return useMutation({
    mutationFn: (ctx: AddToCartContext) => cartService.addOrUpdate(ctx.payload),

    onMutate: async ({ payload, product, variant }: AddToCartContext) => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previousCart = queryClient.getQueryData<Cart>(cartKey);

      queryClient.setQueryData<Cart>(cartKey, (current) => {
        const items = current?.items ?? [];
        const existingIndex = items.findIndex(
          (i) => i.productId === payload.productId && i.variantId === (payload.variantId ?? null)
        );

        const optimisticItem: CartItem = {
          id: items[existingIndex]?.id ?? `optimistic-${payload.productId}-${payload.variantId ?? 'base'}`,
          cartId: current?.id ?? 'optimistic-cart',
          productId: payload.productId,
          variantId: payload.variantId ?? null,
          quantity: payload.quantity,
          product,
          variant: variant ?? null,
        };

        if (existingIndex >= 0) {
          const next = [...items];
          next[existingIndex] = optimisticItem;
          return { ...current, items: next };
        }
        return { ...current, items: [...items, optimisticItem] };
      });

      return { previousCart };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKey, context.previousCart);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKey });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const cartKey = queryKeys.cart.detail();

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeItem(itemId),

    onMutate: async (itemId: string) => {
      await queryClient.cancelQueries({ queryKey: cartKey });
      const previousCart = queryClient.getQueryData<Cart>(cartKey);

      queryClient.setQueryData<Cart>(cartKey, (current) =>
        current ? { ...current, items: current.items.filter((i) => i.id !== itemId) } : current
      );

      return { previousCart };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKey, context.previousCart);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKey });
    },
  });
}
