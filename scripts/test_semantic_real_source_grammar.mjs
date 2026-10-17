// Synthetic source grammars only; no corpus, gold, services or provider access.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { buildSemanticRequestPlan, resolveSemanticSubjects } from './lib/semantic_requirements.mjs';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
import { selectOwaEvidence, assessOwaCoverage } from './lib/owa_evidence.mjs';
import { installRuntimeGuard } from './lib/owa_offline_harness.mjs';
import { budgetSemanticUnits, semanticMaterialFacts } from './lib/semantic_evidence.mjs';

const scope = new Set(['OWAOntology']);
const row = (id, name, description, extra = {}, type = 'ontology_entity') => ({
  namespace: 'OWAOntology', artifact: `exports/owa_ontology/v1/${type}.csv`,
  contentHash: 'sha256:' + 'f'.repeat(64), line: 2, endLine: 30,
  fields: { id, name, canonicalName: name, description, semanticType: type, ...extra },
});
const owner = row('opaque:copper', 'Rejestr miedziany', 'Rejestr przechowuje przesyłki w oddzielnych pakietach.');
const chunk = row('chunk:copper', '', '## Pola i mapowanie\n- `Cpr_Mode` (tinyint) — rodzaj przesyłki [UNKNOWN enum]\n\n## Kluczowe pola\n| Kolumna MSSQL | Typ SQL | Opis |\n| --- | --- | --- |\n| Cpr_Amount | decimal | Kwota pierwotna |',
  { sourceDocumentRefId: owner.fields.id }, 'chunk');

test('followup: literal owned chunks declare fields and statuses without cross-owner invention', () => {
  const wrong = { ...chunk, namespace: 'Private', get fields() { throw Error('excluded'); } };
  const c = buildSemanticCatalog([owner, chunk, wrong], scope);
  assert.equal(c.fields.find(f => f.name === 'Cpr_Mode')?.ownerId, owner.fields.id);
  assert.match(c.fields.find(f => f.name === 'Cpr_Mode')?.status || '', /UNKNOWN/);
  assert.equal(c.fields.find(f => f.name === 'Cpr_Mode')?.origin, chunk);
  assert.equal(c.fields.find(f => f.name === 'Cpr_Amount')?.origin, chunk);
  assert(!c.fields.some(f => f.name === 'tinyint'));
});

test('followup: technical owner phrases remain literal source candidates', () => {
  const c = buildSemanticCatalog([owner, row('chunk:phrase', '', '## Opis\nKażda przesyłka ma osobny wariant oznaczony przez `Cpr_Variant`. ' + 'Warunek pozostaje przy całej deklaracji. '.repeat(7),
    { sourceDocumentRefId: owner.fields.id }, 'chunk')], scope);
  assert(c.identities[0].phrases.some(p => p.text.includes('osobny wariant') && p.origin.fields.id === 'chunk:phrase'));
});

test('followup: field identity prevents unrelated verification prose becoming a subject', () => {
  const noise = row('opaque:noise', 'Rejestr oliwkowy', 'Dokładna liczba raportów nie została ustalona.');
  const c = buildSemanticCatalog([owner, chunk, noise], scope);
  const r = resolveSemanticSubjects('Jakie dokładnie kody liczbowe ma Cpr_Mode? Nie zgaduj wartości.', 'entity', c);
  assert.deepEqual(r.subjects.map(s => s.id), [owner.fields.id]);
});

test('followup: status-axis clarification survives a recognized owner', () => {
  const c = buildSemanticCatalog([owner], scope);
  const p = buildSemanticRequestPlan('Co oznacza stan dokumentu w Rejestr miedziany? Nie podałem typu dokumentu ani osi stanu.', 'concept', c);
  assert(p.requirements.some(r => r.facet === 'statusAmbiguity'));
});

