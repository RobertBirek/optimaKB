export const ALL_KB_NAMESPACES = [
  'ComarchOptimaSchema', 'ComarchOptimaAdditionalFunctions',
  'ComarchOptimaSprint', 'ComarchOptimaReference',
  'ComarchOptimaPartnerTechnical', 'ComarchOptimaBusinessSemantics',
  'ComarchBetterflyReference', 'ComarchCommunityNews',
  'TaxbellLegalReference', 'TaxbellPayrollHRReference',
  'TaxbellAccountingVATReference', 'ComarchUniversalKnowledge', 'OWAOntology', 'InsERTGTSchema',
];

export function kbGroup(ns) {
  if (ns.startsWith('ComarchOptima')) return { group: 'Optima', short: ns.replace('ComarchOptima', '') };
  if (ns.startsWith('Taxbell')) return { group: 'Taxbell', short: ns.replace('Taxbell', '') };
  if (ns.startsWith('InsERT')) return { group: 'InsERT', short: ns };
  if (ns.startsWith('Comarch')) return { group: 'Inne', short: ns.replace('Comarch', '') };
  return { group: 'Inne', short: ns };
}

export const KB_GROUPS = [
  { name: 'Optima', items: ['ComarchOptimaSchema', 'ComarchOptimaAdditionalFunctions', 'ComarchOptimaSprint', 'ComarchOptimaReference', 'ComarchOptimaPartnerTechnical', 'ComarchOptimaBusinessSemantics'] },
  { name: 'Taxbell', items: ['TaxbellLegalReference', 'TaxbellPayrollHRReference', 'TaxbellAccountingVATReference'] },
  { name: 'Inne', items: ['ComarchBetterflyReference', 'ComarchCommunityNews', 'ComarchUniversalKnowledge', 'OWAOntology'] },
  { name: 'InsERT', items: ['InsERTGTSchema'] },
];
