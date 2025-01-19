FROM node:18 AS base
RUN npm install -g npm@9.7.1

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then yarn global add pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

ENV NODE_ENV production

EXPOSE 3000
ENV PORT 3000

HEALTHCHECK --interval=10s --timeout=10s --start-period=1m CMD curl -f --retry 1 --max-time 3 "http://localhost:3000" || bash -c 'kill -s 15 -1 && (sleep 10; kill -s 9 -1)'

CMD ["npm", "run", "serve"]
