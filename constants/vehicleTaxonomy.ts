// STUB DATA. docs/api.md §4 confirms vehicle-fitment matching is "a whole
// separate subsystem" with no endpoint exposed to the app to list valid
// brands/models/variants — GET /api/products only accepts `vehicle`/
// `variant` as opaque filter slugs it doesn't validate against a taxonomy.
// This is a small illustrative set (real brand/model names, invented
// year-variant trims) so the vehicle picker is usable end-to-end; swap for a
// real endpoint before relying on it for actual fitment results.
export interface VehicleModel {
  id: string;
  name: string;
  variants: string[];
}

export interface VehicleBrand {
  id: string;
  name: string;
  models: VehicleModel[];
}

export const VEHICLE_TAXONOMY: VehicleBrand[] = [
  {
    id: 'hero',
    name: 'Hero MotoCorp',
    models: [
      { id: 'splendor-plus', name: 'Splendor Plus', variants: ['2024 · Self Start', '2023 · Kick Start', '2022 · Self Start'] },
      { id: 'hf-deluxe', name: 'HF Deluxe', variants: ['2024 · Standard', '2023 · Standard'] },
      { id: 'glamour', name: 'Glamour', variants: ['2024 · Disc', '2023 · Drum'] },
    ],
  },
  {
    id: 'honda',
    name: 'Honda',
    models: [
      { id: 'activa-6g', name: 'Activa 6G', variants: ['2024 · Standard', '2023 · Deluxe'] },
      { id: 'shine', name: 'Shine', variants: ['2024 · Standard', '2023 · Disc'] },
      { id: 'unicorn', name: 'Unicorn', variants: ['2024 · Standard'] },
    ],
  },
  {
    id: 'bajaj',
    name: 'Bajaj',
    models: [
      { id: 'pulsar-150', name: 'Pulsar 150', variants: ['2024 · Single Disc', '2023 · Twin Disc'] },
      { id: 'platina-100', name: 'Platina 100', variants: ['2024 · ES', '2023 · Standard'] },
      { id: 'ct-100', name: 'CT 100', variants: ['2023 · Standard'] },
    ],
  },
  {
    id: 'tvs',
    name: 'TVS',
    models: [
      { id: 'apache-rtr-160', name: 'Apache RTR 160', variants: ['2024 · Single Channel ABS', '2023 · Standard'] },
      { id: 'jupiter', name: 'Jupiter', variants: ['2024 · ZX', '2023 · Standard'] },
      { id: 'sport', name: 'Sport', variants: ['2023 · Standard'] },
    ],
  },
];
