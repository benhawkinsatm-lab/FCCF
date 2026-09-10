# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci

# Copy all source files
COPY . .

# Build Vite client assets and bundle server.ts to dist/server.cjs
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application output from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent storage mount directory (public/upload is where a host
# folder is bind-mounted in docker-compose.yml for the bulk-import feature)
RUN mkdir -p /app/data /app/public/upload && chown -R node:node /app

USER node

EXPOSE 3000

# Start compiled CommonJS server
CMD ["node", "dist/server.cjs"]
