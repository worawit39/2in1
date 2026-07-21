// tests/laptops.test.js
// Unit tests: ใช้ node:test (built-in) + supertest
// หมายเหตุ: ทดสอบ /health และ validateLaptopPayload() ซึ่งไม่ต้องพึ่งฐานข้อมูลจริง
// ทำให้รันได้ทั้งใน local และ CI pipeline โดยไม่ต้อง provision PostgreSQL


const request = require('supertest');
const { app } = require('../index');
const { validateLaptopPayload } = require('../utils');



test('validateLaptopPayload rejects payload missing required fields', () => {
  const errors = validateLaptopPayload({ seller_name: 'สมชาย' });
  expect(errors.length).toBeGreaterThan(0); // 🔄 เปลี่ยนจาก assert.ok
  expect(errors.some((e) => e.includes('brand'))).toBe(true);
  expect(errors.some((e) => e.includes('model'))).toBe(true);
  expect(errors.some((e) => e.includes('price'))).toBe(true);
});

test('validateLaptopPayload rejects negative or non-numeric price', () => {
  const errors = validateLaptopPayload({
    seller_name: 'สมหญิง', brand: 'Dell', model: 'XPS 13', price: -100,
  });
  expect(errors.some((e) => e.includes('price'))).toBe(true);

  const errors2 = validateLaptopPayload({
    seller_name: 'สมหญิง', brand: 'Dell', model: 'XPS 13', price: 'ฟรี',
  });
  expect(errors2.some((e) => e.includes('price'))).toBe(true);
});

test('validateLaptopPayload accepts a complete, valid payload', () => {
  const errors = validateLaptopPayload({
    seller_name: 'สมชาย ใจดี', brand: 'Apple', model: 'MacBook Air M1',
    cpu: 'Apple M1', ram: '8GB', storage: '256GB SSD', price: 15000,
  });
  expect(errors.length).toBe(0); // 🔄 เปลี่ยนจาก assert.strictEqual
});

test('validateLaptopPayload with partial=true allows missing fields (for PUT)', () => {
  const errors = validateLaptopPayload({ price: 12000 }, { partial: true });
  expect(errors.length).toBe(0);
});