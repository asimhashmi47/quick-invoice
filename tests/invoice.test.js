const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

async function createCustomer(name = 'Invoice Customer') {
  const res = await request(app).post('/api/customers').send({ name });
  return res.body.data;
}

describe('Invoices API', () => {
  test('creates an invoice with correct line, subtotal, and total calculations', async () => {
    const customer = await createCustomer();
    const res = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-01-15',
        items: [
          { description: 'Product A', quantity: 2, unitPrice: 50 },
          { description: 'Product B', quantity: 1, unitPrice: 25 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.items[0].line_total).toBe(100);
    expect(res.body.data.items[1].line_total).toBe(25);
    expect(res.body.data.subtotal).toBe(125);
    expect(res.body.data.total).toBe(125);
    expect(res.body.data.invoice_number).toMatch(/^INV-\d{5}/);
  });

  test('rejects an invoice with an invalid customer', async () => {
    const res = await request(app)
      .post('/api/invoices')
      .send({
        customerId: 999999,
        invoiceDate: '2026-01-15',
        items: [{ description: 'X', quantity: 1, unitPrice: 1 }],
      });
    expect(res.status).toBe(400);
  });

  test('rejects an invoice with no items', async () => {
    const customer = await createCustomer();
    const res = await request(app)
      .post('/api/invoices')
      .send({ customerId: customer.id, invoiceDate: '2026-01-15', items: [] });
    expect(res.status).toBe(400);
    expect(res.body.errors.items).toBeDefined();
  });

  test('rejects an invalid quantity', async () => {
    const customer = await createCustomer();
    const res = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-01-15',
        items: [{ description: 'Bad Qty', quantity: -1, unitPrice: 10 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.errors.itemDetails[0].quantity).toBeDefined();
  });

  test('rejects a negative price', async () => {
    const customer = await createCustomer();
    const res = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-01-15',
        items: [{ description: 'Bad Price', quantity: 1, unitPrice: -5 }],
      });
    expect(res.status).toBe(400);
    expect(res.body.errors.itemDetails[0].unitPrice).toBeDefined();
  });

  test('retrieves an invoice by id with items and customer details', async () => {
    const customer = await createCustomer('Detail Customer');
    const created = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-02-01',
        items: [{ description: 'Item', quantity: 3, unitPrice: 10 }],
      });

    const res = await request(app).get(`/api/invoices/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.customer_name).toBe('Detail Customer');
    expect(res.body.data.items).toHaveLength(1);
  });

  test('deletes an invoice', async () => {
    const customer = await createCustomer();
    const created = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-02-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 5 }],
      });

    const res = await request(app).delete(`/api/invoices/${created.body.data.id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/invoices/${created.body.data.id}`);
    expect(getRes.status).toBe(404);
  });

  test('generates a PDF for an invoice', async () => {
    const customer = await createCustomer();
    const created = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-02-01',
        items: [{ description: 'PDF Item', quantity: 1, unitPrice: 20 }],
      });

    const res = await request(app).get(`/api/invoices/${created.body.data.id}/pdf`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
  });

  test('a customer with invoices cannot be deleted', async () => {
    const customer = await createCustomer();
    await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-02-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 5 }],
      });

    const res = await request(app).delete(`/api/customers/${customer.id}`);
    expect(res.status).toBe(409);
  });
});

describe('Invoice status and numbering', () => {
  async function createInvoice(customerId, extra = {}) {
    const res = await request(app)
      .post('/api/invoices')
      .send({
        customerId,
        invoiceDate: '2026-03-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
        ...extra,
      });
    return res.body.data;
  }

  test('marks an invoice as paid and back to draft', async () => {
    const customer = await createCustomer();
    const invoice = await createInvoice(customer.id);
    expect(invoice.status).toBe('draft');

    const paid = await request(app).patch(`/api/invoices/${invoice.id}/status`).send({ status: 'paid' });
    expect(paid.status).toBe(200);
    expect(paid.body.data.status).toBe('paid');

    const draft = await request(app).patch(`/api/invoices/${invoice.id}/status`).send({ status: 'draft' });
    expect(draft.body.data.status).toBe('draft');
  });

  test('rejects an unknown status', async () => {
    const customer = await createCustomer();
    const invoice = await createInvoice(customer.id);
    const res = await request(app).patch(`/api/invoices/${invoice.id}/status`).send({ status: 'void' });
    expect(res.status).toBe(400);
  });

  test('returns 404 when updating the status of a missing invoice', async () => {
    const res = await request(app).patch('/api/invoices/999999/status').send({ status: 'paid' });
    expect(res.status).toBe(404);
  });

  test('creates an invoice with the paid status', async () => {
    const customer = await createCustomer();
    const invoice = await createInvoice(customer.id, { status: 'paid' });
    expect(invoice.status).toBe('paid');
  });

  test('generated invoice numbers stay unique after a deletion', async () => {
    const customer = await createCustomer();
    const first = await createInvoice(customer.id);
    const second = await createInvoice(customer.id);
    await request(app).delete(`/api/invoices/${first.id}`);
    const third = await createInvoice(customer.id);

    expect(third.invoice_number).toMatch(/^INV-\d{5}$/);
    expect(third.invoice_number).not.toBe(second.invoice_number);
    expect(third.invoice_number).not.toBe(first.invoice_number);
  });

  test('rejects a duplicate custom invoice number', async () => {
    const customer = await createCustomer();
    await createInvoice(customer.id, { invoiceNumber: 'CUSTOM-1' });
    const res = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.id,
        invoiceDate: '2026-03-01',
        invoiceNumber: 'CUSTOM-1',
        items: [{ description: 'Item', quantity: 1, unitPrice: 10 }],
      });
    expect(res.status).toBe(409);
  });

  test.each(['2026-02-30', '03/01/2026', 'not-a-date'])('rejects invalid invoice date %s', async (invoiceDate) => {
    const customer = await createCustomer();
    const res = await request(app)
      .post('/api/invoices')
      .send({ customerId: customer.id, invoiceDate, items: [{ description: 'Item', quantity: 1, unitPrice: 10 }] });
    expect(res.status).toBe(400);
    expect(res.body.errors.invoiceDate).toBeDefined();
  });
});
