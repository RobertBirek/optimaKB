#!/usr/bin/env node

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'erp-kb-retrieval-'));
const previousRoot = process.env.ROOT;
const providerVariables = ['EXA_API_KEY', 'EXA_MCP_COMMAND', 'EXA_PROVIDER', 'EXA_API_URL', 'EXA_AUTO_DRAFT', 'ENABLE_LIVE_LEARNING'];
const previousProviderVariables = new Map(providerVariables.map((name) => [name, process.env[name]]));
delete process.env.EXA_API_KEY;
delete process.env.EXA_MCP_COMMAND;
process.env.EXA_PROVIDER = 'api';
process.env.EXA_API_URL = 'https://exa.invalid.test/search';
process.env.EXA_AUTO_DRAFT = '0';
process.env.ENABLE_LIVE_LEARNING = '0';
process.env.ROOT = fixtureRoot;
const originalFetch = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async () => {
  networkAttempts += 1;
  throw new Error('Test lokalny nie może wykonywać żądań sieciowych.');
};

const {
  buildPragmaticAnswer,
  extractTerms,
  gatherEvidence,
  scanArtifact,
} = await import('./erp_knowledge_answer.mjs');

const PRIMARY = 'ComarchOptimaBusinessSemantics';
const SCHEMA = 'ComarchOptimaSchema';
const COM = 'ComarchOptimaAdditionalFunctions';
const checks = [];

function check(name, run) {
  try {
    run();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', message: error.message });
  }
}

async function checkAsync(name, run) {
  try {
    await run();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', message: error.message });
  }
}

function writeArtifact(relativePath, content) {
  const destination = path.join(fixtureRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, content);
  return relativePath;
}

function makeResponse(primaryArtifacts = [], supportKbs = []) {
  return {
    primaryKb: { name: PRIMARY, namespace: PRIMARY, artifacts: primaryArtifacts },
    supportKbs,
  };
}

function supportKb(name, artifacts) {
  return { name, namespace: name, artifacts };
}

function sha256(content) {
  return `sha256:${crypto.createHash('sha256').update(content).digest('hex')}`;
}

function assertRetrievalMetadata(answer) {
  assert.equal(answer.retrieval.backend, 'local_artifacts');
  assert.equal(answer.retrieval.graphUsed, false);
  assert.equal(answer.retrieval.confidenceMeaning, 'heuristic_retrieval_score');
  assert.ok(Array.isArray(answer.evidenceAssessment.reasons));
  assert.equal(answer.evidenceAssessment.scope, 'local_artifacts');
  assert.ok(answer.evidenceAssessment.reasons.length > 0);
  assert.ok(Array.isArray(answer.evidenceAssessment.missingTerms));
}

function missingTerms(answer) {
  return answer.evidenceAssessment.missingTerms.map((term) => term.toLowerCase());
}

