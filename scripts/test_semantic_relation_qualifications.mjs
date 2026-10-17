// Unrelated synthetic relation statements only. Actual MCP uses a closed virtual
// filesystem/current module closure; no frozen input, corpus or output is written.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSemanticCatalog } from './lib/semantic_catalog.mjs';
import { buildSemanticRequestPlan } from './lib/semantic_requirements.mjs';
import { parseOwaQuestion } from './lib/owa_query_context.mjs';
import { selectOwaEvidence, assessOwaCoverage } from './lib/owa_evidence.mjs';
import { validateSemanticBundle, inspectSemanticResponse } from './lib/semantic_regression_harness.mjs';
import { MODULE_FILES, sha256, registerFrozenModules, installRuntimeGuard } from './lib/owa_offline_harness.mjs';

const namespace='OWAOntology',artifact='exports/owa_ontology/v1/ontology_entity.csv';
const query='Relacja Karta cedrowa do Rejestr paprociowy: kardynalność, formalny FK, ograniczenia weryfikacji';
const typedQuery='Relacja Karta cedrowa do Rejestr paprociowy: kardynalność, formalny FK';
const foreign='Inny zapis jest powiązany z Obiektem obcym: formalny FK, ograniczenia weryfikacji pozostają nieustalone.';
const proper='Dla Karty cedrowej i Rejestru paprociowego: formalny FK nie został potwierdzony.';
const implicit='Formalny FK nie został potwierdzony.';
const header='| Źródło | Cel | Kardynalność | Typ relacji |\n| --- | --- | --- | --- |';
const edge='| Karta cedrowa | Rejestr paprociowy | N:1 |  |';
const other='| Inny zapis | Obiekt obcy | 1:N |  |';
const table=header+'\n'+edge;
const prose='Karta cedrowa jest powiązana z Rejestr paprociowy (kardynalność: N:1).';
const scopedBody=(statement,note,typed=false)=>note
  ? '| Źródło | Cel | Kardynalność | Typ relacji | Uwagi |\n| --- | --- | --- | --- | --- |\n| Karta cedrowa | Rejestr paprociowy | N:1 | '+(typed?'FK':'')+' | '+statement+' |'
  : (typed?table.replace('| N:1 |  |','| N:1 | FK |'):table)+'\n'+statement;
