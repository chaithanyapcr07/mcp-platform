# MDK App Template With MCP Gateway

This example shows how an MDK app/runtime template should provide MCP Gateway configuration to ADK agent code.

MDK owns:

- runtime shape
- deployment defaults
- MCP Gateway client config
- project ID wiring

ADK owns:

- agent behavior
- allowed skills/tasks
- prompts and workflow logic

## Files

- `mdk-template.yaml`: app/runtime template
- `mcp-gateway-client.yaml`: gateway client config

## Local Test

```bash
npm run platform:start
curl -s http://localhost:4000/observability/health
npm run demo:jira-search
```

Expected: app template points to MCP Gateway and runtime data appears in metrics, dashboards, traces, and audit logs.
