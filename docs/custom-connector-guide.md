# Custom Connector Guide

Use packages/connector-sdk or a connector template. Implement /health, /manifest, and /tools/{tool}/invoke, mark write tools explicitly, validate schemas, and avoid raw secrets.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
