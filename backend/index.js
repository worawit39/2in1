require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// แก้ไข 2 บรรทัดนี้เพื่อขยายให้รองรับไฟล์รูปภาพขนาดใหญ่ (50MB)
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));


// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

// ---------------------------------------------------------------------------
// KYC (simulated identity verification for sellers)
// ---------------------------------------------------------------------------
app.post('/api/kyc', async (req, res) => {
  try {
    const { fullName, idCardNumber, facePhotoUrl } = req.body;

    if (!fullName || !idCardNumber) {
      return res.status(400).json({ error: 'fullName and idCardNumber are required' });
    }
    if (!/^\d{13}$/.test(String(idCardNumber))) {
      return res.status(400).json({ error: 'idCardNumber must be exactly 13 digits (Thai national ID format)' });
    }
    if (!facePhotoUrl) {
      return res.status(400).json({ error: 'facePhotoUrl is required to complete KYC simulation' });
    }

    const result = await pool.query(
      `INSERT INTO sellers (full_name, id_card_number, face_photo_url, kyc_verified)
       VALUES ($1, $2, $3, TRUE)
       ON CONFLICT (id_card_number)
       DO UPDATE SET full_name = EXCLUDED.full_name, face_photo_url = EXCLUDED.face_photo_url
       RETURNING id, full_name, kyc_verified, created_at`,
      [fullName, String(idCardNumber), facePhotoUrl]
    );

    res.status(201).json({ message: 'KYC simulation completed successfully', seller: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process KYC', detail: err.message });
  }
});

app.get('/api/sellers/:id', async (req, res) => {
  try {
    const sellerResult = await pool.query(
      `SELECT s.id, s.full_name, s.kyc_verified, s.created_at,
              COALESCE(AVG(r.rating), 0)::NUMERIC(3,2) AS rating_avg,
              COUNT(r.id) AS rating_count
       FROM sellers s
       LEFT JOIN reviews r ON r.seller_id = s.id
       WHERE s.id = $1
       GROUP BY s.id`,
      [req.params.id]
    );

    if (sellerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }
    res.json(sellerResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch seller', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// Listings CRUD + Advanced Filter/Search
// ---------------------------------------------------------------------------
app.post('/api/listings', async (req, res) => {
  try {
    const {
      sellerId, brand, cpu, ram, gpu,
      batteryHealth, defects, price,
      usageType, province, bootScreenPhotoUrl
    } = req.body;

    const required = { sellerId, brand, cpu, ram, gpu, batteryHealth, price, usageType, province, bootScreenPhotoUrl };
    const missing = Object.entries(required).filter(([, v]) => v === undefined || v === null || v === '').map(([k]) => k);
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    const sellerCheck = await pool.query('SELECT kyc_verified FROM sellers WHERE id = $1', [sellerId]);
    if (sellerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found. Please complete KYC before listing an item.' });
    }
    if (!sellerCheck.rows[0].kyc_verified) {
      return res.status(403).json({ error: 'Seller has not completed KYC verification' });
    }

    const result = await pool.query(
      `INSERT INTO listings
        (seller_id, brand, cpu, ram, gpu, battery_health, defects, price, usage_type, province, boot_screen_photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [sellerId, brand, cpu, ram, gpu, batteryHealth, defects || '', price, usageType, province, bootScreenPhotoUrl]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create listing', detail: err.message });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const { minPrice, maxPrice, brand, usageType, province } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (minPrice) { conditions.push(`price >= $${idx++}`); values.push(minPrice); }
    if (maxPrice) { conditions.push(`price <= $${idx++}`); values.push(maxPrice); }
    if (brand) { conditions.push(`brand ILIKE $${idx++}`); values.push(`%${brand}%`); }
    if (usageType) { conditions.push(`usage_type = $${idx++}`); values.push(usageType); }
    if (province) { conditions.push(`province ILIKE $${idx++}`); values.push(`%${province}%`); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT l.*, s.full_name AS seller_name
       FROM listings l
       JOIN sellers s ON s.id = l.seller_id
       ${whereClause}
       ORDER BY l.created_at DESC`,
      values
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listings', detail: err.message });
  }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, s.full_name AS seller_name
       FROM listings l JOIN sellers s ON s.id = l.seller_id
       WHERE l.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch listing', detail: err.message });
  }
});

app.put('/api/listings/:id', async (req, res) => {
  try {
    const {
      brand, cpu, ram, gpu, batteryHealth,
      defects, price, usageType, province, bootScreenPhotoUrl
    } = req.body;

    const result = await pool.query(
      `UPDATE listings SET
        brand = COALESCE($1, brand),
        cpu = COALESCE($2, cpu),
        ram = COALESCE($3, ram),
        gpu = COALESCE($4, gpu),
        battery_health = COALESCE($5, battery_health),
        defects = COALESCE($6, defects),
        price = COALESCE($7, price),
        usage_type = COALESCE($8, usage_type),
        province = COALESCE($9, province),
        boot_screen_photo_url = COALESCE($10, boot_screen_photo_url)
       WHERE id = $11
       RETURNING *`,
      [brand, cpu, ram, gpu, batteryHealth, defects, price, usageType, province, bootScreenPhotoUrl, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update listing', detail: err.message });
  }
});

app.delete('/api/listings/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM listings WHERE id = $1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    res.json({ message: 'Listing deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete listing', detail: err.message });
  }
});

// ---------------------------------------------------------------------------
// Reviews & Ratings
// ---------------------------------------------------------------------------
app.post('/api/reviews', async (req, res) => {
  try {
    const { sellerId, buyerName, rating, comment } = req.body;

    if (!sellerId || !buyerName || rating === undefined) {
      return res.status(400).json({ error: 'sellerId, buyerName and rating are required' });
    }
    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    }

    const sellerCheck = await pool.query('SELECT id FROM sellers WHERE id = $1', [sellerId]);
    if (sellerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Seller not found' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (seller_id, buyer_name, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [sellerId, buyerName, numericRating, comment || '']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create review', detail: err.message });
  }
});

app.get('/api/sellers/:id/reviews', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE seller_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch reviews', detail: err.message });
  }
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Only start listening (and connect to DB) when this file is run directly,
// so it can be safely `require()`-d from tests without opening a real port.
if (require.main === module) {
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Marketplace backend listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = app;
