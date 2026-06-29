FROM node:22-alpine

WORKDIR /app

# Copy package files for caching
COPY package.json package-lock.json ./
RUN npm ci

# Copy application
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
