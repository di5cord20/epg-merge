# Frontend Dockerfile - EPG Merge v0.4.2
# Multi-stage build for production optimization

# Stage 1: Build
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci --prefer-offline --no-audit

# Copy source code
COPY frontend/public ./public
COPY frontend/src ./src

# Build application
RUN npm run build

# Stage 2: Runtime (Nginx)
FROM nginx:alpine

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder
COPY --from=builder /app/build /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/api/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]