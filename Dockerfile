FROM node:20-alpine

# Build tools needed for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["./start.sh"]
