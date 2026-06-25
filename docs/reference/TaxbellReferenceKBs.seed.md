# Taxbell Reference KBs

This seed describes the three document-first Taxbell knowledge bases:

- `TaxbellLegalReference` - Polish law, tax law, legal acts, official tax explanations, rulings and advisory context.
- `TaxbellPayrollHRReference` - payroll, HR, ZUS, PIP, employment and social-insurance obligations.
- `TaxbellAccountingVATReference` - accounting, bookkeeping, VAT/JPK practice, reporting and settlement workflows.

Initial source policy:

- Use a broad Exa crawl with ranked source tiers.
- Prefer official law and public-authority sources.
- Allow professional commentary as supporting context, never as the sole legal basis.
- Preserve `sourceUrl`, `sourceTier`, `retrievedAt`, content hash and local snapshot path for deduplication and attribution.

Audience modes:

- `expert` for Taxbell internal users.
- `client` for simpler explanations with caution that facts must be verified against the client situation.
