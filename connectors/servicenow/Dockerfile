FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install && npm run build -w @mcp-platform/servicenow-connector
EXPOSE 4300
CMD ["npm","run","start","-w","@mcp-platform/servicenow-connector"]

