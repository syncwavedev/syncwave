FROM node:22-bullseye AS builder

# We need those for C bindings (foundationdb)
RUN apt-get update
RUN apt-get install -y python3 make g++ curl
RUN rm -rf /var/lib/apt/lists/*

# Install FoundationDB clients
RUN curl -L -o foundationdb-clients.deb https://github.com/apple/foundationdb/releases/download/7.3.43/foundationdb-clients_7.3.43-1_amd64.deb
RUN dpkg -i foundationdb-clients.deb
RUN rm foundationdb-clients.deb

WORKDIR /app

COPY . .

WORKDIR /app
RUN npm i

WORKDIR /app/packages/data
RUN npm run build

WORKDIR /app/packages/app

ARG STAGE
RUN if [ -z "$STAGE" ]; then \
    echo "Error: STAGE argument is required."; \
    exit 1; \
    fi
ENV PUBLIC_STAGE=$STAGE

RUN npm run build

RUN rm -rf src/ static/ emailTemplates/ docker-compose.yml

USER node:node

EXPOSE 3000

ENV NODE_ENV=production
ENV NODE_OPTIONS='--enable-source-maps'

CMD ["npm", "run", "serve"]