const scopeCases=[];
for(const note of [false,true])for(const [scopeName,scope,covered]of [
  ['foreign','Innego zapisu i Obiektu obcego',false],
  ['matching','Karty cedrowej i Rejestru paprociowego',true],
  ['partly-unresolved','Karty cedrowej i Obiektu obcego',false],
])for(const [form,statement,typed]of [
  ['formal-internal',`Formalny FK dla ${scope} nie został potwierdzony.`],
  ['formal-suffix',`Formalny FK nie został potwierdzony dla ${scope}.`],
  ['foreign-key-internal',`Klucz obcy dla ${scope} wymaga potwierdzenia.`],
  ['verification-internal',`Ograniczenia weryfikacji dla ${scope} pozostają niepotwierdzone.`,true],
  ['verification-suffix',`Weryfikacja nie została potwierdzona dla ${scope}.`,true],
  ['negative-FK',`Brak formalnego FK dla ${scope} w schemacie.`],
  ['confirmation-prefix',`Do potwierdzenia pozostaje formalny FK dla ${scope}.`],
  ['genitive-reference',`Formalny FK ${scope} nie został potwierdzony.`],
  ['relation-reference',`Klucz obcy relacji ${scope} wymaga potwierdzenia.`],
  ['verification-reference',`Weryfikacja dotycząca ${scope} nie została potwierdzona.`,true],
  ['between-reference',`Formalny FK pomiędzy ${scope} nie został potwierdzony.`],
  ['verification-about-reference',`Ograniczenia weryfikacji w odniesieniu do ${scope} pozostają niepotwierdzone.`,true],
])scopeCases.push([`scope-${scopeName}-${form}-${note?'note':'adjacent'}`,scopedBody(statement,note,typed),covered]);
for(const note of [false,true])for(const [name,statement,covered,typed]of [
  ['matching-then-foreign','Dla Karty cedrowej i Rejestru paprociowego: formalny FK dla Innego zapisu i Obiektu obcego nie został potwierdzony.',false],
  ['two-explicit-scopes','Formalny FK dla Karty cedrowej i Rejestru paprociowego nie został potwierdzony dla Innego zapisu i Obiektu obcego.',false],
  ['deictic','Formalny FK dla tej relacji nie został potwierdzony.',true],
  ['previous-deictic','Ograniczenia weryfikacji dla poprzedniej relacji pozostają niepotwierdzone.',true,true],
  ['matching-IDs','Formalny FK dla unit:cedar i unit:fern nie został potwierdzony.',true],
  ['unresolved-ID','Formalny FK dla unit:missing i unit:fern nie został potwierdzony.',false],
  ['conditional-chain','Formalny FK nie został potwierdzony; ograniczenia weryfikacji tylko po kontroli zgodności.',true],
])scopeCases.push([`scope-${name}-${note?'note':'adjacent'}`,scopedBody(statement,note,typed),covered]);
const variants=[
  ['missing',table,false],
  ['foreign-prose',table+'\n'+foreign,false],
  ['proper-pair',table+'\n'+proper,true],
  ['implicit-single-relation',table+'\n'+implicit,true],
  ['foreign-data-row',table+'\n| Inny zapis | Obiekt obcy | 1:N | formalny FK, ograniczenia weryfikacji |',false],
  ['foreign-header',table.replace('Typ relacji','Typ relacji — formalny FK, ograniczenia weryfikacji'),false],
  ['foreign-caption',table+'\n### Inny zapis — formalny FK, ograniczenia weryfikacji',false],
  ['foreign-caption-chain',table+'\nOpis innego zapisu: formalny FK; ograniczenia weryfikacji pozostają nieustalone.',false],
  ['pair-prefixed-foreign-caption',table+'\nDla Karty cedrowej i Rejestru paprociowego: opis innego zapisu — formalny FK, ograniczenia weryfikacji.',false],
  ['foreign-in-row-notes',header.replace('Typ relacji |','Typ relacji | Uwagi |')+' --- |\n'+edge+' '+foreign+' |',false],
  ['ambiguous-table-footer',table+'\n'+other+'\n'+implicit,false],
  ['proper-pair-among-rows',table+'\n'+other+'\n'+proper,true],
  ['proper-heading','## Relacja Karty cedrowej i Rejestru paprociowego — formalny FK nie został potwierdzony\n'+table,true],
  ['same-prose-assertion',prose.replace(/\.$/,', formalny FK nie został potwierdzony.'),true],
  ['foreign-after-prose',prose+'\n'+foreign,false],
  ['proper-after-prose',prose+'\n'+implicit,true],
  ['separate-qualification-bits',table.replace('| N:1 |  |','| N:1 | FK |')+'\nInny zapis jest powiązany z Obiektem obcym: ograniczenia weryfikacji pozostają nieustalone.',false],
  ['typed-FK',table.replace('| N:1 |  |','| N:1 | FK |')+'\n| Inny zapis | Obiekt obcy | 1:N | LOGICAL_JOIN |',true,typedQuery],
  ['typed-LOGICAL_JOIN',table.replace('| N:1 |  |','| N:1 | LOGICAL_JOIN |')+'\n| Inny zapis | Obiekt obcy | 1:N | FK |',true,typedQuery],
  ['own-row-verification','| Źródło | Cel | Kardynalność | Typ relacji | Status |\n| --- | --- | --- | --- | --- |\n| Karta cedrowa | Rejestr paprociowy | N:1 | FK | Do potwierdzenia |',true],
  ...scopeCases,
].map(([name,body,covered,q=query])=>({name,body:body.startsWith('##')?body:'## Relacje ontologiczne\n'+body,covered,query:q}));
const row=(id,name,description)=>({namespace,artifact,contentHash:'sha256:synthetic-qualification',line:2,endLine:30,
  fields:{id,name,canonicalName:name,description,semanticType:'ontology_entity'}});
function fixture(variant,reverse){
  const card=row('unit:cedar','Karta cedrowa',variant.body),book=row('unit:fern','Rejestr paprociowy','Rejestr opisuje wpisy.');
  const rows=[card,book];if(reverse)rows.reverse();return {card,book,rows};
}
function cellsChecked(cells,q){
  assert.equal(cells.length,2);
  assert.deepEqual(new Set(cells.map(c=>c.facet)),new Set(['relations','cardinality']));
  for(const cell of cells){
    assert.deepEqual(new Set(cell.endpointOwnerIds),new Set(['unit:cedar','unit:fern']));
    assert.deepEqual(new Set(cell.qualifications),new Set(q===query?['formalFk','verification']:['formalFk']));
  }
}
for(const reverse of [false,true])for(const variant of variants)test(`FR-I1 assessor: ${variant.name}; reverse=${reverse}`,()=>{
  const {card,rows}=fixture(variant,reverse),catalog=buildSemanticCatalog(rows,new Set([namespace]));
  const plan=buildSemanticRequestPlan(variant.query,'relation',catalog),context=parseOwaQuestion(variant.query);
  assert.deepEqual(new Set(plan.subjects.map(s=>s.id)),new Set(['unit:cedar','unit:fern']));
  const selection=selectOwaEvidence(context,rows,plan),metadata=selection.metadata.get(card);assert(metadata?.units.length);
  const units=metadata.units.map(u=>({...u,namespace,owa:{row:card,ownerIds:metadata.ownerIds}}));
  assert(units.every(u=>u.text===variant.body),'whole original atomic source text');
  const coverage=assessOwaCoverage(context,selection,units);cellsChecked(coverage.requirements,variant.query);
  assert(coverage.requirements.every(c=>c.covered===variant.covered),JSON.stringify(coverage.requirements));
});

