# Dependencies
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

# Development
FROM deps AS dev

WORKDIR /app

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]

# Build
FROM deps AS builder

WORKDIR /app

COPY . .
RUN npm run build

# Production
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
