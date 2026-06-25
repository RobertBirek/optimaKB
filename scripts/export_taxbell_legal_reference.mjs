#!/usr/bin/env node
process.env.TAXBELL_EXPORT_NAMESPACE = process.env.TAXBELL_EXPORT_NAMESPACE || 'TaxbellLegalReference';
import './export_taxbell_reference.mjs';
