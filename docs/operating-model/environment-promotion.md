# Environment Promotion

Connectors move through:

`local -> dev -> staging -> prod`

Each connector version should pass:

1. template generated
2. local tested
3. registered in dev
4. security reviewed
5. staging validated
6. prod approved
7. prod enabled

## Promotion Gates

- Local: mock mode works and tests pass.
- Dev: manifest and registration request validate.
- Staging: gateway invocation, policy denial, audit, metrics, and traces are verified.
- Prod: platform/security approval is recorded and project access is scoped.

