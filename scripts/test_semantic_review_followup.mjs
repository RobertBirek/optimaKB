// Independent-review classes over unrelated in-memory source rows only.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { buildSemanticRequestPlan } from './lib/semantic_requirements.mjs';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
import { selectOwaEvidence, assessOwaCoverage } from './lib/owa_evidence.mjs';

const OWA='OWAOntology';
const row=(id,name,description,extra={},type='ontology_entity')=>({namespace:OWA,artifact:`exports/owa_ontology/v1/${type}.csv`,
  contentHash:'sha256:synthetic-review',line:2,endLine:30,fields:{id,name,canonicalName:name,description,semanticType:type,...extra}});
function setup(query,rows,intent='entity'){
  const catalog=buildSemanticCatalog(rows,new Set([OWA])),plan=buildSemanticRequestPlan(query,intent,catalog);
  const context=parseOwaQuestion(query,{symbols:catalog.symbols}),selection=selectOwaEvidence(context,rows,plan);
  const units=selection.candidates.flatMap(r=>selection.metadata.get(r).units.map(u=>({...u,namespace:r.namespace,
    artifact:r.artifact,recordId:r.fields.id,owa:{row:r,ownerIds:selection.metadata.get(r).ownerIds}})));
  return {catalog,plan,selection,units,assess:visible=>assessOwaCoverage(context,selection,visible)};
}
const padding=()=>[row('padding:one','Tło perłowe','Wyłącznie neutralne tło.'),row('padding:two','Tło miedziane','Neutralny opis pomocniczy.')];
for(const reverse of [false,true])test(`I1: complete neutral name, alias, ID and qualified table precede nominal composition; reverse=${reverse}`,()=>{
  const rows=[row('opaque:parcel','Paczka','Paczka to rejestr przesyłek transportowych.'),
    row('opaque:bundle','Pakiet paczki','## Opis biznesowy\nPakiet oznacza wariant grupowania paczki.'),
    row('opaque:explicit','Pakiet przesyłek','## Opis biznesowy\nObiekt reprezentuje niezależny dokument zbiorczy.',
      {aliases:'Pakiet transportowy',mainTable:'AUX.Explicit'})];
  if(reverse)rows.reverse();
  for(const label of ['Pakiet przesyłek','Pakiet transportowy','opaque:explicit','AUX.Explicit']){
    const s=setup('Opisz '+label,rows);
    assert.deepEqual(s.plan.subjects.map(s=>s.id),['opaque:explicit'],label);
    assert(s.assess(s.units).requirements.some(r=>r.ownerId==='opaque:explicit'&&r.facet==='overview'&&r.covered));
    assert(!s.units.some(u=>u.owa.ownerIds.includes('opaque:bundle')));
  }
});
test('I1: genuine outer-head reference to its declared target alias keeps compound ownership',()=>{
  const parcel=row('opaque:parcel','Paczka','Paczka to rejestr przesyłek transportowych.',{aliases:'Rejestr przesyłek'});
  const bundle=row('opaque:bundle','Pakiet paczki','## Opis biznesowy\nPakiet oznacza wariant grupowania paczki.');
  const s=setup('Opisz pakiet rejestru przesyłek',[parcel,bundle]);
  assert.deepEqual(s.plan.subjects.map(s=>s.id),['opaque:bundle']);
});
test('I1: a declared target symbol may originate in its owned chunk, without losing literal-target precedence rules',()=>{
  const target=row('unit:pearl','Zapis perłowy','Zapis przechowuje dane.',{aliases:'Zapis perłowy'});
  const declaration=row('chunk:pearl','','## Klasyfikacja\nSymbol: QTR; Status: DRAFT.',{sourceDocumentRefId:target.fields.id},'chunk');
  const change=row('unit:change','Zmiana QTR','Zmiana dokumentuje korektę.');
  const s=setup('Opisz zmianę zapisu perłowego',[target,declaration,change]);
  assert.deepEqual(s.plan.subjects.map(s=>s.id),[change.fields.id]);
});

