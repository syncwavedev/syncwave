FROM node:22-bullseye AS builder

# We need those for C bindings (foundationdb / sqlite)
RUN apt-get update
RUN apt-get install -y python3 make g++ curl
RUN rm -rf /var/lib/apt/lists/*

# Install FoundationDB clients
RUN curl -L -o foundationdb-clients.deb https://github.com/apple/foundationdb/releases/download/7.3.43/foundationdb-clients_7.3.43-1_amd64.deb
RUN dpkg -i foundationdb-clients.deb
RUN rm foundationdb-clients.deb

# Set the working directory
WORKDIR /app

# Copy the entire repository
COPY . .

# Install dependencies
WORKDIR /app
RUN npm ci

# Build common data package
WORKDIR /app/packages/data
RUN npm run build

# Build the server
WORKDIR /app/packages/server
RUN npm run build

EXPOSE 4567

ENV NODE_OPTIONS='--enable-source-maps'

CMD ["node", "dist/esm/src/index.js"]
