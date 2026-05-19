# Task Authoring Guide

Start from a task template, define input/output schemas, required skills, constraints, approval behavior, policy constraints, audit requirements, and test cases. Prefer small deterministic workflow steps.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
