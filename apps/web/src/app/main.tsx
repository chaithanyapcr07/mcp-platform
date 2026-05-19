import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, BookOpen, CheckCircle2, FileCode2, KeyRound, Play, ShieldCheck } from "lucide-react";
import { api, getDevToken } from "../lib/api";
import { Badge } from "../components/Badge";
import "./styles.css";

type Tab = "connectors" | "skills" | "tasks" | "access" | "audit" | "templates";

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
    getDevToken(email).then((result) => setToken(result.token)).catch((error) => setMessage(error.message));
  }, [email]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api<any[]>("/connectors", token),
      api<any[]>("/skills", token),
      api<any[]>("/tasks", token),
      api<any[]>("/templates", token)
    ]).then(([connectors, skills, tasks, templates]) => setData({ connectors, skills, tasks, templates })).catch((error) => setMessage(error.message));
  }, [token]);

  const nav = useMemo(() => [
    ["connectors", BookOpen, "Connector Catalog"],
    ["skills", ShieldCheck, "Skill Catalog"],
    ["tasks", Play, "Task Catalog"],
    ["access", KeyRound, "Project Access"],
    ["audit", Activity, "Audit Log"],
    ["templates", FileCode2, "Templates"]
  ] as const, []);

  async function invokeSearch() {
    setMessage("Invoking local knowledge base...");
    const result = await api("/gateway/connectors/local-knowledge-base/tools/search_items/invoke", token, {
      method: "POST",
      headers: { "x-project-id": "platform-internal" },
      body: JSON.stringify({ query: "runbook" })
    });
    setMessage(JSON.stringify(result, null, 2));
  }

  async function executeTask() {
    setMessage("Executing task...");
    const result = await api("/gateway/tasks/search-runbook-and-draft-response/execute", token, {
      method: "POST",
      headers: { "x-project-id": "platform-internal" },
      body: JSON.stringify({ query: "database failover" })
    });
    setMessage(JSON.stringify(result, null, 2));
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
            <p className="eyebrow">Governed MCP connectors, skills, and tasks</p>
            <h1>{nav.find(([id]) => id === tab)?.[2]}</h1>
          </div>
          <div className="actions">
            <button onClick={invokeSearch}><Play size={16} /> Invoke KB Tool</button>
            <button onClick={executeTask}><Play size={16} /> Execute Task</button>
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
            <h2>Platform Internal Project</h2>
            <p>Seeded access approvals let project developers invoke the Local Knowledge Base connector and execute the runbook search task.</p>
            <button onClick={invokeSearch}><Play size={16} /> Verify connector access</button>
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
