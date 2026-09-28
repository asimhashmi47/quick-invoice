const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('Customers API', () => {
  test('creates a customer', async () => {
    const res = await request(app).post('/api/customers').send({ name: 'Jane Doe', email: 'jane@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Jane Doe');
    expect(res.body.data.id).toBeDefined();
  });

  test('rejects a customer without a name', async () => {
    const res = await request(app).post('/api/customers').send({ email: 'no-name@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.errors.name).toBeDefined();
  });

  test('rejects an invalid email', async () => {
    const res = await request(app).post('/api/customers').send({ name: 'Bad Email', email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.errors.email).toBeDefined();
  });

  test('retrieves a customer by id', async () => {
    const created = await request(app).post('/api/customers').send({ name: 'Retrieve Me' });
    const res = await request(app).get(`/api/customers/${created.body.data.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Retrieve Me');
  });

  test('returns 404 for a missing customer', async () => {
    const res = await request(app).get('/api/customers/999999');
    expect(res.status).toBe(404);
  });

  test('updates a customer', async () => {
    const created = await request(app).post('/api/customers').send({ name: 'Old Name' });
    const res = await request(app).put(`/api/customers/${created.body.data.id}`).send({ name: 'New Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('New Name');
  });

  test('deletes a customer with no invoices', async () => {
    const created = await request(app).post('/api/customers').send({ name: 'Delete Me' });
    const res = await request(app).delete(`/api/customers/${created.body.data.id}`);
    expect(res.status).toBe(204);

    const getRes = await request(app).get(`/api/customers/${created.body.data.id}`);
    expect(getRes.status).toBe(404);
  });

  test('searches customers by name', async () => {
    await request(app).post('/api/customers').send({ name: 'Searchable Seller' });
    const res = await request(app).get('/api/customers?search=Searchable');
    expect(res.status).toBe(200);
    expect(res.body.data.some((c) => c.name === 'Searchable Seller')).toBe(true);
  });
});
