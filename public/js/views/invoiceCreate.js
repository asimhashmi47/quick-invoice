views.invoiceCreate = async function invoiceCreate() {
  const content = document.getElementById('page-content');
  content.innerHTML = `
    <div class="page-header">
      <a class="back-link" href="#/invoices">${icons.back} Back to invoices</a>
    </div>
    <div class="card card-padded" id="invoice-form-card">
      <div class="skeleton skeleton-page"></div>
    </div>
  `;

  try {
    const customers = await api.get('/customers');
    renderInvoiceForm(customers);
  } catch (err) {
    const card = document.getElementById('invoice-form-card');
    card.innerHTML = errorStateHtml('We couldn’t load your customers.');
    bindRetry(card, views.invoiceCreate);
  }
};

const MAX_QUANTITY = 1000000;
const MAX_UNIT_PRICE = 100000000;

function renderInvoiceForm(customers) {
  const card = document.getElementById('invoice-form-card');
  const hasCustomers = customers.length > 0;

  card.innerHTML = `
    <form id="invoice-form" novalidate>
      ${
        hasCustomers
          ? ''
          : '<p class="notice notice-warning">You need a customer before you can create an invoice. <a href="#/customers">Add a customer</a></p>'
      }
      <div class="form-row form-row-3">
        <div class="form-group">
          <label for="inv-customer" class="required">Customer</label>
          <select id="inv-customer" aria-describedby="err-customer" ${hasCustomers ? '' : 'disabled'}>
            <option value="">Select a customer</option>
            ${customers.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
          <div class="field-error" id="err-customer"></div>
        </div>
        <div class="form-group">
          <label for="inv-date" class="required">Invoice date</label>
          <input type="date" id="inv-date" aria-describedby="err-date" />
          <div class="field-error" id="err-date"></div>
        </div>
        <div class="form-group">
          <label for="inv-status">Status</label>
          <select id="inv-status">
            <option value="draft">Draft</option>
            <option value="paid">Paid</option>
          </select>
        </div>
      </div>

      <h2 class="section-title">Items</h2>
      <div class="table-wrapper">
        <table class="invoice-items-table">
          <thead>
            <tr>
              <th class="col-desc">Description</th>
              <th class="col-qty text-right">Qty</th>
              <th class="col-price text-right">Unit price</th>
              <th class="col-total text-right">Total</th>
              <th class="col-remove"><span class="visually-hidden">Remove</span></th>
            </tr>
          </thead>
          <tbody id="items-body"></tbody>
        </table>
      </div>
      <div class="field-error" id="err-items" role="alert"></div>
      <button type="button" class="btn btn-secondary add-item-btn" id="add-item-btn">+ Add item</button>

      <div class="totals-panel" aria-live="polite">
        <div class="totals-row">
          <span>Subtotal</span>
          <span id="subtotal-display">$0.00</span>
        </div>
        <div class="totals-row total">
          <span>Total</span>
          <span id="total-display">$0.00</span>
        </div>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary" id="save-invoice-btn" ${hasCustomers ? '' : 'disabled'}>Save invoice</button>
        <a class="btn btn-secondary" href="#/invoices">Cancel</a>
      </div>
    </form>
  `;

  document.getElementById('inv-date').value = todayIso();

  [
    ['inv-customer', 'err-customer'],
    ['inv-date', 'err-date'],
  ].forEach(([fieldId, errorId]) => {
    const field = document.getElementById(fieldId);
    field.addEventListener('change', () => {
      if (!field.value) return;
      setInputInvalid(field, '');
      document.getElementById(errorId).textContent = '';
    });
  });

  const itemsBody = document.getElementById('items-body');
  itemsBody.addEventListener('input', (e) => {
    const input = e.target.closest('input');
    if (input) validateItemInput(input);
    refreshItemErrorSummary();
    recalculateTotals();
  });
  itemsBody.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('[data-action="remove-item"]');
    if (!removeBtn || itemsBody.children.length <= 1) return;
    const row = removeBtn.closest('tr');
    const nextFocus = (row.nextElementSibling || row.previousElementSibling).querySelector('.item-description');
    row.remove();
    refreshItemRows();
    refreshItemErrorSummary();
    nextFocus.focus();
  });

  document.getElementById('add-item-btn').addEventListener('click', () => {
    const row = addItemRow();
    row.querySelector('.item-description').focus();
  });
  addItemRow();

  document.getElementById('invoice-form').addEventListener('submit', handleSubmitInvoice);
}

