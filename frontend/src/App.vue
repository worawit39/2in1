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
        <button :class="['navbtn', tab === 'orders' && 'navbtn--active']" @click="tab = 'orders'; fetchOrders()">รายการสั่งซื้อ</button>
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
            <!-- ============ ป้ายยืนยันการซื้อสำเร็จหน้าสินค้า ============ -->
            <div v-if="item.status === 'sold' || item.is_sold || item.buyer_name" class="card__sold-badge">
              <span class="card__sold-icon">✓</span> ซื้อแล้ว
            </div>

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
              <button v-if="!(item.status === 'sold' || item.is_sold || item.buyer_name)" class="btn btn--success btn--sm flex-1" @click="openBuy(item)">🛒 สั่งซื้อ</button>
              <button v-else class="btn btn--secondary btn--sm flex-1" disabled style="opacity: 0.6; cursor: not-allowed; background: #2A3038; color: var(--muted); border-color: var(--border);">🔒 ขายแล้ว</button>
              
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

      <!-- ============ TAB: ORDERS (หน้า UI รายการยืนยันการสั่งซื้อ) ============ -->
      <section v-if="tab === 'orders'" class="panel">
        <h2 class="panel__title">04 / ใบสั่งซื้อสินค้าที่ยืนยันแล้ว (Order Confirmations)</h2>
        <p class="panel__hint">
          ประวัติคำสั่งซื้อทั้งหมดที่ทำรายการเสร็จสิ้นในระบบจำลองเพื่อตรวจสอบความถูกต้อง
        </p>

        <div v-if="ordersLoading" class="empty">กำลังโหลดข้อมูลการสั่งซื้อ...</div>
        <div v-else-if="orders.length === 0" class="empty">ยังไม่มีการสั่งซื้อสินค้าเกิดขึ้นในระบบในขณะนี้</div>

        <div v-else class="orders-grid">
          <div v-for="order in orders" :key="order.id" class="order-card">
            <div class="order-card__header">
              <span class="order-card__badge">✓ ชำระเงินสำเร็จ</span>
              <span class="order-card__id">Order #{{ order.id }}</span>
            </div>
            <div class="order-card__title">
              {{ order.brand || order.listing_brand || 'Laptop Spec' }}
            </div>
            <div class="order-card__price">
              ฿{{ Number(order.price || order.listing_price || 0).toLocaleString() }}
            </div>
            <div class="order-card__spec-box" v-if="order.cpu || order.ram">
              <span>CPU: {{ order.cpu }}</span> | <span>RAM: {{ order.ram }}</span>
            </div>
            <hr class="order-card__divider">
            <div class="order-card__info">
              <div class="order-card__info-row">
                <span class="order-card__label">👤 ชื่อผู้ซื้อ:</span>
                <span class="order-card__value">{{ order.buyer_name || order.buyerName }}</span>
              </div>
              <div class="order-card__info-row">
                <span class="order-card__label">📞 เบอร์โทรศัพท์:</span>
                <span class="order-card__value">{{ order.phone || order.buyer_phone || '-' }}</span>
              </div>
              <div class="order-card__info-row">
                <span class="order-card__label">📦 การจัดส่ง:</span>
                <span class="order-card__value">{{ order.delivery_method === 'pickup' ? 'นัดรับสินค้า' : 'จัดส่งด่วน (EMS/Flash)' }}</span>
              </div>
              <div v-if="order.province" class="order-card__info-row">
                <span class="order-card__label">📍 พื้นที่นัดรับ/จัดส่ง:</span>
                <span class="order-card__value">{{ order.province }}</span>
              </div>
            </div>
          </div>
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

// === State: รายการสั่งซื้อ ===
const orders = ref([]);
const ordersLoading = ref(false);

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

