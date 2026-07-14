const { Pool } = require('pg');

// ค่าเชื่อมต่อฐานข้อมูลทั้งหมดอ่านจาก Environment Variables
// (ให้ตรงกับที่กำหนดใน docker-compose.yml / docker-compose.prod.yml / .env)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'change_this_password',
  database: process.env.DB_NAME || 'laptop_market',
});

pool.on('error', (err) => {
  // ป้องกันไม่ให้ error จาก idle client ทำให้ทั้งโปรเซสล่ม
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

/**
 * สร้างตารางที่จำเป็นทั้งหมด หากยังไม่มี
 * เรียกใช้ได้ทุกครั้งที่ backend เริ่มทำงาน (ปลอดภัย ไม่ทับข้อมูลเดิม)
 */
async function initDb() {
  const createLaptopsTable = `
    CREATE TABLE IF NOT EXISTS laptops (
      id SERIAL PRIMARY KEY,
      seller_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(150) NOT NULL,
      cpu VARCHAR(150) DEFAULT '',
      ram VARCHAR(50) DEFAULT '',
      storage VARCHAR(50) DEFAULT '',
      gpu VARCHAR(150) DEFAULT '',
      screen_size VARCHAR(50) DEFAULT '',
      condition_note VARCHAR(255) DEFAULT '',
      price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '',
      status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold')),
      buyer_name VARCHAR(150),
      ordered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;

  await pool.query(createLaptopsTable);
}

module.exports = { pool, initDb };
