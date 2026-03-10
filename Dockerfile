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
RUN echo 'server {' > /etc/nginx/conf.d/default.conf && \
    echo '    listen 8080;' >> /etc/nginx/conf.d/default.conf && \
    echo '    server_name localhost;' >> /etc/nginx/conf.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    # OpenClaw API proxy - avoids CORS issues' >> /etc/nginx/conf.d/default.conf && \
    echo '    location /api/openclaw/ {' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_pass https://openclaw.neovega.cc/;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_ssl_server_name on;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header Host openclaw.neovega.cc;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_connect_timeout 30s;' >> /etc/nginx/conf.d/default.conf && \
    echo '        proxy_read_timeout 30s;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '' >> /etc/nginx/conf.d/default.conf && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf && \
    echo '    }' >> /etc/nginx/conf.d/default.conf && \
    echo '}' >> /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]