# [Bug] Reasoner cannot resolve app ID to KB project IDs — `think_pipeline` tasks stuck in RUNNING

## Environment

- **OpenSPG version**: 0.8.0 (2025-06-29 release)
- **Deployment**: Docker Compose (`openspg-server` image)
- **API base**: `http://10.10.254.42:8887`

## Summary

When an OpenSPG app (appId=2) is configured with `think_pipeline` template and attached KB projects (IDs: 4, 6, 7, 8, 9, 10), the public reasoner flow creates base tasks with `projectId=2` (the app ID) instead of resolving to actual KB project IDs. The reasoner scheduler finds 0 unfinished instances for project 2, so tasks sit in `RUNNING` indefinitely with empty `resultMessage`.

## Steps to reproduce

1. Create an app with `think_pipeline` template, attaching KB projects 4, 6, 7, 8, 9, 10
2. Deploy the app (appId=2)
3. Create an app-aware session:
   ```
   POST /public/v1/reasoner/session/create
   { "appId": 2, "accessToken": "<token>", "type": "app", "name": "test" }
   ```
4. Submit a task:
   ```
   POST /public/v1/reasoner/task/submit
   { "sessionId": <sessionId>, "nl": "How to join TraNag with TraElem?" }
   ```
5. Submit dialog execution (without projectId in payload, per current workaround):
   ```
   POST /public/v1/reasoner/dialog/submit
   { "sessionId": <sessionId>, "userNo": <userNo>, "instruction": "<question>", "taskId": <taskId> }
   ```
6. Poll dialog query — task stays in `RUNNING` with empty `resultMessage`

## Attempted workarounds (all failed)

1. **Removed `projectId` from dialog submit payload** — tasks reach `RUNNING` (no `IllegalArgumentException`), but scheduler still reports 0 instances
2. **Explicitly passed `projectId: 4` to `task/submit`** — backend ignores it, uses `projectId=2` from session context
3. **Created non-app session (without `appId`)** — rejected: `"appId is null"`
4. **Stopped stale tasks and re-submitted** — same result

## Expected behavior

The reasoner should resolve `appId` → attached KB project IDs when creating base tasks for an app-aware session. Base tasks should be created with the correct KB project IDs (4, 6, 7, 8, 9, 10), allowing the `think_pipeline` template to run against the actual KB projects.

## Actual behavior

- Base tasks are created with `projectId=2` (app ID, not a real KB project)
- Server log: `getAllNotFinishInstance successful size:0`
- 12 tasks tested — all 12 remain in `RUNNING` with empty `resultMessage`
- Stopped tasks via `POST /public/v1/reasoner/task/stop` — confirmed 13 stale tasks

## Affected endpoints

- `POST /public/v1/reasoner/task/submit`
- `POST /public/v1/reasoner/dialog/submit`
- `GET /public/v1/reasoner/dialog/query`

## Relevant server behavior

- First attempt (with `projectId` in payload): `IllegalArgumentException: 2 is not exists` + `NullPointerException` in paired NL query tasks
- Second attempt (without `projectId`): tasks reach `RUNNING`, scheduler reports 0 instances
- Session context hardcodes `projectId=2` from the app-aware session

## Impact

- Published OpenSPG apps using `think_pipeline` template cannot complete live Q&A
- App is published, deployable, and template-corrected, but end-to-end unusable
- No client-side workaround exists for resolving app ID → project ID