try {
  check('Znane skróty dokumentów pozostają terminami wyszukiwania', () => {
    const aliases = ['PZ', 'WZ', 'FS', 'FZ', 'PW', 'RW', 'MM', 'RO', 'ZD', 'PA', 'PF'];
    const terms = extractTerms(`Jak PZ i PZ oraz ${aliases.join(', ')}?`);
    assert.deepEqual(terms, aliases.map((alias) => alias.toLowerCase()));
  });

  check('Skróty nie przywracają krótkich słów bez znaczenia', () => {
    const terms = extractTerms('do PZ i WZ od aa na bb po cc SQL MCP');
    assert.deepEqual(terms, ['pz', 'wz']);
  });

  check('PZ nie dopasowuje PZW ani fragmentu identyfikatora', () => {
    const artifact = writeArtifact('docs/boundaries.md', [
      'PZW XPZ PZ1 PZ_307 APZB',
      'Zapis PZ: przyjęcie zewnętrzne.',
      'WZ/PZ i (PZ) to osobne symbole.',
      'Opis pz.',
    ].join('\n'));
    const scanned = scanArtifact(artifact, extractTerms('PZ'), [], 10);
    assert.deepEqual(scanned.hits.map((hit) => hit.line), [2, 3, 4]);
  });

  check('FS nie dopasowuje nazwy systemu plików ani FS1', () => {
    const artifact = writeArtifact('docs/fs-boundaries.md', 'NTFS FS1 _FS FS_extra\nDokument FS.\n');
    const scanned = scanArtifact(artifact, extractTerms('FS'), [], 10);
    assert.deepEqual(scanned.hits.map((hit) => hit.line), [2]);
  });

  const csvBytes = Buffer.from('\ufeffid,name,description,source\r\n'
    + 'R0,PZW,Inny dokument,local\r\n'
    + 'R1,Dostawa,"PZ: zapis ""bufor, test""\r\n'
    + 'Dokument używa CDN.TraNag i TypDokumentu=307.",local\r\n'
    + 'R2,WZ,Wydanie zewnętrzne,local\r\n', 'utf8');
  const csvArtifact = writeArtifact('exports/receipt.csv', csvBytes);

  check('CSV cytowane wiele linii jest jednym rekordem z fizycznym zakresem', () => {
    const scanned = scanArtifact(csvArtifact, ['pz'], [], 10);
    assert.equal(scanned.hits.length, 1);
    assert.equal(scanned.hits[0].line, 3);
    assert.equal(scanned.hits[0].endLine, 4);
    assert.match(scanned.hits[0].snippet, /PZ/);
    assert.match(scanned.hits[0].snippet, /bufor, test/);
    assert.doesNotMatch(scanned.hits[0].snippet, /""bufor/);
    assert.equal(scanned.contentHash, sha256(csvBytes));
    assert.ok(!Number.isNaN(Date.parse(scanned.observedAt)));
  });

  check('Dopasowanie w drugiej linii CSV zachowuje początek rekordu', () => {
    const scanned = scanArtifact(csvArtifact, ['typdokumentu'], [], 10);
    assert.equal(scanned.hits.length, 1);
    assert.equal(scanned.hits[0].line, 3);
    assert.equal(scanned.hits[0].endLine, 4);
    assert.match(scanned.hits[0].snippet, /TypDokumentu=307/);
  });

  check('Nagłówek CSV nie jest dowodem na obsługę PZ', () => {
    const artifact = writeArtifact('exports/header-only.csv', '\ufeff"PZ","description"\r\n"neutral","nothing"\r\n');
    assert.equal(scanArtifact(artifact, ['pz'], [], 10).hits.length, 0);
  });

  check('Fragment CSV pokazuje dopasowane pole za długim prefiksem', () => {
    const artifact = writeArtifact('exports/long-prefix.csv', 'id,description\n'
      + `${'x'.repeat(500)},"PZ AddNew przyjęcie do bufora"\n`);
    const scanned = scanArtifact(artifact, ['pz'], [], 10);
    assert.equal(scanned.hits.length, 1);
    assert.equal(scanned.hits[0].line, 2);
    assert.match(scanned.hits[0].snippet, /PZ/);
    assert.ok(scanned.hits[0].snippet.length <= 280);
  });

  check('Okno fragmentu wybiera samodzielne PZ, nawet jeśli wcześniej występuje PZW', () => {
    const artifact = writeArtifact('exports/long-alias-prefix.csv', 'id,description\n'
      + `PZW,"${'x'.repeat(500)} PZ AddNew przyjęcie do bufora"\n`);
    const scanned = scanArtifact(artifact, ['pz'], [], 10);
    assert.equal(scanned.hits.length, 1);
    assert.match(scanned.hits[0].snippet, /\bPZ\b/);
    assert.ok(scanned.hits[0].snippet.length <= 280);
  });

  check('Okno fragmentu pokazuje zwykły termin, gdy pytanie nie zawiera skrótu', () => {
    const artifact = writeArtifact('exports/long-term-prefix.csv', 'id,description\n'
      + `${'x'.repeat(500)},"TypDokumentu określa rodzinę dokumentu"\n`);
    const scanned = scanArtifact(artifact, ['typdokumentu'], [], 10);
    assert.equal(scanned.hits.length, 1);
    assert.match(scanned.hits[0].snippet, /TypDokumentu/);
    assert.ok(scanned.hits[0].snippet.length <= 280);
  });

  check('CSV ma stabilny identyfikator źródła, hash surowych bajtów i locator zakresu', () => {
    const response = makeResponse([csvArtifact]);
    const first = gatherEvidence(response, ['pz']);
    const second = gatherEvidence(response, ['pz']);
    assert.equal(first.length, 1);
    assert.equal(first[0].locator, 'L3-L4');
    assert.equal(first[0].contentHash, sha256(csvBytes));
    assert.equal(first[0].sourceId, second[0].sourceId);
    assert.match(first[0].sourceId, /^sha256:[a-f0-9]{64}$/);
    assert.equal(first[0].uri, `knowledge://legacy/${PRIMARY}/exports/receipt.csv`);
    assert.equal(first[0].excerpt, first[0].hits[0].snippet);
    fs.writeFileSync(path.join(fixtureRoot, csvArtifact), Buffer.concat([csvBytes, Buffer.from('\r\n')]));
    const changed = gatherEvidence(response, ['pz']);
    assert.notEqual(changed[0].sourceId, first[0].sourceId);
    assert.notEqual(changed[0].contentHash, first[0].contentHash);
    assert.equal(changed[0].uri, first[0].uri);
  });

  check('Istniejący locator tekstu i pola dowodu są zachowane', () => {
    const artifact = writeArtifact('docs/plain.md', 'PZ dokument.\n');
    const [evidence] = gatherEvidence(makeResponse([artifact]), ['pz']);
    assert.equal(evidence.locator, 'L1');
    assert.equal(evidence.artifact, artifact);
    assert.equal(evidence.type, 'md');
    assert.equal(evidence.kb, PRIMARY);
    assert.equal(evidence.excerpt, 'PZ dokument.');
  });

  const primaryArtifact = writeArtifact('docs/primary.md', 'PZ dokument ogólny.\n');
  const schemaArtifact = writeArtifact('docs/schema.md', 'PZ dokument CDN.TraNag Bufor TypDokumentu.\n');
  const comArtifact = writeArtifact('docs/com.md', 'PZ dokument AddNew CDN.DokumentyHaMag Bufor.\n');
  const scopedResponse = makeResponse([primaryArtifact], [
    supportKb(SCHEMA, [schemaArtifact]),
    supportKb(COM, [comArtifact]),
  ]);

  check('Pusty zbiór dozwolonych namespace nie zwraca żadnego źródła', () => {
    assert.deepEqual(gatherEvidence(scopedResponse, ['pz'], [], new Set()), []);
  });

  check('Ograniczenie namespace odcina główną i obcą pomocniczą KB', () => {
    const evidence = gatherEvidence(scopedResponse, ['pz'], [], new Set([SCHEMA]));
    assert.deepEqual(evidence.map((item) => item.kb), [SCHEMA]);
    assert.equal(evidence[0].artifact, schemaArtifact);
  });

  check('Nieznana dozwolona KB nie rozszerza dostępu', () => {
    assert.deepEqual(gatherEvidence(scopedResponse, ['pz'], [], new Set(['UnknownNamespace'])), []);
  });

  check('Brak ograniczenia zachowuje źródła ze wszystkich wskazanych KB', () => {
    const evidence = gatherEvidence(scopedResponse, ['pz'], [], null);
    assert.deepEqual(evidence.map((item) => item.kb).sort(), [PRIMARY, SCHEMA, COM].sort());
  });

  check('Sześć ogólnych źródeł głównej KB nie wypiera trafnych SQL i COM', () => {
    const primaryArtifacts = Array.from({ length: 6 }, (_, index) =>
      writeArtifact(`docs/generic-${index}.md`, `Dokument: ogólny opis numer ${index}.\n`));
    const response = makeResponse(primaryArtifacts, [
      supportKb(SCHEMA, [schemaArtifact]),
      supportKb(COM, [comArtifact]),
    ]);
    const question = 'PZ dokument CDN.TraNag Bufor TypDokumentu AddNew';
    const evidence = gatherEvidence(response, extractTerms(question));
    assert.equal(evidence.length, 8);
    const originalEvidence = JSON.stringify(evidence);
    const answer = buildPragmaticAnswer(question, response, evidence);
    assert.equal(answer.evidence.length, 5);
    assert.equal(answer.evidence[0].kb, SCHEMA);
    assert.ok(answer.evidence.some((item) => item.kb === COM));
    assert.equal(answer.evidence.filter((item) => item.kb === PRIMARY).length, 3);
    assert.equal(JSON.stringify(evidence), originalEvidence);
    assert.deepEqual(buildPragmaticAnswer(question, response, evidence).evidence, answer.evidence);
  });

  check('Ranking zachowuje różnorodność przy wielu mocnych trafieniach głównej KB', () => {
    const primaryArtifacts = Array.from({ length: 6 }, (_, index) =>
      writeArtifact(`docs/strong-${index}.md`, 'PZ dokument CDN.TraNag Bufor TypDokumentu AddNew.\n'));
    const response = makeResponse(primaryArtifacts, [
      supportKb(SCHEMA, [schemaArtifact]),
      supportKb(COM, [comArtifact]),
    ]);
    const question = 'PZ dokument CDN.TraNag Bufor TypDokumentu AddNew';
    const answer = buildPragmaticAnswer(question, response, gatherEvidence(response, extractTerms(question)));
    assert.equal(answer.evidence.length, 5);
    assert.equal(answer.evidence[0].kb, PRIMARY);
    assert.deepEqual([...new Set(answer.evidence.map((item) => item.kb))].sort(), [PRIMARY, SCHEMA, COM].sort());
  });

  check('Brak źródeł jawnie zgłasza brak dowodów i nie deklaruje użycia grafu', () => {
    const answer = buildPragmaticAnswer('PZ CDN.TraNag', makeResponse(), []);
    assertRetrievalMetadata(answer);
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.equal(answer.evidenceSource, 'none');
    assert.equal(answer.externalSearch.used, false);
    assert.deepEqual(answer.evidence, []);
    assert.ok(missingTerms(answer).includes('pz'));
    assert.ok(missingTerms(answer).includes('cdn.tranag'));
  });

  check('Trafienie WZ nie potwierdza wymaganego PZ', () => {
    const artifact = writeArtifact('docs/wz-only.md', 'WZ i PZW opisuje CDN.TraNag.\n');
    const response = makeResponse([artifact]);
    const question = 'PZ CDN.TraNag';
    const answer = buildPragmaticAnswer(question, response, gatherEvidence(response, extractTerms(question)));
    assertRetrievalMetadata(answer);
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.ok(missingTerms(answer).includes('pz'));
  });

  check('Trafienie PZ bez wymaganej tabeli pozostaje niewystarczające', () => {
    const response = makeResponse([primaryArtifact]);
    const question = 'PZ CDN.TraNag';
    const answer = buildPragmaticAnswer(question, response, gatherEvidence(response, extractTerms(question)));
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.ok(missingTerms(answer).includes('cdn.tranag'));
    assert.ok(!missingTerms(answer).includes('pz'));
  });

  check('Jawna nazwa tabeli nie dopasowuje innego obiektu z tym samym prefiksem', () => {
    const artifact = writeArtifact('docs/relation-only.md', 'PZ ma relacje w CDN.TraNagRel.\n');
    const response = makeResponse([artifact]);
    const question = 'PZ CDN.TraNag';
    const answer = buildPragmaticAnswer(question, response, gatherEvidence(response, extractTerms(question)));
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.ok(missingTerms(answer).includes('cdn.tranag'));
    assert.ok(!missingTerms(answer).includes('pz'));
  });

  check('Dopasowanie wszystkich słów nadal nie jest weryfikacją twierdzeń', () => {
    const response = makeResponse([schemaArtifact]);
    const question = 'PZ CDN.TraNag';
    const answer = buildPragmaticAnswer(question, response, gatherEvidence(response, extractTerms(question)));
    assertRetrievalMetadata(answer);
    assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
    assert.deepEqual(answer.evidenceAssessment.missingTerms, []);
    assert.equal(answer.question, question);
    assert.equal(answer.primaryKb, PRIMARY);
    assert.deepEqual(answer.supportKbs, []);
    assert.deepEqual(answer.recommendedArtifacts, [schemaArtifact]);
    assert.equal(answer.evidenceSource, 'local');
    assert.equal(typeof answer.note, 'string');
    assert.equal(answer.externalSearch.used, false);
    assert.deepEqual(answer.externalEvidence, []);
  });

  check('Każdy żądany skrót jest wymagany przy porównaniu PZ i WZ', () => {
    const response = makeResponse([schemaArtifact]);
    const question = 'PZ WZ CDN.TraNag';
    const answer = buildPragmaticAnswer(question, response, gatherEvidence(response, extractTerms(question)));
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.ok(missingTerms(answer).includes('wz'));
    assert.ok(!missingTerms(answer).includes('pz'));
  });

  check('Niepełny CSV nie produkuje pozornego fragmentu dowodowego', () => {
    const artifact = writeArtifact('exports/malformed.csv', 'id,description\n1,"PZ bez końca\n');
    const scanned = scanArtifact(artifact, ['pz'], [], 10);
    assert.deepEqual(scanned.hits, []);
    assert.deepEqual(scanned.warnings, ['invalid_csv']);
  });

  check('Błąd CSV jest widoczny w ocenie także obok dopasowanego źródła', () => {
    const malformed = 'exports/malformed.csv';
    const response = makeResponse([schemaArtifact, malformed]);
    const question = 'PZ CDN.TraNag';
    const diagnostics = [];
    const evidence = gatherEvidence(response, extractTerms(question), [], null, diagnostics);
    assert.deepEqual(diagnostics, [{ artifact: malformed, code: 'invalid_csv' }]);
    assert.equal(evidence.length, 1);
    const answer = buildPragmaticAnswer(question, response, evidence, diagnostics);
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.ok(answer.evidenceAssessment.reasons.includes('invalid_csv'));
  });

  check('Błąd CSV z niedozwolonej KB nie ujawnia jej artefaktów', () => {
    const response = makeResponse(['exports/malformed.csv'], [supportKb(SCHEMA, [schemaArtifact])]);
    const diagnostics = [];
    const evidence = gatherEvidence(response, ['pz'], [], new Set([SCHEMA]), diagnostics);
    assert.deepEqual(diagnostics, []);
    assert.equal(evidence.length, 1);
    assert.equal(evidence[0].kb, SCHEMA);
  });

  writeArtifact('docs/reference/ERP_Knowledge_Assistant_Routing.json',
    fs.readFileSync(new URL('../docs/reference/ERP_Knowledge_Assistant_Routing.json', import.meta.url)));
  writeArtifact('exports/optima_schema/v1/table_query_guide.csv',
    'id,description\n1,"PZ CDN.TraNag SQL schema TypDokumentu Bufor"\n');
  const { handleJsonRpcRequest } = await import('./lib/erp_knowledge_mcp_core.mjs');
  const { getMcpProfile } = await import('./lib/erp_knowledge_mcp_profiles.mjs');
  const { getExternalSearchStatus } = await import('./lib/external_search.mjs');

  const callTool = (name, args, profileId, allowedNamespaces = new Set([SCHEMA])) => {
    return handleJsonRpcRequest({
      jsonrpc: '2.0', id: 71, method: 'tools/call',
      params: { name, arguments: args },
    }, { profile: getMcpProfile(profileId), allowedNamespaces, writeAllowed: false });
  };

  await checkAsync('MCP answer_question udostępnia ocenę i metadane przez structuredContent', async () => {
    assert.equal(getExternalSearchStatus().enabled, false);
    const result = await callTool('answer_question', { question: 'PZ CDN.TraNag SQL schema TypDokumentu' }, 'scoped-readonly');
    assert.equal(result.id, 71);
    assert.equal(result.error, undefined);
    assert.equal(result.result.isError, undefined);
    const answer = result.result.structuredContent;
    assertRetrievalMetadata(answer);
    assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
    assert.equal(answer.externalSearch.used, false);
    assert.ok(answer.evidence.length > 0);
    assert.ok(answer.evidence.every((item) => item.kb === SCHEMA));
    assert.match(result.result.content[0].text, /bez wykonania grafu/);
  });

  await checkAsync('Domenowe MCP zachowuje ocenę oraz metadane bez statusu potwierdzenia', async () => {
    const result = await callTool('optima_schema.search', {
      query: 'PZ CDN.TraNag SQL schema TypDokumentu', correlation_id: 'local-retrieval-test',
    }, 'optima-technical-mcp');
    assert.equal(result.error, undefined);
    const answer = result.result.structuredContent;
    assertRetrievalMetadata(answer);
    assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
    assert.equal(answer.knowledge_status, 'partial');
    assert.equal(answer.correlation_id, 'local-retrieval-test');
    assert.ok(answer.evidence.every((item) => item.kb === SCHEMA));
  });

  await checkAsync('Domenowe MCP zgłasza unknown mimo trafień, jeśli brakuje żądanego WZ', async () => {
    const result = await callTool('optima_schema.search', {
      query: 'WZ CDN.TraNag SQL schema TypDokumentu',
    }, 'optima-technical-mcp');
    assert.equal(result.error, undefined);
    const answer = result.result.structuredContent;
    assertRetrievalMetadata(answer);
    assert.ok(answer.evidence.length > 0);
    assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
    assert.ok(missingTerms(answer).includes('wz'));
    assert.equal(answer.knowledge_status, 'unknown');
  });

  await checkAsync('Pusty zakres MCP nie ujawnia dowodów głównej KB', async () => {
    const result = await callTool('answer_question', { question: 'PZ CDN.TraNag' }, 'scoped-readonly', new Set());
    assert.equal(result.id, 71);
    assert.equal(result.jsonrpc, '2.0');
    assert.equal(result.error.code, -32001);
    assert.match(result.error.message, /brak|dostęp|dozwolon/i);
    assert.equal(result.result, undefined);
    assert.equal(result.evidence, undefined);
    assert.equal(networkAttempts, 0);
  });

  const withExternalSearchMock = async (run) => {
    const disabledFetch = globalThis.fetch;
    let mockCalls = 0;
    process.env.EXA_API_KEY = 'synthetic-local-test-key';
    globalThis.fetch = async (url, request) => {
      assert.equal(url, 'https://exa.invalid.test/search');
      assert.equal(request.method, 'POST');
      assert.equal(request.headers['x-api-key'], 'synthetic-local-test-key');
      assert.equal(typeof JSON.parse(request.body).query, 'string');
      mockCalls += 1;
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({ results: [{
          title: 'Syntetyczny wynik testu',
          url: 'https://pomoc.comarch.pl/local-synthetic-test',
          summary: 'Syntetyczny fragment lokalnego testu odpowiedzi. Bez źródła runtime.',
        }] }),
      };
    };
    try {
      await run();
      assert.equal(mockCalls, 1);
      assert.equal(fs.existsSync(path.join(fixtureRoot, 'downloads/knowledge_inbox')), false);
    } finally {
      delete process.env.EXA_API_KEY;
      globalThis.fetch = disabledFetch;
    }
  };

  await checkAsync('Fallback łączący lokalne i zewnętrzne źródła jawnie oznacza oba backendy', async () => {
    await withExternalSearchMock(async () => {
      const result = await callTool('answer_question', {
        question: 'ostatnio PZ CDN.TraNag SQL schema TypDokumentu',
      }, 'scoped-readonly');
      assert.equal(result.error, undefined);
      const answer = result.result.structuredContent;
      assert.equal(answer.externalSearch.used, true);
      assert.equal(answer.evidenceSource, 'blended');
      assert.equal(answer.retrieval.backend, 'local_artifacts_with_external_search');
      assert.equal(answer.retrieval.graphUsed, false);
      assert.equal(answer.retrieval.confidenceMeaning, 'heuristic_retrieval_score');
      assert.equal(answer.evidenceAssessment.scope, 'local_artifacts');
      assert.equal(answer.evidenceAssessment.status, 'unverified_evidence');
      assert.match(result.result.content[0].text, /^Źródło: lokalne artefakty KB i zewnętrzne wyszukiwanie;/m);
      assert.match(result.result.content[0].text, /bez wykonania grafu/);
    });
  });

  await checkAsync('Fallback bez lokalnych źródeł nie sugeruje lokalnego dowodu ani grafu', async () => {
    await withExternalSearchMock(async () => {
      const result = await callTool('answer_question', {
        question: 'ostatnio niezwykłyznacznikxyz',
      }, 'scoped-readonly');
      assert.equal(result.error, undefined);
      const answer = result.result.structuredContent;
      assert.deepEqual(answer.evidence, []);
      assert.equal(answer.externalSearch.used, true);
      assert.equal(answer.evidenceSource, 'external');
      assert.equal(answer.retrieval.backend, 'external_search');
      assert.equal(answer.retrieval.graphUsed, false);
      assert.equal(answer.evidenceAssessment.scope, 'local_artifacts');
      assert.equal(answer.evidenceAssessment.status, 'insufficient_evidence');
      assert.match(result.result.content[0].text, /^Źródło: zewnętrzne wyszukiwanie;/m);
      assert.match(result.result.content[0].text, /bez wykonania grafu/);
    });
  });

  check('Cały pakiet regresji działa bez żądań sieciowych', () => {
    assert.equal(networkAttempts, 0);
  });
} finally {
  if (previousRoot === undefined) delete process.env.ROOT;
  else process.env.ROOT = previousRoot;
  for (const [name, value] of previousProviderVariables) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  globalThis.fetch = originalFetch;
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}

const failed = checks.filter((result) => result.status === 'FAIL');
process.stdout.write(`${JSON.stringify({
  ok: failed.length === 0,
  passed: checks.length - failed.length,
  failed: failed.length,
  checks,
}, null, 2)}\n`);
if (failed.length) process.exitCode = 1;
