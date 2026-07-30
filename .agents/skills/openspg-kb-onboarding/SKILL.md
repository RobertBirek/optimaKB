---
name: openspg-kb-onboarding
description: Add or register a new OpenSPG KB in /docker/openspg. Use when creating a KB, promoting one to active, or making it visible in the dashboard, assistant routing, documentation, and verification artifacts.
---

# OpenSPG KB Onboarding

Use this skill when a KB must be introduced, promoted, or made visible across the OpenSPG workspace.

## Workflow

1. Identify the KB state.
   - Active KBs belong in dashboard and routing files.
   - Historical KBs stay out of active registry/routing.
2. Create or update the KB source artifacts.
   - schema and exporter/builder files
   - `exports/<kb>/v1/` staged output and manifests
   - any KB-specific docs or notes
3. Register the KB everywhere the workspace exposes active KBs.
   - `docs/reference/ERP_KB_Dashboard_KB_Registry.json`
   - `docs/reference/ERP_Knowledge_Assistant_Routing.json`
   - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Bundle.json`
   - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Prompt.md`
   - `docs/reference/ERP_Knowledge_Assistant_OpenSPG_App_Spec.md`
4. Update operator-facing docs and memory.
   - `docs/reference/ComarchKB_Global_Audit.md`
   - `docs/reference/ComarchKB_CrossKB_Practical_Test.md`
   - `docs/LOCAL_KNOWLEDGE.md`
   - `docs/reference/OpenSPG_KB_Operational_Memory.md`
5. Verify the result.
   - parse edited JSON files
   - confirm the new namespace appears in `docs` and `api/status`
   - confirm project id, display name, and namespace agree everywhere

## Rules

- Keep the namespace and display name identical across docs and registry entries.
- Treat `enabled: true` as the marker for active KBs.
- Do not add historical KBs to active routing unless the user explicitly asks.
- Prefer the smallest change set that makes the KB visible and answerable.
- If adding a brand-new KB, add its export/build artifacts before updating routing.

## Verification

Use the checklist in `references/kb-checklist.md` for the exact files and smoke checks.

## Resources

### references/
Workflow and file checklist material lives here.

### scripts/
No helper scripts are required for this skill.

### assets/
No assets are required for this skill.
