FROM node:22-slim AS base

FROM base AS deps

WORKDIR /app

COPY package*.json .
COPY packages/data/package*.json ./packages/data/
COPY packages/server/package*.json ./packages/server/
COPY packages/app/package*.json ./packages/app/

# Self-hosted doesn't use FoundationDB
RUN cd packages/server && sed -i '/foundationdb/d' package.json

RUN npm i

FROM base AS builder

WORKDIR /app

COPY . .
COPY --from=deps /app .

WORKDIR /app/packages/data
RUN npm run build

WORKDIR /app/packages/server
RUN rm ./src/fdb-kv-store.ts ./src/fdb-kv-store.spec.ts
RUN npm run build

WORKDIR /app/packages/app
RUN VITE_PUBLIC_STAGE=self_hosted npm run build

FROM base AS runtime

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/data/package.json ./packages/data/
COPY --from=builder /app/packages/server/package.json ./packages/server/

RUN npm install --omit=dev

COPY --from=builder /app/packages/data/dist ./packages/data/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/app/dist ./packages/server/ui/

EXPOSE 80

ENV STAGE=self
ENV AWS_DEFAULT_REGION=us-east-1

ENV NODE_ENV=production
ENV NODE_OPTIONS='--enable-source-maps'

WORKDIR /app/packages/server

VOLUME /data

CMD ["node", "dist/esm/src/entrypoint.js"]
