import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { Dealer, Order } from '@/api/types';
import { company } from '@/config/env';
import { formatCurrency } from './format';

function esc(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);
}

function date(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// A4 tax invoice, laid out to mirror the web app's downloadable PDF (header,
// from / bill-to, item table with the GST Benefit scheme-discount row, tax
// breakup, paid / due). Rendered by the OS print engine via expo-print.
export function buildInvoiceHtml(order: Order, dealer: Dealer | null): string {
  const invoice = order.invoice;
  if (!invoice) throw new Error('This order has no invoice yet.');

  const igst = invoice.igstAmount ?? 0;
  const hasSplit = igst > 0 || (invoice.cgstAmount ?? 0) > 0 || (invoice.sgstAmount ?? 0) > 0;

  const rows = order.items
    .map((item, i) => {
      const main = `<tr>
        <td>${i + 1}</td>
        <td class="mono">${esc(item.product.partNumber)}</td>
        <td class="mono">${esc(item.product.hsnCode)}</td>
        <td>${esc(item.product.name)}</td>
        <td class="r">${item.quantity}</td>
        <td class="r">${esc(formatCurrency(item.unitPrice))}</td>
        <td class="r">${item.gstRate}%</td>
        <td class="r b">${esc(formatCurrency(item.total))}</td>
      </tr>`;
      const scheme = item.isSchemeItem
        ? `<tr class="scheme"><td></td><td></td><td></td><td colspan="4">Less: Scheme Discount (GST Benefit, Sec. 15(3))</td><td class="r">-${esc(formatCurrency(item.schemeDiscountAmount ?? 0))}</td></tr>`
        : '';
      return main + scheme;
    })
    .join('');

  const taxLines = hasSplit
    ? igst > 0
      ? `<div class="line sub"><span>IGST</span><span>${esc(formatCurrency(igst))}</span></div>`
      : `<div class="line sub"><span>CGST</span><span>${esc(formatCurrency(invoice.cgstAmount ?? 0))}</span></div>
         <div class="line sub"><span>SGST</span><span>${esc(formatCurrency(invoice.sgstAmount ?? 0))}</span></div>`
    : '';

  const cityLine = [dealer?.city, dealer?.state, dealer?.pincode].filter(Boolean).join(', ');

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { margin: 28px; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1d1d1f; font-size: 12px; line-height: 1.45; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 18px; border-bottom: 1px solid #d2d2d7; }
  .brand { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; }
  .muted { color: #6e6e73; }
  .meta { text-align: right; }
  .meta .title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #6e6e73; }
  .meta .num { font-size: 18px; font-weight: 600; margin: 2px 0; }
  .parties { display: flex; gap: 32px; margin: 20px 0; }
  .parties > div { flex: 1; }
  .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6e6e73; margin-bottom: 4px; }
  .name { font-weight: 600; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6e6e73; padding: 8px 6px; border-bottom: 1px solid #d2d2d7; }
  td { padding: 8px 6px; border-bottom: 1px solid #e8e8ed; vertical-align: top; }
  .r { text-align: right; } .b { font-weight: 600; } .mono { font-variant-numeric: tabular-nums; }
  tr.scheme td { color: #248a3d; font-size: 11px; font-style: italic; border-bottom: 1px solid #e8e8ed; }
  .totals { width: 260px; margin: 18px 0 0 auto; }
  .line { display: flex; justify-content: space-between; padding: 3px 0; }
  .line.sub { padding-left: 12px; font-size: 11px; color: #6e6e73; }
  .grand { display: flex; justify-content: space-between; margin: 8px 0; padding: 10px 0; border-top: 1px solid #1d1d1f; border-bottom: 1px solid #1d1d1f; font-size: 15px; font-weight: 600; }
  .foot { margin-top: 28px; font-size: 10px; color: #86868b; text-align: center; }
</style></head>
<body>
  <div class="top">
    <div>
      <div class="brand">MotoXPlus</div>
      <div class="muted">India Pvt. Ltd.</div>
      ${company.address ? `<div class="muted">${esc(company.address)}</div>` : ''}
      ${company.gst ? `<div class="muted">GST: ${esc(company.gst)}</div>` : ''}
      ${company.phone ? `<div class="muted">Phone: ${esc(company.phone)}</div>` : ''}
    </div>
    <div class="meta">
      <div class="title">Tax invoice</div>
      <div class="num">${esc(invoice.invoiceNumber)}</div>
      <div class="muted">Date: ${esc(date(invoice.issuedAt ?? order.createdAt))}</div>
      <div class="muted">Order: ${esc(order.orderNumber)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="label">Bill to</div>
      <div class="name">${esc(dealer?.companyName ?? order.deliveryName)}</div>
      ${dealer?.ownerName ? `<div>${esc(dealer.ownerName)}</div>` : ''}
      ${dealer?.address ? `<div>${esc(dealer.address)}</div>` : ''}
      ${cityLine ? `<div>${esc(cityLine)}</div>` : ''}
      ${dealer?.gstNumber ? `<div>GST: ${esc(dealer.gstNumber)}</div>` : ''}
      ${dealer?.phone ? `<div>Phone: ${esc(dealer.phone)}</div>` : ''}
      ${invoice.placeOfSupply ? `<div class="muted">Place of supply: ${esc(invoice.placeOfSupply)}</div>` : ''}
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Part no.</th><th>HSN</th><th>Product</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">GST</th><th class="r">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div class="line"><span class="muted">Subtotal (excl. GST)</span><span>${esc(formatCurrency(invoice.subtotal))}</span></div>
    <div class="line"><span class="muted">GST</span><span>${esc(formatCurrency(invoice.gstAmount))}</span></div>
    ${taxLines}
    <div class="grand"><span>Grand total</span><span>${esc(formatCurrency(invoice.grandTotal))}</span></div>
    <div class="line"><span class="muted">Paid</span><span>${esc(formatCurrency(order.amountPaid))}</span></div>
    ${order.amountDue > 0 ? `<div class="line"><span class="muted">Balance due</span><span>${esc(formatCurrency(order.amountDue))}</span></div>` : ''}
  </div>

  <div class="foot">This is a computer-generated invoice and does not require a signature.</div>
</body></html>`;
}

/** Renders the invoice to a PDF named after the invoice number and opens the share sheet. */
export async function shareInvoicePdf(order: Order, dealer: Dealer | null): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Sharing files is not available on this device.');
  }

  const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(order, dealer) });

  // printToFileAsync names the file with a random id; rename so the shared
  // PDF reads as the invoice (invoice numbers contain "/", so sanitize).
  const safeName = (order.invoice?.invoiceNumber ?? order.orderNumber).replace(/[^A-Za-z0-9_-]+/g, '-');
  const named = new File(Paths.cache, `${safeName}.pdf`);
  if (named.exists) named.delete();
  new File(uri).move(named);

  await Sharing.shareAsync(named.uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: `Invoice ${order.invoice?.invoiceNumber ?? ''}`.trim(),
  });
}
