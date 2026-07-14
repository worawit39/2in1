<template>
  <div class="app">
    <!-- ============ TOP BAR ============ -->
    <header class="topbar">
      <div class="topbar__brand">
        <span class="topbar__logo">&gt;_</span>
        <div>
          <div class="topbar__title">re/spec — โน๊ตบุ๊คมือสอง</div>
          <div class="topbar__meta">ชื่อ-สกุล: [กรอกชื่อ-นามสกุลของท่าน] &nbsp;•&nbsp; รหัสนักศึกษา: [กรอกรหัสของท่าน]</div>
        </div>
      </div>
      <nav class="topbar__nav">
        <button :class="['navbtn', tab === 'browse' && 'navbtn--active']" @click="tab = 'browse'">ค้นหาสินค้า</button>
        <button :class="['navbtn', tab === 'sell' && 'navbtn--active']" @click="tab = 'sell'">ลงขาย</button>
        <button :class="['navbtn', tab === 'kyc' && 'navbtn--active']" @click="tab = 'kyc'">ยืนยันตัวตน</button>
      </nav>
    </header>

    <div class="statusline">
      <span :class="['dot', apiOnline ? 'dot--ok' : 'dot--down']"></span>
      API: {{ apiBase }} — {{ apiOnline ? 'เชื่อมต่อสำเร็จ' : 'ไม่สามารถเชื่อมต่อได้' }}
      <span v-if="currentSeller" class="statusline__seller">
        | ผู้ขายปัจจุบัน: <strong>{{ currentSeller.full_name }}</strong> (ID #{{ currentSeller.id }})
        <span class="badge badge--verified">KYC ✓</span>
      </span>
    </div>

    <main class="main">
      <!-- ============ TAB: KYC ============ -->
      <section v-if="tab === 'kyc'" class="panel">
        <h2 class="panel__title">01 / ระบบยืนยันตัวตนผู้ขาย (KYC Simulation)</h2>
        <p class="panel__hint">
          ระบบจำลองการยืนยันตัวตน — ต้องกรอกเลขบัตรประชาชน (13 หลัก) และอัปโหลดรูปหน้าก่อนลงขายสินค้าได้
          <em>(ข้อมูลนี้เป็นการจำลองเพื่อการศึกษาเท่านั้น ไม่มีการตรวจสอบจริง)</em>
        </p>

        <form class="form" @submit.prevent="submitKyc">
          <div class="form__row">
            <label class="field">
              <span class="field__label">ชื่อ-นามสกุล *</span>
              <input class="field__input" v-model="kycForm.fullName" required placeholder="เช่น สมชาย ใจดี" />
            </label>
            <label class="field">
              <span class="field__label">เลขบัตรประชาชน (13 หลัก) *</span>
              <input class="field__input" v-model="kycForm.idCardNumber" required maxlength="13" placeholder="XXXXXXXXXXXXX" />
            </label>
          </div>

          <label class="field">
            <span class="field__label">รูปถ่ายหน้า (สำหรับยืนยันตัวตน) *</span>
            <input class="field__file" type="file" accept="image/*" @change="onFileChange($event, 'facePhotoUrl', kycForm)" required />
            <img v-if="kycForm.facePhotoUrl" :src="kycForm.facePhotoUrl" class="preview preview--round" alt="face preview" />
          </label>

          <button class="btn btn--primary" type="submit" :disabled="kycLoading">
            {{ kycLoading ? 'กำลังยืนยันตัวตน...' : 'ยืนยันตัวตน (KYC)' }}
          </button>
          <p v-if="kycMessage" :class="['formmsg', kycError ? 'formmsg--error' : 'formmsg--ok']">{{ kycMessage }}</p>
        </form>
      </section>

      <!-- ============ TAB: SELL ============ -->
      <section v-if="tab === 'sell'" class="panel">
        <h2 class="panel__title">02 / ลงขายโน๊ตบุ๊ค (Laptop Specification Form)</h2>

        <p v-if="!currentSeller" class="panel__warn">
          ⚠ กรุณายืนยันตัวตน (KYC) ก่อนลงขายสินค้า — ไปที่แท็บ "ยืนยันตัวตน"
        </p>

        <form v-else class="form" @submit.prevent="submitListing">
          <div class="form__row">
            <label class="field">
              <span class="field__label">แบรนด์ *</span>
              <input class="field__input" v-model="listingForm.brand" required placeholder="เช่น Apple, Asus, Lenovo" />
            </label>
            <label class="field">
              <span class="field__label">ราคา (บาท) *</span>
              <input class="field__input" type="number" min="0" v-model.number="listingForm.price" required placeholder="15000" />
            </label>
          </div>

          <div class="form__row">
            <label class="field">
              <span class="field__label">CPU *</span>
              <input class="field__input" v-model="listingForm.cpu" required placeholder="เช่น Intel Core i5-1135G7" />
            </label>
            <label class="field">
              <span class="field__label">RAM *</span>
              <input class="field__input" v-model="listingForm.ram" required placeholder="เช่น 16GB DDR4" />
            </label>
            <label class="field">
              <span class="field__label">การ์ดจอ *</span>
              <input class="field__input" v-model="listingForm.gpu" required placeholder="เช่น NVIDIA RTX 3050" />
            </label>
          </div>

          <div class="form__row">
            <label class="field">
              <span class="field__label">สุขภาพแบตเตอรี่: {{ listingForm.batteryHealth }}%</span>
              <input class="field__range" type="range" min="0" max="100" v-model.number="listingForm.batteryHealth" />
            </label>
            <label class="field">
              <span class="field__label">ประเภทการใช้งาน *</span>
              <select class="field__input" v-model="listingForm.usageType" required>
                <option value="" disabled>เลือกประเภท</option>
                <option value="gaming">เล่นเกม</option>
                <option value="office">ทำงานทั่วไป</option>
                <option value="design">งานกราฟิก/ตัดต่อ</option>
                <option value="programming">เขียนโปรแกรม</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">จังหวัด (สำหรับนัดรับสินค้า) *</span>
              <input class="field__input" v-model="listingForm.province" required placeholder="เช่น กรุงเทพมหานคร" />
            </label>
          </div>

          <label class="field">
            <span class="field__label">ตำหนิของเครื่อง</span>
            <textarea class="field__input field__textarea" v-model="listingForm.defects" placeholder="เช่น มีรอยขีดข่วนที่ฝาหลัง, คีย์บอร์ดปุ่ม Enter สึก"></textarea>
          </label>

          <label class="field">
            <span class="field__label">📸 รูปถ่ายหน้าจอตอนเปิดใช้งาน (บังคับ — สำหรับเช็กสภาพเครื่อง) *</span>
            <input class="field__file" type="file" accept="image/*" required @change="onFileChange($event, 'bootScreenPhotoUrl', listingForm)" />
            <div v-if="listingForm.bootScreenPhotoUrl" class="terminal-frame">
              <div class="terminal-frame__bar">
                <span class="dotbtn dotbtn--red"></span><span class="dotbtn dotbtn--yellow"></span><span class="dotbtn dotbtn--green"></span>
                <span class="terminal-frame__label">boot-screen.png</span>
              </div>
              <img :src="listingForm.bootScreenPhotoUrl" class="terminal-frame__img" alt="boot screen preview" />
            </div>
          </label>

          <button class="btn btn--primary" type="submit" :disabled="sellLoading">
            {{ sellLoading ? 'กำลังลงขาย...' : 'ลงขายสินค้า' }}
          </button>
          <p v-if="sellMessage" :class="['formmsg', sellError ? 'formmsg--error' : 'formmsg--ok']">{{ sellMessage }}</p>
        </form>
      </section>

      <!-- ============ TAB: BROWSE ============ -->
      <section v-if="tab === 'browse'" class="panel">
        <h2 class="panel__title">03 / ค้นหาและตัวกรองละเอียด</h2>

        <div class="filters">
          <label class="field field--tight">
            <span class="field__label">ราคาต่ำสุด</span>
            <input class="field__input" type="number" min="0" v-model="filters.minPrice" placeholder="0" />
          </label>
          <label class="field field--tight">
            <span class="field__label">ราคาสูงสุด</span>
            <input class="field__input" type="number" min="0" v-model="filters.maxPrice" placeholder="100000" />
          </label>
          <label class="field field--tight">
            <span class="field__label">แบรนด์</span>
            <input class="field__input" v-model="filters.brand" placeholder="เช่น Apple" />
          </label>
          <label class="field field--tight">
            <span class="field__label">ประเภทการใช้งาน</span>
            <select class="field__input" v-model="filters.usageType">
              <option value="">ทั้งหมด</option>
              <option value="gaming">เล่นเกม</option>
              <option value="office">ทำงานทั่วไป</option>
              <option value="design">งานกราฟิก/ตัดต่อ</option>
              <option value="programming">เขียนโปรแกรม</option>
            </select>
          </label>
          <label class="field field--tight">
            <span class="field__label">จังหวัด</span>
            <input class="field__input" v-model="filters.province" placeholder="เช่น เชียงใหม่" />
          </label>
          <button class="btn btn--outline" @click="fetchListings">🔍 ค้นหา</button>
        </div>

        <div v-if="listingsLoading" class="empty">กำลังโหลดรายการสินค้า...</div>
        <div v-else-if="listings.length === 0" class="empty">ไม่พบสินค้าตามเงื่อนไขที่เลือก</div>

        <div v-else class="grid">
          <article v-for="item in listings" :key="item.id" class="card">
            <div class="card__spechead">
              <span class="card__brand">{{ item.brand }}</span>
              <span class="card__price">฿{{ Number(item.price).toLocaleString() }}</span>
            </div>
            <div class="terminal-frame terminal-frame--sm">
              <div class="terminal-frame__bar">
                <span class="dotbtn dotbtn--red"></span><span class="dotbtn dotbtn--yellow"></span><span class="dotbtn dotbtn--green"></span>
              </div>
              <img :src="item.boot_screen_photo_url" class="terminal-frame__img" alt="boot screen" />
            </div>
            <dl class="spectable">
              <div><dt>CPU</dt><dd>{{ item.cpu }}</dd></div>
              <div><dt>RAM</dt><dd>{{ item.ram }}</dd></div>
              <div><dt>GPU</dt><dd>{{ item.gpu }}</dd></div>
              <div><dt>ใช้งาน</dt><dd>{{ usageLabel(item.usage_type) }}</dd></div>
              <div><dt>จังหวัด</dt><dd>{{ item.province }}</dd></div>
            </dl>
            <div class="battery">
              <span class="battery__label">แบต {{ item.battery_health }}%</span>
              <div class="battery__gauge"><div class="battery__fill" :style="{ width: item.battery_health + '%' }" :class="batteryClass(item.battery_health)"></div></div>
            </div>
            <p v-if="item.defects" class="card__defects">ตำหนิ: {{ item.defects }}</p>
            
            <!-- ============ 3 ปุ่มหลักที่เพิ่มเข้ามา ============ -->
            <div class="card__actions">
              <button class="btn btn--success btn--sm flex-1" @click="openBuy(item)">🛒 สั่งซื้อ</button>
              <button class="btn btn--warning btn--sm" @click="openEdit(item)">✏️ แก้ไข</button>
              <button class="btn btn--danger btn--sm" @click="openDelete(item)">🗑️ ลบ</button>
            </div>

            <div class="card__footer">
              <span class="card__seller">ผู้ขาย: {{ item.seller_name }}</span>
              <button class="btn btn--ghost btn--sm" @click="openReview(item)">⭐ ให้คะแนนผู้ขาย</button>
            </div>
          </article>
        </div>
      </section>
    </main>

    <!-- ============ UI MODAL: ปุ่มสั่งซื้อ ============ -->
    <div v-if="buyTarget" class="modal-backdrop" @click.self="buyTarget = null">
      <div class="modal">
        <h3 class="panel__title">🛒 ยืนยันการสั่งซื้อสินค้า</h3>
        <p class="modal__desc">
          คุณกำลังทำรายการสั่งซื้อเครื่อง <strong>{{ buyTarget.brand }}</strong> <br>
          ราคา: <strong class="text-accent">฿{{ Number(buyTarget.price).toLocaleString() }}</strong>
        </p>
        <form class="form" @submit.prevent="submitBuy">
          <label class="field">
            <span class="field__label">ชื่อ-นามสกุล ผู้ซื้อ *</span>
            <input class="field__input" v-model="buyForm.buyerName" required placeholder="เช่น สมเกียรติ รักเรียน" />
          </label>
          <label class="field">
            <span class="field__label">เบอร์โทรศัพท์ติดต่อ *</span>
            <input class="field__input" v-model="buyForm.phone" required placeholder="เช่น 089xxxxxxx" />
          </label>
          <label class="field">
            <span class="field__label">วิธีการรับสินค้า *</span>
            <select class="field__input" v-model="buyForm.deliveryMethod" required>
              <option value="pickup">นัดรับสินค้า ณ จังหวัด {{ buyTarget.province }}</option>
              <option value="shipping">จัดส่งพัสดุด่วนทั่วประเทศ</option>
            </select>
          </label>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" @click="buyTarget = null">ยกเลิก</button>
            <button type="submit" class="btn btn--success" :disabled="buyLoading">
              {{ buyLoading ? 'กำลังประมวลผล...' : 'ยืนยันการซื้อ' }}
            </button>
          </div>
          <p v-if="buyMessage" :class="['formmsg', buyError ? 'formmsg--error' : 'formmsg--ok']">{{ buyMessage }}</p>
        </form>
      </div>
    </div>

    <!-- ============ UI MODAL: ปุ่มแก้ไข ============ -->
    <div v-if="editTarget" class="modal-backdrop" @click.self="editTarget = null">
      <div class="modal modal--large">
        <h3 class="panel__title">✏️ แก้ไขข้อมูลสินค้า</h3>
        <p class="modal__desc">อัปเดตสเปคเครื่องหรือราคาขายของ {{ editTarget.brand }}</p>
        <form class="form" @submit.prevent="submitEdit">
          <div class="form__row">
            <label class="field">
              <span class="field__label">แบรนด์ *</span>
              <input class="field__input" v-model="editForm.brand" required />
            </label>
            <label class="field">
              <span class="field__label">ราคา (บาท) *</span>
              <input class="field__input" type="number" min="0" v-model.number="editForm.price" required />
            </label>
          </div>

          <div class="form__row">
            <label class="field">
              <span class="field__label">CPU *</span>
              <input class="field__input" v-model="editForm.cpu" required />
            </label>
            <label class="field">
              <span class="field__label">RAM *</span>
              <input class="field__input" v-model="editForm.ram" required />
            </label>
            <label class="field">
              <span class="field__label">การ์ดจอ *</span>
              <input class="field__input" v-model="editForm.gpu" required />
            </label>
          </div>

          <div class="form__row">
            <label class="field">
              <span class="field__label">สุขภาพแบตเตอรี่: {{ editForm.batteryHealth }}%</span>
              <input class="field__range" type="range" min="0" max="100" v-model.number="editForm.batteryHealth" />
            </label>
            <label class="field">
              <span class="field__label">ประเภทการใช้งาน *</span>
              <select class="field__input" v-model="editForm.usageType" required>
                <option value="gaming">เล่นเกม</option>
                <option value="office">ทำงานทั่วไป</option>
                <option value="design">งานกราฟิก/ตัดต่อ</option>
                <option value="programming">เขียนโปรแกรม</option>
              </select>
            </label>
            <label class="field">
              <span class="field__label">จังหวัด (สำหรับนัดรับสินค้า) *</span>
              <input class="field__input" v-model="editForm.province" required />
            </label>
          </div>

          <label class="field">
            <span class="field__label">ตำหนิของเครื่อง</span>
            <textarea class="field__input field__textarea" v-model="editForm.defects"></textarea>
          </label>

          <label class="field">
            <span class="field__label">📸 รูปถ่ายหน้าจอตอนเปิดใช้งาน (ถ้าต้องการแก้ไข)</span>
            <input class="field__file" type="file" accept="image/*" @change="onFileChange($event, 'bootScreenPhotoUrl', editForm)" />
            <div v-if="editForm.bootScreenPhotoUrl" class="terminal-frame">
              <div class="terminal-frame__bar">
                <span class="dotbtn dotbtn--red"></span><span class="dotbtn dotbtn--yellow"></span><span class="dotbtn dotbtn--green"></span>
                <span class="terminal-frame__label">boot-screen.png</span>
              </div>
              <img :src="editForm.bootScreenPhotoUrl" class="terminal-frame__img" alt="boot screen preview" />
            </div>
          </label>

          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" @click="editTarget = null">ยกเลิก</button>
            <button type="submit" class="btn btn--warning" :disabled="editLoading">
              {{ editLoading ? 'กำลังบันทึก...' : 'บันทึกความเปลี่ยนแปลง' }}
            </button>
          </div>
          <p v-if="editMessage" :class="['formmsg', editError ? 'formmsg--error' : 'formmsg--ok']">{{ editMessage }}</p>
        </form>
      </div>
    </div>

    <!-- ============ UI MODAL: ปุ่มลบ ============ -->
    <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
      <div class="modal">
        <h3 class="panel__title" style="color: var(--danger);">🗑️ ยืนยันการลบรายการสินค้า</h3>
        <p class="modal__desc" style="margin-top: 15px; font-size: 14px;">
          คุณแน่ใจหรือไม่ที่จะลบเครื่อง <strong>{{ deleteTarget.brand }}</strong> ราคา <strong>฿{{ Number(deleteTarget.price).toLocaleString() }}</strong> ?<br>
          <span style="color: var(--danger); font-size: 12px; display: block; margin-top: 8px;">*การทำรายการนี้ไม่สามารถกู้คืนข้อมูลได้</span>
        </p>
        <div class="modal__actions" style="margin-top: 20px;">
          <button type="button" class="btn btn--ghost" @click="deleteTarget = null">ยกเลิก</button>
          <button type="button" class="btn btn--danger" @click="submitDelete" :disabled="deleteLoading">
            {{ deleteLoading ? 'กำลังลบ...' : 'ยืนยันลบข้อมูล' }}
          </button>
        </div>
        <p v-if="deleteMessage" :class="['formmsg', deleteError ? 'formmsg--error' : 'formmsg--ok']" style="margin-top: 15px;">{{ deleteMessage }}</p>
      </div>
    </div>

    <!-- ============ REVIEW MODAL ============ -->
    <div v-if="reviewTarget" class="modal-backdrop" @click.self="reviewTarget = null">
      <div class="modal">
        <h3 class="panel__title">รีวิวผู้ขาย: {{ reviewTarget.seller_name }}</h3>
        <form class="form" @submit.prevent="submitReview">
          <label class="field">
            <span class="field__label">ชื่อผู้ซื้อ *</span>
            <input class="field__input" v-model="reviewForm.buyerName" required />
          </label>
          <label class="field">
            <span class="field__label">คะแนน (1-5 ดาว) *</span>
            <div class="stars">
              <span v-for="n in 5" :key="n" class="star" :class="{ 'star--on': n <= reviewForm.rating }" @click="reviewForm.rating = n">★</span>
            </div>
          </label>
          <label class="field">
            <span class="field__label">ความคิดเห็น</span>
            <textarea class="field__input field__textarea" v-model="reviewForm.comment"></textarea>
          </label>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" @click="reviewTarget = null">ยกเลิก</button>
            <button type="submit" class="btn btn--primary" :disabled="reviewLoading">
              {{ reviewLoading ? 'กำลังส่ง...' : 'ส่งรีวิว' }}
            </button>
          </div>
          <p v-if="reviewMessage" :class="['formmsg', reviewError ? 'formmsg--error' : 'formmsg--ok']">{{ reviewMessage }}</p>
        </form>
      </div>
    </div>

    <footer class="footer">re/spec marketplace — โปรเจกต์การศึกษา (Backend: Express + PostgreSQL / Frontend: Vue 3 + Vite)</footer>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const apiOnline = ref(false);
const tab = ref('browse');

const currentSeller = ref(null);

const kycForm = reactive({ fullName: '', idCardNumber: '', facePhotoUrl: '' });
const kycLoading = ref(false);
const kycMessage = ref('');
const kycError = ref(false);

const listingForm = reactive({
  brand: '', cpu: '', ram: '', gpu: '',
  batteryHealth: 80, defects: '', price: null,
  usageType: '', province: '', bootScreenPhotoUrl: ''
});
const sellLoading = ref(false);
const sellMessage = ref('');
const sellError = ref(false);

const filters = reactive({ minPrice: '', maxPrice: '', brand: '', usageType: '', province: '' });
const listings = ref([]);
const listingsLoading = ref(false);

const reviewTarget = ref(null);
const reviewForm = reactive({ buyerName: '', rating: 5, comment: '' });
const reviewLoading = ref(false);
const reviewMessage = ref('');
const reviewError = ref(false);

// === State & Form: สั่งซื้อ ===
const buyTarget = ref(null);
const buyForm = reactive({ buyerName: '', phone: '', deliveryMethod: 'pickup' });
const buyLoading = ref(false);
const buyMessage = ref('');
const buyError = ref(false);

// === State & Form: แก้ไข ===
const editTarget = ref(null);
const editForm = reactive({
  brand: '', cpu: '', ram: '', gpu: '',
  batteryHealth: 80, defects: '', price: null,
  usageType: '', province: '', bootScreenPhotoUrl: ''
});
const editLoading = ref(false);
const editMessage = ref('');
const editError = ref(false);

// === State: ลบ ===
const deleteTarget = ref(null);
const deleteLoading = ref(false);
const deleteMessage = ref('');
const deleteError = ref(false);

function usageLabel(v) {
  const map = { gaming: 'เล่นเกม', office: 'ทำงานทั่วไป', design: 'งานกราฟิก/ตัดต่อ', programming: 'เขียนโปรแกรม' };
  return map[v] || v;
}

function batteryClass(v) {
  if (v >= 80) return 'battery__fill--good';
  if (v >= 50) return 'battery__fill--mid';
  return 'battery__fill--low';
}

function onFileChange(event, targetKey, targetObj) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { targetObj[targetKey] = reader.result; };
  reader.readAsDataURL(file);
}