function addItemRow() {
  const itemsBody = document.getElementById('items-body');
  const row = document.createElement('tr');
  row.innerHTML = `
    <td class="td-desc"><input type="text" class="item-description" maxlength="200" placeholder="Product or service" aria-label="Description" /></td>
    <td class="td-qty"><span class="cell-label" aria-hidden="true">Qty</span><input type="number" class="item-quantity" min="0" step="any" inputmode="decimal" value="1" aria-label="Quantity" /></td>
    <td class="td-price"><span class="cell-label" aria-hidden="true">Unit price</span><input type="number" class="item-price" min="0" step="0.01" inputmode="decimal" placeholder="0.00" aria-label="Unit price" /></td>
    <td class="td-total item-line-total">$0.00</td>
    <td class="td-remove">
      <button type="button" class="btn-icon danger" data-action="remove-item" aria-label="Remove item" title="Remove item">${icons.close}</button>
    </td>
  `;
  itemsBody.appendChild(row);
  refreshItemRows();
  return row;
}

function refreshItemRows() {
  const rows = document.querySelectorAll('#items-body tr');
  rows.forEach((row, index) => {
    const n = index + 1;
    row.querySelector('.item-description').setAttribute('aria-label', `Item ${n} description`);
    row.querySelector('.item-quantity').setAttribute('aria-label', `Item ${n} quantity`);
    row.querySelector('.item-price').setAttribute('aria-label', `Item ${n} unit price`);
    const removeBtn = row.querySelector('[data-action="remove-item"]');
    removeBtn.setAttribute('aria-label', `Remove item ${n}`);
    removeBtn.disabled = rows.length === 1;
  });
  recalculateTotals();
}

function itemInputError(input) {
  const raw = input.value.trim();
  if (input.classList.contains('item-description')) {
    return raw ? '' : 'Description is required.';
  }
  const value = Number(raw);
  if (input.classList.contains('item-quantity')) {
    if (raw === '') return 'Quantity is required.';
    if (!Number.isFinite(value) || value <= 0) return 'Quantity must be greater than 0.';
    if (value > MAX_QUANTITY) return 'Quantity is too large.';
    return '';
  }
  if (raw === '') return 'Price is required.';
  if (!Number.isFinite(value) || value < 0) return 'Price must be 0 or more.';
  if (value > MAX_UNIT_PRICE) return 'Price is too large.';
  return '';
}

function setInputInvalid(input, message) {
  input.classList.toggle('invalid', Boolean(message));
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.title = message;
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('title');
  }
}

// While typing, only flag numbers that are clearly wrong; empty fields are flagged on submit.
function validateItemInput(input) {
  if (input.classList.contains('item-description')) {
    if (input.value.trim()) setInputInvalid(input, '');
    return;
  }
  setInputInvalid(input, input.value.trim() === '' ? '' : itemInputError(input));
}

function refreshItemErrorSummary() {
  const messages = [];
  document.querySelectorAll('#items-body tr').forEach((row, index) => {
    const rowMessages = Array.from(row.querySelectorAll('input.invalid')).map((input) => input.title);
    if (rowMessages.length) messages.push(`Item ${index + 1}: ${rowMessages.join(' ')}`);
  });
  document.getElementById('err-items').textContent = messages.join(' ');
}

function recalculateTotals() {
  let subtotal = 0;
  document.querySelectorAll('#items-body tr').forEach((row) => {
    const qty = Number(row.querySelector('.item-quantity').value);
    const price = Number(row.querySelector('.item-price').value);
    const valid = Number.isFinite(qty) && qty > 0 && Number.isFinite(price) && price >= 0;
    const lineTotal = valid ? Math.round(qty * price * 100) / 100 : 0;
    row.querySelector('.item-line-total').textContent = formatCurrency(lineTotal);
    subtotal += lineTotal;
  });

  document.getElementById('subtotal-display').textContent = formatCurrency(subtotal);
  document.getElementById('total-display').textContent = formatCurrency(subtotal);
}

