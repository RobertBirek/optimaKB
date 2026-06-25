# ERP KB Dashboard Future Roadmap

Status: `DEFERRED`

This document records planned future development only. Its presence does not
authorize implementation, deployment, configuration changes, or removal of
the current forced shadow mode.

## Preconditions

Before starting the roadmap:

1. Collect and adjudicate at least `20` unique live shadow drafts.
2. Keep publication blocked until the existing canary gate passes.
3. Review current incidents, rollback failures, audit-chain state, and operator
   feedback.
4. Approve the scope and maintenance window for each phase separately.

## Phase 1: Operational Resilience

### Persistent worker queue

- separate job execution from the dashboard HTTP process
- resume interrupted jobs after service or host restart
- use bounded retry with exponential backoff and jitter
- add idempotency keys and per-draft/per-KB concurrency controls
- move exhausted jobs to a dead-letter queue
- provide explicit replay and cancellation actions with audit events

Acceptance criteria:

- queued and running jobs survive a controlled service restart
- duplicate requests cannot publish or build twice
- failed jobs reach a terminal state with a complete reason and replay history

### Alerts

- send Teams and/or email alerts for repeated LLM failures
- alert on rollback failure, audit-chain failure, stale canary queue, and dead letters
- group repeated alerts and provide recovery notifications
- link alerts to the relevant dashboard job or audit event

Acceptance criteria:

- every critical condition has one tested alert and one tested recovery notice
- alert storms are rate-limited and deduplicated
- no credentials or draft content are exposed in notifications

### Backup and restore

- back up draft files, promoted state, registry, automation state, audit files,
  reports, and service configuration
- encrypt backup archives and define retention
- document restore order and validation checks
- run scheduled restore drills in an isolated location

Acceptance criteria:

- a clean environment can be restored from backup
- restored registry, draft state, job state, and audit verification are consistent
- restore time and recovery-point results are recorded

## Phase 2: Identity and Security

### SSO/OIDC

- replace normal Basic Auth usage with proxy-backed OIDC/SSO
- map identity-provider groups to `admin`, `operator`, and `viewer`
- preserve the real user identity in domain and HTTP audit events
- retain a documented, disabled-by-default emergency account

Acceptance criteria:

- role mappings are tested for all protected endpoints
- terminated or removed users lose access without application changes
- audit events contain stable corporate identity claims

### Managed secrets

- move source credentials, OpenSPG authentication, and notification credentials
  to a managed secret store
- define rotation and expiry procedures
- prevent secrets from entering reports, logs, audit metadata, or backups

### External audit checkpoints

- periodically sign the current audit-chain head with an external key
- store signed checkpoints outside the dashboard host
- verify checkpoints during startup, backup validation, and restore drills

Acceptance criteria:

- deletion or rewriting of historical events is detectable even by comparison
  from outside the host
- signing keys are not readable by the dashboard service

## Phase 3: LLM Governance

### Independent second reviewer

- invoke a second model only for high-risk, low-confidence, or conflicting drafts
- require model agreement or human approval before publication
- keep prompts and evidence independent enough to avoid correlated approval
- record both verdicts, model versions, latency, and cost

Acceptance criteria:

- disagreement always produces a hold
- failure of either reviewer cannot silently downgrade the policy
- benchmark results show the impact on false positives and operator workload

### Metrics and service objectives

- measure review latency, queue age, publication time, retry rate, rollback rate,
  model agreement, operator overrides, token use, and estimated cost
- define service objectives for availability and maximum queue age
- expose trend views without storing sensitive draft content in metrics

## Phase 4: Engineering Sustainability

### CI and end-to-end tests

- run syntax, unit, automation, and production build checks in CI
- add Playwright flows for draft creation, adjudication, reroute, gate approval,
  publication, rollback, permissions, and audit verification
- test migrations and restore procedures against temporary state
- block deployment when critical tests fail

### Maintainability

- paginate drafts, actions, automation jobs, and audit events
- split the React and HTTP server monoliths along existing domain boundaries
- version state schemas and add explicit migrations
- upgrade Node and Vite together after compatibility tests
- publish operator-facing release notes for workflow changes

## Recommended Order

1. Persistent queue
2. Alerts
3. Backup and restore drill
4. SSO/OIDC and managed secrets
5. External audit checkpoints
6. Second LLM reviewer
7. Metrics and service objectives
8. CI/E2E expansion and modularization

Do not start multiple high-risk phases simultaneously. Each phase should end
with documented acceptance evidence, rollback instructions, and an explicit
production approval.
