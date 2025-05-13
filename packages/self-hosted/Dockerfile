FROM node:22-slim AS base

FROM base AS deps

WORKDIR /app

COPY package*.json .
COPY packages/lib/package*.json ./packages/lib/
COPY packages/server/package*.json ./packages/server/
COPY packages/app/package*.json ./packages/app/

# Self-hosted doesn't use FoundationDB
RUN cd packages/server && sed -i '/foundationdb/d' package.json

RUN npm install

FROM base AS builder

WORKDIR /app

COPY . .
COPY --from=deps /app .

WORKDIR /app/packages/lib
RUN npm run build

WORKDIR /app/packages/server
RUN rm ./src/fdb-kv-store.ts ./src/fdb-kv-store.spec.ts
RUN npm run build

WORKDIR /app/packages/app
RUN VITE_PUBLIC_STAGE=self npm run build

FROM base AS runtime

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/lib/package.json ./packages/lib/
COPY --from=builder /app/packages/server/package.json ./packages/server/

RUN npm install --omit=dev

COPY --from=builder /app/packages/lib/dist ./packages/lib/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/app/dist ./packages/server/ui/

ENV PORT=8080
EXPOSE 8080

ENV STAGE=self
ENV AWS_DEFAULT_REGION=us-east-1

ENV NODE_ENV=production
ENV NODE_OPTIONS='--enable-source-maps'

WORKDIR /app/packages/server

VOLUME /data

CMD ["node", "dist/esm/src/entrypoint.js"]
