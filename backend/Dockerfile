# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# ติดตั้ง dependencies ก่อน เพื่อใช้ Docker layer cache
COPY package*.json ./
RUN npm install --omit=dev

# คัดลอกซอร์สโค้ดที่เหลือ
COPY . .

ENV PORT=3000
EXPOSE 3000

# ใช้ non-root user เพื่อความปลอดภัย
USER node

CMD ["node", "index.js"]
