# Read-only dashboard summaries

Approved scope: the user's “ok, działaj dalej” follows the diagnosis and recommendation to remove GET-side persistence and align discovery learning scope. Implement the bounded repair, not an automation resume or deployment.

## Design

Discovery GET summaries, learning and domain alerts derive a non-persisted snapshot from up to 5000 newest candidates, matching the existing pipeline scope. The UI candidate list remains capped at 500 newest candidates, priority-sorted as before. Calculations use the complete 5000-row window; stored operator overrides remain visible without being rewritten. Existing persisted learning is not repaired or migrated by GET.

Automation GET summaries derive learning without persistence and render a fresh canary report in memory. Explicit report refreshes and existing worker calls retain their write behavior. A missing, stale or malformed stored canary report must not be repaired by GET.

Approaches considered: merely adding `persist:false` to the 500-row calculation would stop writes but leave mismatched metrics. Reading stored learning alone would leave polluted metrics until the next writer. Use consistent in-memory derivation and separate rendering from persistence instead.

## Constraints and acceptance

- No policy, threshold, publication approval, pause or override changes.
- No live GET reproduction, production writes, cookie changes, service restart, merge or push in this scope.
- Work from committed HEAD in an isolated worktree. Production has preexisting source changes; never copy whole worktree files over them.
- Synthetic tests use a temporary ROOT under `/tmp/opencode`, dummy auth/cookie and only loopback HTTP. No provider, OpenSPG, or production dashboard calls.
- Assert exact file inventory, contents, mtime and mode before/after GET, including missing state and corrupt stored canary JSON.
- Assert independent literal noise rates for >500 candidates and call-order independence across learning/alerts/discovery/status.
- Verify explicit writers still persist, including canary repair behavior.

The fix does not certify production configuration or overall retrieval quality.
