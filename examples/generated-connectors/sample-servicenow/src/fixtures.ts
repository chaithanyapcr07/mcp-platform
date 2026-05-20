export type ServiceNowIncident = {
  number: string;
  shortDescription: string;
  priority: "1" | "2" | "3" | "4";
  state: "new" | "in_progress" | "resolved";
  assignmentGroup: string;
};

export const mockIncidents: ServiceNowIncident[] = [
  {
    number: "INC0010001",
    shortDescription: "Payments API latency above threshold",
    priority: "1",
    state: "in_progress",
    assignmentGroup: "SRE"
  },
  {
    number: "INC0010002",
    shortDescription: "Search indexing backlog for knowledge articles",
    priority: "2",
    state: "new",
    assignmentGroup: "Platform"
  },
  {
    number: "INC0010003",
    shortDescription: "Internal dashboard login failures",
    priority: "3",
    state: "resolved",
    assignmentGroup: "Identity"
  }
];

