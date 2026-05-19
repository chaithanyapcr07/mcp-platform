# Audit Model

Every gateway decision should create an audit event.

Allowed event fields include:

- actor
- project
- connector
- skill
- task
- tool
- action
- decision
- reason
- request ID
- metadata

Denied calls also write audit events before returning a structured error.