function relationFixture(type='LOGICAL_JOIN'){
  const card=row('unit:cedar','Karta cedrowa','## Relacje ontologiczne\n| Predykat | Źródło | Cel | Kardynalność | Typ relacji | Warunek JOIN | Status |\n| --- | --- | --- | --- | --- | --- | --- |\n| należy | KartaCedrowa | RejestrPaprociowy | N:1 | '+type+' | AUX.Cedar.Card_Group = AUX.FernBook.Fern_Key | UNKNOWN |',{mainTable:'AUX.Cedar',aliases:'KartaCedrowa'});
  const book=row('unit:fern','Rejestr paprociowy','Rejestr opisuje wpisy.',{aliases:'FernBook'});
  const tables=row('chunk:fern','','## Źródła danych\n| Rola źródła | Schemat | Tabela lub obiekt |\n| --- | --- | --- |\n| Tabela główna | AUX | FernBook |',{sourceDocumentRefId:book.fields.id},'chunk');
  return {card,book,tables,query:'Relacja Karta cedrowa do Rejestr paprociowy: kardynalność, rozróżnij FK i relację logiczną'};
}
for(const type of ['FK','LOGICAL_JOIN'])test(`M2: actual typed relation row and owned source-table endpoint are proof, not verification: ${type}`,()=>{
  const f=relationFixture(type),s=setup(f.query,[f.card,f.book,f.tables],'relation');
  const visible=s.units.filter(u=>u.owa.row===f.card),c=s.assess(visible);
  assert(c.requirements.filter(r=>['relations','cardinality'].includes(r.facet)).every(r=>r.covered));
  assert.equal(c.status,'unknown','literal UNKNOWN is not erased by a known relation type');
  assert(!s.assess(visible.map(u=>({...u,owa:{...u.owa,row:{...u.owa.row,contentHash:'foreign'}}}))).requirements.some(r=>r.covered));
});
test('M2: another row cannot lend its type or cardinality to a requested endpoint',()=>{
  const f=relationFixture('');
  f.card.fields.description+='\n| inne | KartaCedrowa | NieznanyRejestr | 1:N | FK | AUX.Other.Other_Key = AUX.Cedar.Card_Key | DRAFT |';
  const s=setup(f.query,[f.card,f.book,f.tables],'relation');
  const cells=s.assess(s.units.filter(u=>u.owa.row===f.card)).requirements.filter(r=>r.endpointOwnerIds?.includes(f.book.fields.id)&&r.qualifications?.includes('formalFk'));
  assert(cells.length); assert(cells.every(r=>!r.covered));
});
test('M2: an endpoint label appearing only as a table header cannot establish the requested row',()=>{
  const f=relationFixture('FK');
  f.book.fields.name=f.book.fields.canonicalName='Cel'; f.book.fields.aliases='';
  f.card.fields.description=f.card.fields.description.replace('RejestrPaprociowy','NieznanyRejestr').replace('AUX.FernBook.Fern_Key','AUX.Other.Other_Key')+'\n\nFormalny FK pozostaje do potwierdzenia.';
  const s=setup('Relacja Karta cedrowa do Cel: kardynalność, formalny FK',[f.card,f.book],'relation');
  const cells=s.assess(s.units.filter(u=>u.owa.row===f.card)).requirements.filter(r=>r.endpointOwnerIds?.includes(f.book.fields.id));
  assert(cells.length); assert(cells.every(r=>!r.covered));
});
test('M2: a second row cannot lend cardinality to a blank requested row even when its type is known',()=>{
  const f=relationFixture('FK');
  f.card.fields.description=f.card.fields.description.replace('| N:1 | FK |','|  | FK |')+'\n| inne | KartaCedrowa | NieznanyRejestr | 1:N | FK | AUX.Other.Other_Key = AUX.Cedar.Card_Key | DRAFT |';
  const s=setup('Relacja Karta cedrowa do Rejestr paprociowy: kardynalność',[f.card,f.book,f.tables],'relation');
  const cells=s.assess(s.units.filter(u=>u.owa.row===f.card)).requirements.filter(r=>r.facet==='cardinality'&&r.endpointOwnerIds?.includes(f.book.fields.id));
  assert(cells.length); assert(cells.every(r=>!r.covered));
});
test('M2: a natural declared endpoint in a relation row needs no invented compressed ID',()=>{
  const f=relationFixture('FK');
  f.card.fields.description=f.card.fields.description.replace('RejestrPaprociowy','Rejestr paprociowy').replace('AUX.Cedar.Card_Group = AUX.FernBook.Fern_Key','—');
  const s=setup(f.query,[f.card,f.book],'relation');
  assert(s.assess(s.units.filter(u=>u.owa.row===f.card)).requirements.filter(r=>['relations','cardinality'].includes(r.facet)).every(r=>r.covered));
  f.card.fields.description=f.card.fields.description.replace('Rejestr paprociowy','UNDECLARED_RejestrPaprociowy');
  const wrong=setup(f.query,[f.card,f.book],'relation');
  const cells=wrong.assess(wrong.units.filter(u=>u.owa.row===f.card)).requirements.filter(r=>r.endpointOwnerIds?.includes(f.book.fields.id));
  assert(cells.length); assert(cells.every(r=>!r.covered));
});
test('M2: owned prose can bind a qualified target table, but foreign declarations cannot',()=>{
  const f=relationFixture('FK');
  f.card.fields.description='## Opis biznesowy\nKarta jest powiązana z `AUX.FernBook`.';
  const query='Relacja Karta cedrowa do Rejestr paprociowy';
  const s=setup(query,[f.card,f.book,f.tables],'relation');
  assert(s.assess(s.units.filter(u=>u.owa.row===f.card)).requirements.some(r=>r.facet==='relations'&&r.covered));
  const without=setup(query,[f.card,{...f.book,fields:{...f.book.fields,aliases:''}}, {...f.tables,namespace:'Private'}],'relation');
  assert(!without.assess(without.units.filter(u=>u.owa.row===f.card)).requirements.some(r=>r.covered));
});

