// index.js
// Express API สำหรับระบบซื้อขายโน้ตบุ๊คมือสอง
// ผู้ขาย (seller) กรอกสเปคเครื่องเข้าระบบ, ผู้ซื้อ (buyer) เรียกดู/ค้นหารายละเอียดเพิ่มเติมได้

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Health check ----------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', time: new Date().toISOString() });
});

// ---------- Helpers ----------
function validateLaptopPayload(body, { partial = false } = {}) {
  const required = ['seller_name', 'brand', 'model', 'price'];
  const errors = [];

  if (!partial) {
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  if (body.price !== undefined && body.price !== null && body.price !== '') {
    const priceNum = Number(body.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      errors.push('price must be a positive number');
    }
  }

  return errors;
}

// ---------- CRUD: Laptops ----------

// GET /api/laptops - รายการโน้ตบุ๊คทั้งหมด (รองรับ filter: brand, condition, min_price, max_price, q)
app.get('/api/laptops', async (req, res) => {
  try {
    const { brand, condition, min_price, max_price, q } = req.query;
    const clauses = [];
    const values = [];

    if (brand) {
      values.push(`%${brand}%`);
      clauses.push(`brand ILIKE $${values.length}`);
    }
    if (condition) {
      values.push(condition);
      clauses.push(`condition = $${values.length}`);
    }
    if (min_price) {
      values.push(Number(min_price));
      clauses.push(`price >= $${values.length}`);
    }
    if (max_price) {
      values.push(Number(max_price));
      clauses.push(`price <= $${values.length}`);
    }
    if (q) {
      values.push(`%${q}%`);
      clauses.push(`(brand ILIKE $${values.length} OR model ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM laptops ${where} ORDER BY created_at DESC`,
      values
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch laptops', detail: err.message });
  }
});

// GET /api/laptops/:id - รายละเอียดเครื่องเดียว (สำหรับผู้ซื้อดูสเปคเต็ม)
app.get('/api/laptops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query('SELECT * FROM laptops WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch laptop', detail: err.message });
  }
});

// POST /api/laptops - ผู้ขายลงประกาศเครื่องใหม่
app.post('/api/laptops', async (req, res) => {
  try {
    const errors = validateLaptopPayload(req.body);
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const {
      seller_name, brand, model, cpu, ram, storage, gpu,
      screen_size, condition, price, description, image_url, contact,
    } = req.body;

    const result = await pool.query(
      `INSERT INTO laptops
        (seller_name, brand, model, cpu, ram, storage, gpu, screen_size, condition, price, description, image_url, contact)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [seller_name, brand, model, cpu, ram, storage, gpu, screen_size, condition, price, description, image_url, contact]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create laptop', detail: err.message });
  }
});

// PUT /api/laptops/:id - ผู้ขายแก้ไขประกาศ
app.put('/api/laptops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });

    const errors = validateLaptopPayload(req.body, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const existing = await pool.query('SELECT * FROM laptops WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }

    const current = existing.rows[0];
    const merged = { ...current, ...req.body };

    const result = await pool.query(
      `UPDATE laptops SET
        seller_name=$1, brand=$2, model=$3, cpu=$4, ram=$5, storage=$6, gpu=$7,
        screen_size=$8, condition=$9, price=$10, description=$11, image_url=$12, contact=$13
       WHERE id=$14 RETURNING *`,
      [
        merged.seller_name, merged.brand, merged.model, merged.cpu, merged.ram,
        merged.storage, merged.gpu, merged.screen_size, merged.condition,
        merged.price, merged.description, merged.image_url, merged.contact, id,
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update laptop', detail: err.message });
  }
});

// DELETE /api/laptops/:id - ผู้ขายลบประกาศ (เช่น ขายแล้ว)
app.delete('/api/laptops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query('DELETE FROM laptops WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Laptop not found' });
    }
    res.json({ message: 'Deleted', laptop: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete laptop', detail: err.message });
  }
});

// ---------- Start server (only when run directly, not when imported by tests) ----------
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Backend API listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database', err);
      process.exit(1);
    });
}

module.exports = { app, validateLaptopPayload };
