import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CODE_ROOT = fileURLToPath(new URL('../../', import.meta.url));

// Explicit offline CLI/gate dependency closure. Never substitute a production
// policy: each sandbox receives only its caller's explicit fixture policy.
export function copyOwaCodeForTests(destination, policy) {
  const target = path.resolve(destination);
  const source = path.resolve(CODE_ROOT);
  if (target === source || source.startsWith(`${target}${path.sep}`) || target.startsWith(`${source}${path.sep}`)) {
    throw new Error('OWA fixture code must be outside the source checkout');
  }
  for (const relative of [
    'scripts/export_owa_ontology.mjs',
    'scripts/kb_quality_gate.mjs',
    'scripts/lib/export_utils.mjs',
    'scripts/lib/promoted_knowledge.mjs',
    'scripts/lib/atomic_file.mjs',
    'scripts/lib/dashboard_audit.mjs',
    'scripts/lib/owa_export_selection.mjs',
    'scripts/lib/owa_promoted_coverage.mjs',
    'scripts/lib/owa_relation_parser.mjs',
    'scripts/lib/owa_relation_policy.mjs',
    'scripts/lib/owa_relation_export.mjs',
  ]) {
    const output = path.join(target, relative);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(source, relative), output);
  }
  fs.writeFileSync(path.join(target, 'scripts/lib/owa_relation_id_policy.json'), `${JSON.stringify(policy, null, 2)}\n`);
  return { cliPath: path.join(target, 'scripts/export_owa_ontology.mjs'), gatePath: path.join(target, 'scripts/kb_quality_gate.mjs') };
}

export function fixtureOwaRelationPolicy() {
  return {
    schemaVersion: 1, namespace: 'OWAOntology', database: 'owaontology',
    observedAt: '2026-10-28T00:00:00Z',
    sourceEvidence: [{ name: 'synthetic-fixture.json', sha256: 'a'.repeat(64) }],
    reservedIds: ['OWA_REL_FIXTURE_BELONGS_TARGET', 'OWA_REL_LAYOUT_P_TARGET', 'OWA_REL_RETIRED'],
    entries: [
      { sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'belongs', legacyTargetRefId: 'OWA_ENTITY_TARGET', id: 'OWA_REL_FIXTURE_BELONGS_TARGET', state: 'preserved' },
      { sourceEntityRefId: 'OWA_ENTITY_FIXTURE', predicate: 'belongs', legacyTargetRefId: 'OWA_ENTITY_TARGET', id: 'OWA_REL_UNPREFIXED_BELONGS_TARGET', state: 'new' },
      { sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'P', legacyTargetRefId: 'OWA_ENTITY_TARGET', id: 'OWA_REL_LAYOUT_P_TARGET', state: 'preserved' },
      { sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'retired', legacyTargetRefId: 'OWA_ENTITY_TARGET', id: 'OWA_REL_RETIRED', state: 'retired' },
      { sourceEntityRefId: 'OWA_ENTITY_ENCJA_FIXTURE', predicate: 'new', legacyTargetRefId: 'OWA_ENTITY_TARGET', id: 'OWA_REL_NEW', state: 'new' },
    ],
  };
}
