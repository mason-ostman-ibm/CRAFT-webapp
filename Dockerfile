# ============================================================================
# Multi-stage Production Build for Excel AI Processor
# Node.js Frontend + Backend Only (Python microservice deployed separately)
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

# Stage 3: Final Production Image
FROM node:20-alpine

WORKDIR /app

# Copy frontend build from builder
COPY --from=frontend-builder /build/dist ./dist

# Copy backend files
COPY api ./api

# Copy backend node_modules from builder
COPY --from=backend-builder /build/node_modules ./node_modules

# Create necessary directories
RUN mkdir -p uploads && \
    chmod 755 uploads

# Add non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 3000

# Start Node.js backend (serves frontend + API)
CMD ["node", "api/server.js"]

# Made with Bob