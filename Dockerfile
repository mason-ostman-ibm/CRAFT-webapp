# ============================================================================
# Multi-stage Production Build for Excel AI Processor
# ============================================================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /build

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Build Backend Dependencies
FROM node:20-alpine AS backend-builder

WORKDIR /build

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Stage 3: Python Dependencies
FROM python:3.11-alpine AS python-builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache gcc musl-dev linux-headers

# Copy and install Python dependencies
COPY api/python-service/requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 4: Final Production Image
FROM node:20-alpine

WORKDIR /app

# Install Python runtime (no build tools needed)
RUN apk add --no-cache python3 py3-pip

# Copy frontend build from builder to /app/web/dist (Golden Path structure)
COPY --from=frontend-builder /build/dist ./web/dist

# Copy backend files
COPY api ./api

# Copy backend node_modules from builder
COPY --from=backend-builder /build/node_modules ./node_modules

# Copy Python dependencies from builder
COPY --from=python-builder /install /usr/local

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/uploads && \
    chmod 777 /tmp/uploads

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose ports
EXPOSE 3000 5000

# Start Node.js server (which will start Python service via server.js)
CMD ["node", "api/server.js"]

# Made with Bob