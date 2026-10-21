FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build frontend and server
RUN npm run build

# Expose port (default 3000)
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Start server
CMD ["npm", "start"]
