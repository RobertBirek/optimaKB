/** @typedef {'concept'|'entity'|'relation'|'process'} SemanticIntent */

const semanticMethods = new Map([
  ['erp_concept.search', 'concept'],
  ['erp_entity.get', 'entity'],
  ['erp_relation.list', 'relation'],
  ['erp_process.explain', 'process'],
]);
const semanticIntents = new Set(semanticMethods.values());

/** @returns {SemanticIntent|null} Private intent from an exact, validated tool name. */
export function semanticIntentForTool(name) {
  return semanticMethods.get(name) || null;
}

/**
 * Candidate scope only: intent neither grants access nor chooses a primary KB.
 * @param {SemanticIntent|null} intent
 * @param {Set<string>|null} allowed
 * @returns {string[]}
 */
export function semanticCandidateNamespaces(intent, allowed) {
  if (!semanticIntents.has(intent)) return [];
  return ['OWAOntology', 'ComarchOptimaBusinessSemantics']
    .filter(namespace => allowed == null || allowed.has(namespace));
}
