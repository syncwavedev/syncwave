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

# Build the web
WORKDIR /app/packages/web

ARG STAGE
RUN if [ -z "$STAGE" ]; then \
    echo "Error: STAGE argument is required."; \
    exit 1; \
    fi
ENV PUBLIC_STAGE=$STAGE

RUN npm run build

# Delete source code files that were used to build the app that are no longer needed
RUN rm -rf src/ static/ emailTemplates/ docker-compose.yml

# The USER instruction sets the user name to use as the default user for the remainder of the current stage
USER node:node

EXPOSE 3000

ENV NODE_ENV=production
ENV NODE_OPTIONS='--enable-source-maps'

# This is the command that will be run inside the image when you tell Docker to start the container
CMD ["node", "build/index.js"]
