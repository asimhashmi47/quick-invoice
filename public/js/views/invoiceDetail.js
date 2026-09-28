views.invoiceDetail = async function invoiceDetail(id) {
  const content = document.getElementById('page-content');
  content.innerHTML = `<div class="card card-padded"><div class="skeleton skeleton-page"></div></div>`;

  try {
    const invoice = await api.get(`/invoices/${id}`);
    renderInvoiceDetail(invoice);
  } catch (err) {
    router.setTitle('Invoice not found');
    content.innerHTML =
      err.status === 404
        ? emptyStateHtml({
            icon: icons.invoice,
            title: 'Invoice not found',
            message: 'It may have been deleted.',
            actionHref: '#/invoices',
            actionLabel: 'Back to invoices',
          })
        : errorStateHtml('We couldn’t load this invoice.');
    bindRetry(content, () => views.invoiceDetail(id));
  }
};

function renderInvoiceDetail(invoice) {
  const content = document.getElementById('page-content');
  const isPaid = invoice.status === 'paid';
  router.setTitle(`Invoice ${invoice.invoice_number}`);

  const billToLines = [invoice.customer_phone, invoice.customer_email, invoice.customer_address]
    .filter(Boolean)
    .map((line) => `<div class="bill-to-line">${escapeHtml(line)}</div>`)
    .join('');

  content.innerHTML = `
    <div class="page-header no-print">
      <div class="detail-heading">
        <a class="back-link" href="#/invoices">${icons.back} Back to invoices</a>
        <span class="badge badge-${isPaid ? 'paid' : 'draft'}">${escapeHtml(invoice.status)}</span>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-secondary" id="toggle-status-btn">${isPaid ? 'Mark as draft' : 'Mark as paid'}</button>
        <button type="button" class="btn btn-secondary" id="print-btn">Print</button>
        <a class="btn btn-secondary" href="/api/invoices/${invoice.id}/pdf" download>Download PDF</a>
        <button type="button" class="btn-icon danger" id="delete-invoice-btn" aria-label="Delete invoice" title="Delete invoice">${icons.trash}</button>
      </div>
    </div>

    <article class="card invoice-doc" id="printable-invoice" aria-label="Invoice ${escapeHtml(invoice.invoice_number)}">
      <div class="invoice-doc-head">
        <div>
          <div class="invoice-brand">QuickInvoice</div>
          <div class="invoice-meta">
            Invoice <strong>#${escapeHtml(invoice.invoice_number)}</strong><br />
            Date: ${escapeHtml(formatDate(invoice.invoice_date))}
          </div>
        </div>
        <div class="bill-to">
          <div class="label-caps">Bill to</div>
          <div class="bill-to-name">${escapeHtml(invoice.customer_name)}</div>
          ${billToLines}
        </div>
      </div>

      <table class="stack-table doc-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Price</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${invoice.items
            .map(
              (item) => `
            <tr>
              <td class="doc-desc invoice-item-desc">${escapeHtml(item.description)}</td>
              <td class="doc-qty text-right num">${escapeHtml(formatQuantity(item.quantity))}</td>
              <td class="doc-price text-right num">${escapeHtml(formatCurrency(item.unit_price))}</td>
              <td class="doc-total text-right cell-primary num">${escapeHtml(formatCurrency(item.line_total))}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>

      <div class="totals-panel">
        <div class="totals-row">
          <span>Subtotal</span>
          <span>${escapeHtml(formatCurrency(invoice.subtotal))}</span>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <span>${escapeHtml(formatCurrency(invoice.total))}</span>
        </div>
      </div>

      <p class="invoice-thanks">Thank you for your business.</p>
    </article>
  `;

  document.getElementById('print-btn').addEventListener('click', () => window.print());
  document.getElementById('toggle-status-btn').addEventListener('click', () => toggleInvoiceStatus(invoice));
  document.getElementById('delete-invoice-btn').addEventListener('click', async () => {
    if (await confirmDeleteInvoice(invoice)) window.location.hash = '#/invoices';
  });
}

async function toggleInvoiceStatus(invoice) {
  const nextStatus = invoice.status === 'paid' ? 'draft' : 'paid';
  const button = document.getElementById('toggle-status-btn');
  button.disabled = true;
  try {
    const updated = await api.patch(`/invoices/${invoice.id}/status`, { status: nextStatus });
    toast.success(nextStatus === 'paid' ? 'Invoice marked as paid.' : 'Invoice marked as draft.');
    renderInvoiceDetail(updated);
    document.getElementById('toggle-status-btn').focus();
  } catch (err) {
    toast.error(err.message || 'Unable to update invoice status.');
    button.disabled = false;
  }
}

function formatQuantity(value) {
  return Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 });
}
