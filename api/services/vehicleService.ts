import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from '../client';
import type { VehicleTaxonomyResponse } from '../types';
// Bundled offline/first-launch fallback — real brand/model names and slugs
// from motoxplus-web's prisma/seed-vehicles.ts (the actual backend seed),
// with variant-level data only for the 3 models that seed script gives real
// generations/variants (Splendor Plus, Pulsar 150, Activa 6G); every other
// model's `variants` is honestly empty rather than invented. IDs are the
// slug itself — GET /api/products' vehicle/variant filters match on slug,
// not id, so this doesn't need to line up with real database cuids.
import vehicleTaxonomySnapshot from '@/constants/vehicleTaxonomySnapshot.json';

const CACHE_KEY = 'mx_vehicle_taxonomy_cache_v1';

interface TaxonomyCacheEntry {
  etag: string | null;
  data: VehicleTaxonomyResponse;
}

async function readCache(): Promise<TaxonomyCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as TaxonomyCacheEntry) : null;
  } catch {
    return null;
  }
}

async function writeCache(entry: TaxonomyCacheEntry): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Non-fatal — worst case, next launch just refetches instead of reusing cache.
  }
}

export const vehicleService = {
  /**
   * On-device cache keyed by the server's ETag (see GET /api/vehicles,
   * which sends one derived from the taxonomy's `updatedAt`): sends
   * `If-None-Match` with whatever's cached, so an unchanged backend costs a
   * cheap 304 instead of re-downloading the whole tree. Falls back, in
   * order, to (1) the on-device cache if the network request fails, then
   * (2) the bundled snapshot above if there's no cache yet either (offline
   * first launch) — so the picker always has real data to show.
   */
  async list(): Promise<VehicleTaxonomyResponse> {
    const cached = await readCache();

    try {
      const response = await apiClient.get<VehicleTaxonomyResponse>('/vehicles', {
        headers: cached?.etag ? { 'If-None-Match': cached.etag } : undefined,
        validateStatus: (status) => status === 200 || status === 304,
      });

      if (response.status === 304 && cached) {
        return cached.data;
      }

      const etag = (response.headers.etag as string | undefined) ?? null;
      await writeCache({ etag, data: response.data });
      return response.data;
    } catch {
      if (cached) return cached.data;
      return vehicleTaxonomySnapshot as VehicleTaxonomyResponse;
    }
  },
};
