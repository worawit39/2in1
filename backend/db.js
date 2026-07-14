// db.js
// สร้าง PostgreSQL connection pool โดยอ่านค่าการตั้งค่าทั้งหมดจาก Environment Variables
// รองรับทั้งการรัน dev (docker-compose.yml) และ prod (docker-compose.prod.yml)

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'laptop_market',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

// สร้างตารางอัตโนมัติถ้ายังไม่มี (สะดวกสำหรับ dev / first run)
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS laptops (
      id SERIAL PRIMARY KEY,
      seller_name VARCHAR(255) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      cpu VARCHAR(255),
      ram VARCHAR(50),
      storage VARCHAR(50),
      gpu VARCHAR(100),
      screen_size VARCHAR(50),
      condition VARCHAR(50),
      price NUMERIC(10, 2) NOT NULL,
      description TEXT,
      image_url VARCHAR(500),
      contact VARCHAR(255),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);
}

module.exports = { pool, initDb };
