// app.js
// Vanilla JS frontend logic สำหรับตลาดโน้ตบุ๊กมือสอง
// เรียก backend ผ่าน path สัมพัทธ์ /api และ /health (nginx จะ proxy ไปที่ backend service)

const API_BASE = '/api/laptops';
const CATEGORIES_URL = '/api/categories';

// ---------- แก้ไขข้อมูลผู้จัดทำตรงนี้ ----------
const AUTHOR_NAME = 'ชื่อ-นามสกุล (แก้ไขตรงนี้)';
const STUDENT_ID = 'รหัสนักศึกษา (แก้ไขตรงนี้)';
document.getElementById('student-tag-text').textContent = `${AUTHOR_NAME} / ${STUDENT_ID}`;
// ------------------------------------------------

let currentLaptops = [];
let editingId = null;
let currentDetailId = null;
let activeCategory = ''; // '' = ทั้งหมด

// ---------- Tab switching ----------
const tabBrowseBtn = document.getElementById('tab-browse-btn');
const tabSellBtn = document.getElementById('tab-sell-btn');
const tabBrowseSection = document.getElementById('tab-browse');
const tabSellSection = document.getElementById('tab-sell');

function showTab(name) {
  const isBrowse = name === 'browse';
  tabBrowseSection.classList.toggle('hidden', !isBrowse);
  tabSellSection.classList.toggle('hidden', isBrowse);
  tabBrowseBtn.classList.toggle('active', isBrowse);
  tabSellBtn.classList.toggle('active', !isBrowse);
}
tabBrowseBtn.addEventListener('click', () => showTab('browse'));
tabSellBtn.addEventListener('click', () => {
  if (!editingId) resetForm();
  showTab('sell');
});

// ---------- Helpers ----------
function formatPrice(p) {
  return Number(p).toLocaleString('th-TH', { minimumFractionDigits: 0 });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

function setStatus(msg, isError = false) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = isError ? 'error' : '';
}

// ---------- Health check ----------
async function checkHealth() {
  const el = document.getElementById('health-status');
  try {
    const res = await fetch('/health');
    if (res.ok) {
      el.textContent = 'online';
      el.className = 'badge ok';
    } else {
      throw new Error('not ok');
    }
  } catch {
    el.textContent = 'offline';
    el.className = 'badge error';
  }
}

// ---------- Category filter buttons ----------
async function loadCategories() {
  const container = document.getElementById('category-filter');
  const formSelect = document.getElementById('f-category');
  try {
    const res = await fetch(CATEGORIES_URL);
    const categories = await res.json();

    categories.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.type = 'button';
      btn.dataset.category = cat;
      btn.textContent = cat;
      btn.addEventListener('click', () => selectCategory(cat));
      container.appendChild(btn);

      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      formSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('โหลดประเภทสินค้าไม่สำเร็จ', err);
  }
}

function selectCategory(cat) {
  // กดเลือกประเภทใดประเภทหนึ่ง -> แสดงเฉพาะสินค้าประเภทนั้นเท่านั้น (exact match ฝั่ง backend)
  activeCategory = cat;
  document.querySelectorAll('.cat-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.category === cat);
  });
  fetchLaptops();
}

document.getElementById('category-filter').addEventListener('click', (e) => {
  if (e.target.classList.contains('cat-btn') && e.target.dataset.category === '') {
    selectCategory('');
  }
});

// ---------- Fetch & render laptop list ----------
async function fetchLaptops() {
  setStatus('กำลังโหลด...');
  document.getElementById('grid').innerHTML = '';

  const params = new URLSearchParams();
  const q = document.getElementById('f-search').value.trim();
  const minPrice = document.getElementById('f-min-price').value;
  const maxPrice = document.getElementById('f-max-price').value;

  if (activeCategory) params.set('category', activeCategory);
  if (q) params.set('q', q);
  if (minPrice) params.set('minPrice', minPrice);
  if (maxPrice) params.set('maxPrice', maxPrice);

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    currentLaptops = await res.json();
    renderGrid(currentLaptops);
    setStatus(currentLaptops.length === 0 ? 'ไม่พบสินค้าที่ตรงกับเงื่อนไข' : '');
  } catch (err) {
    setStatus(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', true);
  }
}

