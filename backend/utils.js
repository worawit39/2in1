// backend/utils.js

function validateLaptopPayload(payload, options = {}) {
  const errors = [];
  const isPartial = options.partial || false;

  // ตรวจสอบเงื่อนไขบังคับหากไม่ใช่ PUT (partial)
  if (!isPartial) {
    if (!payload.brand) errors.push('brand is required');
    if (!payload.model) errors.push('model is required');
    if (payload.price === undefined) errors.push('price is required');
  }

  // ตรวจสอบราคา (Price Validation)
  if (payload.price !== undefined) {
    if (typeof payload.price !== 'number' || payload.price < 0) {
      errors.push('price must be a positive number');
    }
  }

  return errors;
}

// Export เฉพาะฟังก์ชันนี้ออกไปตรงๆ
module.exports = { validateLaptopPayload };
