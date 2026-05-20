import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, BookOpen, CheckCircle2, FileCode2, KeyRound, Play, ShieldCheck, Workflow } from "lucide-react";
import { ApiRequestError, api, getDevToken } from "../lib/api.js";
import { Badge } from "../components/Badge.js";
import "./styles.css";

type Tab = "connectors" | "jira" | "templates" | "access" | "selfService" | "skills" | "tasks" | "audit";
type DevTokenResponse = { token: string };
type ActionResult = {
  kind: "loading" | "success" | "denied" | "info";
  title: string;
  detail: string;
  requestId?: string;
  body?: any;
};

const implementedConnectors = new Set(["jira", "servicenow", "local-knowledge-base"]);

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected request failure";
}

function statusTone(status: string) {
  if (status === "approved") return "good";
  if (["requested", "draft", "submitted", "pending_review"].includes(status)) return "warn";
  if (["disabled", "rejected", "denied"].includes(status)) return "danger";
  return "neutral";
}

function connectorStage(connector: any) {
  if (implementedConnectors.has(connector.id)) return "Runtime wired";
  return "Catalog metadata only";
}

function connectorNextStep(connector: any) {
  if (connector.status !== "approved") {
    return "Not executable yet. Connector owner must finish implementation and platform/security must approve it.";
  }
  if (!implementedConnectors.has(connector.id)) {
    return "Approved metadata, but no local runtime is wired in this starter kit.";
  }
  return "Executable through MCP Gateway in local demo mode.";
}

function requestNextStep(request: any) {
  if (request.type === "existing_connector_access") {
    if (request.status === "requested") return "Platform/security reviews the access request. After approval, the project can invoke the selected connector tools through MCP Gateway.";
    if (request.status === "approved") return "Access is approved. The DS or ADK app can use the MCP Gateway URL and project ID.";
  }
  if (request.type === "new_connector_registration") {
    if (request.status === "draft") return "Connector owner reviews generated SDD artifacts, submits the request, then platform/security reviews it before production use.";
    if (request.status === "submitted") return "Security and platform reviews are pending. Write tools stay approval-gated.";
  }
  return "Open the request details, review artifacts/comments, and route it through approval.";
}