function renderGrid(laptops) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  laptops.forEach((lap) => {
    const isSold = lap.status === 'sold';
    const card = document.createElement('div');
    card.className = `card${isSold ? ' sold' : ''}`;
    card.innerHTML = `
      ${isSold ? '<span class="sold-badge">ขายแล้ว</span>' : ''}
      ${lap.image_url
        ? `<img src="${escapeHtml(lap.image_url)}" class="thumb" alt="" />`
        : `<div class="thumb placeholder">ไม่มีรูป</div>`}
      <span class="cat-chip">${escapeHtml(lap.category)}</span>
      <h3>${escapeHtml(lap.brand)} ${escapeHtml(lap.model)}</h3>
      <p class="price">฿${formatPrice(lap.price)}</p>
      <p class="meta">${escapeHtml(lap.ram || '-')} RAM · ${escapeHtml(lap.storage || '-')}</p>
      <p class="seller">ผู้ขาย: ${escapeHtml(lap.seller_name)}</p>
    `;
    card.addEventListener('click', () => openDetail(lap.id));
    grid.appendChild(card);
  });
}

// ---------- Filters ----------
document.getElementById('search-btn').addEventListener('click', fetchLaptops);
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('f-search').value = '';
  document.getElementById('f-min-price').value = '';
  document.getElementById('f-max-price').value = '';
  selectCategory('');
});
document.getElementById('f-search').addEventListener('keyup', (e) => {
  if (e.key === 'Enter') fetchLaptops();
});

// ---------- Detail modal ----------
const modalBackdrop = document.getElementById('modal-backdrop');

function openDetail(id) {
  const lap = currentLaptops.find((l) => l.id === id);
  if (!lap) return;
  currentDetailId = id;

  document.getElementById('modal-title').textContent = `${lap.brand} ${lap.model}`;
  document.getElementById('modal-category').textContent = lap.category;
  document.getElementById('modal-price').textContent = `฿${formatPrice(lap.price)}`;
  document.getElementById('modal-desc').textContent = lap.description || '';

  const statusEl = document.getElementById('modal-status');
  const isSold = lap.status === 'sold';
  statusEl.textContent = isSold ? `ขายแล้ว (ผู้ซื้อ: ${lap.buyer_name || '-'})` : 'พร้อมขาย';
  statusEl.className = `status-tag ${isSold ? 'sold' : 'available'}`;

  const img = document.getElementById('modal-img');
  if (lap.image_url) {
    img.src = lap.image_url;
    img.classList.remove('hidden');
  } else {
    img.classList.add('hidden');
  }

  const specBody = document.getElementById('modal-spec-body');
  const rows = [
    ['CPU', lap.cpu], ['RAM', lap.ram], ['พื้นที่จัดเก็บ', lap.storage], ['การ์ดจอ', lap.gpu],
    ['หน้าจอ', lap.screen_size], ['สภาพเครื่อง', lap.condition_note],
    ['ผู้ขาย', lap.seller_name],
  ];
  specBody.innerHTML = rows
    .map(([label, val]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(val || '-')}</td></tr>`)
    .join('');

  document.getElementById('modal-buy-btn').classList.toggle('hidden', isSold);
  modalBackdrop.classList.remove('hidden');
}

document.getElementById('modal-close-btn').addEventListener('click', () => {
  modalBackdrop.classList.add('hidden');
});
modalBackdrop.addEventListener('click', (e) => {
  if (e.target === modalBackdrop) modalBackdrop.classList.add('hidden');
});

document.getElementById('modal-edit-btn').addEventListener('click', () => {
  const lap = currentLaptops.find((l) => l.id === currentDetailId);
  if (!lap) return;
  startEdit(lap);
  modalBackdrop.classList.add('hidden');
});

document.getElementById('modal-delete-btn').addEventListener('click', async () => {
  if (!currentDetailId) return;
  if (!confirm('ยืนยันการลบสินค้านี้ออกจากระบบ?')) return;
  try {
    const res = await fetch(`${API_BASE}/${currentDetailId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('ลบไม่สำเร็จ');
    modalBackdrop.classList.add('hidden');
    fetchLaptops();
  } catch (err) {
    alert(err.message);
  }
});

// ---------- Checkout / Confirm Order modal ----------
const orderModalBackdrop = document.getElementById('order-modal-backdrop');
const orderForm = document.getElementById('order-form');
const orderFormMsg = document.getElementById('order-form-msg');

document.getElementById('modal-buy-btn').addEventListener('click', () => {
  const lap = currentLaptops.find((l) => l.id === currentDetailId);
  if (!lap) return;
  document.getElementById('order-modal-item-name').textContent = `${lap.brand} ${lap.model}`;
  document.getElementById('order-modal-item-price').textContent = `฿${formatPrice(lap.price)}`;
  orderForm.reset();
  orderFormMsg.textContent = '';
  orderFormMsg.className = '';
  modalBackdrop.classList.add('hidden');
  orderModalBackdrop.classList.remove('hidden');
});

