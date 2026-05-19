import { withSpan } from "../observability/tracing.js";

export type SecretReference = {
  secretRef: string;
  secretProvider: "local_mock" | "vault" | "aws" | "gcp" | "azure" | "kubernetes";
  secretVersion: string;
  allowedRuntimeIdentity: string;
  rotationStatus: "current" | "rotation_due" | "rotating";
  lastRotatedAt?: Date;
};

export interface SecretProvider {
  resolve(reference: SecretReference, runtimeIdentity: string): Promise<string>;
}

export class LocalMockSecretProvider implements SecretProvider {
  async resolve(reference: SecretReference, runtimeIdentity: string): Promise<string> {
    return withSpan("secret.resolve_reference", {
      status: reference.rotationStatus
    }, async () => {
      if (reference.allowedRuntimeIdentity !== runtimeIdentity) {
        throw new Error("Runtime identity is not allowed to resolve secret reference");
      }
      return `mock-secret-value-for:${reference.secretRef}:${reference.secretVersion}`;
    });
  }
}