function endpointFixture(source,target,join='—'){
  const f=relationFixture('FK');
  f.card.fields.description=f.card.fields.description.replace('KartaCedrowa',source).replace('RejestrPaprociowy',target)
    .replace('AUX.Cedar.Card_Group = AUX.FernBook.Fern_Key',join);
  f.query='Karta cedrowa: jej relacja do Rejestr paprociowy, kardynalność, formalny FK';
  return f;
}
function relationCells(f,reverse=false){
  const rows=[f.card,f.book,f.tables];if(reverse)rows.reverse();
  const s=setup(f.query,rows,'relation'),visible=s.units.filter(u=>u.owa.row===f.card);
  assert(visible.length,'actual container-owned selected units must be admitted');
  const cells=s.assess(visible).requirements.filter(r=>['relations','cardinality'].includes(r.facet));
  assert(cells.some(r=>r.facet==='relations')&&cells.some(r=>r.facet==='cardinality'),'both requested cells must exist');
  return cells;
}
for(const reverse of [false,true]){
  test(`I2: explicit foreign source is not replaced by the document container; reverse=${reverse}`,()=>{
    const f=endpointFixture('Niepowiązany zapis','Rejestr paprociowy');
    assert(relationCells(f,reverse).every(r=>!r.covered));
  });
  test(`I2: proper explicit source and target are relation evidence; reverse=${reverse}`,()=>{
    assert(relationCells(endpointFixture('Karta cedrowa','Rejestr paprociowy'),reverse).every(r=>r.covered));
  });
  test(`I2: legitimate inverse row retains its actual two endpoints; reverse=${reverse}`,()=>{
    assert(relationCells(endpointFixture('Rejestr paprociowy','Karta cedrowa'),reverse).every(r=>r.covered));
  });
  test(`I2: structured empty or unresolved endpoint never inherits the container; reverse=${reverse}`,()=>{
    for(const [source,target]of [['','Rejestr paprociowy'],['Rejestr paprociowy',''],['UNKNOWN','Rejestr paprociowy'],['opaque:missing','Rejestr paprociowy'],['Rejestr paprociowy','UNKNOWN']]){
      assert(relationCells(endpointFixture(source,target),reverse).every(r=>!r.covered),`${source} -> ${target}`);
    }
  });
}
test('I2: an explicit foreign source cannot borrow its requested source from a JOIN or another row',()=>{
  const f=endpointFixture('Niepowiązany zapis','Rejestr paprociowy','AUX.Cedar.Card_Group = AUX.FernBook.Fern_Key');
  assert(relationCells(f).every(r=>!r.covered));
  const wrong='| należy | Niepowiązany zapis | Rejestr paprociowy | N:1 | FK | — | UNKNOWN |';
  const other='| inne | Karta cedrowa | Nieznany rejestr | 1:N | FK | — | DRAFT |';
  for(const order of [[wrong,other],[other,wrong]]){
    f.card.fields.description='## Relacje ontologiczne\n| Predykat | Źródło | Cel | Kardynalność | Typ relacji | Warunek JOIN | Status |\n| --- | --- | --- | --- | --- | --- | --- |\n'+order.join('\n');
    assert(relationCells(f).every(r=>!r.covered));
  }
});
test('I2: a declared source omitted by a one-ended relation bullet may inherit its owner',()=>{
  const f=endpointFixture('Karta cedrowa','Rejestr paprociowy');
  f.card.fields.description='## Relacje ontologiczne\n- **NALEŻY** (kardynalność: N:1) → Rejestr paprociowy; formalny FK.';
  const cells=relationCells(f);assert(cells.every(r=>r.covered),JSON.stringify(cells));
});
test('I2: an explicitly foreign bullet source cannot be treated as an implicit container source',()=>{
  const f=endpointFixture('Karta cedrowa','Rejestr paprociowy');
  f.card.fields.description='## Relacje ontologiczne\n- Niepowiązany zapis → Rejestr paprociowy (kardynalność: N:1), formalny FK.';
  assert(relationCells(f).every(r=>!r.covered));
});
test('I2: an undeclared explicit source table cannot be resolved from its container ID',()=>{
  const f=endpointFixture('AUX.Cedar','Rejestr paprociowy');
  f.card.fields.mainTable='';
  assert(relationCells(f).every(r=>!r.covered));
});
test('M2: a validated source-owned stock outcome does not need the target endpoint in that effect clause',()=>{
  const a=row('unit:source','Zapis cedrowy (QZA)','## Przebieg\nQZA → QZB.\n\n## Skutek QZA\nQZA zwiększa stan magazynowy.');
  const b=row('unit:target','Zapis paprociowy (QZB)','QZA → QZB. QZA zwiększa stan magazynowy.');
  const s=setup('Wyjaśnij QZA → QZB i skutek magazynowy QZA; niezależnie wyjaśnij proces Zapis paprociowy',[a,b],'process');
  const effect=s.units.filter(u=>u.owa.row===a&&u.text.includes('QZA zwiększa'));
  const c=s.assess(effect);
  assert(c.requirements.some(r=>r.workflowAspect==='outcome'&&r.covered));
  assert(c.requirements.filter(r=>['progression','direction'].includes(r.workflowAspect)).every(r=>!r.covered));
  const foreign=s.units.filter(u=>u.owa.row===b); assert(foreign.length);
  assert(!s.assess(foreign).requirements.some(r=>r.ownerId===a.fields.id&&r.workflowAspect==='outcome'&&r.covered));
});

