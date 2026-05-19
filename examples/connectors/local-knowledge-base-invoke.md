# Invoke Local Knowledge Base

```bash
curl -s -X POST http://localhost:4000/gateway/connectors/local-knowledge-base/tools/search_items/invoke \
  -H "authorization: Bearer $TOKEN" \
  -H "x-project-id: platform-internal" \
  -H "content-type: application/json" \
  -d '{"query":"runbook"}'
```
