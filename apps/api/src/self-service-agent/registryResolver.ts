import type { FastifyInstance } from "fastify";
import type { AgentRegistryResolver, ConnectorSummary } from "./agentTypes.js";

export class PrismaAgentRegistryResolver implements AgentRegistryResolver {
  constructor(private readonly app: FastifyInstance) {}

  async findConnector(connectorId: string): Promise<ConnectorSummary | undefined> {
    const connector = await this.app.db.connector.findUnique({
      where: { id: connectorId },
      include: { tools: true }
    });
    if (!connector) return undefined;
    return {
      id: connector.id,
      status: connector.status,
      riskLevel: connector.riskLevel,
      dataClassification: connector.dataClassification,
      tools: connector.tools.map((tool) => ({
        name: tool.name,
        write: tool.write,
        riskLevel: tool.riskLevel
      }))
    };
  }

  async hasConnector(connectorId: string): Promise<boolean> {
    return Boolean(await this.findConnector(connectorId));
  }
}