function uniqueLatestRequests(requests: any[]) {
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const request of requests) {
    const key = `${request.type}:${request.projectId ?? request.team}:${request.connectorId ?? request.desiredSystem}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(request);
  }
  return unique;
}

function ResultPanel({ result }: { result: ActionResult | null }) {
  if (!result) {
    return (
      <div className="result empty">
        <strong>Try a gateway action</strong>
        <span>Run Jira search to see returned issues, or test denied write to see policy enforcement and the generated request ID.</span>
      </div>
    );
  }
  return (
    <div className={`result ${result.kind}`}>
      <div>
        <strong>{result.title}</strong>
        <span>{result.detail}</span>
        {result.requestId && <small>Request ID: {result.requestId}</small>}
      </div>
      {result.body && <pre>{JSON.stringify(result.body, null, 2)}</pre>}
    </div>
  );
}

function App() {
  const [email, setEmail] = useState("developer@example.com");
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Tab>("connectors");
  const [data, setData] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    getDevToken(email)
      .then((response: DevTokenResponse) => setToken(response.token))
      .catch((error: unknown) => setResult({ kind: "denied", title: "Unable to sign in", detail: errorMessage(error) }));
  }, [email]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<any[]>("/connectors", token),
      api<any[]>("/skills", token),
      api<any[]>("/tasks", token),
      api<any[]>("/templates", token),
      api<any[]>("/self-service/requests?take=25", token)
    ])
      .then(([connectors, skills, tasks, templates, selfService]) => setData({ connectors, skills, tasks, templates, selfService }))
      .catch((error: unknown) => setResult({ kind: "denied", title: "Unable to load catalog", detail: errorMessage(error) }));
  }, [token]);

  const nav = useMemo(() => [
    ["connectors", BookOpen, "Connector Catalog"],
    ["jira", Workflow, "Jira Connector Example"],
    ["templates", FileCode2, "Connector Template Gallery"],
    ["access", KeyRound, "Project Access Requests"],
    ["selfService", KeyRound, "Self-Service Requests"],
    ["skills", ShieldCheck, "Skill Catalog"],
    ["tasks", Play, "Task Catalog"],
    ["audit", Activity, "Audit Log"]
  ] as const, []);

  const connectors = useMemo(() => [...(data.connectors ?? [])].sort((a, b) => {
    const aImplemented = implementedConnectors.has(a.id) ? 0 : 1;
    const bImplemented = implementedConnectors.has(b.id) ? 0 : 1;
    if (aImplemented !== bImplemented) return aImplemented - bImplemented;
    if (a.status !== b.status) return a.status === "approved" ? -1 : b.status === "approved" ? 1 : 0;
    return a.name.localeCompare(b.name);
  }), [data.connectors]);

  const selfServiceRequests = useMemo(() => uniqueLatestRequests(data.selfService ?? []), [data.selfService]);
  const hiddenDuplicateCount = Math.max((data.selfService ?? []).length - selfServiceRequests.length, 0);
  const canReview = email === "admin@example.com" || email === "security@example.com";

  async function invokeJiraSearch() {
    setResult({ kind: "loading", title: "Invoking Jira search", detail: "MCP Gateway is checking auth, RBAC, project access, connector status, and policy before calling Jira mock mode." });
    try {
      const response = await api<any>("/gateway/connectors/jira/tools/jira.search_issues/invoke", token, {
        method: "POST",
        body: JSON.stringify({
          projectId: "ai-platform-demo",
          input: {
            jql: "project = DEMO ORDER BY created DESC",
            maxResults: 10
          }
        })
      });
      setResult({
        kind: "success",
        title: `Jira search returned ${response.output?.issues?.length ?? 0} issues`,
        detail: "This is what a DS or ADK agent receives when it calls Jira through the governed MCP Gateway.",
        requestId: response.requestId,
        body: response.output
      });
      void loadAudit();
    } catch (error: unknown) {
      setResult({ kind: "denied", title: "Jira search failed", detail: errorMessage(error), body: error instanceof ApiRequestError ? error.body : undefined });
    }
  }

  async function invokeDeniedJiraWrite() {
    setResult({ kind: "loading", title: "Testing write policy", detail: "This intentionally tries jira.create_issue as a project developer. High-risk write tools require approval before execution." });
    try {
      const response = await api<any>("/gateway/connectors/jira/tools/jira.create_issue/invoke", token, {
        method: "POST",
        body: JSON.stringify({
          projectId: "ai-platform-demo",
          input: {
            projectKey: "DEMO",
            summary: "Bug from incident",
            description: "Created through governed MCP Gateway"
          }
        })
      });
      setResult({ kind: "success", title: "Write action executed", detail: "The request was allowed by policy.", requestId: response.requestId, body: response });
    } catch (error: unknown) {
      const body = error instanceof ApiRequestError ? error.body : undefined;
      setResult({
        kind: "denied",
        title: "Write action was approval-gated",
        detail: "This is expected. The gateway created an approval-required decision instead of letting the agent write directly to Jira.",
        requestId: body?.requestId,
        body
      });
      void loadAudit();
    }
  }

  async function loadAudit() {
    const events = await api<any[]>("/audit/events?take=25", token);
    setData((current) => ({ ...current, audit: events }));
  }

  async function generateTemplate(id: string) {
    const generated = await api(`/templates/${id}/generate`, token, {
      method: "POST",
      body: JSON.stringify({ name: "team-starter", ownerTeam: "ai-platform" })
    });
    setResult({ kind: "info", title: "Template generated", detail: "The API returned the scaffold contents that a CLI or portal can write to a connector repo.", body: generated });
  }

  async function refreshSelfService() {
    const requests = await api<any[]>("/self-service/requests?take=25", token);
    setData((current) => ({ ...current, selfService: requests }));
  }

  async function createJiraAccessRequest() {
    const created = await api<any>("/self-service/access-requests", token, {
      method: "POST",
      body: JSON.stringify({
        projectId: "ai-platform-demo",
        connectorId: "jira",
        requestedTools: ["jira.search_issues"],
        team: "incident-response",
        readOrWriteIntent: "read",
        businessJustification: "Use approved Jira search from an incident-response ADK agent.",
        dataClassification: "confidential",
        expectedVolume: "100 requests/day",
        source: "portal"
      })
    });
    await refreshSelfService();
    setSelected(created);
    setResult({
      kind: "info",
      title: created.reusedExisting ? "Existing Jira access request opened" : "Jira access request created",
      detail: requestNextStep(created),
      body: { id: created.id, status: created.status, requestedTools: created.requestedTools }
    });
  }

  async function createServiceNowConnectorRequest() {
    const created = await api<any>("/self-service/connector-requests", token, {
      method: "POST",
      body: JSON.stringify({
        projectId: "ai-platform-demo",
        desiredSystem: "servicenow",
        connectorId: "servicenow-mcp-connector",
        requestedTools: ["servicenow.search_incidents", "servicenow.get_incident", "servicenow.create_incident", "servicenow.update_incident"],
        team: "service-management-platform",
        ownerTeam: "service-management-platform",
        runtimeOwner: "service-management-platform",
        securityReviewer: "security-platform",
        deploymentMode: "remote",
        readOrWriteIntent: "read_write",
        businessJustification: "Generate a governed ServiceNow connector onboarding package for incident-response agents.",
        dataClassification: "confidential",
        expectedVolume: "500 requests/day",
        source: "portal"
      })
    });
    await refreshSelfService();
    setSelected(created);
    setResult({
      kind: "info",
      title: created.reusedExisting ? "Existing ServiceNow proposal opened" : "ServiceNow connector proposal created",
      detail: requestNextStep(created),
      body: { id: created.id, status: created.status, artifacts: created.artifacts?.map((artifact: any) => artifact.name) }
    });
  }

  async function updateSelectedRequest(path: string, title: string) {
    if (!selected?.id) return;
    const updated = await api<any>(path, token, {
      method: "POST",
      body: JSON.stringify({ reason: title })
    });
    await refreshSelfService();
    setSelected(updated);
    setResult({ kind: "success", title, detail: requestNextStep(updated), body: { id: updated.id, status: updated.status } });
  }

  return (
    <main>
      <aside>
        <div className="brand">
          <CheckCircle2 size={22} />
          <div>
            <strong>MCP Platform</strong>
            <span>Internal AI Platform</span>
          </div>
        </div>
        <label>
          Actor
          <select value={email} onChange={(event) => setEmail(event.target.value)}>
            <option>developer@example.com</option>
            <option>admin@example.com</option>
            <option>security@example.com</option>
            <option>auditor@example.com</option>
          </select>
        </label>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button key={id} className={tab === id ? "active" : ""} onClick={() => {
              setTab(id);
              if (id === "audit") void loadAudit();
            }}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
      </aside>
      <section>
        <header>
          <div>
            <p className="eyebrow">Template-first MCP connector onboarding</p>
            <h1>{nav.find(([id]) => id === tab)?.[2]}</h1>
          </div>
          <div className="actions">
            <button onClick={invokeJiraSearch}><Play size={16} /> Invoke Jira Search</button>
            <button onClick={invokeDeniedJiraWrite}><ShieldCheck size={16} /> Demo Denied Write</button>
          </div>
        </header>

        <ResultPanel result={result} />

        {tab === "connectors" && (
          <>
            <div className="explain">
              <strong>Why are many connectors draft?</strong>
              <span>Only Jira, ServiceNow, and Local Knowledge Base are wired end to end in this starter kit. The other enterprise systems are seed catalog metadata so teams can see the onboarding target without pretending integrations are already production-ready.</span>
            </div>
            <div className="grid">
              {connectors.map((connector) => (
                <button className={`card ${implementedConnectors.has(connector.id) ? "implemented" : ""}`} key={connector.id} onClick={() => setSelected(connector)}>
                  <strong>{connector.name}</strong>
                  <span>{connector.description}</span>
                  <small>{connectorNextStep(connector)}</small>
                  <div className="row">
                    <Badge tone={statusTone(connector.status)}>{connector.status}</Badge>
                    <Badge tone={implementedConnectors.has(connector.id) ? "good" : "neutral"}>{connectorStage(connector)}</Badge>
                    {connector.riskLevel && <Badge>{connector.riskLevel}</Badge>}
                    {connector.dataClassification && <Badge>{connector.dataClassification}</Badge>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {["skills", "tasks"].includes(tab) && (
          <div className="grid">
            {(data[tab] ?? []).map((item) => (
              <button className="card" key={item.id} onClick={() => setSelected(item)}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
                <div className="row">
                  <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                  {item.riskLevel && <Badge>{item.riskLevel}</Badge>}
                  {item.dataClassification && <Badge>{item.dataClassification}</Badge>}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === "access" && (
          <div className="panel">
            <h2>AI Platform Demo Project</h2>
            <p>Seeded access lets project developers invoke approved Jira and ServiceNow read tools through the gateway. Write tools stay approval-gated, which is the expected enterprise behavior.</p>
            <div className="actions inline">
              <button onClick={invokeJiraSearch}><Play size={16} /> Verify Jira access</button>
              <button onClick={invokeDeniedJiraWrite}><ShieldCheck size={16} /> Verify write approval gate</button>
            </div>
          </div>
        )}

        {tab === "selfService" && (
          <div className="panel">
            <h2>Self-Service MCP Onboarding</h2>
            <p>Requests are intake records. They do not auto-approve production usage. Open a row to see owner, tools, generated artifacts, and the next review step.</p>
            {hiddenDuplicateCount > 0 && <p className="subtle">Showing the latest request per connector/project. Hidden duplicate test records: {hiddenDuplicateCount}.</p>}
            <div className="actions inline">
              <button onClick={createJiraAccessRequest}><KeyRound size={16} /> Request Jira access</button>
              <button onClick={createServiceNowConnectorRequest}><FileCode2 size={16} /> Propose ServiceNow connector</button>
              <button onClick={refreshSelfService}><Activity size={16} /> Refresh</button>
            </div>
            <div className="table requestTable">
              <div className="tableHead">
                <span>Request</span>
                <span>Connector</span>
                <span>Status</span>
                <span>Next step</span>
              </div>
              {selfServiceRequests.map((request) => (
                <button className="tableRow clickable" key={request.id} onClick={() => setSelected(request)}>
                  <span>{request.type.replaceAll("_", " ")}</span>
                  <strong>{request.connectorId ?? request.desiredSystem}</strong>
                  <Badge tone={statusTone(request.status)}>{request.status}</Badge>
                  <span>{requestNextStep(request)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "jira" && (
          <div className="panel">
            <h2>Jira Connector Example</h2>
            <p>Jira runs in mock mode without credentials and exposes read and write tools. Agents call MCP Gateway; the gateway enforces auth, RBAC, project access, policy, audit, metrics, and traces before calling Jira.</p>
            <div className="snippet">
              <strong>Sample gateway invocation</strong>
              <pre>{`POST /gateway/connectors/jira/tools/jira.search_issues/invoke
{
  "projectId": "ai-platform-demo",
  "input": {
    "jql": "project = DEMO ORDER BY created DESC",
    "maxResults": 10
  }
}`}</pre>
            </div>
            <div className="actions inline">
              <button onClick={invokeJiraSearch}><Play size={16} /> Run search</button>
              <button onClick={invokeDeniedJiraWrite}><ShieldCheck size={16} /> Test write policy</button>
            </div>
          </div>
        )}

        {tab === "audit" && (
          <div className="table auditTable">
            <div className="tableHead">
              <span>Time</span>
              <span>Action</span>
              <span>Decision</span>
              <span>Reason</span>
            </div>
            {(data.audit ?? []).map((event) => (
              <div className="tableRow" key={event.id}>
                <span>{new Date(event.timestamp).toLocaleString()}</span>
                <strong>{event.action}</strong>
                <Badge tone={event.decision === "allowed" ? "good" : "danger"}>{event.decision}</Badge>
                <span>{event.reason}</span>
              </div>
            ))}
          </div>
        )}

        {tab === "templates" && (
          <div className="grid">
            {(data.templates ?? []).map((template) => (
              <button className="card" key={template.id} onClick={() => generateTemplate(template.id)}>
                <strong>{template.id}</strong>
                <span>{template.description}</span>
                <Badge>{template.type}</Badge>
                {template.type === "connector" && <small>npm run create:connector -- --name team-connector --template {template.id}</small>}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="drawer">
            <button className="close" onClick={() => setSelected(null)}>Close</button>
            <p className="eyebrow">Details</p>
            <h2>{selected.name ?? selected.connectorId ?? selected.desiredSystem ?? selected.id}</h2>
            {selected.type && (
              <div className="nextStep">
                <strong>What happens next?</strong>
                <span>{requestNextStep(selected)}</span>
              </div>
            )}
            {selected.artifacts?.length > 0 && (
              <div className="artifactList">
                <strong>Generated artifacts</strong>
                {selected.artifacts.map((artifact: any) => <span key={artifact.id}>{artifact.name}</span>)}
              </div>
            )}
            {selected.type && (
              <div className="actions inline">
                {selected.status === "draft" && <button onClick={() => updateSelectedRequest(`/self-service/requests/${selected.id}/submit`, "Request submitted for review")}>Submit for review</button>}
                {canReview && !["approved", "rejected"].includes(selected.status) && <button onClick={() => updateSelectedRequest(`/self-service/requests/${selected.id}/approve`, "Request approved")}>Approve request</button>}
                {canReview && !["approved", "rejected"].includes(selected.status) && <button onClick={() => updateSelectedRequest(`/self-service/requests/${selected.id}/reject`, "Request rejected")}>Reject request</button>}
              </div>
            )}
            <pre>{JSON.stringify(selected, null, 2)}</pre>
          </div>
        )}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
