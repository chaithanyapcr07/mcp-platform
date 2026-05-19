FROM node:20-slim
WORKDIR /app
COPY . .
RUN npm install && npm run build -w @mcp-platform/jira-connector
EXPOSE 4200
CMD ["npm", "run", "start", "-w", "@mcp-platform/jira-connector"]
