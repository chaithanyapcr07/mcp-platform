# Skill Authoring Guide

Start from a skill template, bind required connectors, list allowed tools/resources/prompts, set risk and data classifications, add approval requirements, write evals, and keep examples close to the business workflow.

## Local MVP Notes

Definitions in Git represent desired state. Runtime state belongs in PostgreSQL or external enterprise systems. The gateway is implemented inside the API for the MVP but structured as a module that can be split into an independently deployed data-plane service.