async function checkHealth() {
  try {
    const res = await fetch(`${apiBase}/health`);
    apiOnline.value = res.ok;
  } catch {
    apiOnline.value = false;
  }
}

async function submitKyc() {
  kycLoading.value = true;
  kycMessage.value = '';
  kycError.value = false;
  try {
    const res = await fetch(`${apiBase}/api/kyc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kycForm)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
    currentSeller.value = data.seller;
    kycMessage.value = 'ยืนยันตัวตนสำเร็จ! ตอนนี้ท่านสามารถลงขายสินค้าได้แล้ว';
    tab.value = 'sell';
  } catch (err) {
    kycError.value = true;
    kycMessage.value = err.message;
  } finally {
    kycLoading.value = false;
  }
}

async function submitListing() {
  if (!currentSeller.value) return;
  sellLoading.value = true;
  sellMessage.value = '';
  sellError.value = false;
  try {
    const res = await fetch(`${apiBase}/api/listings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...listingForm, sellerId: currentSeller.value.id })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
    sellMessage.value = 'ลงขายสินค้าสำเร็จ!';
    Object.assign(listingForm, { brand: '', cpu: '', ram: '', gpu: '', batteryHealth: 80, defects: '', price: null, usageType: '', province: '', bootScreenPhotoUrl: '' });
    tab.value = 'browse';
    fetchListings();
  } catch (err) {
    sellError.value = true;
    sellMessage.value = err.message;
  } finally {
    sellLoading.value = false;
  }
}

