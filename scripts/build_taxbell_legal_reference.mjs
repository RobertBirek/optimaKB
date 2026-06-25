#!/usr/bin/env node
process.env.OPENSPG_NAMESPACE = process.env.OPENSPG_NAMESPACE || 'TaxbellLegalReference';
await import('./build_taxbell_reference.mjs');
