import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, BookOpen, CheckCircle2, FileCode2, KeyRound, Play, ShieldCheck, Workflow } from "lucide-react";
import { api, getDevToken } from "../lib/api.js";
import { Badge } from "../components/Badge.js";
import "./styles.css";

type Tab = "connectors" | "jira" | "templates" | "access" | "selfService" | "skills" | "tasks" | "audit";
type DevTokenResponse = { token: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected request failure";
}

function statusTone(status: string) {
  if (status === "approved") return "good";
  if (status === "pending_review") return "warn";
  if (status === "disabled") return "danger";
  return "neutral";
}

function App() {
  const [email, setEmail] = useState("developer@example.com");
  const [token, setToken] = useState("");
  const [tab, setTab] = useState<Tab>("connectors");
  const [data, setData] = useState<Record<string, any[]>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getDevToken(email)
      .then((result: DevTokenResponse) => setToken(result.token))
      .catch((error: unknown) => setMessage(errorMessage(error)));
  }, [email]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<any[]>("/connectors", token),
      api<any[]>("/skills", token),
      api<any[]>("/tasks", token),
      api<any[]>("/templates", token),
      api<any[]>("/self-service/requests", token)
    ]).then(([connectors, skills, tasks, templates, selfService]) => setData({ connectors, skills, tasks, templates, selfService })).catch((error: unknown) => setMessage(errorMessage(error)));
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

  async function invokeJiraSearch() {
    setMessage("Invoking Jira search through the MCP Gateway...");
    try {
      const result = await api("/gateway/connectors/jira/tools/jira.search_issues/invoke", token, {
        method: "POST",
        body: JSON.stringify({
          projectId: "ai-platform-demo",
          input: {
            jql: "project = DEMO ORDER BY created DESC",
            maxResults: 10
          }
        })
      });
      setMessage(JSON.stringify(result, null, 2));
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    }
  }

  async function invokeDeniedJiraWrite() {
    setMessage("Invoking Jira write action to demonstrate policy denial...");
    try {
      const result = await api("/gateway/connectors/jira/tools/jira.create_issue/invoke", token, {
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
      setMessage(JSON.stringify(result, null, 2));
    } catch (error: unknown) {
      setMessage(errorMessage(error));
    }
  }

  async function loadAudit() {
    const events = await api<any[]>("/audit/events", token);
    setData((current) => ({ ...current, audit: events }));
  }

  async function generateTemplate(id: string) {
    const generated = await api(`/templates/${id}/generate`, token, {
      method: "POST",
      body: JSON.stringify({ name: "team-starter", ownerTeam: "ai-platform" })
    });
    setMessage(JSON.stringify(generated, null, 2));
  }

  async function refreshSelfService() {
    const requests = await api<any[]>("/self-service/requests", token);
    setData((current) => ({ ...current, selfService: requests }));
  }

  async function createJiraAccessRequest() {
    const created = await api("/self-service/access-requests", token, {
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
    setMessage(JSON.stringify(created, null, 2));
  }

  async function createServiceNowConnectorRequest() {
    const created = await api("/self-service/connector-requests", token, {
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
    setMessage(JSON.stringify(created, null, 2));
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
              if (id === "audit") loadAudit();
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

        {["connectors", "skills", "tasks"].includes(tab) && (
          <div className="grid">
            {(data[tab] ?? []).map((item) => (
              <button className="card" key={item.id} onClick={() => setSelected(item)}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
                <div className="row">
                  <Badge tone={statusTone(item.status) as any}>{item.status}</Badge>
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
            <p>Seeded access approvals let project developers invoke approved Jira read tools through the gateway. Write tools remain blocked until an approval workflow allows them.</p>
            <button onClick={invokeJiraSearch}><Play size={16} /> Verify Jira access</button>
          </div>
        )}

        {tab === "selfService" && (
          <div className="panel">
            <h2>Self-Service MCP Onboarding</h2>
            <p>Create a governed access request for an existing connector or propose a new team-owned connector. Requests keep generated artifacts, comments, approval steps, and audit trail together.</p>
            <div className="actions inline">
              <button onClick={createJiraAccessRequest}><KeyRound size={16} /> Request Jira access</button>
              <button onClick={createServiceNowConnectorRequest}><FileCode2 size={16} /> Propose ServiceNow connector</button>
              <button onClick={refreshSelfService}><Activity size={16} /> Refresh</button>
            </div>
            <div className="table">
              {(data.selfService ?? []).map((request) => (
                <button className="tableRow clickable" key={request.id} onClick={() => setSelected(request)}>
                  <span>{request.type}</span>
                  <strong>{request.connectorId ?? request.desiredSystem}</strong>
                  <Badge tone={request.status === "approved" ? "good" : request.status === "rejected" ? "danger" : "warn"}>{request.status}</Badge>
                  <span>{request.projectId ?? request.team}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {tab === "jira" && (
          <div className="panel">
            <h2>Jira Connector Example</h2>
            <p>The Jira connector runs in mock mode without credentials and exposes search, read, create, comment, and transition tools. Agents call the MCP Gateway; the gateway enforces auth, RBAC, project access, policy, and audit before calling Jira.</p>
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
          <div className="table">
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
            <h2>{selected.name}</h2>
            <pre>{JSON.stringify(selected, null, 2)}</pre>
          </div>
        )}

        {message && <pre className="console">{message}</pre>}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
