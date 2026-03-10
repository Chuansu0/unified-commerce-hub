# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the Vite app
RUN bun run build

# Production stage - use nginx to serve static files
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration with OpenClaw proxy
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]