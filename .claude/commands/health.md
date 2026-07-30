---
description: Check the dashboard and LLM health status for the OpenSPG stack.
---

First check that Docker services are running: `docker compose ps`.

Then run `node scripts/check_dashboard_llm_health.mjs` to verify LLM connectivity and dashboard health.

Report any services that are down, unhealthy, or misconfigured.