test('followup: explanatory overview cannot be covered by an identity inventory', () => {
  const c = buildSemanticCatalog([owner], scope), q = 'Opisz Rejestr miedziany';
  const p = buildSemanticRequestPlan(q, 'entity', c), ctx = parseOwaQuestion(q);
  const s = selectOwaEvidence(ctx, [owner], p);
  const inventory = s.metadata.get(owner).units.find(u => u.text.startsWith('| id |'));
  if (inventory) assert(!assessOwaCoverage(ctx, s, [{ ...inventory, namespace: owner.namespace, owa: { row: owner, ownerIds: [owner.fields.id] } }]).requirements.some(r => r.covered));
  assert(s.metadata.get(owner).units.some(u => u.text.includes('przechowuje przesyłki')));
});

test('followup: requested unresolved source contrast keeps the owned UNKNOWN counterpart eligible', () => {
  const a = row('opaque:amber', 'Wpis bursztynowy', 'Wpis jest generowany automatycznie.');
  const b = row('chunk:amber', '', '## Otwarte problemy\n- [UNKNOWN: czy generowanie jest automatyczne czy ręczne?]', { sourceDocumentRefId: a.fields.id }, 'chunk');
  const q = 'Wpis bursztynowy: opis automatyczny i otwarte pytanie czy ręczny. Nie ukrywaj sprzeczności.';
  const p = buildSemanticRequestPlan(q, 'entity', buildSemanticCatalog([a, b], scope));
  const s = selectOwaEvidence(parseOwaQuestion(q), [a, b], p);
  assert(s.metadata.get(b)?.units.some(u => u.text.includes('UNKNOWN')));
});

test('followup: existing disabled provider has zero config or network I/O', async () => {
  process.env.EXA_PROVIDER = 'disabled';
  const { searchExternalSources } = await import('./lib/external_search.mjs');
  const root = '/tmp/opencode/disabled-provider-synthetic';
  const guard = installRuntimeGuard({ root, output: root, files: new Map(), directories: new Set([root]) });
  try {
    const result = await searchExternalSources({ query: 'Synthetic offline provider check' });
    assert.equal(result.ok, false); assert.equal(result.provider, 'disabled');
    assert.deepEqual(guard.reads, []); assert.deepEqual(guard.violations, []);
  } finally { guard.restore(); }
});

test('followup: natural data meanings retain each declared amount field, not unrelated columns', () => {
  const data = row('chunk:values', '', '## Kluczowe pola\n| Kolumna | Typ | Opis |\n| --- | --- | --- |\n| Cpr_Original | decimal | Kwota pierwotna |\n| Cpr_Settled | decimal | Kwota rozliczona |\n| Cpr_Date | datetime | Data rejestracji |', { sourceDocumentRefId: owner.fields.id }, 'chunk');
  const p = buildSemanticRequestPlan('Rejestr miedziany: gdzie w opisie danych odróżniono pierwotną kwotę od kwoty rozliczonej?', 'entity', buildSemanticCatalog([owner, data], scope));
  assert.deepEqual(new Set(p.requirements.filter(r => r.facet === 'fields').map(r => r.fieldName)), new Set(['Cpr_Original', 'Cpr_Settled']));
});

test('followup: amount constraints retain the complete owned rule section as rules, not progression', () => {
  const data = row('chunk:rules', '', '## Reguły biznesowe\n- Kwota musi być dodatnia.\n- Wartość rozliczona nie przekracza kwoty początkowej.', { sourceDocumentRefId: owner.fields.id }, 'chunk');
  const q = 'Rejestr miedziany: jakie ograniczenia dotyczą kwoty?', c = buildSemanticCatalog([owner, data], scope);
  const p = buildSemanticRequestPlan(q, 'entity', c), s = selectOwaEvidence(parseOwaQuestion(q), [owner, data], p);
  assert(p.requirements.some(r => r.facet === 'rules'));
  assert(!p.requirements.some(r => r.facet === 'workflow'));
  assert(s.metadata.get(data)?.units.some(u => u.text.includes('musi być dodatnia')));
});

