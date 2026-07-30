---
description: Tail logs for a specific Docker Compose service (e.g. /logs server, /logs mysql)
argument-hint: <service>
---

Run `docker compose logs -f $ARGUMENTS` (service name comes from the argument above). If no service is specified, list available services from `compose.yaml` and ask which one.
