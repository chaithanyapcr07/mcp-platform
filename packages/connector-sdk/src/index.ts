import { connectorManifestSchema, type ConnectorManifest, type ToolCapability } from "@mcp-platform/shared-types";

export type ConnectorContext = {
  actorId?: string;
  projectId?: string;
  requestId: string;
  secrets: Record<string, string>;
};

export type ToolHandler = (input: Record<string, unknown>, context: ConnectorContext) => Promise<unknown>;

export class ConnectorBuilder {
  private readonly handlers = new Map<string, ToolHandler>();

  constructor(private readonly manifest: ConnectorManifest) {
    connectorManifestSchema.parse(manifest);
  }

  tool(capability: ToolCapability, handler: ToolHandler): this {
    if (!this.manifest.tools.some((tool) => tool.name === capability.name)) {
      this.manifest.tools.push(capability);
    }
    this.handlers.set(capability.name, handler);
    return this;
  }

  getManifest(): ConnectorManifest {
    return this.manifest;
  }

  listTools(): ToolCapability[] {
    return this.manifest.tools;
  }

  async invoke(toolName: string, input: Record<string, unknown>, context: ConnectorContext): Promise<unknown> {
    const handler = this.handlers.get(toolName);
    if (!handler) {
      throw Object.assign(new Error(`Unknown tool ${toolName}`), { statusCode: 404 });
    }
    return handler(input, context);
  }
}

export function defineConnector(manifest: ConnectorManifest): ConnectorBuilder {
  return new ConnectorBuilder(manifest);
}
