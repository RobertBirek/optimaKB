# Taxbell Reference KBs Runbook

Active KBs:

- `TaxbellLegalReference` - project `12`
- `TaxbellPayrollHRReference` - project `13`
- `TaxbellAccountingVATReference` - project `14`

## Refresh Sources

Broad Exa crawl with ranked source tiers:

```bash
node scripts/refresh_taxbell_reference_sources.mjs --kb all
```

Single KB:

```bash
node scripts/refresh_taxbell_reference_sources.mjs --kb TaxbellLegalReference
node scripts/refresh_taxbell_reference_sources.mjs --kb TaxbellPayrollHRReference
node scripts/refresh_taxbell_reference_sources.mjs --kb TaxbellAccountingVATReference
```

Dry run:

```bash
node scripts/refresh_taxbell_reference_sources.mjs --kb all --dry-run
```

## Export

```bash
node scripts/export_taxbell_reference.mjs --kb all
```

## Create Or Refresh OpenSPG Projects

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie \
node scripts/create_taxbell_reference_projects.mjs --kb all
```

Project ids are stored in:

```text
docs/reference/Taxbell_KB_Project_Map.json
```

## Build

```bash
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/build_taxbell_legal_reference.mjs
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/build_taxbell_payroll_hr_reference.mjs
OPENSPG_COOKIE_FILE=/etc/erp-kb-openspg.cookie node scripts/build_taxbell_accounting_vat_reference.mjs
```

## Validate

```bash
node scripts/kb_quality_gate.mjs --kb TaxbellLegalReference,TaxbellPayrollHRReference,TaxbellAccountingVATReference
node scripts/source_freshness_report.mjs
```

## Source Policy

- `official_law`: ISAP, Dziennik Ustaw, Sejm.
- `official_authority`: public authority pages such as podatki.gov.pl, ZUS, PIP, gov.pl, biznes.gov.pl.
- `professional_commentary`: professional or trade commentary.
- `news_or_low`: low-confidence context only.

Professional commentary must not be presented as legal basis. Use official sources for legal conclusions and cite commentary only as practical context.
