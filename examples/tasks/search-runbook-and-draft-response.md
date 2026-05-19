# Search Runbook And Draft Response

```bash
curl -s -X POST http://localhost:4000/gateway/tasks/search-runbook-and-draft-response/execute \
  -H "authorization: Bearer $TOKEN" \
  -H "x-project-id: platform-internal" \
  -H "content-type: application/json" \
  -d '{"query":"database failover"}'
```
