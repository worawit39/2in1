const { Pool } = require('pg');

// Prefer a single DATABASE_URL if provided, otherwise fall back to
// individual PG* environment variables (both are supported so this
// works the same whether run via Docker Compose or locally).
const connectionConfig = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'marketplace_user',
      password: process.env.PGPASSWORD || 'marketplace_pass',
      database: process.env.PGDATABASE || 'marketplace_db'
    };

const pool = new Pool({
  host: process.env.DB_HOST || 'db',         // บังคับให้ถ้าไม่มีค่า ให้ชี้ไปที่ตู้ db แทน
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'change_this_password',
  database: process.env.DB_NAME || 'laptop_market',
});

pool.on('error', (err) => {
  // Prevents an idle client error from crashing the whole process
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * Creates all required tables if they do not already exist.
 * Safe to call on every backend startup.
 */
async function initDb() {
  const createSellersTable = `
    CREATE TABLE IF NOT EXISTS sellers (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(150) NOT NULL,
      id_card_number VARCHAR(20) NOT NULL UNIQUE,
      face_photo_url TEXT,
      kyc_verified BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const createListingsTable = `
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      brand VARCHAR(100) NOT NULL,
      cpu VARCHAR(150) NOT NULL,
      ram VARCHAR(50) NOT NULL,
      gpu VARCHAR(150) NOT NULL,
      battery_health INTEGER NOT NULL CHECK (battery_health >= 0 AND battery_health <= 100),
      defects TEXT DEFAULT '',
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      usage_type VARCHAR(50) NOT NULL,
      province VARCHAR(100) NOT NULL,
      boot_screen_photo_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  const createReviewsTable = `
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
      buyer_name VARCHAR(150) NOT NULL,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await pool.query(createSellersTable);
  await pool.query(createListingsTable);
  await pool.query(createReviewsTable);
}

module.exports = { pool, initDb };