test('followup: a generic follow-up question cannot introduce another primary through source prose', () => {
  const noise = row('opaque:noise', 'Rejestr oliwkowy', 'Weryfikacja źródła pokazuje aktualizację dokumentu.');
  const c = buildSemanticCatalog([owner, noise], scope);
  const r = resolveSemanticSubjects('Opisz Rejestr miedziany. Weryfikacja źródła?', 'entity', c);
  assert.deepEqual(r.subjects.map(s => s.id), [owner.fields.id]);
});

test('followup: a source dictionary of other document symbols does not declare its owner as those documents', () => {
  const ledger = row('opaque:ledger', 'Słownik dokumentów', '## Klasy dokumentów\n| Symbol | Klasa | Nazwa |\n| --- | --- | --- |\n| ZVX | 778 | Zapis fiołkowy |');
  const document = row('opaque:violet', 'Zapis fiołkowy ZVX', 'Zapis dokumentuje rozliczenie.');
  const p = resolveSemanticSubjects('Opisz Zapis fiołkowy ZVX', 'entity', buildSemanticCatalog([ledger, document], scope));
  assert.deepEqual(p.subjects.map(s => s.id), [document.fields.id]);
});

for (const [established, followup, noiseText] of [
  ['Opisz Rejestr miedziany.', 'Podaj mapowanie w SQL.', 'Mapowanie w SQL opisuje rejestr oliwkowy.'],
  ['Opisz pole Cpr_Mode.', 'Jeśli słownik nie ustala wartości, nie zgaduj.', 'Słownik wartości rejestru oliwkowego nie został opisany.'],
  ['Rejestr miedziany.', 'Gdzie odróżniono kwotę pierwotną i kwotę systemową?', 'Kwota systemowa przechowywana osobno.'],
]) test(`continuity: generic follow-up retains the established owner: ${followup}`, () => {
  const noise = row('opaque:olive', 'Rejestr oliwkowy', noiseText);
  const q = `${established} ${followup}`, c = buildSemanticCatalog([owner, chunk, noise], scope);
  const p = buildSemanticRequestPlan(q, 'entity', c);
  assert.deepEqual(p.subjects.map(s => s.id), [owner.fields.id]);
  assert(p.requirements.every(r => r.ownerId === owner.fields.id));
});

test('continuity: independent natural subject and explicit comparison remain requested', () => {
  const other = row('opaque:olive', 'Rejestr oliwkowy', 'Ewidencjonowanie oliwkowych przesyłek.');
  const c = buildSemanticCatalog([owner, other], scope);
  for (const q of ['Rejestr miedziany. Niezależnie opisz ewidencjonowanie oliwkowych przesyłek.',
    'Porównaj Rejestr miedziany i Rejestr oliwkowy']) {
    assert.deepEqual(new Set(resolveSemanticSubjects(q, 'entity', c).subjects.map(s => s.id)), new Set([owner.fields.id, other.fields.id]));
  }
});

test('actions: declared head plus referenced target name resolves both comparison arms without document-code maps', () => {
  const targets = [row('opaque:birch', 'Zapis brzozowy BIR', 'Zapis przechowuje dane.'), row('opaque:elm', 'Zapis wiązowy ELM', 'Zapis przechowuje dane.')];
  const actions = [row('opaque:rev-birch', 'Zmiana BIR (BIRR)', 'Zmiana BIRR odnosi się do BIR.'), row('opaque:rev-elm', 'Zmiana ELM (ELMR)', 'Zmiana ELMR odnosi się do ELM.')];
  const c = buildSemanticCatalog([...targets, ...actions], scope);
  for (const q of ['Porównaj zmianę zapisu brzozowego ze zmianą wiązowego.', 'Czy zmiana zapisu wiązowego jest taka sama jak zmiana brzozowego?']) {
    const p = buildSemanticRequestPlan(q, 'process', c);
    assert.deepEqual(new Set(p.subjects.map(s => s.id)), new Set(actions.map(s => s.fields.id)));
    assert(p.requirements.some(r => r.ownerId === actions[0].fields.id));
    assert(p.requirements.some(r => r.ownerId === actions[1].fields.id));
  }
  const wrong = resolveSemanticSubjects('Zmiana zapisu nieistniejącego', 'process', c);
  assert(!wrong.subjects.some(s => actions.some(a => a.fields.id === s.id)));
});

