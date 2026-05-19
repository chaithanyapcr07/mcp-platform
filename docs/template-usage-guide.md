# Template Usage Guide

Use /templates to list starter assets and /templates/{id}/generate to produce connector, skill, or task starter content. Template folders in packages/templates include manifests, tests, policy examples, and README files.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
