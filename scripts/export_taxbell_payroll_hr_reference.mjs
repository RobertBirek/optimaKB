#!/usr/bin/env node
process.env.TAXBELL_EXPORT_NAMESPACE = process.env.TAXBELL_EXPORT_NAMESPACE || 'TaxbellPayrollHRReference';
import './export_taxbell_reference.mjs';