test('actions: source-supported event head and arguments outrank incidental entities, not an unrelated action', () => {
  const record = row('opaque:record', 'Zapis', 'Zapis przechowuje informacje.'), ledger = row('opaque:ledger', 'Rejestr', 'Rejestr zawiera zapisy.');
  const action = row('opaque:handover', 'Przekazanie międzyrejestrowe (QMR)', '## Relacje\n- QMR przenosi zapisy między dwoma rejestrami.');
  const unrelated = row('opaque:close', 'Zamknięcie międzyrejestrowe', 'Rejestr zamyka zapisy w jednym rejestrze.');
  const c = buildSemanticCatalog([record, ledger, action, unrelated], scope);
  const p = resolveSemanticSubjects('Przekazuję zapisy między dwoma rejestrami.', 'process', c);
  assert.deepEqual(p.subjects.map(s => s.id), [action.fields.id]);
  assert(!resolveSemanticSubjects('Przekazuję faktury do archiwum.', 'process', c).subjects.some(s => s.id === action.fields.id));
});

test('actions: a literal source predicate preserves a second natural comparison arm and respects exclusion', () => {
  const a = row('opaque:handover', 'Przekazanie międzyrejestrowe (QMR)', 'Przekazanie przenosi zapisy między dwoma rejestrami.');
  const b = row('opaque:undo', 'Zmiana BIR (BIRR)', '## Relacje\n- Cofnięcie zapisu do wystawcy.');
  const c = buildSemanticCatalog([a, b], scope);
  const p = resolveSemanticSubjects('Porównaj przekazanie międzyrejestrowe z cofnięciem zapisu do wystawcy.', 'process', c);
  assert.deepEqual(new Set(p.subjects.map(s => s.id)), new Set([a.fields.id, b.fields.id]));
  const excluded = resolveSemanticSubjects('Opisz przekazanie międzyrejestrowe, nie pytam o cofnięcie zapisu do wystawcy.', 'process', c);
  assert(!excluded.subjects.some(s => s.id === b.fields.id));
});

test('actions: an operation title ending in a document code is not that document identity', () => {
  const doc = row('opaque:doc', 'Zapis bazowy ZBX', 'Zapis przechowuje dane.');
  const operation = row('flow:collect', 'Scalanie zapisów do ZBX', 'Operacja łączy dokumenty.', { workflowName: 'Scalanie' }, 'workflow_pattern');
  const c = buildSemanticCatalog([doc, operation], scope);
  assert(!c.symbols.some(s => s.ownerId === operation.fields.id && s.name === 'ZBX'));
});

test('material: requested variation dimensions and polarity are independent complete source obligations', () => {
  const a = row('opaque:delta', 'Zmiana szmaragdowa', '## Uwagi\nOryginał nie jest nadpisywany.\n\n## Relacje\nZmiana może dotyczyć kwot lub ilości. Może być in plus (zwiększenie) lub in minus (zmniejszenie).');
  const q = 'Zmiana szmaragdowa: czy nadpisuje oryginał? Czy może zwiększać i zmniejszać kwoty lub ilości?';
  const p = buildSemanticRequestPlan(q, 'process', buildSemanticCatalog([a], scope));
  for (const type of ['original', 'dimensions', 'polarity']) assert(p.requirements.some(r => r.qualifierClass === type));
  const s = selectOwaEvidence(parseOwaQuestion(q), [a], p);
  assert(s.metadata.get(a).units.some(u => u.text.includes('in plus') && u.text.includes('in minus')));
});

