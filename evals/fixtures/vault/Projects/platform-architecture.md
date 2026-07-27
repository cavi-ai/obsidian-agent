---
title: Platform architecture
type: note
tags: [infra]
---

# Platform architecture

Single Postgres primary, no read replica. Queue is in-process.
Scaling limit: the ingest worker is a single point of failure.
