const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Dashboard API', () => {
  test('returns summary counts and recent invoices', async () => {
    const customer = await request(app).post('/api/customers').send({ name: 'Dashboard Customer' });
    await request(app)
      .post('/api/invoices')
      .send({
        customerId: customer.body.data.id,
        invoiceDate: '2026-01-01',
        items: [{ description: 'Item', quantity: 1, unitPrice: 40 }],
      });

    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.data.totalInvoices).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalCustomers).toBeGreaterThanOrEqual(1);
    expect(res.body.data.totalSales).toBeGreaterThanOrEqual(40);
    expect(Array.isArray(res.body.data.recentInvoices)).toBe(true);
  });

  test('returns 404 for unknown api routes', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.status).toBe(404);
  });
});
