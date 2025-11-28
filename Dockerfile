# Stage 1 - build
FROM node:20-bullseye as build
WORKDIR /app
COPY package*.json ./
COPY pnpm-lock.yaml* ./
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# Stage 2 - runtime
FROM node:20-alpine
WORKDIR /app
# Create a non-root user
RUN addgroup -S app && adduser -S -G app app
# Copy only built files and package.json for production deps (if needed)
COPY --from=build /app/dist ./dist
COPY package*.json ./
ENV NODE_ENV=production
RUN npm ci --production --legacy-peer-deps
# Expose port used by your app
EXPOSE 3000
USER app
CMD ["node", "dist/server.js"]
