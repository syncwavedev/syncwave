FROM node:22-slim AS base

FROM base AS deps

WORKDIR /app

COPY package*.json .
COPY packages/www/package*.json ./packages/www/

RUN npm install

FROM base AS builder

WORKDIR /app

COPY . .
COPY --from=deps /app .

WORKDIR /app/packages/www
RUN npm run build

FROM nginx:1.26.3-alpine AS runtime
COPY ./packages/www/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/packages/www/dist /usr/share/nginx/html
EXPOSE 8080
