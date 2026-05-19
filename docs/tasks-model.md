# Tasks Model

Tasks are platform-owned workflow definitions. They do not depend on experimental MCP Tasks. A Task defines required skills, input and output schemas, execution constraints, approval behavior, policy constraints, audit requirements, and test cases.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
