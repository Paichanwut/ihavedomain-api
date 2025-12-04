# ----------------------
# Stage 1: Install dependencies
# ----------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Install pnpm (optional, ถ้าใช้ npm ก็ไม่ต้อง)
RUN npm install -g pnpm

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies
RUN if [ -f pnpm-lock.yaml ]; then pnpm install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

# ----------------------
# Stage 2: Build
# ----------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build Next.js
RUN npm run build

# ----------------------
# Stage 3: Production image
# ----------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy node_modules and built files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Expose port
EXPOSE 3000

# Start Next.js
CMD ["npm", "start"]