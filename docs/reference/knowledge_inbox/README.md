# Knowledge Inbox Review Store

Date: `2026-06-02`

This directory stores reviewed knowledge drafts promoted from:

- `downloads/knowledge_inbox/`

Use:

```bash
cd /docker/openspg
node scripts/manage_knowledge_inbox.mjs list --status pending
node scripts/manage_knowledge_inbox.mjs show <draft_id>
node scripts/manage_knowledge_inbox.mjs promote <draft_id> --note "source checked" --by "<operator>"
```

Automation:

```bash
node scripts/run_knowledge_inbox_pipeline.mjs --status
node scripts/run_knowledge_inbox_pipeline.mjs --promote <draft_id> --export --note "source checked" --by "<operator>"
```

Build automation uses a stored OpenSPG session cookie:

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/openspg_auth_check.mjs
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/run_knowledge_inbox_pipeline.mjs --kb <kbNamespace> --export --build
```

Promoted draft files are stored under:

- `promoted/<kbNamespace>/<draft_id>.json`
- `promoted/<kbNamespace>/<draft_id>.md`

The target KB exporters consume promoted drafts only. Pending raw drafts are not
included in OpenSPG staging.
