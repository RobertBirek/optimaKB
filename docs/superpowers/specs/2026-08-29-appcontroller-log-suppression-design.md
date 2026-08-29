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

The first implementation added
`LOGGING_LEVEL_COM_ANTGROUP_OPENSPGAPP_API_HTTP_SERVER_APP_APPCONTROLLER=OFF`.
Spring Boot 2.7 relaxed binding lowercases environment-variable logger names,
so that form can configure packages but cannot reliably configure the
case-sensitive `AppController` class logger. The live container accepted the
environment string, but that did not prove the class logger was disabled.
Spring Boot documents this limitation and recommends `SPRING_APPLICATION_JSON`
for individual class loggers:
<https://docs.spring.io/spring-boot/reference/features/logging.html>.

## Change

Use Spring Boot's case-preserving JSON property source in the OpenSPG `server`
service:

```yaml
SPRING_APPLICATION_JSON: '{"logging.level.com.antgroup.openspgapp.api.http.server.app.AppController":"OFF"}'
```

Remove the ineffective `LOGGING_LEVEL_...APPCONTROLLER` variable. Spring Boot
parses `SPRING_APPLICATION_JSON` without lowercasing its property key, so the
exact class name retains its uppercase letters. The change does not alter
other controller logs, server-wide logging, request payloads, model
configuration, credentials, or application state.

## Deployment

1. Validate the Compose file with `docker compose config`.
2. Recreate only the `server` container so Spring Boot loads the new logger
   level.
3. Wait for the server health check to report healthy.
4. Confirm `SPRING_APPLICATION_JSON` resolves to the exact class logger and
   `OFF` value without printing unrelated environment variables.
5. Send an authenticated `PUT /v1/app/-1` with the benign body `{}` and discard
   the response body. The negative ID cannot identify an existing application,
   and the payload contains no credential.
6. Confirm the controlled request adds no `AppController` log line.

The health timer remains stopped. The deployment does not run discovery,
builders, ingestion, KB builds, or updates to existing application state.

## Security Boundary

This change prevents future `AppController` payload logging. The original
design expected the existing Docker-managed log history to remain available,
but the forced recreation of `release-openspg-server` removed the prior
container and its Docker-managed logs. Consequently, six known historical
`AppController` lines are no longer available through `docker logs`. There is
no technical recovery path from Docker unless an independent backup or log
collector retained those lines.

On 2026-08-29, after the loss was identified, the user explicitly accepted the
irreversible loss and waived the historical-log preservation requirement. The
OpenAI key remained unchanged. This waiver does not alter the verified runtime
results for server health, dependency isolation, and timer state. The first
logger override and read-only GET probe did not prove class-level suppression.

The operator approved one more server-only recreation for the corrected
configuration and accepted the resulting loss of the current container's
Docker-managed log history. Verification must not print the key, application
access tokens, session cookies, API response bodies, or matching log lines.

## Rollback

Remove `SPRING_APPLICATION_JSON`, validate Compose, and recreate only the
`server` container. Do not restore the ineffective class-level environment
variable. Rollback restores upstream logging behavior and therefore restores
the credential-exposure risk.

## Success Criteria

- `docker compose config` succeeds.
- The server returns to healthy state after recreation.
- Runtime JSON contains the exact case-sensitive class logger with value
  `OFF`.
- A controlled `PUT /v1/app/-1` with body `{}` does not create a new
  `AppController` log line.
- The health timer remains inactive.
- No unrelated service or OpenSPG application configuration changes.
