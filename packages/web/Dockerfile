# Use a Node.js base image
FROM node:22-bullseye AS builder

# Install additional dependencies
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
WORKDIR /app/packages/web
RUN npm run build

ENV NODE_ENV production

EXPOSE 3000
ENV PORT 3000

HEALTHCHECK --interval=10s --timeout=10s --start-period=1m CMD curl -f --retry 1 --max-time 3 "http://localhost:3000" || bash -c 'kill -s 15 -1 && (sleep 10; kill -s 9 -1)'

# Run the built application
CMD ["npm", "run", "serve"]