function clearInvoiceErrors() {
  ['err-customer', 'err-date', 'err-items'].forEach((id) => (document.getElementById(id).textContent = ''));
  document.querySelectorAll('#invoice-form .invalid').forEach((el) => setInputInvalid(el, ''));
}

function validateInvoiceForm() {
  const errors = {};
  if (!document.getElementById('inv-customer').value) errors.customerId = 'Please select a customer.';
  if (!document.getElementById('inv-date').value) errors.invoiceDate = 'Please choose an invoice date.';

  const itemDetails = [];
  document.querySelectorAll('#items-body tr').forEach((row, index) => {
    const rowErrors = {};
    const fields = { description: '.item-description', quantity: '.item-quantity', unitPrice: '.item-price' };
    Object.entries(fields).forEach(([key, selector]) => {
      const message = itemInputError(row.querySelector(selector));
      if (message) rowErrors[key] = message;
    });
    if (Object.keys(rowErrors).length) itemDetails[index] = rowErrors;
  });
  if (itemDetails.length) errors.itemDetails = itemDetails;
  return errors;
}

async function handleSubmitInvoice(e) {
  e.preventDefault();
  clearInvoiceErrors();

  const clientErrors = validateInvoiceForm();
  if (Object.keys(clientErrors).length) {
    applyInvoiceFieldErrors(clientErrors);
    return;
  }

  const rows = Array.from(document.querySelectorAll('#items-body tr'));
  const payload = {
    customerId: Number(document.getElementById('inv-customer').value),
    invoiceDate: document.getElementById('inv-date').value,
    status: document.getElementById('inv-status').value,
    items: rows.map((row) => ({
      description: row.querySelector('.item-description').value,
      quantity: Number(row.querySelector('.item-quantity').value),
      unitPrice: Number(row.querySelector('.item-price').value),
    })),
  };

  const submitBtn = document.getElementById('save-invoice-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const invoice = await api.post('/invoices', payload);
    toast.success(`Invoice ${invoice.invoice_number} created.`);
    window.location.hash = `#/invoices/${invoice.id}`;
  } catch (err) {
    if (err.fieldErrors) {
      applyInvoiceFieldErrors(err.fieldErrors);
    } else {
      toast.error(err.message || 'Unable to create invoice.');
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save invoice';
  }
}

function applyInvoiceFieldErrors(fieldErrors) {
  const invalidInputs = [];

  if (fieldErrors.customerId) {
    document.getElementById('err-customer').textContent = fieldErrors.customerId;
    const select = document.getElementById('inv-customer');
    setInputInvalid(select, fieldErrors.customerId);
    invalidInputs.push(select);
  }
  if (fieldErrors.invoiceDate) {
    document.getElementById('err-date').textContent = fieldErrors.invoiceDate;
    const date = document.getElementById('inv-date');
    setInputInvalid(date, fieldErrors.invoiceDate);
    invalidInputs.push(date);
  }

  if (fieldErrors.itemDetails) {
    const rows = document.querySelectorAll('#items-body tr');
    const selectors = { description: '.item-description', quantity: '.item-quantity', unitPrice: '.item-price' };
    fieldErrors.itemDetails.forEach((itemError, index) => {
      if (!itemError || !rows[index]) return;
      Object.entries(itemError).forEach(([key, message]) => {
        const input = rows[index].querySelector(selectors[key]);
        if (!input) return;
        setInputInvalid(input, message);
        invalidInputs.push(input);
      });
    });
  }
  refreshItemErrorSummary();
  if (fieldErrors.items) {
    const summary = document.getElementById('err-items');
    summary.textContent = `${fieldErrors.items} ${summary.textContent}`.trim();
  }

  if (invalidInputs.length) invalidInputs[0].focus();
}
