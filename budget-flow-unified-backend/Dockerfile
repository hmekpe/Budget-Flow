FROM oven/bun:1.2.19-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY jsconfig.json ./
COPY src ./src
COPY sql ./sql
COPY flowise ./flowise

EXPOSE 5002

CMD ["bun", "run", "start"]
