FROM node:20-alpine

WORKDIR /app

# 安裝依賴
COPY package*.json ./
RUN npm install

# 複製原始碼
COPY . .

# 編譯 TypeScript
RUN npm run build

# 暴露埠
EXPOSE 3000

# 啟動
CMD ["npm", "start"]
