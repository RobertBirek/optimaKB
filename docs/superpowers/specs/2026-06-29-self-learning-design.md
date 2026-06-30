# Self-Learning Design

## Goal

Add a safe self-learning layer for both discovery and draft automation by reusing operator feedback, adjudication, reroute history, and calibration data already collected in the dashboard.

## Scope

- discovery candidate scoring and prioritization
- automation canary recommendation and priority ordering
- transparent learning state persisted to local JSON artifacts
- no direct autonomous publication changes in this phase

## Approach

The system will derive compact learning states from audited historical decisions instead of training a separate ML model. Discovery will learn from candidate accept/reject/duplicate outcomes by domain and query. Automation will learn from adjudicated shadow jobs and accepted reroutes by KB and reroute pair. These learned signals will adjust score and recommendation layers only.

## Safety

- learning changes recommendations and queue ordering, not publication gates
- all signals are derived from existing operator-audited data
- all outputs remain inspectable in dashboard API payloads and JSON state files

## Data

- `data/dashboard/learning/discovery_learning_state.json`
- `data/dashboard/learning/automation_learning_state.json`

## Discovery Learning

The system computes acceptance, rejection, and duplicate patterns by domain, query, and KB namespace. These signals produce bounded score deltas and human-readable reasons, which are folded into candidate priority. Weak queries are not just reported; they also reduce the priority of future candidates from the same query family.

## Automation Learning

The system computes publish false-positive pressure by KB namespace and reroute confirmation strength by source-target KB pair. These signals influence canary queue ordering and the recommended operator action shown for live shadow jobs. This creates a feedback loop without bypassing adjudication.

## UI/API

- `GET /api/discovery` exposes `discovery.learning`
- `GET /api/automation` exposes `automation.learning`
- Sources page shows learned discovery signals summary
- Automation page shows learned canary/reroute signals summary

## Tests

- derived discovery learning state from reviewed candidates
- derived automation learning state from adjudicated jobs
- score/recommendation adjustments remain bounded and deterministic
- regression tests for API/build stability
