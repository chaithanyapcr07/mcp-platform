# ServiceNow MCP Connector

Golden path ServiceNow connector for the MCP Platform Starter Kit.

It supports:

- mock mode for local development
- real mode using `SERVICENOW_BASE_URL` and `SERVICENOW_API_TOKEN`
- read tools for search/get incidents
- write tools for create/update incidents, which require gateway human approval by default

## Run Locally

```bash
cp .env.example .env
npm install
npm run dev -w @mcp-platform/servicenow-connector
```

## Tools

- `servicenow.search_incidents`
- `servicenow.get_incident`
- `servicenow.create_incident`
- `servicenow.update_incident`

ADK/MDK apps should call MCP Gateway, not this connector directly.

