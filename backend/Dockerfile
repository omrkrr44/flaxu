FROM node:18-alpine

WORKDIR /app

# Install dependencies for native modules and OpenSSL 1.1 for Prisma
RUN apk add --no-cache python3 make g++ openssl1.1-compat

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 4000

# Start application
CMD ["npm", "run", "start"]
