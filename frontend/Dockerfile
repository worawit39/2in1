# frontend/Dockerfile
# ใช้ nginx:alpine เป็น base image และ COPY ไฟล์ static (HTML + Vanilla JS) เข้าไปตรงๆ
# (ไม่ build ด้วย Node/Vite — โปรเจกต์นี้ใช้ Frontend แบบ HTML + Vanilla JS ตามข้อกำหนด)
FROM nginx:alpine

# ลบไฟล์ default ของ nginx ออกก่อน
RUN rm -rf /usr/share/nginx/html/*

# คัดลอกไฟล์หน้าเว็บเข้าไปใน document root
COPY index.html /usr/share/nginx/html/index.html
COPY app.js /usr/share/nginx/html/app.js

# คัดลอก nginx config ที่ตั้งค่า proxy /api และ /health ไปยัง backend service
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