test('material: effect and necessity requests select literal relational prose and its whole qualifications', () => {
  const a = row('opaque:move', 'Przekazanie szmaragdowe', '## Relacje\nNie zmienia sumarycznego stanu, tylko rozmieszczenie.\n\n## Uwagi\nNie ma uczestnika zewnętrznego. Wymagane są oba rejestry.');
  const q = 'Przekazanie szmaragdowe. Co dzieje się z ilością? Czy potrzebny jest uczestnik zewnętrzny?';
  const p = buildSemanticRequestPlan(q, 'process', buildSemanticCatalog([a], scope));
  assert(p.requirements.some(r => r.workflowAspects?.includes('outcome')));
  assert(p.requirements.some(r => r.qualifierClass === 'necessity'));
  const s = selectOwaEvidence(parseOwaQuestion(q), [a], p);
  assert(s.metadata.get(a).units.some(u => u.text.includes('Nie ma uczestnika') && u.text.includes('oba rejestry')));
});

test('material: requested participating records retain the source numeric and opposite-sign constraint', () => {
  const a = row('opaque:net', 'Uzgodnienie szmaragdowe', '## Opis biznesowy\nUzgodnienie nie powoduje przepływu środków.\n\n## Reguły biznesowe\nUzgodnienie wymaga co najmniej trzech zapisów o przeciwnych znakach.');
  const p = buildSemanticRequestPlan('Uzgodnienie szmaragdowe: jakie zapisy obejmuje?', 'process', buildSemanticCatalog([a], scope));
  assert(p.requirements.some(r => r.qualifierClass === 'participation'));
});

test('material: table assignment and type-dependent scope are requested separately from a generic process path', () => {
  const a = row('opaque:stages', 'Obieg szmaragdowy', '## Źródła danych\n| Rola | Schemat | Tabela |\n| --- | --- | --- |\n| Etapy | AUX | StageMap |\n\n## Struktura procesu\nKażdy rodzaj zapisu ma własną definicję etapów.');
  const p = buildSemanticRequestPlan('Obieg szmaragdowy: etapy i obowiązkowość. Wskaż tabele i ograniczenia weryfikacji.', 'process', buildSemanticCatalog([a], scope));
  for (const type of ['sourceTables', 'scope']) assert(p.requirements.some(r => r.qualifierClass === type));
});

test('ambiguity: explicit missing document type and alternative operations request state-axis clarification', () => {
  const q = 'Dokument oczekuje zamknięcia. Czy chodzi o płatność czy zatwierdzenie? Nie podałem typu dokumentu ani operacji.';
  assert(parseOwaQuestion(q).facets.includes('statusAmbiguity'));
});

test('composition: nominal head and the declared object definition support a paraphrase without an alias map', () => {
  const object = row('opaque:parcel', 'Paczka', 'Paczka to rejestr przesyłek transportowych.');
  const property = row('opaque:bundle', 'Pakiet paczki', 'Pakiet oznacza wariant grupowania paczki.');
  const c = buildSemanticCatalog([object, property], scope);
  const p = resolveSemanticSubjects('W kilku pakietach przesyłek występują różne warianty.', 'entity', c);
  assert.deepEqual(p.subjects.map(s => s.id), [property.fields.id]);
  assert(!resolveSemanticSubjects('W kilku pakietach faktur występują różne warianty.', 'entity', c).subjects.some(s => s.id === property.fields.id));
});

test('material: upper-case source annotations retain execution status and literal table declarations', () => {
  assert(semanticMaterialFacts('## MCP API\n### WRITE (NIE WYWOŁANO)\n- operacja zapisuje dane.').includes('execution'));
  assert(semanticMaterialFacts('## Tabele MSSQL\n- `AUX.StageMap` — przypisanie etapów.').includes('sourceTables'));
});