document.getElementById('order-modal-close-btn').addEventListener('click', () => {
  orderModalBackdrop.classList.add('hidden');
});
document.getElementById('order-cancel-btn').addEventListener('click', () => {
  orderModalBackdrop.classList.add('hidden');
});
orderModalBackdrop.addEventListener('click', (e) => {
  if (e.target === orderModalBackdrop) orderModalBackdrop.classList.add('hidden');
});

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const buyerName = document.getElementById('order-buyer-name').value.trim();
  if (!currentDetailId || !buyerName) return;

  try {
    const res = await fetch(`${API_BASE}/${currentDetailId}/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ยืนยันคำสั่งซื้อไม่สำเร็จ');

    orderFormMsg.textContent = 'ยืนยันคำสั่งซื้อสำเร็จ! สินค้าถูกเปลี่ยนสถานะเป็น "ขายแล้ว"';
    orderFormMsg.className = 'success';
    fetchLaptops();
    setTimeout(() => {
      orderModalBackdrop.classList.add('hidden');
    }, 1200);
  } catch (err) {
    orderFormMsg.textContent = err.message;
    orderFormMsg.className = 'error';
  }
});

// ---------- Seller form (Create / Update) ----------
const form = document.getElementById('laptop-form');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const formMsg = document.getElementById('form-msg');

function readForm() {
  return {
    seller_name: document.getElementById('f-seller-name').value.trim(),
    category: document.getElementById('f-category').value,
    brand: document.getElementById('f-brand').value.trim(),
    model: document.getElementById('f-model').value.trim(),
    cpu: document.getElementById('f-cpu').value.trim(),
    ram: document.getElementById('f-ram').value.trim(),
    storage: document.getElementById('f-storage').value.trim(),
    gpu: document.getElementById('f-gpu').value.trim(),
    screen_size: document.getElementById('f-screen').value.trim(),
    condition_note: document.getElementById('f-condition').value.trim(),
    price: document.getElementById('f-price').value,
    image_url: document.getElementById('f-image').value.trim(),
    description: document.getElementById('f-desc').value.trim(),
  };
}

function fillForm(lap) {
  document.getElementById('f-seller-name').value = lap.seller_name || '';
  document.getElementById('f-category').value = lap.category || '';
  document.getElementById('f-brand').value = lap.brand || '';
  document.getElementById('f-model').value = lap.model || '';
  document.getElementById('f-cpu').value = lap.cpu || '';
  document.getElementById('f-ram').value = lap.ram || '';
  document.getElementById('f-storage').value = lap.storage || '';
  document.getElementById('f-gpu').value = lap.gpu || '';
  document.getElementById('f-screen').value = lap.screen_size || '';
  document.getElementById('f-condition').value = lap.condition_note || '';
  document.getElementById('f-price').value = lap.price || '';
  document.getElementById('f-image').value = lap.image_url || '';
  document.getElementById('f-desc').value = lap.description || '';
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = 'ลงขายโน้ตบุ๊กใหม่';
  submitBtn.textContent = 'ลงประกาศ';
  cancelEditBtn.classList.add('hidden');
  formMsg.textContent = '';
  formMsg.className = '';
}

function startEdit(lap) {
  fillForm(lap);
  editingId = lap.id;
  formTitle.textContent = 'แก้ไขข้อมูลสินค้า';
  submitBtn.textContent = 'บันทึกการแก้ไข';
  cancelEditBtn.classList.remove('hidden');
  showTab('sell');
}

cancelEditBtn.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formMsg.textContent = '';
  formMsg.className = '';

  const payload = readForm();
  const method = editingId ? 'PUT' : 'POST';
  const url = editingId ? `${API_BASE}/${editingId}` : API_BASE;

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'บันทึกไม่สำเร็จ');

    formMsg.textContent = editingId ? 'แก้ไขข้อมูลสินค้าสำเร็จ!' : 'ลงประกาศขายสำเร็จ!';
    formMsg.className = 'success';
    resetForm();
    showTab('browse');
    fetchLaptops();
  } catch (err) {
    formMsg.textContent = err.message;
    formMsg.className = 'error';
  }
});

// ---------- Init ----------
async function init() {
  await loadCategories();
  checkHealth();
  fetchLaptops();
  setInterval(checkHealth, 15000);
}
init();