test('FR-I1 actual guarded MCP: paired qualification sources in both input orders',async t=>{
  const repo=fileURLToPath(new URL('../',import.meta.url));
  const original=validateSemanticBundle(path.join(repo,'.superpowers/sdd/semantic32-frozen-rggcvF'));
  // Preserve the frozen fixture and exact module pinning while binding the
  // separately tested read-only write boundary (the only other runtime edits).
  const writeBoundaryHashes={
    'scripts/erp_knowledge_answer.mjs':'52a5f8e525b18ac783919d3c0c4afff75f5277f7aec0c1d5275b57efbb7692c8',
    'scripts/lib/erp_knowledge_mcp_core.mjs':'bd6f00321d41b431a12cd2ed5ed3718428f6a898797a34ad1228a97bef844866',
  };
  const root=path.join(repo,'.superpowers/sdd/finalfix-qualification-virtual'),files=new Map(),directories=new Set([root]),modules={};
  for(const [file,bytes]of original.files)files.set(path.join(root,path.relative(original.root,file)),bytes);
  for(const file of MODULE_FILES){
    const bytes=fs.readFileSync(path.join(repo,file));modules[file]=bytes.toString();
    if(file!=='scripts/lib/owa_evidence.mjs')assert.equal(sha256(bytes),writeBoundaryHashes[file]||original.manifest.files.find(f=>f.path===file).sha256);
  }
  for(const file of files.keys())for(let dir=path.dirname(file);dir.startsWith(root);dir=path.dirname(dir)){directories.add(dir);if(dir===root)break;}
  for(const file of files.keys())if(file.endsWith('.csv'))files.set(file,Buffer.from('id\n'));
  const bundle={root,files,directories,modules};
  const saved={...process.env};Object.assign(process.env,{ROOT:root,EXA_PROVIDER:'disabled',EXA_AUTO_DRAFT:'0',ENABLE_LIVE_LEARNING:'0',LEARNING_ENABLED:'0'});
  registerFrozenModules(bundle);
  const guard=installRuntimeGuard({...bundle,output:root}),captures=[];
  try{
    const load=file=>import(pathToFileURL(path.join(root,'scripts/lib',file+'.mjs')).href);
    const {handleJsonRpcRequest}=await load('erp_knowledge_mcp_core'),{getMcpProfile}=await load('erp_knowledge_mcp_profiles');
    for(const reverse of [false,true])for(const variant of variants){
      const {rows}=fixture(variant,reverse),columns=['id','name','canonicalName','description','semanticType'];
      const csv=[columns,...rows.map(r=>columns.map(c=>r.fields[c]))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
      files.set(path.join(root,artifact),Buffer.from(csv));
      const request={jsonrpc:'2.0',id:`qualification-${variant.name}-${reverse}`,method:'tools/call',params:{name:'erp_relation.list',
        arguments:{query:variant.query,as_of:'2026-10-16',limit:5,correlation_id:`qualification-${variant.name}-${reverse}`}}};
      const response=JSON.parse(JSON.stringify(await handleJsonRpcRequest(request,{profile:getMcpProfile('erp-semantic-mcp'),allowedNamespaces:new Set([namespace]),writeAllowed:false})));
      const audit=inspectSemanticResponse(response,bundle);
      captures.push({variant,reverse,response,audit});
    }
  }finally{
    guard.restore();for(const key of Object.keys(process.env))delete process.env[key];Object.assign(process.env,saved);
  }
  assert.deepEqual(guard.violations,[],'no swallowed or direct guard attempt');
  t.diagnostic(JSON.stringify({actualCalls:captures.length,presentationAudits:captures.length,guardViolations:guard.violations,
    runtimeModuleHashes:Object.fromEntries(Object.entries(modules).map(([file,source])=>[file,sha256(source)]))}));
  for(const {variant,reverse,response,audit}of captures)await t.test(`${variant.name}; reverse=${reverse}`,()=>{
    const body=response.result.structuredContent,cells=body.owaCoverage.requirements;cellsChecked(cells,variant.query);
    assert(cells.every(c=>c.covered===variant.covered),JSON.stringify(cells));
    assert(!audit.error);assert(audit.sources<=2&&audit.extractCharacters<=4000);
    assert(body.extracts.every(e=>e.text===variant.body),'do not trim a foreign qualification out of an emitted atomic unit');
    if(variant.covered)assert(body.extracts.length,'actual qualified proof must be visible');
    else assert.equal(body.evidenceAssessment.status,'insufficient_evidence');
  });
});
