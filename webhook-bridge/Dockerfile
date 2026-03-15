FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3003

# 直接使用 node 啟動，避免 npm 包裝層的問題
CMD ["node", "dist/index.js"]
