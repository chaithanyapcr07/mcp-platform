# Connector Onboarding

Teams author connector.yaml, declare tools/resources/prompts, risk level, data classification, auth type, scopes, owners, and docs. They submit for review, receive approval, request project access, and route execution through the gateway.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
