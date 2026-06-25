#!/usr/bin/env node
process.env.OPENSPG_NAMESPACE = process.env.OPENSPG_NAMESPACE || 'TaxbellAccountingVATReference';
await import('./build_taxbell_reference.mjs');
