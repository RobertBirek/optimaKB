---
name: codex-delegation
description: Execute a bounded read-only OpenSPG task delegated by central Codex and return an evidence-based machine-readable handoff.
compatibility: opencode
metadata:
  owner: central-codex
  workflow: delegated-task
---

# Codex Delegation Protocol

Require `TASK_ID`, objective, scope, acceptance criteria, required validation, and edit policy before starting.

1. Inspect repository instructions and Git status.
2. Record branch and full Git SHA.
3. Preserve all existing changes.
4. Never read or print secrets, `.env`, tokens, cookies, keys, or connection strings.
5. Never commit, push, pull, deploy, restart, ingest, publish, or mutate graph and tenant data.
6. Use only the assigned repository and host.
7. Load only skills relevant to the task, once each.
8. Label evidence as `POTWIERDZONE`, `WNIOSEK`, `HIPOTEZA`, or `NIEUSTALONE`.

End with:

```yaml
task_id:
agent:
host:
repository:
base_branch:
base_commit:
result_commit: uncommitted
changed_files: []
skills_used: []
commands_run: []
validation:
  passed: []
  failed: []
  not_run: []
confirmed_findings: []
inferences: []
hypotheses: []
risks: []
approval_required: []
recommended_next_action:
```
