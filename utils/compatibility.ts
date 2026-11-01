import vehicleTaxonomySnapshot from '@/constants/vehicleTaxonomySnapshot.json';

export interface CompatibilityGroup {
  /** Make (e.g. "Honda"), or null for entries that don't start with a known make. */
  brand: string | null;
  /** Model text with the make stripped off the front. */
  models: string[];
}

// Longest names first, so "Royal Enfield Bullet" matches "Royal Enfield" and
// not a shorter make that happens to be its prefix.
const BRAND_NAMES = (vehicleTaxonomySnapshot as { brands: { name: string }[] }).brands
  .map((b) => b.name)
  .sort((a, b) => b.length - a.length);

/**
 * Product.compatibility is a flat list of vehicle names. Group it by make for
 * display, using the bundled vehicle taxonomy to recognise the make: splitting
 * on the first word would break two-word makes. Anything that doesn't start
 * with a known make is kept whole under a null brand. Order is preserved.
 */
export function groupCompatibility(vehicles: readonly string[]): CompatibilityGroup[] {
  const groups = new Map<string | null, string[]>();

  for (const vehicle of vehicles) {
    const lower = vehicle.toLowerCase();
    const brand = BRAND_NAMES.find((name) => {
      const n = name.toLowerCase();
      return lower === n || lower.startsWith(`${n} `);
    });
    const key = brand ?? null;
    const model = brand ? vehicle.slice(brand.length).trim() || vehicle : vehicle;
    const list = groups.get(key);
    if (list) list.push(model);
    else groups.set(key, [model]);
  }

  // Unrecognised entries go last so the known makes lead.
  return [...groups.entries()]
    .map(([brand, models]) => ({ brand, models }))
    .sort((a, b) => Number(a.brand === null) - Number(b.brand === null));
}
