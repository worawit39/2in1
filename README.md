# 💻 ระบบซื้อขายโน้ตบุ๊กมือสอง (Used Notebook Marketplace)

**ชื่อ-นามสกุล:** _กรอกชื่อ-นามสกุลของคุณตรงนี้_
**รหัสนักศึกษา:** _กรอกรหัสนักศึกษาของคุณตรงนี้_

![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-Alpine-009639?logo=nginx&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

ระบบซื้อขายโน้ตบุ๊กมือสองแบบง่าย — **ผู้ขาย** สามารถกรอกสเปคเครื่อง (ยี่ห้อ, CPU, RAM, ที่เก็บข้อมูล, ราคา ฯลฯ) ลงประกาศขายได้
**ผู้ซื้อ** สามารถค้นหา กรอง และเรียกดูรายละเอียดสเปคแบบเต็มของแต่ละเครื่องได้

---

## 📦 โครงสร้างโปรเจกต์

```
midterm-devops-notebook-shop/
├── README.md
├── .gitignore
├── .env.example
├── docker-compose.yml          ← dev: build + รัน 3 services
├── docker-compose.prod.yml     ← prod: pull image จาก Docker Hub
├── backend/                    ← Express API + PostgreSQL
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── package.json
│   ├── index.js
│   ├── db.js
│   ├── eslint.config.js
│   └── tests/
│       └── laptops.test.js
└── frontend/                   ← HTML + Vanilla JS (served by nginx)
    ├── Dockerfile
    ├── .dockerignore
    ├── nginx.conf
    ├── index.html
    └── app.js
```

## 🧱 Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL (ผ่าน `pg` Pool) |
| Frontend | HTML + Vanilla JavaScript, served ด้วย Nginx |
| Container | Docker / Docker Compose |

---

## 🚀 วิธีรัน (Development)

1. คัดลอกไฟล์ตัวแปรแวดล้อม:
   ```bash
   cp .env.example .env
   ```
   แล้วแก้ค่าตามต้องการ (โดยเฉพาะ `DB_PASSWORD`)

2. Build และรันทั้ง 3 services (PostgreSQL, Backend, Frontend):
   ```bash
   docker compose up --build
   ```

3. เปิดใช้งาน:
   - **Frontend (หน้าเว็บ):** http://localhost:8080
   - **Backend API:** http://localhost:3000
   - **Health check:** http://localhost:3000/health

4. หยุดการทำงาน:
   ```bash
   docker compose down
   ```
   (เพิ่ม `-v` ถ้าต้องการลบข้อมูลใน volume ของฐานข้อมูลด้วย)

### รัน Backend แบบ local (ไม่ใช้ Docker) เพื่อพัฒนา

```bash
cd backend
npm install
npm run dev     # ใช้ node --watch
npm run lint    # ตรวจสอบโค้ดด้วย ESLint
npm test        # รัน Unit Test (node --test)
```

---

## 🏭 วิธีรัน (Production — ใช้ Image จาก Docker Hub)

1. Build และ push image ขึ้น Docker Hub (ทำครั้งเดียวตอน deploy):
   ```bash
   docker build -t <DOCKERHUB_USERNAME>/notebook-shop-backend:latest ./backend
   docker push <DOCKERHUB_USERNAME>/notebook-shop-backend:latest

   docker build -t <DOCKERHUB_USERNAME>/notebook-shop-frontend:latest ./frontend
   docker push <DOCKERHUB_USERNAME>/notebook-shop-frontend:latest
   ```

2. ตั้งค่า `.env` ให้มี `DOCKERHUB_USERNAME=<บัญชีของคุณ>`

3. รันด้วย compose ไฟล์สำหรับ production:
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

---

## 📖 API Endpoints

Base URL (dev): `http://localhost:3000`

| Method | Endpoint | คำอธิบาย | Body ตัวอย่าง |
|---|---|---|---|
| GET | `/health` | ตรวจสอบสถานะเซิร์ฟเวอร์ | - |
| GET | `/api/laptops` | ดูรายการโน้ตบุ๊กทั้งหมด (รองรับ query filter) | - |
| GET | `/api/laptops?brand=Asus&condition=ดี&min_price=5000&max_price=20000&q=gaming` | ค้นหา/กรองตามเงื่อนไข | - |
| GET | `/api/laptops/:id` | ดูรายละเอียดโน้ตบุ๊กเครื่องเดียว | - |
| POST | `/api/laptops` | ลงประกาศขายโน้ตบุ๊กใหม่ | `{"seller_name":"สมชาย","brand":"Asus","model":"ROG G15","price":18000,"ram":"16GB"}` |
| PUT | `/api/laptops/:id` | แก้ไขประกาศที่มีอยู่ | `{"price":17000}` |
| DELETE | `/api/laptops/:id` | ลบประกาศ (เช่น ขายแล้ว) | - |

### Query parameters ของ `GET /api/laptops`

| Parameter | ความหมาย |
|---|---|
| `q` | ค้นหาคำในยี่ห้อ/รุ่น/คำอธิบาย |
| `brand` | กรองตามยี่ห้อ (ค้นหาแบบ partial match) |
| `condition` | กรองตามสภาพเครื่อง (`ใหม่มาก` / `ดี` / `พอใช้`) |
| `min_price`, `max_price` | ช่วงราคา |

---

## 🧪 Unit Tests

อยู่ที่ `backend/tests/laptops.test.js` ใช้ `node:test` (built-in) + `supertest`
ทดสอบ `/health` endpoint และ logic ตรวจสอบข้อมูล (`validateLaptopPayload`) รวม 5 test cases (≥ 3 ตามเงื่อนไข) โดยไม่ต้องพึ่งฐานข้อมูลจริง จึงรันได้ทั้ง local และ CI pipeline

```bash
cd backend
npm test
```

---

## 🔐 Environment Variables

ดูตัวอย่างทั้งหมดใน [`.env.example`](./.env.example) — **ห้าม commit ไฟล์ `.env` จริงขึ้น Git**

| ตัวแปร | คำอธิบาย | ค่า default |
|---|---|---|
| `DB_HOST` | Hostname ของ PostgreSQL | `db` |
| `DB_PORT` | Port ของ PostgreSQL | `5432` |
| `DB_USER` | Username | `postgres` |
| `DB_PASSWORD` | Password | `change_this_password` |
| `DB_NAME` | ชื่อฐานข้อมูล | `laptop_market` |
| `PORT` | Port ของ Backend API | `3000` |
| `DOCKERHUB_USERNAME` | บัญชี Docker Hub (สำหรับ prod) | - |
| `IMAGE_TAG` | Tag ของ image (สำหรับ prod) | `latest` |
| `FRONTEND_PORT` | Port บนเครื่อง host สำหรับ frontend | `8080` |
| `BACKEND_PORT` | Port บนเครื่อง host สำหรับ backend | `3000` |
