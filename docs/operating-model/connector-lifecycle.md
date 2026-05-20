# Connector Lifecycle

## Registration States

- draft
- submitted
- security_review
- platform_review
- approved
- rejected
- enabled
- deprecated
- disabled

## Lifecycle

1. Template generated.
2. Local tests pass.
3. Connector manifest submitted.
4. Platform reviews runtime contract and registry shape.
5. Security reviews risk, data classification, secrets, and write tools.
6. Dev registration is approved.
7. Staging validation proves gateway, policy, audit, metrics, and traces.
8. Production approval enables project access requests.
9. Deprecated versions receive migration windows.
10. Disabled versions cannot be executed.

Write actions default to denied or `approval_required` unless policy explicitly allows automation.

