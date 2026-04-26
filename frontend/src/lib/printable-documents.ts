type PrintableLineItem = {
  amount: number;
  label: string;
  meta?: string;
  quantity?: number;
  rate?: number;
};

type InvoiceDocumentPayload = {
  balanceDue: number;
  billingCycle: string;
  dueDate: string;
  invoiceDate: string;
  invoiceType: string;
  lineItems: PrintableLineItem[];
  location: string;
  paidAmount: number;
  reference: string;
  regId: string;
  remarks?: string;
  residentName: string;
  room: string;
  status: string;
  subtotal: number;
  title?: string;
  totalAmount: number;
  totals?: Array<{ label: string; value: number }>;
};

type ReceiptDocumentPayload = {
  amount: number;
  balanceAfter: number;
  date: string;
  location: string;
  note?: string;
  reference: string;
  regId: string;
  residentName: string;
  room: string;
  status: string;
  subtitle?: string;
  title?: string;
  typeLabel: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCycle(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00`));
}

function openPrintableWindow(title: string, bodyMarkup: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1080,height=860");

  if (!printWindow) {
    return false;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --border: #d6deef;
        --border-strong: #b8c3dc;
        --ink: #14213d;
        --ink-soft: #42506e;
        --muted: #6a7693;
        --panel: #f5f8ff;
        --accent: #255df4;
        --accent-soft: rgba(37, 93, 244, 0.1);
        --good: #14866d;
        --danger: #b5475b;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #edf2fb;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
      }

      .sheet {
        width: min(980px, calc(100% - 48px));
        margin: 24px auto;
        padding: 32px;
        border: 1px solid var(--border);
        border-radius: 28px;
        background: #ffffff;
        box-shadow: 0 18px 50px rgba(17, 28, 68, 0.08);
      }

      .header {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--border);
      }

      .eyebrow {
        margin: 0 0 10px;
        color: var(--accent);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.1;
      }

      .subtitle {
        margin: 12px 0 0;
        color: var(--ink-soft);
        font-size: 14px;
        line-height: 1.6;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 8px 12px;
        color: var(--ink-soft);
        font-size: 12px;
        font-weight: 700;
        background: var(--panel);
        text-transform: uppercase;
        letter-spacing: 0.12em;
      }

      .meta-grid,
      .stats-grid {
        display: grid;
        gap: 14px;
        margin-top: 24px;
      }

      .meta-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }

      .card {
        min-width: 0;
        padding: 16px 18px;
        border: 1px solid var(--border);
        border-radius: 20px;
        background: var(--panel);
      }

      .card-label {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.14em;
      }

      .card-value {
        margin: 0;
        color: var(--ink);
        font-size: 18px;
        font-weight: 700;
        line-height: 1.4;
      }

      .card-hint {
        margin: 8px 0 0;
        color: var(--ink-soft);
        font-size: 13px;
        line-height: 1.5;
      }

      .section {
        margin-top: 28px;
      }

      .section-title {
        margin: 0 0 14px;
        font-size: 16px;
        font-weight: 700;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border);
        text-align: left;
        vertical-align: top;
      }

      th {
        color: var(--muted);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        background: var(--panel);
      }

      td {
        font-size: 14px;
        line-height: 1.5;
      }

      .align-right {
        text-align: right;
      }

      .totals {
        width: min(340px, 100%);
        margin-left: auto;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
        font-size: 14px;
      }

      .total-row strong {
        font-size: 16px;
      }

      .footer-note {
        margin-top: 24px;
        padding: 16px 18px;
        border: 1px dashed var(--border-strong);
        border-radius: 18px;
        color: var(--ink-soft);
        font-size: 13px;
        line-height: 1.6;
        background: #fbfcff;
      }

      @page {
        margin: 16mm;
      }

      @media print {
        body {
          background: #ffffff;
        }

        .sheet {
          width: 100%;
          margin: 0;
          padding: 0;
          border: 0;
          border-radius: 0;
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      ${bodyMarkup}
    </main>
    <script>
      window.addEventListener("load", function () {
        window.focus();
        setTimeout(function () {
          window.print();
        }, 120);
      });
    </script>
  </body>
</html>`);
  printWindow.document.close();
  return true;
}

