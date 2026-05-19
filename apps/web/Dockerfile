FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install && npm run build -w @mcp-platform/web
EXPOSE 3000
CMD ["npm", "run", "dev", "-w", "@mcp-platform/web"]
