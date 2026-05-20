export type Incident = {
  number: string;
  shortDescription: string;
  description: string;
  priority: "1" | "2" | "3" | "4";
  state: "new" | "in_progress" | "resolved";
};

const incidents: Incident[] = [
  {
    number: "INC0010001",
    shortDescription: "Checkout API latency above threshold",
    description: "Payments checkout API latency exceeded SLO during peak traffic.",
    priority: "1",
    state: "in_progress"
  },
  {
    number: "INC0010002",
    shortDescription: "Knowledge search indexing delay",
    description: "Internal runbooks are delayed in search indexing.",
    priority: "2",
    state: "new"
  }
];

export function searchMockIncidents(query = "", limit = 10) {
  const normalized = query.toLowerCase();
  return incidents
    .filter((incident) => JSON.stringify(incident).toLowerCase().includes(normalized))
    .slice(0, limit);
}

export function getMockIncident(number: string) {
  return incidents.find((incident) => incident.number === number);
}

export function createMockIncident(input: Partial<Incident>) {
  const incident: Incident = {
    number: `INC${String(incidents.length + 1001).padStart(7, "0")}`,
    shortDescription: input.shortDescription ?? "Generated incident",
    description: input.description ?? "",
    priority: input.priority ?? "3",
    state: "new"
  };
  incidents.push(incident);
  return incident;
}

export function updateMockIncident(number: string, input: Partial<Incident>) {
  const incident = getMockIncident(number);
  if (!incident) return undefined;
  Object.assign(incident, input);
  return incident;
}

