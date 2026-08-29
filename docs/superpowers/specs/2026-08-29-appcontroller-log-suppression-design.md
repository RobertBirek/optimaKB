# AppController Log Suppression Design

## Goal

Prevent OpenSPG `AppController` from writing application request payloads,
including provider credentials, to server logs.

## Confirmed Root Cause

The live class is
`com.antgroup.openspgapp.api.http.server.app.AppController`. It logs complete
application update requests at INFO level. The current Compose logger rule
targets `com.antgroup.openspgapp.arks.sofaboot`, so it does not cover this
controller.

## Change

Add one environment variable to the OpenSPG `server` service in
`compose.yaml`:

```yaml
LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER: "OFF"
```

Spring Boot maps this variable to the exact controller class. The change does
not alter other controller logs, server-wide logging, request payloads, model
configuration, credentials, or application state.

## Deployment

1. Validate the Compose file with `docker compose config`.
2. Recreate only the `server` container so Spring Boot loads the new logger
   level.
3. Wait for the server health check to report healthy.
4. Confirm the exact environment variable exists in the recreated container.
5. Perform a read-only API request while discarding its response body.
6. Confirm the request does not add an `AppController` log line.

The health timer remains stopped. The deployment does not run discovery,
builders, ingestion, KB builds, or application updates.

## Security Boundary

This change prevents future `AppController` payload logging. It does not erase
historical Docker logs. The operator chose to keep the current OpenAI key and
accepted the residual exposure in those historical lines. Verification must
not print the key, application access tokens, session cookies, or API response
bodies.

## Rollback

Remove the exact logger environment variable, validate Compose, and recreate
only the `server` container. Rollback restores upstream logging behavior and
therefore restores the credential-exposure risk.

## Success Criteria

- `docker compose config` succeeds.
- The server returns to healthy state after recreation.
- Runtime environment contains the exact logger override with value `OFF`.
- A read-only API request does not create a new `AppController` log line.
- The health timer remains inactive.
- No unrelated service or OpenSPG application configuration changes.
