# MCP Connector Validator

Validates generated connector repos before platform/security review.

```bash
npm run connector:validate -- --path generated-repos/servicenow-mcp-connector
```

Checks include required files, ownership fields, write-action approval defaults, secret placeholders, runtime scaffold, and SDD artifacts.

