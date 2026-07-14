# 🖥️ SecondHand Laptop Marketplace

**ชื่อ-สกุล:** _[กรอกชื่อ-นามสกุลของท่านที่นี่]_
**รหัสนักศึกษา:** _[กรอกรหัสนักศึกษาของท่านที่นี่]_

![Node](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js&logoColor=white)
![Vue](https://img.shields.io/badge/Vue-3.x-4FC08D?logo=vue.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow)

ระบบเว็บซื้อขายโน๊ตบุ๊คมือสองแบบครบวงจร ประกอบด้วยระบบลงขายสินค้าเจาะจงสเปก, ระบบค้นหา/ตัวกรองละเอียด, และระบบ KYC จำลอง + รีวิวร้านค้า

---

## 📁 โครงสร้างโปรเจกต์

```
├── backend/          # Express.js REST API + PostgreSQL
├── frontend/         # Vue 3 + Vite SPA
├── docker-compose.yml        # สำหรับ Development (build จาก source)
├── docker-compose.prod.yml   # สำหรับ Production (ดึง image จาก Docker Hub)
└── .github/workflows/ci.yml  # CI Pipeline: lint -> test -> build
```

## 🚀 วิธีรัน (Development)

### 1. เตรียม Environment Variables
```bash
cp .env.example .env
```

### 2. รันทั้งระบบด้วย Docker Compose
```bash
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health Check: http://localhost:3000/health
- PostgreSQL: localhost:5432

### 3. รันแบบ Production (ดึง Image จาก Docker Hub)
```bash
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
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 ตาราง API Endpoints

| Method | Endpoint | คำอธิบาย | Body / Query |
|---|---|---|---|
| GET | `/health` | เช็กสถานะระบบและฐานข้อมูล | - |
| POST | `/api/kyc` | ลงทะเบียนยืนยันตัวตนผู้ขาย (จำลอง) | `{ fullName, idCardNumber, facePhotoUrl }` |
| GET | `/api/sellers/:id` | ดูข้อมูลผู้ขาย + คะแนนเฉลี่ย | - |
| GET | `/api/sellers/:id/reviews` | ดูรีวิวทั้งหมดของผู้ขาย | - |
| POST | `/api/listings` | ลงขายโน๊ตบุ๊คใหม่ (ต้อง KYC แล้ว) | `{ sellerId, brand, cpu, ram, gpu, batteryHealth, defects, price, usageType, province, bootScreenPhotoUrl }` |
| GET | `/api/listings` | ดูรายการสินค้าทั้งหมด + Filter | `?minPrice&maxPrice&brand&usageType&province` |
| GET | `/api/listings/:id` | ดูรายละเอียดสินค้าชิ้นเดียว | - |
| PUT | `/api/listings/:id` | แก้ไขข้อมูลสินค้า | เหมือน POST |
| DELETE | `/api/listings/:id` | ลบสินค้าที่ลงขาย | - |
| POST | `/api/reviews` | ให้คะแนน/รีวิวร้านค้าหลังปิดการขาย | `{ sellerId, buyerName, rating, comment }` |

## 🔒 หมายเหตุเรื่อง KYC
ระบบ KYC ในโปรเจกต์นี้เป็น **การจำลอง (Simulation)** เพื่อวัตถุประสงค์ทางการศึกษาเท่านั้น ไม่มีการตรวจสอบเลขบัตรประชาชนจริงกับหน่วยงานภายนอกใด ๆ และไม่ควรใช้เก็บข้อมูลบัตรประชาชนจริงในระบบ production

## 🛠️ Tech Stack
- **Frontend:** Vue 3 (Composition API) + Vite
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL (ผ่าน `pg` connection pool)
- **DevOps:** Docker, Docker Compose, Nginx (serve frontend build), GitHub Actions CI
