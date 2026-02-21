# Use official Node.js LTS image
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Create audio directory for TTS output
RUN mkdir -p audio

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "index.js"]
