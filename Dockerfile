# Multi-stage Dockerfile cho Hồn Việt 3D
# -------------------------------------------------------------
# Stage 1: Build Frontend với Node.js
# -------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -------------------------------------------------------------
# Stage 2: Production Server (Node.js HTTP + WebSocket server)
# -------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8787

# Chỉ cài production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Sao chép bản build frontend và server
COPY --from=builder /app/dist ./dist
COPY server ./server
COPY package.json ./

# Tạo thư mục lưu data leaderboard nếu chưa có
RUN mkdir -p server/data

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/health || exit 1

CMD ["node", "server/index.mjs"]
