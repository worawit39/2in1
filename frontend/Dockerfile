# Frontend เป็น HTML + Vanilla JS ล้วน ๆ ไม่มีขั้นตอน build ใด ๆ
# จึงใช้ nginx:alpine เป็น base image เดียว แล้ว COPY ไฟล์ static เข้าไปได้เลย
FROM nginx:alpine

# ลบไฟล์ static ตัวอย่างเริ่มต้นของ nginx ออกก่อน
RUN rm -rf /usr/share/nginx/html/*

# คัดลอกไฟล์หน้าเว็บทั้งหมด
COPY index.html /usr/share/nginx/html/index.html
COPY style.css /usr/share/nginx/html/style.css
COPY app.js /usr/share/nginx/html/app.js

# คัดลอกไฟล์ config ของ nginx (proxy /api และ /health ไปยัง backend service)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
