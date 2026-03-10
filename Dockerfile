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

# Create nginx configuration for SPA routing with OpenClaw proxy
RUN printf '%s\n' \
    'server {' \
    '    listen 8080;' \
    '    server_name localhost;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '' \
    '    # OpenClaw API proxy - avoids CORS issues' \
    '    location /api/openclaw/ {' \
    '        proxy_pass https://openclaw.neovega.cc/;' \
    '        proxy_ssl_server_name on;' \
    '        proxy_set_header Host openclaw.neovega.cc;' \
    '        proxy_set_header X-Real-IP $remote_addr;' \
    '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' \
    '        proxy_set_header X-Forwarded-Proto $scheme;' \
    '        proxy_connect_timeout 30s;' \
    '        proxy_read_timeout 30s;' \
    '    }' \
    '' \
    '    location / {' \
    '        try_files $uri $uri/ /index.html;' \
    '    }' \
    '}' > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]