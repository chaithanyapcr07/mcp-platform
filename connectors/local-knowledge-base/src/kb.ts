export type KnowledgeItem = {
  id: string;
  projectId: string;
  title: string;
  body: string;
  tags: string[];
};

export const items: KnowledgeItem[] = [
  {
    id: "kb-001",
    projectId: "platform-internal",
    title: "Database Failover Runbook",
    body: "Use the primary incident channel, verify replica lag, promote the healthiest replica, rotate application write endpoint, and open a follow-up reliability task.",
    tags: ["database", "incident", "runbook"]
  },
  {
    id: "kb-002",
    projectId: "platform-internal",
    title: "Deployment Risk Checklist",
    body: "Check recent incidents, error budget burn, pending database migrations, feature flag rollback coverage, and owner availability before approving deployment.",
    tags: ["deployment", "risk", "release"]
  },
  {
    id: "kb-003",
    projectId: "security-review",
    title: "Restricted Data Handling",
    body: "Restricted data connectors require explicit project approval, SIEM audit export, and runtime identity scoping before production execution.",
    tags: ["security", "restricted", "policy"]
  }
];

export function searchItems(query: string) {
  const normalized = query.toLowerCase();
  return items.filter((item) =>
    [item.title, item.body, item.projectId, ...item.tags].some((value) => value.toLowerCase().includes(normalized))
  );
}