test('budget: source-slot reservation keeps three exclusive conditions instead of a redundant process witness', () => {
  const a = row('opaque:stages', 'Obieg bursztynowy', 'Najpierw przyjmujemy wpis, następnie zatwierdzamy wpis.');
  const b = row('chunk:stages', '', '## Endpointy\nNajpierw przyjmujemy wpis, następnie zatwierdzamy wpis. Pełna realizacja jest warunkowa.\n\n## Reguły biznesowe\nWymagane są trzy etapy.\n\n## Struktura procesu\nKażdy rodzaj zapisu ma własną definicję etapów.\n\n## Źródła danych\n| Rola | Schemat | Tabela |\n| --- | --- | --- |\n| Etapy | AUX | StageMap |', { sourceDocumentRefId: a.fields.id }, 'chunk');
  const q = 'Obieg bursztynowy: etapy obowiązkowe. Wskaż tabele i ograniczenia weryfikacji.';
  const p = buildSemanticRequestPlan(q, 'process', buildSemanticCatalog([a, b], scope)), ctx = parseOwaQuestion(q), s = selectOwaEvidence(ctx, [a, b], p);
  const groups = [a, b].map(r => ({ source: { namespace: 'OWAOntology', key:r.fields.id }, score:1,
    units:s.metadata.get(r).units.map(u=>({ ...u, facets:[u.facet], relevance:1, owa:{row:r,ownerIds:[a.fields.id]} })) }));
  const assess = units => assessOwaCoverage(ctx, s, units);
  const selected = budgetSemanticUnits(groups, assess, () => {}, p);
  assert(assess(selected.extracts).requirements.every(r=>r.covered));
  assert.equal(selected.sources.length, 2);
  assert(selected.extracts.some(u=>u.text.includes('AUX | StageMap')));
});

test('continuity: a shadowed shorter metadata label cannot authorize disjoint weak evidence', () => {
  const short = row('opaque:short', 'Rejestr', 'Klucz główny jest potwierdzony.');
  const long = row('opaque:long', 'Rejestr szmaragdowy', 'Rejestr opisuje paczki.');
  const p = resolveSemanticSubjects('Rejestr szmaragdowy: jego klucz główny.', 'entity', buildSemanticCatalog([short, long], scope));
  assert.deepEqual(p.subjects.map(s=>s.id), [long.fields.id]);
});

test('continuity: asking for a difference between established owners cannot discover a Difference entity', () => {
  const a = row('opaque:a', 'Przepływ szmaragdowy', 'Przepływ opisuje przesyłkę.'), b = row('opaque:b', 'Rezerwa bursztynowa', 'Rezerwa oznacza należność.');
  const noise = row('opaque:difference', 'Różnica fiołkowa', 'Różnica wynika z przepływu przesyłki i należności.');
  const q = 'Czy Przepływ szmaragdowy i Rezerwa bursztynowa to to samo? Wyjaśnij różnicę między przepływem przesyłki a należnością.';
  const p = resolveSemanticSubjects(q, 'concept', buildSemanticCatalog([a, b, noise], scope));
  assert.deepEqual(new Set(p.subjects.map(s=>s.id)), new Set([a.fields.id,b.fields.id]));
});

test('paths: explicitly requested target reference and effect stay separate from forward creation proof', () => {
  const a = row('opaque:base', 'Zapis bazowy (ZBX)', 'Zapis przechowuje dane.');
  const b = row('opaque:revision', 'Zmiana ZBX (ZBXR)', '## Relacje\nZBXR → ZBX (oryginał).\nGeneruje przeciwny ruch ilościowy.');
  const q = 'Wyjaśnij ZBX → ZBXR: do czego odnosi się zmiana i jak ma się jej ruch do pierwotnego zapisu?';
  const p = buildSemanticRequestPlan(q, 'process', buildSemanticCatalog([a,b],scope)), ctx=parseOwaQuestion(q), s=selectOwaEvidence(ctx,[a,b],p);
  for(const type of ['reference','effectRelation']) assert(p.requirements.some(r=>r.ownerId===b.fields.id&&r.qualifierClass===type));
  assert(s.metadata.get(b).units.some(u=>u.text.includes('przeciwny ruch')));
  const visible=s.candidates.flatMap(r=>s.metadata.get(r).units.map(u=>({...u,namespace:r.namespace,owa:{row:r,ownerIds:[r.fields.id]}})));
  assert(!assessOwaCoverage(ctx,s,visible).requirements.some(r=>r.documentPath&&r.covered), 'reverse reference is not forward creation');
});

