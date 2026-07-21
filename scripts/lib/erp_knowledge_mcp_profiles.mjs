export const MCP_PROFILE_VERSION = '1.0.0';

const commonReadTools = ['list_knowledge_bases'];

const profiles = {
  legacy: {
    id: 'legacy',
    serverName: 'erp-knowledge-assistant',
    mode: 'legacy',
    namespaces: null,
    scopes: [],
    tools: ['route_question', 'answer_question', 'run_community_thread_test', 'submit_knowledge_draft', 'search_external_sources', 'draft_external_source', ...commonReadTools],
  },
  'scoped-readonly': {
    id: 'scoped-readonly', serverName: 'erp-knowledge-scoped', mode: 'restricted-read-only',
    namespaces: null, scopes: ['kb.read'], port: null,
    tools: ['answer_question', ...commonReadTools],
  },
  'erp-semantic-mcp': {
    id: 'erp-semantic-mcp', serverName: 'erp-semantic-mcp', mode: 'read-only',
    namespaces: ['OWAOntology', 'ComarchOptimaBusinessSemantics'], scopes: ['kb.semantic.read'], port: 3420,
    tools: ['erp_concept.search', 'erp_entity.get', 'erp_process.explain', 'erp_relation.list', ...commonReadTools],
  },
  'optima-technical-mcp': {
    id: 'optima-technical-mcp', serverName: 'optima-technical-mcp', mode: 'read-only',
    namespaces: ['ComarchOptimaSchema', 'ComarchOptimaPartnerTechnical', 'ComarchOptimaAdditionalFunctions', 'ComarchOptimaSprint'], scopes: ['kb.optima.technical.read'], port: 3421,
    tools: ['optima_schema.search', 'optima_object.get', 'optima_join_path.find', 'optima_implementation.explain', ...commonReadTools],
  },
  'optima-product-mcp': {
    id: 'optima-product-mcp', serverName: 'optima-product-mcp', mode: 'read-only',
    namespaces: ['ComarchOptimaReference', 'ComarchCommunityNews'], scopes: ['kb.optima.product.read'], port: 3422,
    tools: ['optima_docs.search', 'optima_feature.explain', 'optima_release.search', ...commonReadTools],
  },
  'legal-compliance-mcp': {
    id: 'legal-compliance-mcp', serverName: 'legal-compliance-mcp', mode: 'read-only',
    namespaces: ['TaxbellLegalReference'], scopes: ['kb.legal.read'], port: 3423,
    tools: ['legal_source.search', 'legal_requirement.explain', 'legal_live_source.search', ...commonReadTools],
  },
  'accounting-tax-mcp': {
    id: 'accounting-tax-mcp', serverName: 'accounting-tax-mcp', mode: 'read-only',
    namespaces: ['TaxbellAccountingVATReference'], scopes: ['kb.accounting.read'], port: 3424,
    tools: ['accounting_guidance.search', 'vat_rule.explain', 'reporting_requirement.explain', ...commonReadTools],
  },
  'payroll-hr-mcp': {
    id: 'payroll-hr-mcp', serverName: 'payroll-hr-mcp', mode: 'read-only',
    namespaces: ['TaxbellPayrollHRReference'], scopes: ['kb.payroll.read'], port: 3425,
    tools: ['payroll_guidance.search', 'hr_rule.explain', 'social_insurance_rule.explain', ...commonReadTools],
  },
  'knowledge-editorial-mcp': {
    id: 'knowledge-editorial-mcp', serverName: 'knowledge-editorial-mcp', mode: 'editorial',
    namespaces: null, scopes: ['kb.editorial.write'], port: 3426, host: '127.0.0.1',
    tools: ['search_external_sources', 'submit_knowledge_draft', 'draft_external_source', ...commonReadTools],
  },
};

export function getMcpProfile(id = 'legacy') {
  const profile = profiles[id];
  if (!profile) throw new Error(`Unknown ERP KB MCP profile: ${id}`);
  return Object.freeze({ ...profile, tools: Object.freeze([...profile.tools]), namespaces: profile.namespaces ? Object.freeze([...profile.namespaces]) : null });
}

export function listMcpProfiles() {
  return Object.values(profiles).map((profile) => ({ ...profile, tools: [...profile.tools], namespaces: profile.namespaces ? [...profile.namespaces] : null }));
}