test('M3: a declarative initial party is context, while explicit or inherited requests remain obligations',()=>{
  const party=row('unit:party','Podmiot szmaragdowy','Podmiot opisuje uczestnika.');
  const operation=row('unit:net','Uzgodnienie bursztynowe','Uzgodnienie rozlicza wpisy.');
  const q='Ten sam Podmiot szmaragdowy jest naszym dłużnikiem i wierzycielem. Czy Uzgodnienie bursztynowe wymaga przelewu i jakie wpisy obejmuje? Wyjaśnij opis.';
  const s=setup(q,[party,operation],'process');
  assert(!s.plan.requirements.some(r=>r.ownerId===party.fields.id&&r.facet==='workflow'));
  for(const query of ['Opisz proces Podmiot szmaragdowy','Podmiot szmaragdowy jest naszym dłużnikiem. Wyjaśnij jego obieg.']){
    assert(setup(query,[party,operation],'process').plan.requirements.some(r=>r.ownerId===party.fields.id&&r.facet==='workflow'));
  }
});
test('M3: the actually asked conditional process retains its conditions and execution caveat',()=>{
  const operation=row('unit:net','Uzgodnienie bursztynowe','## Reguły biznesowe\nUzgodnienie wymaga co najmniej trzech wpisów.');
  const s=setup('Czy Uzgodnienie bursztynowe wymaga przelewu i jakie wpisy obejmuje?',[operation],'process');
  assert(s.plan.requirements.some(r=>r.ownerId===operation.fields.id&&r.workflowAspects?.includes('conditions')));
  assert(s.assess(s.units).notices.some(n=>n.includes('nie jest dowodem wykonania operacji')));
});
test('M3: ambiguity-only clarification excludes incidental source ties but retains an actually requested shared alias',()=>{
  const a=row('unit:one','Obiekt szmaragdowy','Dokument jest nierozliczony i oczekuje zamknięcia.',{aliases:'Wspólna etykieta'});
  const b=row('unit:two','Obiekt bursztynowy','Dokument jest nierozliczony i oczekuje zamknięcia.',{aliases:'Wspólna etykieta'});
  const q='Dokument jest nierozliczony i oczekuje zamknięcia. Czy chodzi o zapłatę czy etap obiegu? Nie podałem typu dokumentu ani operacji.';
  const s=setup(q,[a,b,...padding()],'concept');
  assert.deepEqual(s.plan.ambiguities,[]);
  assert(!s.assess([]).reasons.includes('ambiguous_owner'));
  const explicit=setup('Stan dokumentu w Wspólna etykieta? Nie podałem typu dokumentu ani operacji.',[a,b,...padding()],'concept');
  assert.equal(explicit.plan.ambiguities.length,1);
  const missing=setup('Stan dokumentu opaque:absent? Nie podałem typu dokumentu ani operacji.',[a,b],'concept');
  assert.equal(missing.plan.identityBarrier,true);
});
test('M3: a weak tie inside an explicitly requested two-document path is not a new owner question',()=>{
  const a=row('unit:one','Zapis cedrowy (QRA)','Powrót przesyłki do wystawcy.',{aliases:'Wspólny powrót'});
  const b=row('unit:two','Zapis paprociowy (QRB)','Powrót przesyłki do wystawcy.',{aliases:'Wspólny powrót'});
  const s=setup('Wyjaśnij QRA → QRB: powrót przesyłki do wystawcy.',[a,b,...padding()],'process');
  assert.deepEqual(new Set(s.plan.subjects.map(s=>s.id)),new Set([a.fields.id,b.fields.id]));
  assert.deepEqual(s.plan.ambiguities,[]);
  const explicit=setup('QRA → QRB; niezależnie opisz Wspólny powrót',[a,b,...padding()],'process');
  assert.equal(explicit.plan.ambiguities.length,1);
});
for(const reverse of [false,true])test(`M3: supplier wording stays in its comparison arm; reverse=${reverse}`,()=>{
  const move=row('unit:move','Przekazanie cedrowe','Przekazanie przenosi wpisy.'), back=row('unit:back','Zwrot bursztynowy','Zwrot dotyczy dostawcy.');
  const q=reverse?'Porównaj Zwrot bursztynowy do dostawcy z Przekazaniem cedrowym':'Porównaj Przekazanie cedrowe ze Zwrotem bursztynowym do dostawcy';
  const s=setup(q,[move,back],'process');
  assert.deepEqual(s.plan.requirements.filter(r=>r.facet==='roles').map(r=>r.ownerId),[back.fields.id]);
  for(const query of ['Porównaj role Przekazania cedrowego i Zwrotu bursztynowego','Porównaj Przekazanie cedrowe i Zwrot bursztynowy: ich role']){
    assert.deepEqual(new Set(setup(query,[move,back],'process').plan.requirements.filter(r=>r.facet==='roles').map(r=>r.ownerId)),new Set([move.fields.id,back.fields.id]));
  }
});

