# Jira Connector Onboarding

The Jira connector is the reference onboarding path.

## Run In Mock Mode

```bash
cp .env.example .env
npm install
npm run dev:jira
```

Health:

```bash
curl http://localhost:4200/health
```

## Run The Platform

```bash
docker compose up --build
```

## Invoke Search Through Gateway

```bash
DEV_TOKEN=$(curl -s -X POST http://localhost:4000/auth/dev-token \
  -H 'content-type: application/json' \
  -d '{"email":"developer@example.com"}' | jq -r .token)

curl -s -X POST http://localhost:4000/gateway/connectors/jira/tools/jira.search_issues/invoke \
  -H "authorization: Bearer $DEV_TOKEN" \
  -H "content-type: application/json" \
  -d '{"projectId":"ai-platform-demo","input":{"jql":"project = DEMO ORDER BY created DESC","maxResults":10}}'
```

## Real Jira Mode

Set:

```bash
JIRA_AUTH_MODE=api_token
JIRA_BASE_URL=https://your-company.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-token
```

Do not commit real credentials.

## Approval Behavior

`jira.search_issues` and `jira.get_issue` are read tools. `jira.create_issue`, `jira.add_comment`, and `jira.transition_issue` are write tools and require human approval by default.
