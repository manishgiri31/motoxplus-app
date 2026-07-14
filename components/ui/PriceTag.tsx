import { Text, View } from 'react-native';

import { discountPercent, formatCurrency } from '@/utils/format';

export interface PriceTagProps {
  price: number;
  mrp?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const textSize: Record<NonNullable<PriceTagProps['size']>, string> = {
  sm: 'text-[14px]',
  md: 'text-[18px]',
  lg: 'text-price',
};

export function PriceTag({ price, mrp = null, size = 'md' }: PriceTagProps) {
  const discount = discountPercent(price, mrp ?? null);

  return (
    <View className="flex-row items-baseline flex-wrap gap-sm">
      <Text className={`font-bold text-text ${textSize[size]}`}>{formatCurrency(price)}</Text>
      {discount !== null && mrp && (
        <>
          <Text className="text-[13px] text-muted line-through">{formatCurrency(mrp)}</Text>
          <Text className="text-[13px] font-semibold text-success">{discount}% off</Text>
        </>
      )}
    </View>
  );
}
