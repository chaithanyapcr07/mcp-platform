FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install \
  && npm run build -w @mcp-platform/shared-types \
  && npm run build -w @mcp-platform/connector-sdk \
  && npm run build -w @mcp-platform/local-knowledge-base
EXPOSE 4100
CMD ["npm", "run", "start", "-w", "@mcp-platform/local-knowledge-base"]
