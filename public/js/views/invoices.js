views.invoices = async function invoices() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <p class="page-header-sub">Every invoice you've created, newest first.</p>
      <div class="header-actions">
        <div class="search-box">
          ${icons.search}
          <input type="search" id="invoice-search" placeholder="Search invoices…" aria-label="Search invoices" />
        </div>
        <a class="btn btn-primary" href="#/invoices/new">+ New Invoice</a>
      </div>
    </div>
    <div class="table-wrapper" id="invoices-table-wrapper" aria-live="polite">
      <div class="skeleton skeleton-block"></div>
    </div>
  `;

  let debounceTimer;
  document.getElementById('invoice-search').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadInvoices(e.target.value.trim()), 250);
  });

  await loadInvoices('');
};

function currentInvoiceSearch() {
  const input = document.getElementById('invoice-search');
  return input ? input.value.trim() : '';
}

async function loadInvoices(search) {
  const wrapper = document.getElementById('invoices-table-wrapper');
  if (!wrapper) return;
  try {
    const invoices = await api.get(`/invoices${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    if (search !== currentInvoiceSearch()) return;
    renderInvoicesTable(wrapper, invoices, search);
  } catch (err) {
    wrapper.innerHTML = errorStateHtml('We couldn’t load your invoices.');
    bindRetry(wrapper, () => loadInvoices(currentInvoiceSearch()));
  }
}

function renderInvoicesTable(wrapper, invoices, search) {
  if (invoices.length === 0) {
    wrapper.innerHTML = search
      ? emptyStateHtml({
          icon: icons.search,
          title: 'No matching invoices',
          message: `Nothing matches “${search}”. Try an invoice number or customer name.`,
        })
      : emptyStateHtml({
          icon: icons.invoice,
          title: 'No invoices yet',
          message: 'Create your first invoice to start billing customers.',
          actionHref: '#/invoices/new',
          actionLabel: 'Create your first invoice',
        });
    return;
  }

  wrapper.innerHTML = `
    <div class="table-scroll">
      <table class="stack-table invoice-table">
        <thead>
          <tr>
            <th>Invoice</th><th>Customer</th><th>Date</th><th>Status</th><th class="text-right">Total</th>
            <th><span class="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          ${invoices
            .map(
              (inv) => `
            <tr class="row-link" data-id="${inv.id}" data-href="#/invoices/${inv.id}">
              <td class="td-number"><a class="cell-link" href="#/invoices/${inv.id}">${escapeHtml(inv.invoice_number)}</a></td>
              <td class="td-customer cell-name">${escapeHtml(inv.customer_name)}</td>
              <td class="td-date cell-muted num">${escapeHtml(formatDateShort(inv.invoice_date))}</td>
              <td class="td-status"><span class="badge badge-${inv.status === 'paid' ? 'paid' : 'draft'}">${escapeHtml(inv.status)}</span></td>
              <td class="td-total-amount text-right cell-primary num">${escapeHtml(formatCurrency(inv.total))}</td>
              <td class="td-actions">
                <div class="row-actions">
                  <button type="button" class="btn-icon danger" data-action="delete" aria-label="Delete invoice ${escapeHtml(inv.invoice_number)}" title="Delete">${icons.trash}</button>
                </div>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;

  bindRowLinks(wrapper);
  wrapper.querySelectorAll('tr[data-id]').forEach((row) => {
    const invoice = invoices.find((i) => i.id === Number(row.dataset.id));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteInvoiceRow(invoice));
  });
}

async function confirmDeleteInvoice(invoice) {
  const confirmed = await modal.confirm({
    title: 'Delete invoice?',
    message: `Invoice ${invoice.invoice_number} will be permanently removed. This can’t be undone.`,
    confirmLabel: 'Delete invoice',
    danger: true,
  });
  if (!confirmed) return false;

  try {
    await api.delete(`/invoices/${invoice.id}`);
    toast.success('Invoice deleted.');
    return true;
  } catch (err) {
    toast.error(err.message || 'Unable to delete invoice.');
    return false;
  }
}

async function deleteInvoiceRow(invoice) {
  if (await confirmDeleteInvoice(invoice)) loadInvoices(currentInvoiceSearch());
}
