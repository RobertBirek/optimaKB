---
description: Run the knowledge inbox pipeline — promote drafts from downloads/knowledge_inbox/ into the target KB.
---

Run `node scripts/run_knowledge_inbox_pipeline.mjs` to process all pending drafts in `downloads/knowledge_inbox/`.

After completion, report which drafts were promoted and to which KBs. If there are conflicts or errors, list them.
