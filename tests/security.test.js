const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Security', () => {
  test('SQL injection attempt in customer name is stored safely as literal text', async () => {
    const maliciousName = "Robert'); DROP TABLE customers;--";
    const res = await request(app).post('/api/customers').send({ name: maliciousName });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(maliciousName);

    const listRes = await request(app).get('/api/customers');
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);
  });

  test('SQL injection attempt in search query does not break the query', async () => {
    const res = await request(app).get(`/api/customers?search=${encodeURIComponent("' OR '1'='1")}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('script tags in customer fields are stored as plain text, not executed server-side', async () => {
    const xssPayload = '<script>alert(1)</script>';
    const res = await request(app).post('/api/customers').send({ name: xssPayload });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(xssPayload);
  });

  test('oversized payloads are rejected', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'a'.repeat(500) });
    expect(res.status).toBe(400);
  });

  test('error responses do not leak stack traces', async () => {
    const res = await request(app).get('/api/customers/not-a-number');
    expect(res.body.stack).toBeUndefined();
  });

  test('security headers are present', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  test('malformed JSON body returns a 400, not a 500', async () => {
    const res = await request(app)
      .post('/api/customers')
      .set('Content-Type', 'application/json')
      .send('{not valid json');
    expect(res.status).toBe(400);
  });

  test('PDF filename is sanitized against header injection via invoice number', async () => {
    const customerRes = await request(app).post('/api/customers').send({ name: 'PDF Safety' });
    const invoiceRes = await request(app)
      .post('/api/invoices')
      .send({
        customerId: customerRes.body.data.id,
        invoiceDate: '2026-01-01',
        invoiceNumber: 'INV"; evil',
        items: [{ description: 'X', quantity: 1, unitPrice: 1 }],
      });
    const pdfRes = await request(app).get(`/api/invoices/${invoiceRes.body.data.id}/pdf`);
    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-disposition']).not.toMatch(/[\r\n]/);
  });
});
