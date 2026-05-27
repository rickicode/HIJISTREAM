FROM oven/bun:latest
WORKDIR /app
COPY package.json ./
RUN bun install --production
COPY src/ ./src/
EXPOSE 3001
CMD ["bun", "src/index.js"]
