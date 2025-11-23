# EPG Merge Frontend - Optimized Multi-stage Build (v0.4.7)
# Reduces image size from ~300MB to ~100MB

# Stage 1: Builder - Build React app with all dependencies
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies (npm will be removed in next stage)
RUN npm ci --prefer-offline --no-audit || npm install --prefer-offline

# Copy source code
COPY frontend/public ./public
COPY frontend/src ./src

# Build application (optimizes for production)
RUN npm run build

# Stage 2: Runtime - Serve with minimal Nginx
FROM nginx:1.25-alpine

# Copy optimized nginx config
COPY frontend/nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]