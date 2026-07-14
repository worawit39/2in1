require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// รายการประเภทโน้ตบุ๊กที่ระบบรองรับ (ใช้ตรวจสอบฝั่ง backend ให้ตรงกับตัวกรองฝั่ง frontend)
const CATEGORIES = ['Gaming', 'Office', 'Thin & Light'];

// ---------------------------------------------------------------------------
// Validation helper (export ไว้เพื่อให้ unit test เรียกใช้ได้โดยตรง โดยไม่ต้องพึ่ง DB)
// ---------------------------------------------------------------------------
function validateLaptopPayload(payload, { partial = false } = {}) {
  const errors = [];
  const { seller_name, category, brand, model, price } = payload;

  if (!partial || seller_name !== undefined) {
    if (!seller_name || !String(seller_name).trim()) errors.push('seller_name is required');
  }
  if (!partial || category !== undefined) {
    if (!category || !String(category).trim()) {
      errors.push('category is required');
    } else if (!CATEGORIES.includes(category)) {
      errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
    }
  }
  if (!partial || brand !== undefined) {
    if (!brand || !String(brand).trim()) errors.push('brand is required');
  }
  if (!partial || model !== undefined) {
    if (!model || !String(model).trim()) errors.push('model is required');
  }
  if (!partial || price !== undefined) {
    if (price === undefined || price === null || price === '') {
      errors.push('price is required');
    } else {
      const numPrice = Number(price);
      if (Number.isNaN(numPrice) || numPrice < 0) errors.push('price must be a non-negative number');
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({
      status: 'ok',
      service: 'backend',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'error',
      service: 'backend',
      database: 'disconnected',
      message: err.message,
    });
  }
});

app.get('/api/categories', (req, res) => {
  res.json(CATEGORIES);
});

// ---------------------------------------------------------------------------
// Laptops CRUD + Category Filter / Search
// ---------------------------------------------------------------------------

// GET /api/laptops?category=&brand=&q=&minPrice=&maxPrice=&status=
app.get('/api/laptops', async (req, res) => {
  try {
    const { category, brand, q, minPrice, maxPrice, status } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    // ใช้ "=" แบบ exact match เท่านั้น (ห้ามใช้ ILIKE %category%) เพื่อไม่ให้ประเภทอื่น
    // หลุดเข้ามาปนกัน เช่น กรอง "Office" ต้องไม่ดึง "Office Pro" หรือประเภทอื่นติดมาด้วย
    if (category) {
      conditions.push(`category = $${idx++}`);
      values.push(category);
    }
    if (brand) {
      conditions.push(`brand ILIKE $${idx++}`);
      values.push(`%${brand}%`);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (q) {
      conditions.push(`(brand ILIKE $${idx} OR model ILIKE $${idx} OR seller_name ILIKE $${idx})`);
      values.push(`%${q}%`);
      idx++;
    }
    if (minPrice) {
      conditions.push(`price >= $${idx++}`);
      values.push(minPrice);
    }
    if (maxPrice) {
      conditions.push(`price <= $${idx++}`);
      values.push(maxPrice);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM laptops ${whereClause} ORDER BY created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch laptops', detail: err.message });
  }
});

app.get('/api/laptops/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM laptops WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch laptop', detail: err.message });
  }
});

app.post('/api/laptops', async (req, res) => {
  try {
    const errors = validateLaptopPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', '), errors });
    }

    const {
      seller_name, category, brand, model, cpu, ram, storage, gpu,
      screen_size, condition_note, price, description, image_url,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO laptops
        (seller_name, category, brand, model, cpu, ram, storage, gpu,
         screen_size, condition_note, price, description, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        seller_name, category, brand, model, cpu || '', ram || '', storage || '', gpu || '',
        screen_size || '', condition_note || '', price, description || '', image_url || '',
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create laptop', detail: err.message });
  }
});

app.put('/api/laptops/:id', async (req, res) => {
  try {
    const errors = validateLaptopPayload(req.body, { partial: true });
    if (errors.length > 0) {
      return res.status(400).json({ error: errors.join(', '), errors });
    }

    const {
      seller_name, category, brand, model, cpu, ram, storage, gpu,
      screen_size, condition_note, price, description, image_url,
    } = req.body;

    const result = await pool.query(
      `UPDATE laptops SET
        seller_name = COALESCE($1, seller_name),
        category = COALESCE($2, category),
        brand = COALESCE($3, brand),
        model = COALESCE($4, model),
        cpu = COALESCE($5, cpu),
        ram = COALESCE($6, ram),
        storage = COALESCE($7, storage),
        gpu = COALESCE($8, gpu),
        screen_size = COALESCE($9, screen_size),
        condition_note = COALESCE($10, condition_note),
        price = COALESCE($11, price),
        description = COALESCE($12, description),
        image_url = COALESCE($13, image_url),
        updated_at = NOW()
       WHERE id = $14
       RETURNING *`,
      [
        seller_name, category, brand, model, cpu, ram, storage, gpu,
        screen_size, condition_note, price, description, image_url, req.params.id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update laptop', detail: err.message });
  }
});

app.delete('/api/laptops/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM laptops WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    res.json({ message: 'Laptop deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete laptop', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// Checkout: ยืนยันคำสั่งซื้อ -> เปลี่ยนสถานะสินค้าเป็น "sold" (ขายแล้ว)
// ---------------------------------------------------------------------------
app.post('/api/laptops/:id/order', async (req, res) => {
  try {
    const { buyerName } = req.body;
    if (!buyerName || !String(buyerName).trim()) {
      return res.status(400).json({ error: 'buyerName is required to confirm an order' });
    }

    const existing = await pool.query('SELECT * FROM laptops WHERE id = $1', [req.params.id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    if (existing.rows[0].status === 'sold') {
      return res.status(409).json({ error: 'This laptop has already been sold' });
    }

    const result = await pool.query(
      `UPDATE laptops SET status = 'sold', buyer_name = $1, ordered_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [buyerName, req.params.id]
    );

    res.status(200).json({ message: 'Order confirmed successfully', laptop: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to confirm order', detail: err.message });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// เริ่ม listen (และเชื่อมต่อ DB) เฉพาะตอนรันไฟล์นี้โดยตรงเท่านั้น
// เพื่อให้ require() จาก test ได้โดยไม่เปิดพอร์ตจริง
if (process.env.NODE_ENV !== 'test') {
  initDb()
    .then(() => {
      console.log('Database initialized successfully');
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err.message);
    });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = { app, validateLaptopPayload, CATEGORIES };
