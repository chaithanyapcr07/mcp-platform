export type GatewayClientOptions = {
  gatewayUrl: string;
  token?: string;
  projectId: string;
  fetchImpl?: typeof fetch;
};

export type InvokeOptions = {
  requestId?: string;
  skillId?: string;
  taskId?: string;
};

export class McpGatewayError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown
  ) {
    super(message);
  }
}

export class McpGatewayClient {
  private readonly gatewayUrl: string;
  private readonly token?: string;
  private readonly projectId: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GatewayClientOptions) {
    this.gatewayUrl = options.gatewayUrl.replace(/\/$/, "");
    this.token = options.token;
    this.projectId = options.projectId;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async invokeTool<TOutput = unknown>(connectorId: string, toolName: string, input: unknown, options: InvokeOptions = {}) {
    const response = await this.fetchImpl(`${this.gatewayUrl}/gateway/connectors/${encodeURIComponent(connectorId)}/tools/${encodeURIComponent(toolName)}/invoke`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        ...(options.requestId ? { "x-correlation-id": options.requestId } : {})
      },
      body: JSON.stringify({
        projectId: this.projectId,
        input,
        skillId: options.skillId,
        taskId: options.taskId
      })
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new McpGatewayError(response.status, payload.error ?? payload.error?.code ?? "GATEWAY_ERROR", payload.reason ?? payload.message ?? "MCP Gateway request failed", payload.requestId, payload.details);
    }
    return payload as { requestId: string; connectorId: string; toolName: string; output: TOutput };
  }
}

