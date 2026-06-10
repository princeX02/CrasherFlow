FROM node:18-alpine

WORKDIR /app

# Use production mode by default
ENV NODE_ENV=production

# Install dependencies (prefer npm ci when lockfile exists)
COPY package.json package-lock.json* ./
RUN npm ci --only=production || npm install --production

# Copy app source
COPY . .

# Run as non-root when possible
RUN chown -R node:node /app
USER node

EXPOSE 3000

CMD ["npm","start"]
