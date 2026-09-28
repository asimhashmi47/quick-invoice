views.dashboard = async function dashboard() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <p class="page-header-sub">Here's what has happened recently.</p>
    </div>
    <div class="kpi-grid" id="kpi-grid">
      ${'<div class="skeleton skeleton-kpi"></div>'.repeat(3)}
    </div>
    <section class="table-wrapper" aria-labelledby="recent-title">
      <div class="card-header">
        <h2 id="recent-title">Recent Invoices</h2>
        <a href="#/invoices">View all</a>
      </div>
      <div id="recent-invoices"><div class="skeleton skeleton-block"></div></div>
    </section>
  `;

  try {
    const summary = await api.get('/dashboard');
    renderKpis(summary);
    renderRecentInvoices(summary.recentInvoices);
  } catch (err) {
    content.innerHTML = errorStateHtml('We couldn’t load your dashboard.');
    bindRetry(content, views.dashboard);
  }
};

function renderKpis(summary) {
  const cards = [
    { label: 'Total Invoices', value: summary.totalInvoices, icon: icons.invoice },
    { label: 'Total Customers', value: summary.totalCustomers, icon: icons.customers },
    { label: 'Total Sales', value: formatCurrency(summary.totalSales), icon: icons.sales },
  ];

  document.getElementById('kpi-grid').innerHTML = cards
    .map(
      (card) => `
      <div class="kpi-card">
        <div class="kpi-icon">${card.icon}</div>
        <div class="kpi-text">
          <span class="kpi-label">${escapeHtml(card.label)}</span>
          <span class="kpi-value">${escapeHtml(String(card.value))}</span>
        </div>
      </div>
    `
    )
    .join('');
}

function renderRecentInvoices(invoices) {
  const container = document.getElementById('recent-invoices');

  if (invoices.length === 0) {
    container.innerHTML = emptyStateHtml({
      icon: icons.invoice,
      title: 'No invoices yet',
      message: 'Create your first invoice and it will show up here.',
      actionHref: '#/invoices/new',
      actionLabel: 'Create your first invoice',
    });
    return;
  }

  container.innerHTML = `
    <div class="table-scroll">
      <table class="stack-table invoice-table">
        <thead>
          <tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Status</th><th class="text-right">Total</th></tr>
        </thead>
        <tbody>
          ${invoices.map(invoiceRowHtml).join('')}
        </tbody>
      </table>
    </div>
  `;
  bindRowLinks(container);
}

function invoiceRowHtml(inv) {
  return `
    <tr class="row-link" data-href="#/invoices/${inv.id}">
      <td class="td-number"><a class="cell-link" href="#/invoices/${inv.id}">${escapeHtml(inv.invoice_number)}</a></td>
      <td class="td-customer cell-name">${escapeHtml(inv.customer_name)}</td>
      <td class="td-date cell-muted num">${escapeHtml(formatDateShort(inv.invoice_date))}</td>
      <td class="td-status"><span class="badge badge-${inv.status === 'paid' ? 'paid' : 'draft'}">${escapeHtml(inv.status)}</span></td>
      <td class="td-total-amount text-right cell-primary num">${escapeHtml(formatCurrency(inv.total))}</td>
    </tr>
  `;
}

function bindRowLinks(container) {
  container.querySelectorAll('tr.row-link').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      window.location.hash = row.dataset.href;
    });
  });
}