// === Logic: ดึงรายการสั่งซื้อ (แท็บ รายการสั่งซื้อ) ===
async function fetchOrders() {
  ordersLoading.value = true;
  try {
    // 1. ส่งรีเควสไปหา API รายการสั่งซื้อโดยตรง
    const res = await fetch(`${apiBase}/api/orders`);
    if (res.ok) {
      orders.value = await res.json();
    } else {
      // 2. Fallback: กรณี Backend ไม่มี endpoint /api/orders, ทำการฟิลเตอร์สินค้าที่ถูกซื้อแล้วจาก listings แทน
      const listingsRes = await fetch(`${apiBase}/api/listings`);
      if (listingsRes.ok) {
        const allListings = await listingsRes.json();
        orders.value = allListings.filter(item => item.status === 'sold' || item.is_sold || item.buyer_name);
      }
    }
  } catch {
    // Fallback แผนสำรองกรณีเชื่อมต่อ API ขัดข้อง
    orders.value = listings.value.filter(item => item.status === 'sold' || item.is_sold || item.buyer_name);
  } finally {
    ordersLoading.value = false;
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
      fetchOrders(); // อัปเดตรายการหน้าสั่งซื้อทันที
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
      fetchOrders(); // ดึงข้อมูลใหม่
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
  fetchOrders();
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
body { margin: 0; background: var(--bg); color: var(--text); }

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
.field__input, .field__textarea, .field__range {
  background: var(--panel-2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
  outline: none;
  transition: border-color .15s ease;
}
.field__input:focus, .field__textarea:focus { border-color: var(--accent); }
.field__textarea { resize: vertical; min-height: 80px; }
.field__file { color: var(--muted); font-size: 13px; }

/* ---------- Preview ---------- */
.preview { max-width: 120px; border-radius: 6px; margin-top: 10px; border: 1px solid var(--border); }
.preview--round { border-radius: 50%; aspect-ratio: 1; object-fit: cover; }

/* ---------- Buttons ---------- */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600;
  cursor: pointer; border: 1px solid transparent; transition: all .15s ease;
  font-family: inherit;
}
.btn--primary { background: var(--accent); color: #0A1512; }
.btn--primary:hover { background: #4ddcd0; }
.btn--primary:disabled { background: var(--border); color: var(--muted); cursor: not-allowed; }
.btn--outline { background: transparent; border-color: var(--border); color: var(--text); }
.btn--outline:hover { border-color: var(--accent-dim); }
.btn--success { background: #10B981; color: white; }
.btn--success:hover { background: #059669; }
.btn--warning { background: var(--warn); color: #0F1216; }
.btn--warning:hover { background: #e0921b; }
.btn--danger { background: var(--danger); color: white; }
.btn--danger:hover { background: #d94148; }
.btn--ghost { background: transparent; color: var(--muted); }
.btn--ghost:hover { color: var(--text); background: rgba(255,255,255,0.05); }
.btn--sm { padding: 6px 12px; font-size: 12px; }
.flex-1 { flex: 1; }

/* ---------- Message Info ---------- */
.formmsg { font-size: 13px; font-family: 'JetBrains Mono', monospace; margin-top: 8px; }
.formmsg--error { color: var(--danger); }
.formmsg--ok { color: var(--accent); }

/* ---------- Empty State ---------- */
.empty {
  text-align: center; color: var(--muted); padding: 48px; border: 1px dashed var(--border);
  border-radius: var(--radius); font-size: 14px;
}

/* ---------- Filters ---------- */
.filters {
  display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;
  background: var(--panel-2); padding: 16px; border-radius: var(--radius);
  border: 1px solid var(--border); align-items: flex-end;
}

/* ---------- Product Grid & Card ---------- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px; }
.card {
  background: var(--panel-2); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px; display: flex; flex-direction: column; gap: 12px; position: relative;
}
.card__spechead { display: flex; justify-content: space-between; align-items: center; }
.card__brand { font-weight: 700; font-size: 16px; color: var(--accent); }
.card__price { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #fff; font-size: 16px; }
.card__defects { font-size: 12px; color: var(--warn); margin: 0; background: rgba(245,166,35,0.08); padding: 6px 10px; border-radius: 4px; border-left: 2px solid var(--warn); }
.card__actions { display: flex; gap: 8px; }
.card__footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid var(--border); padding-top: 10px; font-size: 11px; }
.card__seller { color: var(--muted); }

/* ---------- Terminal Frame ---------- */
.terminal-frame {
  border: 1px solid var(--border); border-radius: 6px; overflow: hidden; background: #000;
  position: relative;
}
.terminal-frame--sm { aspect-ratio: 16/9; }
.terminal-frame__bar {
  background: #171B21; padding: 6px 10px; display: flex; align-items: center; gap: 6px;
  border-bottom: 1px solid var(--border);
}
.terminal-frame__label { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--muted); margin-left: 6px; }
.terminal-frame__img { width: 100%; height: 100%; object-fit: cover; display: block; }

.dotbtn { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.dotbtn--red { background: #FF5F56; }
.dotbtn--yellow { background: #FFBD2E; }
.dotbtn--green { background: #27C93F; }

/* ---------- Spec Table ---------- */
.spectable { margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
.spectable div { display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 4px; }
.spectable dt { color: var(--muted); margin: 0; font-family: 'JetBrains Mono', monospace; }
.spectable dd { color: var(--text); margin: 0; font-weight: 500; text-align: right; }

/* ---------- Battery ---------- */
.battery { display: flex; align-items: center; justify-content: space-between; font-size: 11px; }
.battery__label { color: var(--muted); font-family: 'JetBrains Mono', monospace; }
.battery__gauge { width: 80px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.battery__fill { height: 100%; border-radius: 3px; }
.battery__fill--good { background: var(--good); }
.battery__fill--mid { background: var(--mid); }
.battery__fill--low { background: var(--low); }

/* ---------- Review Stars ---------- */
.stars { display: flex; gap: 4px; }
.star { font-size: 20px; color: var(--border); cursor: pointer; transition: color .15s; }
.star--on { color: var(--warn); }

/* ---------- Modals ---------- */
.modal-backdrop {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center; z-index: 100; 
  padding: 16px; /* ระยะห่างจากขอบจอ */
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--panel); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 24px; max-width: 500px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  
  /* [เพิ่มใหม่] เพื่อให้หน้าต่างไม่สูงเกินจอ และเลื่อน (Scroll) ดูเนื้อหาได้ */
  max-height: 90vh; 
  overflow-y: auto; 
}
.modal--large { max-width: 720px; }
.modal__desc { color: var(--muted); font-size: 13px; line-height: 1.5; margin: 10px 0 20px 0; }
.modal__actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.text-accent { color: var(--accent); }

/* [เพิ่มใหม่] Responsive สำหรับหน้าจอมือถือโดยเฉพาะ */
@media (max-width: 600px) {
  .modal-backdrop {
    padding: 10px; /* ลดขอบรอบนอกลง เพื่อให้มีพื้นที่แสดงกล่องมากขึ้น */
  }
  .modal {
    padding: 16px; /* ลดช่องว่างด้านในกล่องลง ไม่ให้อึดอัดเกินไปบนมือถือ */
  }
  .modal__actions {
    /* (ตัวเลือก) ปรับให้ปุ่มเต็มความกว้างบนมือถือ ถ้าต้องการให้กดง่ายขึ้น */
    flex-direction: column-reverse; 
    width: 100%;
  }
  .modal__actions .btn {
    width: 100%;
  }
}

/* ---------- Footer ---------- */
.footer { text-align: center; padding: 24px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); font-family: 'JetBrains Mono', monospace; }

/* =======================================================
   ========== NEW CUSTOM STYLES (สไตล์ที่เพิ่มเติมเข้ามา) ==========
   ======================================================= */

/* 1. สไตล์ป้ายและไอคอน "ซื้อแล้ว" บนการ์ดสินค้า */
.card__sold-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(16, 185, 129, 0.95); /* สีเขียว */
  color: #ffffff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.15);
  text-transform: uppercase;
}
.card__sold-icon {
  font-size: 10px;
}

/* 2. สไตล์หน้ากริดของรายการสั่งซื้อยืนยันแล้ว */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 15px;
}
.order-card {
  background: var(--panel-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}
.order-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.order-card__badge {
  background: rgba(94, 234, 212, 0.1);
  color: var(--accent);
  border: 1px solid var(--accent-dim);
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 700;
}
.order-card__id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--muted);
}
.order-card__title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.order-card__price {
  font-size: 20px;
  font-weight: 800;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
}
.order-card__spec-box {
  font-size: 11px;
  color: var(--muted);
  background: rgba(255, 255, 255, 0.02);
  padding: 6px 10px;
  border-radius: 4px;
}
.order-card__divider {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 4px 0;
}
.order-card__info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
}
.order-card__info-row {
  display: flex;
  justify-content: space-between;
}
.order-card__label {
  color: var(--muted);
}
.order-card__value {
  color: var(--text);
  font-weight: 500;
}
</style>