function proseCells(clause,reverse){
  const card=row('prose:card','Karta cedrowa','## Relacje ontologiczne\n'+clause);
  const book=row('prose:book','Rejestr paprociowy','Rejestr opisuje wpisy.');
  const olive=row('prose:olive','Zapis oliwkowy','Zapis opisuje inny obiekt.');
  const rows=[card,book,olive];if(reverse)rows.reverse();
  const s=setup('Relacja Karta cedrowa do Rejestr paprociowy: kardynalność, formalny FK',rows,'relation');
  assert.deepEqual(new Set(s.plan.subjects.map(o=>o.id)),new Set([card.fields.id,book.fields.id]),'the real plan must request exactly the two intended owners');
  const visible=s.units.filter(u=>u.owa.row===card);assert(visible.length,'use complete original selected card units');
  const cells=s.assess(visible).requirements.filter(r=>['relations','cardinality'].includes(r.facet));
  assert(cells.some(r=>r.facet==='relations')&&cells.some(r=>r.facet==='cardinality'));
  for(const cell of cells)assert.deepEqual(new Set(cell.endpointOwnerIds),new Set([card.fields.id,book.fields.id]));
  return cells;
}
const proseQualification=' (kardynalność: N:1), formalny FK.';
for(const reverse of [false,true])for(const [name,body,covered]of [
  ['declared foreign subject','Zapis oliwkowy jest powiązany z Rejestr paprociowy',false],
  ['unrecognized explicit third subject','Nieznany dokument brązowy jest powiązany z Rejestr paprociowy',false],
  ['foreign modifier on the container head','Karta oliwkowa jest powiązana z Rejestr paprociowy',false],
  ['foreign subject with both requested objects','Zapis oliwkowy jest powiązany z Karta cedrowa oraz Rejestr paprociowy',false],
  ['proper explicit subject','Karta cedrowa jest powiązana z Rejestr paprociowy',true],
  ['proper inverse subject','Rejestr paprociowy jest powiązany z Karta cedrowa',true],
  ['genuinely omitted subject','Jest powiązana z Rejestr paprociowy',true],
  ['deictic self subject','Ta karta jest powiązana z Rejestr paprociowy',true],
  ['owner-compatible short self subject','Karta jest powiązana z Rejestr paprociowy',true],
  ['target-only noun phrase','Związek z Rejestr paprociowy',false],
  ['incompatible deictic head','Ten zapis jest powiązany z Rejestr paprociowy',false],
  ['requested owner only in a prepositional context','Dla Karty cedrowej Rejestr paprociowy jest powiązany z Zapis oliwkowy',false],
])test(`I2 prose: ${name}; reverse=${reverse}`,()=>{
  const cells=proseCells(body+proseQualification,reverse);
  assert(cells.every(cell=>cell.covered===covered),JSON.stringify(cells));
});
test('I2 prose: a separately requested third subject cannot connect its two objects to each other',()=>{
  const card=row('prose:card','Karta cedrowa','## Relacje ontologiczne\nZapis oliwkowy jest powiązany z Karta cedrowa oraz Rejestr paprociowy'+proseQualification);
  const book=row('prose:book','Rejestr paprociowy','Rejestr opisuje wpisy.');
  const olive=row('prose:olive','Zapis oliwkowy','Zapis opisuje inny obiekt.');
  const s=setup('Relacja Karta cedrowa do Rejestr paprociowy: kardynalność, formalny FK; niezależnie opisz Zapis oliwkowy',[card,book,olive],'relation');
  assert.deepEqual(new Set(s.plan.subjects.map(o=>o.id)),new Set([card.fields.id,book.fields.id,olive.fields.id]));
  const cells=s.assess(s.units.filter(u=>u.owa.row===card)).requirements.filter(r=>r.endpointOwnerIds?.includes(card.fields.id)&&r.endpointOwnerIds?.includes(book.fields.id));
  assert(cells.length);assert(cells.every(r=>!r.covered),JSON.stringify(cells));
});
