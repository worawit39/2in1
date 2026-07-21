const request = require('supertest');

// Mock the db module BEFORE requiring the app, so tests never need a real
// PostgreSQL connection. `pool.query` is replaced with a jest mock function
// whose behavior is customized per test case below.
jest.mock('../db', () => ({
  pool: { query: jest.fn() },
  initDb: jest.fn().mockResolvedValue()
}));

const { pool } = require('../db');
const app = require('../index');

beforeEach(() => {
  pool.query.mockReset();
});

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

describe('POST /api/listings (ระบบลงขายสินค้า / ตรวจสภาพเครื่อง)', () => {
  test('rejects listing creation when boot screen photo (mandatory) is missing', async () => {
    const res = await request(app)
      .post('/api/listings')
      .send({
        sellerId: 1,
        brand: 'Apple',
        cpu: 'M1',
        ram: '16GB',
        gpu: 'Integrated',
        batteryHealth: 90,
        price: 15000,
        usageType: 'general',
        province: 'Bangkok'
        // bootScreenPhotoUrl intentionally omitted
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/bootScreenPhotoUrl/);
  });

  test('creates a listing successfully for a KYC-verified seller', async () => {
    // 1st query inside the route: check seller KYC status
    pool.query.mockResolvedValueOnce({ rows: [{ kyc_verified: true }] });
    // 2nd query: the INSERT ... RETURNING *
    const fakeListing = {
      id: 1,
      seller_id: 1,
      brand: 'Apple',
      cpu: 'M1',
      ram: '16GB',
      gpu: 'Integrated',
      battery_health: 90,
      defects: '',
      price: '15000.00',
      usage_type: 'general',
      province: 'Bangkok',
      boot_screen_photo_url: 'http://example.com/boot.png'
    };
    pool.query.mockResolvedValueOnce({ rows: [fakeListing] });

    const res = await request(app)
      .post('/api/listings')
      .send({
        sellerId: 1,
        brand: 'Apple',
        cpu: 'M1',
        ram: '16GB',
        gpu: 'Integrated',
        batteryHealth: 90,
        price: 15000,
        usageType: 'general',
        province: 'Bangkok',
        bootScreenPhotoUrl: 'http://example.com/boot.png'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body).toEqual(fakeListing);
  });
});

describe('GET /api/listings (ระบบค้นหาและตัวกรองละเอียด)', () => {
  test('applies price range, brand and province filters to the SQL query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/listings')
      .query({ minPrice: 5000, maxPrice: 20000, brand: 'Dell', province: 'Chiang Mai' });

    expect(res.statusCode).toBe(200);
    expect(pool.query).toHaveBeenCalledTimes(1);

    const [sqlText, values] = pool.query.mock.calls[0];
    expect(sqlText).toMatch(/price >= \$1/);
    expect(sqlText).toMatch(/price <= \$2/);
    expect(sqlText).toMatch(/brand ILIKE \$3/);
    expect(sqlText).toMatch(/province ILIKE \$4/);
    expect(values).toEqual(['5000', '20000', '%Dell%', '%Chiang Mai%']);
  });
});

describe('POST /api/reviews (ระบบให้คะแนนและรีวิว)', () => {
  test('rejects a rating outside the 1-5 range', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .send({ sellerId: 1, buyerName: 'Somchai', rating: 7 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/rating/);
  });
});