async function fetchListings() {
  listingsLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.brand) params.set('brand', filters.brand);
    if (filters.usageType) params.set('usageType', filters.usageType);
    if (filters.province) params.set('province', filters.province);

    const res = await fetch(`${apiBase}/api/listings?${params.toString()}`);
    listings.value = res.ok ? await res.json() : [];
  } catch {
    listings.value = [];
  } finally {
    listingsLoading.value = false;
  }
}

function openReview(item) {
  reviewTarget.value = item;
  reviewForm.buyerName = '';
  reviewForm.rating = 5;
  reviewForm.comment = '';
  reviewMessage.value = '';
}

async function submitReview() {
  reviewLoading.value = true;
  reviewMessage.value = '';
  reviewError.value = false;
  try {
    const res = await fetch(`${apiBase}/api/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sellerId: reviewTarget.value.seller_id, ...reviewForm })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'เกิดข้อผิดพลาด');
    reviewMessage.value = 'ส่งรีวิวสำเร็จ ขอบคุณครับ/ค่ะ!';
    setTimeout(() => { reviewTarget.value = null; }, 1200);
  } catch (err) {
    reviewError.value = true;
    reviewMessage.value = err.message;
  } finally {
    reviewLoading.value = false;
  }
}

// === Logic: ปุ่มสั่งซื้อ ===
function openBuy(item) {
  buyTarget.value = item;
  buyForm.buyerName = '';
  buyForm.phone = '';
  buyForm.deliveryMethod = 'pickup';
  buyMessage.value = '';
  buyError.value = false;
}

async function submitBuy() {
  buyLoading.value = true;
  buyMessage.value = '';
  buyError.value = false;
  try {
    const res = await fetch(`${apiBase}/api/listings/${buyTarget.value.id}/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buyForm)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ไม่สามารถสั่งซื้อสินค้าได้');
    buyMessage.value = 'สั่งซื้อเสร็จสมบูรณ์! ระบบจำลองข้อมูลการซื้อเรียบร้อยแล้ว';
    setTimeout(() => {
      buyTarget.value = null;
      fetchListings();
    }, 1500);
  } catch (err) {
    buyError.value = true;
    buyMessage.value = err.message;
  } finally {
    buyLoading.value = false;
  }
}

