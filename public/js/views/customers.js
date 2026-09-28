views.customers = async function customers() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <p class="page-header-sub">Manage the people and businesses you invoice.</p>
      <div class="header-actions">
        <div class="search-box">
          ${icons.search}
          <input type="search" id="customer-search" placeholder="Search customers…" aria-label="Search customers" />
        </div>
        <button type="button" class="btn btn-primary" id="add-customer-btn">+ Add Customer</button>
      </div>
    </div>
    <div class="table-wrapper" id="customers-table-wrapper" aria-live="polite">
      <div class="skeleton skeleton-block"></div>
    </div>
  `;

  document.getElementById('add-customer-btn').addEventListener('click', () => openCustomerForm());

  let debounceTimer;
  document.getElementById('customer-search').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => loadCustomers(e.target.value.trim()), 250);
  });

  await loadCustomers('');
};

function currentCustomerSearch() {
  const input = document.getElementById('customer-search');
  return input ? input.value.trim() : '';
}

async function loadCustomers(search) {
  const wrapper = document.getElementById('customers-table-wrapper');
  if (!wrapper) return;
  try {
    const customers = await api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    if (search !== currentCustomerSearch()) return;
    renderCustomersTable(wrapper, customers, search);
  } catch (err) {
    wrapper.innerHTML = errorStateHtml('We couldn’t load your customers.');
    bindRetry(wrapper, () => loadCustomers(currentCustomerSearch()));
  }
}

function renderCustomersTable(wrapper, customers, search) {
  if (customers.length === 0) {
    wrapper.innerHTML = search
      ? emptyStateHtml({
          icon: icons.search,
          title: 'No matching customers',
          message: `Nothing matches “${search}”. Try a different name, email, or phone.`,
        })
      : emptyStateHtml({
          icon: icons.customers,
          title: 'No customers yet',
          message: 'Add your first customer to start creating invoices.',
        });
    return;
  }

  wrapper.innerHTML = `
    <div class="table-scroll">
      <table class="stack-table customer-table">
        <thead>
          <tr><th>Customer</th><th>Phone</th><th>Email</th><th>Created</th><th><span class="visually-hidden">Actions</span></th></tr>
        </thead>
        <tbody>
          ${customers
            .map(
              (c) => `
            <tr data-id="${c.id}">
              <td class="td-name cell-primary cell-name">${escapeHtml(c.name)}</td>
              <td class="td-phone cell-muted num${c.phone ? '' : ' is-empty'}">${c.phone ? escapeHtml(c.phone) : '—'}</td>
              <td class="td-email cell-muted cell-wrap${c.email ? '' : ' is-empty'}">${c.email ? escapeHtml(c.email) : '—'}</td>
              <td class="td-created cell-muted num">${escapeHtml(formatDateShort(c.created_at))}</td>
              <td class="td-actions">
                <div class="row-actions">
                  <button type="button" class="btn-icon" data-action="edit" aria-label="Edit ${escapeHtml(c.name)}" title="Edit">${icons.edit}</button>
                  <button type="button" class="btn-icon danger" data-action="delete" aria-label="Delete ${escapeHtml(c.name)}" title="Delete">${icons.trash}</button>
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

  wrapper.querySelectorAll('tr[data-id]').forEach((row) => {
    const customer = customers.find((c) => c.id === Number(row.dataset.id));
    row.querySelector('[data-action="edit"]').addEventListener('click', () => openCustomerForm(customer));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteCustomer(customer));
  });
}

const CUSTOMER_FIELDS = ['name', 'phone', 'email', 'address'];

function openCustomerForm(customer = null) {
  const isEdit = Boolean(customer);
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="modal-header">
      <h3>${isEdit ? 'Edit customer' : 'Add customer'}</h3>
      <button type="button" class="btn-icon" data-action="close" aria-label="Close">${icons.close}</button>
    </div>
    <form id="customer-form" novalidate>
      <div class="modal-body">
        <div class="form-group">
          <label for="c-name" class="required">Name</label>
          <input type="text" id="c-name" maxlength="200" autocomplete="name" aria-describedby="err-name" required />
          <div class="field-error" id="err-name"></div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="c-phone">Phone</label>
            <input type="tel" id="c-phone" maxlength="30" autocomplete="tel" aria-describedby="err-phone" />
            <div class="field-error" id="err-phone"></div>
          </div>
          <div class="form-group">
            <label for="c-email">Email</label>
            <input type="email" id="c-email" maxlength="200" autocomplete="email" aria-describedby="err-email" />
            <div class="field-error" id="err-email"></div>
          </div>
        </div>
        <div class="form-group">
          <label for="c-address">Address</label>
          <textarea id="c-address" maxlength="500" rows="3" autocomplete="street-address" aria-describedby="err-address"></textarea>
          <div class="field-error" id="err-address"></div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close">Cancel</button>
        <button type="submit" class="btn btn-primary" id="submit-form">${isEdit ? 'Save changes' : 'Add customer'}</button>
      </div>
    </form>
  `;

  if (customer) {
    CUSTOMER_FIELDS.forEach((field) => {
      wrapper.querySelector(`#c-${field}`).value = customer[field] || '';
    });
  }

  wrapper.querySelectorAll('[data-action="close"]').forEach((btn) => btn.addEventListener('click', modal.close));

  wrapper.querySelector('#customer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearCustomerErrors(wrapper);

    const payload = {};
    CUSTOMER_FIELDS.forEach((field) => {
      payload[field] = wrapper.querySelector(`#c-${field}`).value;
    });

    if (!payload.name.trim()) {
      applyCustomerErrors(wrapper, { name: 'Name is required.' });
      return;
    }

    const submitBtn = wrapper.querySelector('#submit-form');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving…';

    try {
      if (isEdit) {
        await api.put(`/customers/${customer.id}`, payload);
        toast.success('Customer updated.');
      } else {
        await api.post('/customers', payload);
        toast.success('Customer added.');
      }
      modal.close();
      loadCustomers(currentCustomerSearch());
    } catch (err) {
      if (err.fieldErrors) {
        applyCustomerErrors(wrapper, err.fieldErrors);
      } else {
        toast.error(err.message || 'Unable to save customer.');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Save changes' : 'Add customer';
    }
  });

  modal.open(wrapper, { dismissOnBackdrop: false });
}

function clearCustomerErrors(wrapper) {
  CUSTOMER_FIELDS.forEach((field) => {
    wrapper.querySelector(`#err-${field}`).textContent = '';
    const input = wrapper.querySelector(`#c-${field}`);
    input.classList.remove('invalid');
    input.removeAttribute('aria-invalid');
  });
}

function applyCustomerErrors(wrapper, fieldErrors) {
  let firstInvalid = null;
  Object.entries(fieldErrors).forEach(([field, message]) => {
    const errEl = wrapper.querySelector(`#err-${field}`);
    const input = wrapper.querySelector(`#c-${field}`);
    if (!errEl || !input) return;
    errEl.textContent = message;
    input.classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    if (!firstInvalid) firstInvalid = input;
  });
  if (firstInvalid) firstInvalid.focus();
}

async function deleteCustomer(customer) {
  const confirmed = await modal.confirm({
    title: 'Delete customer?',
    message: `“${customer.name}” will be permanently removed. This can’t be undone.`,
    confirmLabel: 'Delete customer',
    danger: true,
  });
  if (!confirmed) return;

  try {
    await api.delete(`/customers/${customer.id}`);
    toast.success('Customer deleted.');
    loadCustomers(currentCustomerSearch());
  } catch (err) {
    const message =
      err.status === 409
        ? `“${customer.name}” has invoices, so they can’t be deleted. Delete their invoices first.`
        : err.message || 'Unable to delete customer.';
    toast.error(message);
  }
}
