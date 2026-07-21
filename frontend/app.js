// app.js
// Vanilla JS frontend logic สำหรับตลาดโน้ตบุ๊กมือสอง
// เรียก backend ผ่าน path สัมพัทธ์ /api และ /health (nginx จะ proxy ไปที่ backend service)

const API_BASE = '/api/laptops';

// ---------- แก้ไขข้อมูลผู้จัดทำตรงนี้ ----------
const AUTHOR_NAME = 'ชื่อ-นามสกุล (แก้ไขตรงนี้)';
const STUDENT_ID = 'รหัสนักศึกษา (แก้ไขตรงนี้)';
document.getElementById('student-tag-text').textContent = `${AUTHOR_NAME} / ${STUDENT_ID}`;
// ------------------------------------------------

let currentLaptops = [];
let editingId = null;

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
tabSellBtn.addEventListener('click', () => showTab('sell'));

// ---------- Helpers ----------
function formatPrice(p) {
  return Number(p).toLocaleString('th-TH', { minimumFractionDigits: 0 });
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
      el.className = 'ok';
    } else {
      throw new Error('not ok');
    }
  } catch {
    el.textContent = 'offline';
    el.className = 'error';
  }
}

// ---------- Fetch & render laptop list ----------
async function fetchLaptops() {
  setStatus('กำลังโหลด...');
  document.getElementById('grid').innerHTML = '';

  const params = new URLSearchParams();
  const q = document.getElementById('f-q').value.trim();
  const brand = document.getElementById('f-brand').value.trim();
  const condition = document.getElementById('f-condition').value;
  const minPrice = document.getElementById('f-min-price').value;
  const maxPrice = document.getElementById('f-max-price').value;

  if (q) params.set('q', q);
  if (brand) params.set('brand', brand);
  if (condition) params.set('condition', condition);
  if (minPrice) params.set('min_price', minPrice);
  if (maxPrice) params.set('max_price', maxPrice);

  try {
    const res = await fetch(`${API_BASE}?${params.toString()}`);
    if (!res.ok) throw new Error('โหลดข้อมูลไม่สำเร็จ');
    currentLaptops = await res.json();
    renderGrid(currentLaptops);
    setStatus(currentLaptops.length === 0 ? 'ไม่พบประกาศขายที่ตรงกับเงื่อนไข' : '');
  } catch (err) {
    setStatus(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล', true);
  }
}

function renderGrid(laptops) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  laptops.forEach((lap) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      ${lap.image_url
        ? `<img src="${escapeHtml(lap.image_url)}" class="thumb" alt="" />`
        : `<div class="thumb placeholder">ไม่มีรูป</div>`}
      <h3>${escapeHtml(lap.brand)} ${escapeHtml(lap.model)}</h3>
      <p class="price">฿${formatPrice(lap.price)}</p>
      <p class="meta">${escapeHtml(lap.condition || '-')} · ${escapeHtml(lap.ram || '-')} RAM · ${escapeHtml(lap.storage || '-')}</p>
      <p class="seller">ผู้ขาย: ${escapeHtml(lap.seller_name)}</p>
    `;
    card.addEventListener('click', () => openDetail(lap.id));
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str ?? '');
  return div.innerHTML;
}

// ---------- Detail modal ----------
const modalBackdrop = document.getElementById('modal-backdrop');
let currentDetailId = null;

function openDetail(id) {
  const lap = currentLaptops.find((l) => l.id === id);
  if (!lap) return;
  currentDetailId = id;

  document.getElementById('modal-title').textContent = `${lap.brand} ${lap.model}`;
  document.getElementById('modal-price').textContent = `฿${formatPrice(lap.price)}`;
  document.getElementById('modal-desc').textContent = lap.description || '';

  const img = document.getElementById('modal-img');
  if (lap.image_url) {
    img.src = lap.image_url;
    img.classList.remove('hidden');
  } else {
    img.classList.add('hidden');
  }

  const specBody = document.getElementById('modal-spec-body');
  const rows = [
    ['CPU', lap.cpu], ['RAM', lap.ram], ['Storage', lap.storage], ['GPU', lap.gpu],
    ['หน้าจอ', lap.screen_size], ['สภาพเครื่อง', lap.condition],
    ['ผู้ขาย', lap.seller_name], ['ติดต่อ', lap.contact],
  ];
  specBody.innerHTML = rows
    .map(([label, val]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(val || '-')}</td></tr>`)
    .join('');

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
  if (!confirm('ยืนยันการลบประกาศนี้?')) return;
  try {
    const res = await fetch(`${API_BASE}/${currentDetailId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('ลบไม่สำเร็จ');
    modalBackdrop.classList.add('hidden');
    fetchLaptops();
  } catch (err) {
    alert(err.message);
  }
});

// ---------- Filters ----------
document.getElementById('search-btn').addEventListener('click', fetchLaptops);
document.getElementById('reset-btn').addEventListener('click', () => {
  document.getElementById('f-q').value = '';
  document.getElementById('f-brand').value = '';
  document.getElementById('f-condition').value = '';
  document.getElementById('f-min-price').value = '';
  document.getElementById('f-max-price').value = '';
  fetchLaptops();
});
['f-q', 'f-brand'].forEach((id) => {
  document.getElementById(id).addEventListener('keyup', (e) => {
    if (e.key === 'Enter') fetchLaptops();
  });
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
    contact: document.getElementById('f-contact').value.trim(),
    brand: document.getElementById('f-brand-in').value.trim(),
    model: document.getElementById('f-model').value.trim(),
    cpu: document.getElementById('f-cpu').value.trim(),
    gpu: document.getElementById('f-gpu').value.trim(),
    ram: document.getElementById('f-ram').value.trim(),
    storage: document.getElementById('f-storage').value.trim(),
    screen_size: document.getElementById('f-screen').value.trim(),
    condition: document.getElementById('f-condition-in').value,
    price: document.getElementById('f-price').value,
    image_url: document.getElementById('f-image').value.trim(),
    description: document.getElementById('f-desc').value.trim(),
  };
}

function fillForm(lap) {
  document.getElementById('f-seller-name').value = lap.seller_name || '';
  document.getElementById('f-contact').value = lap.contact || '';
  document.getElementById('f-brand-in').value = lap.brand || '';
  document.getElementById('f-model').value = lap.model || '';
  document.getElementById('f-cpu').value = lap.cpu || '';
  document.getElementById('f-gpu').value = lap.gpu || '';
  document.getElementById('f-ram').value = lap.ram || '';
  document.getElementById('f-storage').value = lap.storage || '';
  document.getElementById('f-screen').value = lap.screen_size || '';
  document.getElementById('f-condition-in').value = lap.condition || '';
  document.getElementById('f-price').value = lap.price || '';
  document.getElementById('f-image').value = lap.image_url || '';
  document.getElementById('f-desc').value = lap.description || '';
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = 'ลงประกาศขายโน้ตบุ๊ก';
  submitBtn.textContent = 'ลงประกาศ';
  cancelEditBtn.classList.add('hidden');
  formMsg.textContent = '';
  formMsg.className = '';
}

function startEdit(lap) {
  fillForm(lap);
  editingId = lap.id;
  formTitle.textContent = 'แก้ไขประกาศ';
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

    formMsg.textContent = editingId ? 'แก้ไขประกาศสำเร็จ!' : 'ลงประกาศสำเร็จ!';
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
checkHealth();
fetchLaptops();
setInterval(checkHealth, 15000);
