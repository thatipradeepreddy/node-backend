# Stage 1 - build
FROM node:20-bullseye AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all deps (including dev, needed for build)
RUN npm ci --legacy-peer-deps

# Copy source
COPY . .

# Build the app
RUN npm run build

# --------------------------------------------------

# Stage 2 - runtime (⚠️ MUST BE glibc-based)
FROM node:20-bullseye

WORKDIR /app

# Install required system libs for onnxruntime
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libc6 \
    libstdc++6 \
    libgcc-s1 \
    && rm -rf /var/lib/apt/lists/*

# Copy built output
COPY --from=build /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production

# Install only production deps
RUN npm ci --omit=dev --legacy-peer-deps

# App listens on 3000
EXPOSE 3000

# Start server
CMD ["node", "dist/server.js"]
