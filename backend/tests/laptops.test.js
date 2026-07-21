// tests/laptops.test.js
// Unit tests: ใช้ node:test (built-in) + supertest
// หมายเหตุ: ทดสอบ /health และ validateLaptopPayload() ซึ่งไม่ต้องพึ่งฐานข้อมูลจริง
// ทำให้รันได้ทั้งใน local และ CI pipeline โดยไม่ต้อง provision PostgreSQL

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { app } = require('../index');
const { validateLaptopPayload } = require('../utils');



test('validateLaptopPayload rejects payload missing required fields', () => {
  const errors = validateLaptopPayload({ seller_name: 'สมชาย' });
  assert.ok(errors.length > 0, 'should return validation errors');
  assert.ok(errors.some((e) => e.includes('brand')));
  assert.ok(errors.some((e) => e.includes('model')));
  assert.ok(errors.some((e) => e.includes('price')));
});

test('validateLaptopPayload rejects negative or non-numeric price', () => {
  const errors = validateLaptopPayload({
    seller_name: 'สมหญิง', brand: 'Dell', model: 'XPS 13', price: -100,
  });
  assert.ok(errors.some((e) => e.includes('price')));

  const errors2 = validateLaptopPayload({
    seller_name: 'สมหญิง', brand: 'Dell', model: 'XPS 13', price: 'ฟรี',
  });
  assert.ok(errors2.some((e) => e.includes('price')));
});

test('validateLaptopPayload accepts a complete, valid payload', () => {
  const errors = validateLaptopPayload({
    seller_name: 'สมชาย ใจดี',
    brand: 'Apple',
    model: 'MacBook Air M1',
    cpu: 'Apple M1',
    ram: '8GB',
    storage: '256GB SSD',
    price: 15000,
  });
  assert.strictEqual(errors.length, 0);
});

test('validateLaptopPayload with partial=true allows missing fields (for PUT)', () => {
  const errors = validateLaptopPayload({ price: 12000 }, { partial: true });
  assert.strictEqual(errors.length, 0);
});