export function openInvoicePrintView(payload: InvoiceDocumentPayload) {
  const totals = [
    ...(payload.totals ?? []),
    { label: "Total amount", value: payload.totalAmount },
    { label: "Paid amount", value: payload.paidAmount },
    { label: "Balance due", value: payload.balanceDue },
  ];

  const lineItemsMarkup = payload.lineItems
    .map((item) => {
      const quantityMarkup = typeof item.quantity === "number" ? escapeHtml(String(item.quantity)) : "1";
      const rateMarkup = typeof item.rate === "number" ? formatCurrency(item.rate) : "Included";
      const metaMarkup = item.meta ? `<div style="margin-top:4px;color:#6a7693;font-size:12px;">${escapeHtml(item.meta)}</div>` : "";

      return `
        <tr>
          <td>
            <div style="font-weight:700;">${escapeHtml(item.label)}</div>
            ${metaMarkup}
          </td>
          <td class="align-right">${quantityMarkup}</td>
          <td class="align-right">${escapeHtml(rateMarkup)}</td>
          <td class="align-right">${escapeHtml(formatCurrency(item.amount))}</td>
        </tr>
      `;
    })
    .join("");

  const totalsMarkup = totals
    .map((item, index) => {
      const isFinal = index === totals.length - 1;
      return `
        <div class="total-row"${isFinal ? ' style="border-bottom:0;padding-top:14px;"' : ""}>
          <span>${escapeHtml(item.label)}</span>
          <span>${isFinal ? `<strong>${escapeHtml(formatCurrency(item.value))}</strong>` : escapeHtml(formatCurrency(item.value))}</span>
        </div>
      `;
    })
    .join("");

  return openPrintableWindow(
    payload.title ?? `${payload.reference} Invoice`,
    `
      <section class="header">
        <div>
          <p class="eyebrow">Hostel Billing</p>
          <h1>${escapeHtml(payload.title ?? "Invoice PDF")}</h1>
          <p class="subtitle">
            Resident billing document for ${escapeHtml(payload.invoiceType)} in ${escapeHtml(formatCycle(payload.billingCycle))}.
          </p>
        </div>
        <div style="text-align:right;">
          <span class="badge">${escapeHtml(payload.status)}</span>
        </div>
      </section>

      <section class="meta-grid">
        <div class="card">
          <p class="card-label">Resident</p>
          <p class="card-value">${escapeHtml(payload.residentName)}</p>
          <p class="card-hint">${escapeHtml(payload.regId)}</p>
        </div>
        <div class="card">
          <p class="card-label">Allocation</p>
          <p class="card-value">${escapeHtml(payload.room)}</p>
          <p class="card-hint">${escapeHtml(payload.location)}</p>
        </div>
        <div class="card">
          <p class="card-label">Invoice Reference</p>
          <p class="card-value">${escapeHtml(payload.reference)}</p>
          <p class="card-hint">Issued ${escapeHtml(formatDate(payload.invoiceDate))}</p>
        </div>
        <div class="card">
          <p class="card-label">Due Date</p>
          <p class="card-value">${escapeHtml(formatDate(payload.dueDate))}</p>
          <p class="card-hint">${escapeHtml(formatCycle(payload.billingCycle))}</p>
        </div>
      </section>

      <section class="section">
        <h2 class="section-title">Charge Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="align-right">Qty</th>
              <th class="align-right">Rate</th>
              <th class="align-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsMarkup}
          </tbody>
        </table>
      </section>

      <section class="section">
        <div class="totals">
          ${totalsMarkup}
        </div>
      </section>

      <section class="footer-note">
        ${escapeHtml(payload.remarks?.trim() || "Generated from the billing workspace. Use the browser print dialog to save this document as PDF.")}
      </section>
    `,
  );
}

export function openReceiptPrintView(payload: ReceiptDocumentPayload) {
  return openPrintableWindow(
    payload.title ?? `${payload.reference} Receipt`,
    `
      <section class="header">
        <div>
          <p class="eyebrow">Hostel Billing</p>
          <h1>${escapeHtml(payload.title ?? "Payment Receipt")}</h1>
          <p class="subtitle">
            ${escapeHtml(payload.subtitle ?? "Resident transaction confirmation generated from the billing ledger.")}
          </p>
        </div>
        <div style="text-align:right;">
          <span class="badge">${escapeHtml(payload.status)}</span>
        </div>
      </section>

      <section class="stats-grid">
        <div class="card">
          <p class="card-label">Receipt / Reference</p>
          <p class="card-value">${escapeHtml(payload.reference)}</p>
          <p class="card-hint">${escapeHtml(payload.typeLabel)}</p>
        </div>
        <div class="card">
          <p class="card-label">Amount</p>
          <p class="card-value">${escapeHtml(formatCurrency(payload.amount))}</p>
          <p class="card-hint">Posted ${escapeHtml(formatDate(payload.date))}</p>
        </div>
        <div class="card">
          <p class="card-label">Resident</p>
          <p class="card-value">${escapeHtml(payload.residentName)}</p>
          <p class="card-hint">${escapeHtml(payload.regId)}</p>
        </div>
        <div class="card">
          <p class="card-label">Balance After</p>
          <p class="card-value">${escapeHtml(formatCurrency(payload.balanceAfter))}</p>
          <p class="card-hint">${escapeHtml(payload.room)}</p>
        </div>
      </section>

      <section class="meta-grid">
        <div class="card">
          <p class="card-label">Location</p>
          <p class="card-value">${escapeHtml(payload.location)}</p>
          <p class="card-hint">${escapeHtml(payload.room)}</p>
        </div>
        <div class="card">
          <p class="card-label">Document Note</p>
          <p class="card-value">${escapeHtml(payload.note?.trim() || "Resident-facing receipt prepared from the ledger record.")}</p>
          <p class="card-hint">Choose Save as PDF in the print dialog if needed.</p>
        </div>
      </section>
    `,
  );
}