// === Logic: ปุ่มแก้ไข ===
function openEdit(item) {
  editTarget.value = item;
  Object.assign(editForm, {
    brand: item.brand,
    cpu: item.cpu,
    ram: item.ram,
    gpu: item.gpu,
    batteryHealth: item.battery_health,
    defects: item.defects || '',
    price: item.price,
    usageType: item.usage_type,
    province: item.province,
    bootScreenPhotoUrl: item.boot_screen_photo_url
  });
  editMessage.value = '';
  editError.value = false;
}

async function submitEdit() {
  editLoading.value = true;
  editMessage.value = '';
  editError.value = false;
  try {
    const res = await fetch(`${apiBase}/api/listings/${editTarget.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'ไม่สามารถแก้ไขสินค้าได้');
    editMessage.value = 'อัปเดตข้อมูลสินค้าเรียบร้อย!';
    setTimeout(() => {
      editTarget.value = null;
      fetchListings();
    }, 1200);
  } catch (err) {
    editError.value = true;
    editMessage.value = err.message;
  } finally {
    editLoading.value = false;
  }
}

// === Logic: ปุ่มลบ ===
function openDelete(item) {
  deleteTarget.value = item;
  deleteMessage.value = '';
  deleteError.value = false;
}

async function submitDelete() {
  deleteLoading.value = true;
  deleteMessage.value = '';
  deleteError.value = false;
  try {
    const res = await fetch(`${apiBase}/api/listings/${deleteTarget.value.id}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'ไม่สามารถลบสินค้าได้');
    }
    deleteMessage.value = 'ลบรายการสินค้าสำเร็จ!';
    setTimeout(() => {
      deleteTarget.value = null;
      fetchListings();
    }, 1200);
  } catch (err) {
    deleteError.value = true;
    deleteMessage.value = err.message;
  } finally {
    deleteLoading.value = false;
  }
}

