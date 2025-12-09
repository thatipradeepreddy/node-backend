# Stage 1 - build
FROM node:20-bullseye as build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy the rest of the source code
COPY . .

# Build the TypeScript / app
RUN npm run build

# Stage 2 - runtime
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -S app && adduser -S -G app app

# Copy built files and package.json for production dependencies
COPY --from=build /app/dist ./dist
COPY package*.json ./

ENV NODE_ENV=production

# Install only production dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# App listens on port 3000
EXPOSE 3000

USER app

# Adjust entrypoint if your main file is different
CMD ["node", "dist/server.js"]