test('relations: explicit owner-attributed relationship cannot be replaced with a peer inventory', () => {
  const a=row('opaque:a','Karta miedziana','## Relacje\nNależy do `AUX.Groups` (N:1) przez Card_Group = Group_Key. Formalny FK niepotwierdzony.',{mainTable:'AUX.Cards'});
  const b=row('opaque:b','Grupa miedziana','## Relacje\nMa karty (1:N) w `AUX.Cards`.',{mainTable:'AUX.Groups'});
  const q='Karta miedziana: jej relacja do grupy miedzianej',p=buildSemanticRequestPlan(q,'relation',buildSemanticCatalog([a,b],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[a,b],p);
  const peer=s.metadata.get(b).units.map(u=>({...u,namespace:b.namespace,owa:{row:b,ownerIds:[b.fields.id]}}));
  assert(!assessOwaCoverage(ctx,s,peer).requirements.some(r=>r.facet==='relations'&&r.covered));
});

test('relations: unresolved derived endpoints are not eligible substitutes for an owned literal relation', () => {
  const a=row('opaque:a','Karta miedziana','## Relacje\nKarta ma elementy (1:N).');
  const edge=row('edge:bad','','', {sourceEntityRefId:a.fields.id,targetEntityRefId:'absent:target',predicate:'has',cardinality:'N:1'},'ontology_relation');
  const q='Karta miedziana: jej relacje',p=buildSemanticRequestPlan(q,'relation',buildSemanticCatalog([a,edge],scope)),s=selectOwaEvidence(parseOwaQuestion(q),[a,edge],p);
  assert(!s.candidates.includes(edge));
});

test('meaning: explicit difference asks for definitions rather than key or endpoint inventories', () => {
  const a=row('opaque:a','Karta miedziana','## Identyfikatory\nPK: Amber_Key.\n\n## Opis biznesowy\nKarta reprezentuje ewidencję zapisów.');
  const q='Co oznacza Karta miedziana?',p=buildSemanticRequestPlan(q,'concept',buildSemanticCatalog([a],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[a],p);
  const keys=s.metadata.get(a).units.filter(u=>u.text.includes('PK:')).map(u=>({...u,namespace:a.namespace,owa:{row:a,ownerIds:[a.fields.id]}}));
  assert(!assessOwaCoverage(ctx,s,keys).requirements.some(r=>r.facet==='overview'&&r.covered));
});

test('relations: an owner FK mention without cardinality or target-key mapping cannot discharge a requested relationship', () => {
  const a=row('opaque:a','Karta miedziana','## Reguły biznesowe\nFK do grupy. Usunięcie grupy kasuje kartę.');
  const q='Karta miedziana: jej relacja',p=buildSemanticRequestPlan(q,'relation',buildSemanticCatalog([a],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[a],p);
  const units=s.metadata.get(a).units.map(u=>({...u,namespace:a.namespace,owa:{row:a,ownerIds:[a.fields.id]}}));
  assert(!assessOwaCoverage(ctx,s,units).requirements.some(r=>r.facet==='relations'&&r.covered));
});

test('ambiguity: alternative named operations do not become ordinary evidence requirements when the document type is explicitly missing', () => {
  const op=row('opaque:reconcile','Uzgodnienie szmaragdowe','Uzgodnienie rozlicza zapisy.');
  const q='Dokument jest nierozliczony. Czy chodzi o Uzgodnienie szmaragdowe czy etap obiegu? Nie podałem typu dokumentu ani operacji.';
  const p=buildSemanticRequestPlan(q,'concept',buildSemanticCatalog([op],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[op],p);
  assert.deepEqual(p.requirements.map(r=>r.facet),['statusAmbiguity']);
  assert(!s.candidates.some(r=>s.metadata.get(r).units.length));
  const coverage=assessOwaCoverage(ctx,s,[]);
  assert(coverage.notices.some(n=>n.includes('operację')));
});

test('material: a bounded complete owned chunk can witness inseparable key, mapping, effect and verification facts', () => {
  const a=row('opaque:card','Karta szmaragdowa','Karta reprezentuje zapis.');
  const body='## Status weryfikacji\nKolumny niezweryfikowane w bazie.\n\n## Identyfikatory\nPK: Elm_Key; Status: do potwierdzenia.\n\n## Relacje\nNależy do `AUX.Groups` (N:1) przez Elm_Group → Group_Key.\n\n## Reguły biznesowe\nUsunięcie grupy kasuje wszystkie jej karty.';
  const b=row('chunk:card','',body,{sourceDocumentRefId:a.fields.id},'chunk');
  const q='Karta szmaragdowa: jej klucz i relacja do grupy. Jaki skutek usunięcia grupy opisuje źródło i jak mocno zweryfikowano informacje?';
  const p=buildSemanticRequestPlan(q,'entity',buildSemanticCatalog([a,b],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[a,b],p);
  assert(p.requirements.some(r=>r.qualifierClass==='verification'));
  assert(s.metadata.get(b).units.some(u=>u.text===body),'retain actual whole source bytes, not stitched snippets');
});

test('budget: an unrelated peer with zero attributable proof cannot fill spare source slots', () => {
  const a=row('opaque:a','Karta miedziana','## Relacje\nNależy do `AUX.Groups` (N:1) przez Card_Group → Group_Key.',{mainTable:'AUX.Cards'});
  const b=row('opaque:b','Grupa miedziana','## Relacje\nGrupa obejmuje karty `AUX.Cards` (1:N).',{mainTable:'AUX.Groups'});
  const q='Karta miedziana: jej relacja do grupy miedzianej',p=buildSemanticRequestPlan(q,'relation',buildSemanticCatalog([a,b],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[a,b],p);
  const groups=[a,b].map(r=>({source:{namespace:r.namespace,key:r.fields.id},score:1,units:s.metadata.get(r).units.map(u=>({...u,facets:[u.facet],relevance:1,owa:{row:r,ownerIds:[r.fields.id]}}))}));
  const result=budgetSemanticUnits(groups,u=>assessOwaCoverage(ctx,s,u),()=>{},p);
  assert(result.extracts.every(u=>u.owa.row===a));
  assert.equal(result.sources.length,1);
});

test('paths: asking what both documents mean creates two scoped definitions independent of forward path proof', () => {
  const a=row('opaque:base','Zapis bazowy (ZBX)','## Uwagi\n- Dokument przyjęcia przesyłki do rejestru z zewnątrz.\n- Może być powiązany z ABX.\n- Obieg: ZBX → ABX.');
  const b=row('opaque:result','Zapis wynikowy (ABX)','## Opis biznesowy\nZapis wynikowy dokumentuje rozliczenie przesyłki.');
  const q='Wyjaśnij ZBX → ABX: co oznaczają oba dokumenty?',p=buildSemanticRequestPlan(q,'process',buildSemanticCatalog([a,b],scope)),ctx=parseOwaQuestion(q),s=selectOwaEvidence(ctx,[a,b],p);
  for(const r of [a,b])assert(p.requirements.some(req=>req.ownerId===r.fields.id&&req.facet==='overview'));
  const units=s.candidates.flatMap(r=>s.metadata.get(r).units.map(u=>({...u,namespace:r.namespace,owa:{row:r,ownerIds:[r.fields.id]}})));
  assert(assessOwaCoverage(ctx,s,units).requirements.filter(r=>r.facet==='overview').every(r=>r.covered));
});