onMounted(() => {
  checkHealth();
  fetchListings();
});
</script>

<style>
:root {
  --bg: #0F1216;
  --panel: #171B21;
  --panel-2: #1D222A;
  --border: #2A3038;
  --text: #E7E9EE;
  --muted: #8B93A1;
  --accent: #5EEAD4;
  --accent-dim: #2E7D6E;
  --warn: #F5A623;
  --danger: #F2545B;
  --good: #5EEAD4;
  --mid: #F5A623;
  --low: #F2545B;
  --radius: 10px;
  font-family: 'Inter', system-ui, sans-serif;
}

* { box-sizing: border-box; }
body { margin: 0; }

.app {
  background: var(--bg);
  color: var(--text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ---------- Topbar ---------- */
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 32px;
  border-bottom: 1px solid var(--border);
  background: linear-gradient(180deg, var(--panel), var(--bg));
}
.topbar__brand { display: flex; align-items: center; gap: 12px; }
.topbar__logo {
  font-family: 'JetBrains Mono', monospace;
  color: var(--accent);
  font-size: 22px;
  border: 1px solid var(--accent-dim);
  border-radius: 6px;
  padding: 4px 8px;
}
.topbar__title { font-weight: 700; font-size: 18px; letter-spacing: 0.2px; }
.topbar__meta { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 2px; }

.topbar__nav { display: flex; gap: 8px; }
.navbtn {
  background: transparent; border: 1px solid var(--border); color: var(--muted);
  padding: 8px 16px; border-radius: 999px; font-size: 13px; cursor: pointer;
  transition: all .15s ease;
}
.navbtn:hover { color: var(--text); border-color: var(--accent-dim); }
.navbtn--active { background: var(--accent); color: #0A1512; border-color: var(--accent); font-weight: 600; }

/* ---------- Status line ---------- */
.statusline {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--muted);
  padding: 8px 32px; border-bottom: 1px solid var(--border);
  display: flex; align-items: center; gap: 6px;
}
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.dot--ok { background: var(--good); box-shadow: 0 0 6px var(--good); }
.dot--down { background: var(--danger); }
.statusline__seller { margin-left: 16px; color: var(--text); }
.badge { font-size: 10px; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
.badge--verified { background: rgba(94,234,212,0.15); color: var(--accent); border: 1px solid var(--accent-dim); }

/* ---------- Main / Panel ---------- */
.main { padding: 28px 32px; flex: 1; max-width: 1160px; margin: 0 auto; width: 100%; }
.panel { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
.panel__title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 15px; letter-spacing: 0.5px; color: var(--accent);
  margin: 0 0 6px 0; text-transform: uppercase;
}
.panel__hint { color: var(--muted); font-size: 13px; margin-bottom: 20px; }
.panel__warn { color: var(--warn); font-family: 'JetBrains Mono', monospace; font-size: 13px; }

/* ---------- Forms ---------- */
.form { display: flex; flex-direction: column; gap: 16px; max-width: 720px; }
.form__row { display: flex; gap: 16px; flex-wrap: wrap; }
.field { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 180px; }
.field--tight { min-width: 140px; }
.field__label { font-size: 12px; color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.field__input, .field__file {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: 6px;
  padding: 10px 12px; color: var(--text); font-size: 14px; outline: none;
}
.field__input:focus { border-color: var(--accent); }
.field__textarea { min-height: 70px; resize: vertical; font-family: inherit; }
.field__range { accent-color: var(--accent); }

.preview { max-width: 120px; margin-top: 8px; border-radius: 8px; border: 1px solid var(--border); }
.preview--round { border-radius: 50%; width: 96px; height: 96px; object-fit: cover; }

.terminal-frame { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 10px; background: #000; }
.terminal-frame--sm { margin: 12px 0; }
.terminal-frame__bar { display: flex; align-items: center; gap: 6px; background: #1a1e24; padding: 6px 10px; }
.dotbtn { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
.dotbtn--red { background: #F2545B; } .dotbtn--yellow { background: #F5A623; } .dotbtn--green { background: #5EEAD4; }
.terminal-frame__label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); margin-left: 6px; }
.terminal-frame__img { display: block; width: 100%; max-height: 200px; object-fit: cover; }

.btn { border-radius: 6px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid transparent; width: fit-content; }
.btn--primary { background: var(--accent); color: #0A1512; }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--outline { background: transparent; border-color: var(--accent-dim); color: var(--accent); align-self: flex-end; }
.btn--ghost { background: transparent; border-color: var(--border); color: var(--text); }
.btn--sm { padding: 6px 12px; font-size: 12px; }

/* Dynamic state buttons */
.btn--success { background: var(--good); color: #0A1512; }
.btn--warning { background: var(--warn); color: #0A1512; }
.btn--danger { background: var(--danger); color: #FFF; }
.btn--success:disabled, .btn--warning:disabled, .btn--danger:disabled { opacity: 0.5; cursor: not-allowed; }

.formmsg { font-size: 13px; padding: 8px 12px; border-radius: 6px; }
.formmsg--ok { background: rgba(94,234,212,0.12); color: var(--accent); }
.formmsg--error { background: rgba(242,84,91,0.12); color: var(--danger); }

/* ---------- Filters ---------- */
.filters { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed var(--border); }

/* ---------- Card grid ---------- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
.card { background: var(--panel-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.card__spechead { display: flex; justify-content: space-between; align-items: center; }
.card__brand { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: var(--accent); }
.card__price { font-weight: 700; font-size: 16px; }
.spectable { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; margin: 0; font-size: 12px; }
.spectable div { display: flex; justify-content: space-between; gap: 6px; border-bottom: 1px dotted var(--border); padding-bottom: 3px; }
.spectable dt { color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.spectable dd { margin: 0; text-align: right; }
.card__defects { font-size: 12px; color: var(--warn); margin: 0; }

/* Container for 3 main buttons inside a card */
.card__actions { display: flex; gap: 6px; margin-top: 8px; border-top: 1px solid var(--border); padding-top: 12px; }
.flex-1 { flex: 1; }

.card__footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 8px; }
.card__seller { font-size: 12px; color: var(--muted); }

.battery { display: flex; align-items: center; gap: 8px; }
.battery__label { font-size: 11px; font-family: 'JetBrains Mono', monospace; color: var(--muted); width: 60px; }
.battery__gauge { flex: 1; height: 8px; background: var(--panel); border: 1px solid var(--border); border-radius: 4px; overflow: hidden; }
.battery__fill { height: 100%; }
.battery__fill--good { background: var(--good); }
.battery__fill--mid { background: var(--mid); }
.battery__fill--low { background: var(--low); }

.empty { color: var(--muted); padding: 40px 0; text-align: center; font-family: 'JetBrains Mono', monospace; }

/* ---------- Modal ---------- */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 1000; }
.modal { background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; width: 100%; max-width: 420px; }
.modal--large { max-width: 680px; max-height: 85vh; overflow-y: auto; }
.modal__desc { font-size: 13px; color: var(--muted); margin: 8px 0 16px 0; }
.text-accent { color: var(--accent); }
.modal__actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; }
.stars { display: flex; gap: 4px; font-size: 24px; cursor: pointer; }
.star { color: var(--border); }
.star--on { color: var(--warn); }

.footer { text-align: center; padding: 18px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; }

@media (max-width: 640px) {
  .topbar { flex-direction: column; align-items: flex-start; gap: 12px; }
  .main { padding: 20px 16px; }
}
</style>