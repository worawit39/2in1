# 💻 ระบบซื้อขายโน้ตบุ๊กมือสอง (Second-Hand Notebook Marketplace)

**ชื่อ-สกุล:** _[กรอกชื่อ-นามสกุลของท่านที่นี่]_
**รหัสนักศึกษา:** _[กรอกรหัสนักศึกษาของท่านที่นี่]_

> โปรเจกต์สอบกลางภาค วิชา DevOps — ระบบซื้อขายโน้ตบุ๊กมือสอง

![Node](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)

ระบบเว็บซื้อขายโน้ตบุ๊กมือสอง ประกอบด้วยระบบลงขายสินค้า (พร้อมชื่อผู้ขายและประเภทสินค้า),
ตัวกรองสินค้าตามประเภท (Category Filter), ระบบแก้ไข/ลบสินค้า และระบบยืนยันคำสั่งซื้อ (Checkout)
ที่เปลี่ยนสถานะสินค้าเป็น "ขายแล้ว" เมื่อมีการซื้อสำเร็จ

---

## 📁 โครงสร้างโปรเจกต์

```
├── backend/                   # Express.js REST API + PostgreSQL
│   ├── db.js                  # PostgreSQL connection pool (อ่านค่าจาก ENV)
│   ├── index.js                # Express app + endpoints ทั้งหมด
│   ├── tests/api.test.js      # Unit tests (Jest + Supertest, mock DB)
│   └── Dockerfile
├── frontend/                  # HTML + Vanilla JS (ไม่มี framework/ไม่มีขั้นตอน build)
│   ├── index.html
│   ├── app.js
│   ├── style.css
│   ├── nginx.conf             # proxy /api และ /health ไปยัง backend
│   └── Dockerfile             # FROM nginx:alpine โดยตรง
├── docker-compose.yml         # สำหรับ Development (build image จาก source)
├── docker-compose.prod.yml    # สำหรับ Production (ดึง image จาก Docker Hub)
└── .github/workflows/ci.yml   # CI Pipeline: lint -> test -> build
```

## 🧩 ฟีเจอร์หลัก

1. **ข้อมูลสินค้า** — แต่ละประกาศมี `seller_name` (ชื่อผู้ขาย) และ `category`
   (ประเภทโน้ตบุ๊ก: Gaming / Office / Thin & Light)
2. **ตัวกรองประเภทสินค้า (Category Filter)** — กดเลือกประเภทใดประเภทหนึ่งแล้วระบบจะแสดง
   เฉพาะสินค้าประเภทนั้นเท่านั้น (backend ใช้ `category = $1` แบบ exact match เพื่อไม่ให้
   ประเภทอื่นหลุดมาปน)
3. **CRUD สินค้า** — ผู้ขายแก้ไข (Edit) และลบ (Delete) ประกาศของตนเองได้จากหน้าเว็บ
4. **ระบบสั่งซื้อ (Checkout)** — ปุ่ม "ซื้อสินค้า" เปิดฟอร์มยืนยันคำสั่งซื้อ (Confirm Order)
   เมื่อยืนยันแล้ว สถานะสินค้าจะเปลี่ยนเป็น `sold` ("ขายแล้ว") ทันที และไม่สามารถซื้อซ้ำได้

## 🚀 วิธีรัน (Development)

### 1. เตรียม Environment Variables
```bash
cp .env.example .env
```

### 2. รันทั้งระบบด้วย Docker Compose
```bash
docker-compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health

### 3. รันแบบ Production (ดึง Image จาก Docker Hub)
```bash
export DOCKERHUB_USERNAME=your-dockerhub-username
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 รัน Backend แบบ Local (ไม่ผ่าน Docker)
```bash
cd backend
npm install
npm run lint
npm test
npm start
```

## 🧑‍💻 รัน Frontend แบบ Local (ไม่ผ่าน Docker)
frontend เป็นไฟล์ static (HTML/CSS/JS) ล้วน ๆ เปิดด้วย live server ใดก็ได้ เช่น:
```bash
cd frontend
npx serve .
```
(ต้องรัน backend คู่กันที่ `http://localhost:3000` และตั้งค่า proxy/CORS ให้เรียบร้อยหากไม่ได้ผ่าน nginx)

---

## 📡 ตาราง API Endpoints

| Method | Endpoint | คำอธิบาย | Body / Query |
|---|---|---|---|
| GET | `/health` | เช็กสถานะระบบและฐานข้อมูล | - |
| GET | `/api/categories` | ดูรายการประเภทโน้ตบุ๊กที่ระบบรองรับ | - |
| GET | `/api/laptops` | ดูรายการสินค้าทั้งหมด + ตัวกรอง | `?category&brand&q&minPrice&maxPrice&status` |
| GET | `/api/laptops/:id` | ดูรายละเอียดสินค้าชิ้นเดียว | - |
| POST | `/api/laptops` | ลงขายโน้ตบุ๊กใหม่ | `{ seller_name, category, brand, model, cpu, ram, storage, gpu, screen_size, condition_note, price, description, image_url }` |
| PUT | `/api/laptops/:id` | แก้ไขข้อมูลสินค้า | เหมือน POST (ส่งเฉพาะฟิลด์ที่ต้องการแก้ไขได้) |
| DELETE | `/api/laptops/:id` | ลบสินค้าออกจากระบบ | - |
| POST | `/api/laptops/:id/order` | ยืนยันคำสั่งซื้อ (Checkout) → เปลี่ยนสถานะเป็น `sold` | `{ buyerName }` |

## 🛠️ Tech Stack
- **Frontend:** HTML + Vanilla JavaScript + CSS (ไม่มี framework, serve ผ่าน Nginx)
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (ผ่าน `pg` connection pool, อ่านค่าเชื่อมต่อจาก ENV ทั้งหมด)
- **DevOps:** Docker, Docker Compose (dev/prod), Nginx, GitHub Actions CI
