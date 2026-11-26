FROM node:22-bookworm-slim

WORKDIR /app

# Install build tools for better-sqlite3 native addon
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

COPY shared ./shared
COPY server ./server
COPY client ./client

RUN npm run build

ENV PORT=3001
ENV DB_PATH=/app/data/familia-town.db
EXPOSE 3001

CMD ["npm", "run", "start", "-w", "server"]
