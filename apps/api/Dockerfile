FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install \
  && npm run build -w @mcp-platform/shared-types \
  && npm run build -w @mcp-platform/policy-core \
  && npm run db:generate -w @mcp-platform/api \
  && npm run build -w @mcp-platform/api
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "@mcp-platform/api"]
