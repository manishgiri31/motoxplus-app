/**
 * Only ever true for a well-formed https:// URL. Use before opening any
 * server-supplied URL (e.g. Shipment.trackingUrl) in a browser — response
 * fields are typed but never runtime-validated (see api/services/*.ts), so a
 * malformed backend deploy or a compromised upstream (Delhivery) shouldn't be
 * able to hand the app a `javascript:`/`data:`/plain-http URL to open.
 */
export function isHttpsUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}
