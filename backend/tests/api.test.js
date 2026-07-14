const request = require('supertest');

// Mock the db module BEFORE requiring the app, so tests never need a real
// PostgreSQL connection. `pool.query` is replaced with a jest mock function
// whose behavior is customized per test case below.
jest.mock('../db', () => ({
  pool: { query: jest.fn() },
  initDb: jest.fn().mockResolvedValue(),
}));

const { pool } = require('../db');
const { app, validateLaptopPayload, CATEGORIES } = require('../index');

beforeEach(() => {
  pool.query.mockReset();
});

// ---------------------------------------------------------------------------
// 1) Health check
// ---------------------------------------------------------------------------
describe('GET /health', () => {
  test('returns 200 and status ok when the database is reachable', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.database).toBe('connected');
  });

  test('returns 503 when the database is unreachable', async () => {
    pool.query.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(app).get('/health');

    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// 2) Validation helper (pure function, no DB needed)
// ---------------------------------------------------------------------------
describe('validateLaptopPayload', () => {
  test('rejects a payload missing required fields', () => {
    const errors = validateLaptopPayload({ seller_name: 'สมชาย' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('category'))).toBe(true);
    expect(errors.some((e) => e.includes('brand'))).toBe(true);
    expect(errors.some((e) => e.includes('model'))).toBe(true);
    expect(errors.some((e) => e.includes('price'))).toBe(true);
  });

  test('rejects a category outside the allowed list', () => {
    const errors = validateLaptopPayload({
      seller_name: 'สมชาย', category: 'Ultrabook', brand: 'Dell', model: 'XPS 13', price: 15000,
    });
    expect(errors.some((e) => e.includes('category'))).toBe(true);
  });

  test('rejects a negative or non-numeric price', () => {
    const errors = validateLaptopPayload({
      seller_name: 'สมหญิง', category: 'Office', brand: 'Dell', model: 'XPS 13', price: -100,
    });
    expect(errors.some((e) => e.includes('price'))).toBe(true);

    const errors2 = validateLaptopPayload({
      seller_name: 'สมหญิง', category: 'Office', brand: 'Dell', model: 'XPS 13', price: 'ฟรี',
    });
    expect(errors2.some((e) => e.includes('price'))).toBe(true);
  });

  test('accepts a complete, valid payload', () => {
    const errors = validateLaptopPayload({
      seller_name: 'สมชาย ใจดี',
      category: 'Gaming',
      brand: 'Asus',
      model: 'ROG Strix',
      price: 25000,
    });
    expect(errors).toHaveLength(0);
  });

  test('with partial=true allows missing fields (used for PUT)', () => {
    const errors = validateLaptopPayload({ price: 12000 }, { partial: true });
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3) Create listing
// ---------------------------------------------------------------------------
describe('POST /api/laptops', () => {
  test('rejects creation when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/laptops')
      .send({ seller_name: 'สมชาย', brand: 'Dell' }); // missing category, model, price

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('creates a laptop successfully with valid data', async () => {
    const fakeLaptop = {
      id: 1,
      seller_name: 'สมชาย ใจดี',
      category: 'Gaming',
      brand: 'Asus',
      model: 'ROG Strix',
      price: '25000.00',
      status: 'available',
    };
    pool.query.mockResolvedValueOnce({ rows: [fakeLaptop] });

    const res = await request(app)
      .post('/api/laptops')
      .send({
        seller_name: 'สมชาย ใจดี',
        category: 'Gaming',
        brand: 'Asus',
        model: 'ROG Strix',
        price: 25000,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(fakeLaptop);
  });
});

// ---------------------------------------------------------------------------
// 4) Category filter — ต้องกรองแบบ exact match เท่านั้น (ไม่ให้ประเภทอื่นหลุดมาปน)
// ---------------------------------------------------------------------------
describe('GET /api/laptops (Category Filter)', () => {
  test('filters strictly by exact category match, not partial ILIKE', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/laptops').query({ category: 'Office' });

    expect(res.statusCode).toBe(200);
    const [sqlText, values] = pool.query.mock.calls[0];
    expect(sqlText).toMatch(/category = \$1/);
    expect(sqlText).not.toMatch(/category ILIKE/);
    expect(values).toEqual(['Office']);
  });

  test('combines category with price range filters correctly', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/laptops')
      .query({ category: 'Gaming', minPrice: 10000, maxPrice: 50000 });

    expect(res.statusCode).toBe(200);
    const [sqlText, values] = pool.query.mock.calls[0];
    expect(sqlText).toMatch(/category = \$1/);
    expect(sqlText).toMatch(/price >= \$2/);
    expect(sqlText).toMatch(/price <= \$3/);
    expect(values).toEqual(['Gaming', '10000', '50000']);
  });
});

// ---------------------------------------------------------------------------
// 5) Update / Delete
// ---------------------------------------------------------------------------
describe('PUT /api/laptops/:id', () => {
  test('returns 404 when updating a laptop that does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).put('/api/laptops/999').send({ price: 12000 });

    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /api/laptops/:id', () => {
  test('deletes a laptop successfully', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).delete('/api/laptops/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(1);
  });

  test('returns 404 when deleting a laptop that does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).delete('/api/laptops/999');

    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 6) Checkout / Confirm Order — ต้องเปลี่ยนสถานะเป็น "sold" (ขายแล้ว)
// ---------------------------------------------------------------------------
describe('POST /api/laptops/:id/order (Checkout / Confirm Order)', () => {
  test('rejects order confirmation when buyerName is missing', async () => {
    const res = await request(app).post('/api/laptops/1/order').send({});

    expect(res.statusCode).toBe(400);
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('returns 404 when the laptop does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/laptops/999/order').send({ buyerName: 'สมหญิง' });

    expect(res.statusCode).toBe(404);
  });

  test('returns 409 when the laptop is already sold', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'sold' }] });

    const res = await request(app).post('/api/laptops/1/order').send({ buyerName: 'สมหญิง' });

    expect(res.statusCode).toBe(409);
  });

  test('confirms the order and marks the laptop as sold', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'available' }] });
    const soldLaptop = { id: 1, status: 'sold', buyer_name: 'สมหญิง' };
    pool.query.mockResolvedValueOnce({ rows: [soldLaptop] });

    const res = await request(app).post('/api/laptops/1/order').send({ buyerName: 'สมหญิง' });

    expect(res.statusCode).toBe(200);
    expect(res.body.laptop.status).toBe('sold');
  });
});

// ---------------------------------------------------------------------------
// 7) Categories list exposed to the frontend
// ---------------------------------------------------------------------------
describe('GET /api/categories', () => {
  test('returns the fixed list of supported categories', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(CATEGORIES);
  });
});
