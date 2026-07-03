FROM node:22-alpine

WORKDIR /app

# Copy package files for caching
COPY package.json package-lock.json ./
RUN rm -rf node_modules package-lock.json && npm install

# Copy application
COPY . .

EXPOSE 5173

# Clear Vite cache on startup to prevent stale module serving
CMD sh -c "rm -rf /app/node_modules/.vite && npm run dev -- --host 0.0.0.0"
