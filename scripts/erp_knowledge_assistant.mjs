#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = '/docker/openspg';
const ROUTING_PATH = path.join(ROOT, 'docs/reference/ERP_Knowledge_Assistant_Routing.json');

export const KB_DETAILS = {
  TaxbellLegalReference: {
    projectId: 12,
    namespace: 'TaxbellLegalReference',
    summary: 'Taxbell Polish legal and tax-law reference: acts, official authority guidance, tax explanations, rulings, and ranked commentary.',
    artifacts: [
      'exports/taxbell_legal_reference/v1/reference_document.csv',
      'exports/taxbell_legal_reference/v1/source_topic.csv',
      'exports/taxbell_legal_reference/v1/chunk.csv',
      'downloads/taxbell/legal_reference/meta/source_registry.json',
    ],
  },
  TaxbellPayrollHRReference: {
    projectId: 13,
    namespace: 'TaxbellPayrollHRReference',
    summary: 'Taxbell payroll, HR, labor law, ZUS, PIP, employment and social-insurance reference corpus.',
    artifacts: [
      'exports/taxbell_payroll_hr_reference/v1/reference_document.csv',
      'exports/taxbell_payroll_hr_reference/v1/source_topic.csv',
      'exports/taxbell_payroll_hr_reference/v1/chunk.csv',
      'downloads/taxbell/payroll_hr_reference/meta/source_registry.json',
    ],
  },
  TaxbellAccountingVATReference: {
    projectId: 14,
    namespace: 'TaxbellAccountingVATReference',
    summary: 'Taxbell accounting, bookkeeping, VAT/JPK, reporting, settlement and practical financial-documentation reference corpus.',
    artifacts: [
      'exports/taxbell_accounting_vat_reference/v1/reference_document.csv',
      'exports/taxbell_accounting_vat_reference/v1/source_topic.csv',
      'exports/taxbell_accounting_vat_reference/v1/chunk.csv',
      'downloads/taxbell/accounting_vat_reference/meta/source_registry.json',
    ],
  },
  ComarchCommunityNews: {
    projectId: 11,
    namespace: 'ComarchCommunityNews',
    summary: 'Public Comarch community news, release notes, service notices, category topics, media attachments.',
    artifacts: [
      'docs/reference/ComarchCommunityNews.seed.md',
      'docs/reference/ComarchCommunityNews.audit.md',
      'exports/community_news/v1/reference_document.csv',
      'exports/community_news/v1/news_topic.csv',
      'exports/community_news/v1/community_attachment.csv',
      'exports/community_news/v1/chunk.csv',
    ],
  },
  ComarchOptimaSchema: {
    projectId: 4,
    namespace: 'ComarchOptimaSchema',
    summary: 'Optima MSSQL structure, joins, SQL objects, dependencies, helper guides.',
    artifacts: [
      'docs/reference/ComarchOptimaSchema.schema',
      'exports/optima_schema/v1/table_query_guide.csv',
      'exports/optima_schema/v1/join_path_guide.csv',
      'exports/optima_schema/v1/sql_object_guide.csv',
      'exports/optima_schema/v1/object_dependency.csv',
      'exports/optima_schema/v1/trigger.csv',
    ],
  },
  ComarchOptimaAdditionalFunctions: {
    projectId: 6,
    namespace: 'ComarchOptimaAdditionalFunctions',
    summary: 'Additional Functions, COM examples, implementation guides, dictionaries.',
    artifacts: [
      'docs/reference/ComarchOptimaAdditionalFunctions.seed.md',
      'exports/optima_additional_functions/v1/implementation_guide.csv',
      'exports/optima_additional_functions/v1/implementation_example.csv',
      'exports/optima_additional_functions/v1/schema_touchpoint.csv',
    ],
  },
  ComarchOptimaSprint: {
    projectId: 7,
    namespace: 'ComarchOptimaSprint',
    summary: 'Sprint and print workflows, SQL patterns, diagnostics, print technologies.',
    artifacts: [
      'docs/reference/ComarchOptimaSprint.seed.md',
      'exports/optima_sprint/v1/sql_pattern.csv',
      'exports/optima_sprint/v1/diagnostic_case.csv',
      'exports/optima_sprint/v1/module_recipe.csv',
      'docs/reference/Optima_Wydruki_FD_TypeFamily_Map_2026-06-01.md',
    ],
  },
  ComarchOptimaReference: {
    projectId: 8,
    namespace: 'ComarchOptimaReference',
    summary: 'Official Optima docs, onboarding, categories, entry guides, cross-KB routing.',
    artifacts: [
      'docs/reference/ComarchOptimaReference.seed.md',
      'exports/optima_reference/v1/entry_guide.csv',
      'exports/optima_reference/v1/version_topic.csv',
      'exports/optima_reference/v1/reference_document.csv',
      'docs/reference/ComarchKB_Global_Audit.md',
      'docs/reference/ComarchKB_CrossKB_Practical_Test.md',
    ],
  },
  ComarchOptimaPartnerTechnical: {
    projectId: 9,
    namespace: 'ComarchOptimaPartnerTechnical',
    summary: 'Partner-only technical assets, COM samples, procedures, messages, config dictionaries.',
    artifacts: [
      'docs/reference/ComarchOptimaPartnerTechnical.seed.md',
      'exports/optima_partner_technical/v1/com_module_recipe.csv',
      'exports/optima_partner_technical/v1/proc_entry.csv',
      'exports/optima_partner_technical/v1/msg_entry.csv',
      'downloads/partner/optima_technical/source_registry.json',
    ],
  },
  ComarchBetterflyReference: {
    projectId: 10,
    namespace: 'ComarchBetterflyReference',
    summary: 'Betterfly docs and API guidance, live metadata-only behavior, write-side notes.',
    artifacts: [
      'exports/betterfly_reference/v1/reference_document.csv',
      'exports/betterfly_reference/v1/chunk.csv',
      'exports/betterfly_reference/v1/api_resource.csv',
      'exports/betterfly_reference/v1/api_pattern.csv',
      'docs/reference/ComarchBetterflyReference.live_probe.md',
      'docs/reference/ComarchBetterflyReference.contract_notes.md',
      'docs/reference/ComarchBetterflyReference.write_notes.md',
      'docs/reference/ComarchBetterflyReference.usability_test.md',
    ],
  },
  ComarchOptimaBusinessSemantics: {
    projectId: 15,
    namespace: 'ComarchOptimaBusinessSemantics',
    summary: 'Business semantics for Optima tables: code-to-label mappings, business descriptions, validation rules, domain classification.',
    artifacts: [
      'docs/reference/ComarchOptimaBusinessSemantics.schema',
      'exports/optima_business_semantics/v1/business_description.csv',
      'exports/optima_business_semantics/v1/code_meaning.csv',
      'exports/optima_business_semantics/v1/business_rule.csv',
      'exports/optima_business_semantics/v1/business_domain.csv',
    ],
  },
  ComarchUniversalKnowledge: {
    projectId: 0,
    namespace: 'ComarchUniversalKnowledge',
    summary: 'Catch-all knowledge for queries that did not match any specialized KB. Content auto-discovered via external search and learning gap processor.',
    artifacts: [
      'exports/universal_knowledge/v1/reference_document.csv',
      'exports/universal_knowledge/v1/chunk.csv',
    ],
  },
};

const BLENDED_RULES = [
  {
    case: 'print_sql_and_joins',
    test: ({ q }) => hasAny(q, ['sprint', 'wydruk', 'genrap', 'raport']) && hasAny(q, ['join', 'sql', 'tranag', 'traelem', 'towary', 'kontrahenci']),
  },
  {
    case: 'fd_implementation_with_table_context',
    test: ({ q }) => hasAny(q, ['funkcja dodatkowa', ' fd ', 'com', 'kolumna uzytkownika', 'user column']) && hasAny(q, ['tranag', 'traelem', 'kontrahenci', 'towary', 'sql', 'join', 'tabela']),
  },
  {
    case: 'partner_com_example_with_implementation_guidance',
    test: ({ q }) => hasAny(q, ['partner', 'przyklady-uzycia-obiektow-com', 'com']) && hasAny(q, ['dodaj operatora', 'okno logowania', 'implementacja', 'funkcja dodatkowa']),
  },
  {
    case: 'vague_optima_entry_question',
    test: ({ q, routeScores }) => {
      const topScore = routeScores[0]?.score || 0;
      return (
        routeScores.every((item) => item.score === 0) ||
        (topScore <= 2 &&
          hasAny(q, ['jak zaczac', 'gdzie w dokumentacji', 'gdzie zaczac', 'od czego zaczac', 'instrukcja', 'modul']))
      );
    },
  },
];

export function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsNormalizedTerm(haystack, rawTerm) {
  const term = normalizeText(rawTerm);
  if (!term) return false;
  if (term.includes(' ')) return haystack.includes(term);
  if (term.length <= 4) {
    const pattern = new RegExp(`(^|[^a-z0-9_])${escapeRegExp(term)}($|[^a-z0-9_])`);
    return pattern.test(haystack);
  }
  return haystack.includes(term);
}

function hasAny(haystack, needles) {
  return needles.some((needle) => containsNormalizedTerm(haystack, needle));
}

function scoreRoute(questionNormalized, route) {
  let score = 0;
  const matched = [];
  for (const keyword of route.keywords || []) {
    const token = normalizeText(keyword);
    if (containsNormalizedTerm(questionNormalized, token)) {
      score += token.length > 8 ? 2 : 1;
      matched.push(keyword);
    }
  }
  return { score, matched };
}

function applyMorphologyBoosts(questionNormalized, route) {
  let score = 0;
  const matched = [];

  if (route.intent === 'optima_additional_functions') {
    if (questionNormalized.includes('funkcj') && questionNormalized.includes('dodatk')) {
      score += 3;
      matched.push('funkcj* dodat*');
    }
    if (questionNormalized.includes('kolumn') && questionNormalized.includes('uzytk')) {
      score += 2;
      matched.push('kolumn* uzytk*');
    }
    if (questionNormalized.includes(' fd ')) {
      score += 2;
      matched.push('fd');
    }
    if (questionNormalized.includes('ewidencj') && questionNormalized.includes('dodat')) {
      score += 2;
      matched.push('ewidencj* dodat*');
    }
    if (questionNormalized.includes('import') && questionNormalized.includes('xml')) {
      score += 2;
      matched.push('import + xml');
    }
    if (questionNormalized.includes('eksport') && questionNormalized.includes('xml')) {
      score += 2;
      matched.push('eksport + xml');
    }
    if (containsNormalizedTerm(questionNormalized, 'com') && questionNormalized.includes('przyklad')) {
      score += 2;
      matched.push('com + przyklad*');
    }
    if (containsNormalizedTerm(questionNormalized, 'com') && (questionNormalized.includes('wydruk') || questionNormalized.includes('raport'))) {
      score += 4;
      matched.push('com + wydruk/raport');
    }
    if (containsNormalizedTerm(questionNormalized, 'com') && questionNormalized.includes('ksiegow')) {
      score += 3;
      matched.push('com + ksiegow*');
    }
    if (questionNormalized.includes('recipes') && questionNormalized.includes('ksiegow')) {
      score += 3;
      matched.push('recipes + ksiegow*');
    }
    if (questionNormalized.includes('fd') && questionNormalized.includes('ksiegow')) {
      score += 3;
      matched.push('fd + ksiegow*');
    }
    if (questionNormalized.includes('example') && containsNormalizedTerm(questionNormalized, 'com')) {
      score += 2;
      matched.push('com + example');
    }
    if (questionNormalized.includes('anulow') && questionNormalized.includes('magazyn')) {
      score += 3;
      matched.push('anulow* + magazyn*');
    }
    if (questionNormalized.includes('touchpoint') || questionNormalized.includes('touchpointy')) {
      score += 2;
      matched.push('touchpoint*');
    }
    if (questionNormalized.includes('przyklad') && (questionNormalized.includes('tranag') || questionNormalized.includes('traelem'))) {
      score += 2;
      matched.push('przyklad* + tranag/traelem');
    }
    if (questionNormalized.includes('slownik') && questionNormalized.includes('funkcj') && questionNormalized.includes('dodatk')) {
      score += 3;
      matched.push('slownik* + funkcj* dodat*');
    }
    if (questionNormalized.includes('slownik') && questionNormalized.includes('partner') && questionNormalized.includes('funkcj') && questionNormalized.includes('dodatk')) {
      score += 3;
      matched.push('partner* + slownik* + funkcj* dodat*');
    }
  }

  if (route.intent === 'optima_sprint_prints') {
    if (questionNormalized.includes('wydruk')) {
      score += 2;
      matched.push('wydruk*');
    }
    if (questionNormalized.includes('raport')) {
      score += 1;
      matched.push('raport*');
    }
    if (questionNormalized.includes('diagnoz') && questionNormalized.includes('parametr') && questionNormalized.includes('dynamic')) {
      score += 4;
      matched.push('diagnoz* + parametr* + dynamic*');
    }
    if (questionNormalized.includes('sql') && (questionNormalized.includes('naglow') || questionNormalized.includes('pozycj'))) {
      score += 3;
      matched.push('sql + naglow*/pozycj*');
    }
  }

  if (route.intent === 'optima_schema_sql') {
    if (questionNormalized.includes('procedur')) {
      score += 2;
      matched.push('procedur*');
    }
    if (questionNormalized.includes('funkcj') && (questionNormalized.includes('sql') || questionNormalized.includes('baz') || questionNormalized.includes('tabel'))) {
      score += 2;
      matched.push('funkcj* + kontekst db');
    }
    if (questionNormalized.includes('trigger') || questionNormalized.includes('triggery')) {
      score += 2;
      matched.push('trigger*');
    }
    if (questionNormalized.includes('klucz')) {
      score += 2;
      matched.push('klucz*');
    }
    if (questionNormalized.includes('tabel')) {
      score += 2;
      matched.push('tabel*');
    }
    if (questionNormalized.includes('tabel') && questionNormalized.includes('slownik')) {
      score += 3;
      matched.push('tabel* + slownik*');
    }
    if (questionNormalized.includes('relacj')) {
      score += 2;
      matched.push('relacj*');
    }
    if (questionNormalized.includes('cfgklucze') || questionNormalized.includes('cfgwartosci')) {
      score += 3;
      matched.push('cfg*');
    }
    if (questionNormalized.includes('bnkzapisy')) {
      score += 2;
      matched.push('bnkzapisy');
    }
    if (questionNormalized.includes('bnkzapisy') && (questionNormalized.includes('raport') || questionNormalized.includes('kas'))) {
      score += 2;
      matched.push('bnkzapisy + raport/kas');
    }
    if (containsNormalizedTerm(questionNormalized, 'vat')) {
      score += 1;
      matched.push('vat');
    }
    if (questionNormalized.includes('obiekt') && questionNormalized.includes('sql')) {
      score += 2;
      matched.push('obiekt* + sql');
    }
    if (questionNormalized.includes('operator') && questionNormalized.includes('baz')) {
      score += 2;
      matched.push('operator* + baz*');
    }
    if (questionNormalized.includes('procedur') && (questionNormalized.includes('wydruk') || questionNormalized.includes('getreportcontent') || questionNormalized.includes('getreportheader'))) {
      score += 5;
      matched.push('procedur* + wydruki/getreport*');
    }
    if (questionNormalized.includes('relacj') && questionNormalized.includes('raport')) {
      score += 2;
      matched.push('relacj* + raport*');
    }
    if ((questionNormalized.includes('trigger') || questionNormalized.includes('funkcj')) && questionNormalized.includes('wydruk')) {
      score += 3;
      matched.push('trigger/funkcj + wydruk*');
    }
  }

  if (route.intent === 'optima_official_docs') {
    if (questionNormalized.includes('dokumentac')) {
      score += 2;
      matched.push('dokumentac*');
    }
    if (questionNormalized.includes('instrukcj')) {
      score += 1;
      matched.push('instrukcj*');
    }
    if (questionNormalized.includes('oficjal')) {
      score += 2;
      matched.push('oficjal*');
    }
    if (questionNormalized.includes('info')) {
      score += 1;
      matched.push('info');
    }
    if (questionNormalized.includes('oficjal') && questionNormalized.includes('kolumn') && questionNormalized.includes('uzytk')) {
      score += 4;
      matched.push('oficjal* + kolumn* uzytk*');
    }
    if (questionNormalized.includes('oficjal') && (questionNormalized.includes('sprint') || questionNormalized.includes('wydruk'))) {
      score += 3;
      matched.push('oficjal* + sprint/wydruk');
    }
  }

  if (route.intent === 'optima_partner_technical') {
    if (questionNormalized.includes('partner')) {
      score += 4;
      matched.push('partner*');
    }
    if (questionNormalized.includes('partner') && questionNormalized.includes('slownik')) {
      score += 3;
      matched.push('partner* + slownik*');
    }
    if (questionNormalized.includes('procedures.csv') || questionNormalized.includes('messages.csv') || questionNormalized.includes('dictionaries')) {
      score += 3;
      matched.push('partner dictionary files');
    }
    if (questionNormalized.includes('com sample')) {
      score += 2;
      matched.push('com sample');
    }
    if (containsNormalizedTerm(questionNormalized, 'com') && (questionNormalized.includes('recipe') || questionNormalized.includes('recipes') || questionNormalized.includes('raport') || questionNormalized.includes('wydruk'))) {
      score += 3;
      matched.push('partner com + recipe/raport/wydruk');
    }
    if ((questionNormalized.includes('procedures') || questionNormalized.includes('messages') || questionNormalized.includes('procedur') || questionNormalized.includes('message')) && questionNormalized.includes('partner')) {
      score += 3;
      matched.push('partner + procedures/messages');
    }
  }

  if (route.intent === 'betterfly_api') {
    if (questionNormalized.includes('betterfly')) {
      score += 2;
      matched.push('betterfly');
    }
    if (questionNormalized.includes('endpoint')) {
      score += 1;
      matched.push('endpoint*');
    }
    if (questionNormalized.includes('advance invoice') || questionNormalized.includes('advanceinvoices')) {
      score += 2;
      matched.push('advance invoice');
    }
    if (questionNormalized.includes('finalize')) {
      score += 2;
      matched.push('finalize');
    }
  }

  if (route.intent === 'taxbell_legal_tax_law') {
    if (questionNormalized.includes('kodeks') && questionNormalized.includes('podatk')) {
      score += 3;
      matched.push('kodeks + podatk*');
    }
    if (questionNormalized.includes('ustaw') && questionNormalized.includes('podatk')) {
      score += 2;
      matched.push('ustaw* + podatk*');
    }
  }

  if (route.intent === 'taxbell_payroll_hr_zus') {
    if (questionNormalized.includes('pip')) {
      score += 4;
      matched.push('pip');
    }
    if (questionNormalized.includes('bhp')) {
      score += 4;
      matched.push('bhp');
    }
    if (questionNormalized.includes('pracodawc')) {
      score += 3;
      matched.push('pracodawc*');
    }
    if (questionNormalized.includes('inspekcj')) {
      score += 3;
      matched.push('inspekcj*');
    }
    if (questionNormalized.includes('przepisy') && questionNormalized.includes('praw')) {
      score += 2;
      matched.push('przepisy + praw*');
    }
  }

  if (route.intent === 'optima_business_semantics') {
    if (questionNormalized.includes('znaczy') || questionNormalized.includes('znaczenie')) {
      score += 4;
      matched.push('znacz*');
    }
    if (questionNormalized.includes('typ') && (questionNormalized.includes('dokument') || questionNormalized.includes('dokumentu'))) {
      score += 3;
      matched.push('typ* + dokument*');
    }
    if (containsNormalizedTerm(questionNormalized, 'kod') || containsNormalizedTerm(questionNormalized, 'kody')) {
      score += 2;
      matched.push('kod*');
    }
    if (questionNormalized.includes('oznacza') || questionNormalized.includes('reprezentuje')) {
      score += 3;
      matched.push('oznacza/reprezentuje');
    }
    if (questionNormalized.includes('co to') && (questionNormalized.includes('tabela') || questionNormalized.includes('kolumna'))) {
      score += 3;
      matched.push('co to + tabela/kolumna');
    }
    if (questionNormalized.includes('opis') && (questionNormalized.includes('biznesow') || questionNormalized.includes('dziedzin'))) {
      score += 2;
      matched.push('opis* + biznesow*/dziedzin*');
    }
    if (questionNormalized.includes('slownik') || questionNormalized.includes('wartosci')) {
      score += 2;
      matched.push('slownik/wartosci');
    }
    if (questionNormalized.includes('domen')) {
      score += 2;
      matched.push('domen*');
    }
    if (questionNormalized.includes('klasyfikacj')) {
      score += 2;
      matched.push('klasyfikacj*');
    }
    if (questionNormalized.includes('walidac') || questionNormalized.includes('ograniczen')) {
      score += 4;
      matched.push('walidac/ograniczen');
    }
    if (questionNormalized.includes('co oznacza') || questionNormalized.includes('czym jest')) {
      score += 3;
      matched.push('co oznacza/czym jest');
    }
    if (questionNormalized.includes('jaka') && (questionNormalized.includes('wartosc') || questionNormalized.includes('dopuszczaln'))) {
      score += 2;
      matched.push('jaka wartosc/dopuszczaln');
    }
  }

  if (route.intent === 'community_news_updates') {
    if (questionNormalized.includes('przerwa') && questionNormalized.includes('technicz')) {
      score += 4;
      matched.push('przerwa* technicz*');
    }
    if (questionNormalized.includes('nowa') && questionNormalized.includes('wersj')) {
      score += 4;
      matched.push('nowa wersj*');
    }
    if (questionNormalized.includes('planowan') && questionNormalized.includes('wersj')) {
      score += 3;
      matched.push('planowan* wersj*');
    }
    if (questionNormalized.includes('komunikat') && (questionNormalized.includes('przerwa') || questionNormalized.includes('awari') || questionNormalized.includes('planowan') || questionNormalized.includes('wersj'))) {
      score += 3;
      matched.push('komunikat* + kontekst');
    }
    if (questionNormalized.includes('niedostepn') || questionNormalized.includes('awari') || questionNormalized.includes('serwisow')) {
      score += 3;
      matched.push('niedostepn*/awari*/serwisow*');
    }
    if (questionNormalized.includes('spolecznosc') || questionNormalized.includes('news')) {
      score += 2;
      matched.push('spolecznosc/news');
    }
    if (questionNormalized.includes('aktualn') || questionNormalized.includes('publiczn')) {
      score += 2;
      matched.push('aktualn*/publiczn*');
    }
    if ((questionNormalized.includes('nowy') || questionNormalized.includes('najnowsz')) && questionNormalized.includes('wpis')) {
      score += 3;
      matched.push('nowy* wpis*');
    }
    if (questionNormalized.includes('premier') && questionNormalized.includes('wersj')) {
      score += 2;
      matched.push('premier* wersj*');
    }
    if (questionNormalized.includes('uslug') || questionNormalized.includes('chmur')) {
      score += 2;
      matched.push('uslug*/chmur*');
    }
    if (questionNormalized.includes('ocr') && (questionNormalized.includes('now') || questionNormalized.includes('wersj') || questionNormalized.includes('aktualiz'))) {
      score += 2;
      matched.push('ocr + kontekst');
    }
    if (
      questionNormalized.includes('betterfly') ||
      questionNormalized.includes('ibard') ||
      questionNormalized.includes('xl') ||
      questionNormalized.includes('data editor')
    ) {
      score += 1;
      matched.push('extended product keyword');
    }
  }

  return { score, matched };
}

export function filterRouting(routing, allowedNamespaces) {
  if (!allowedNamespaces || !allowedNamespaces.size) return routing;
  const allowed = allowedNamespaces;
  return {
    ...routing,
    primaryKbOrder: (routing.primaryKbOrder || []).filter((ns) => allowed.has(ns)),
    routes: (routing.routes || []).map((route) => ({
      ...route,
      supportKbs: (route.supportKbs || []).filter((ns) => allowed.has(ns)),
    })).filter((route) => allowed.has(route.primaryKb)),
  };
}

export function listKnowledgeBases(allowedNamespaces) {
  if (!allowedNamespaces || !allowedNamespaces.size) return KB_DETAILS;
  return Object.fromEntries(
    Object.entries(KB_DETAILS).filter(([ns]) => allowedNamespaces.has(ns)),
  );
}

export function classifyQuestion(question, routing, allowedNamespaces) {
  if (allowedNamespaces) routing = filterRouting(routing, allowedNamespaces);
  const q = normalizeText(question);
  const hasNewsContext = hasAny(q, [
    'news',
    'spolecznosc',
    'aktualnosci',
    'aktualnosc',
    'publiczne',
    'publiczny',
    'premiera',
    'nowa wersja',
    'przerwa techniczna',
    'planowane wersje',
    'serwisowa',
    'awaria systemu',
  ]);
  const routeScores = routing.routes.map((route) => {
    const base = scoreRoute(q, route);
    const morph = applyMorphologyBoosts(q, route);
    return {
      ...route,
      score: base.score + morph.score,
      matched: [...base.matched, ...morph.matched],
    };
  });

  const routeCompare = (a, b) => {
    const d = b.score - a.score;
    if (d !== 0) return d;
    const ia = (a.matched || []).filter((m) => m !== 'explicite comarch/optima').length;
    const ib = (b.matched || []).filter((m) => m !== 'explicite comarch/optima').length;
    if (ia !== ib) return ib - ia;
    if (a.primaryKb === 'ComarchOptimaReference') return -1;
    if (b.primaryKb === 'ComarchOptimaReference') return 1;
    return a.primaryKb.localeCompare(b.primaryKb);
  };
  routeScores.sort(routeCompare);
  let primary = routeScores[0];

  if (hasNewsContext) {
    const communityRoute = routeScores.find((route) => route.primaryKb === 'ComarchCommunityNews');
    if (communityRoute && communityRoute.score > 0) {
      const currentScore = primary?.score || 0;
      const currentIsProductSpecific = primary && ['ComarchBetterflyReference', 'ComarchOptimaReference'].includes(primary.primaryKb);
      if (!primary || currentScore <= communityRoute.score + 1 || currentIsProductSpecific) {
        primary = communityRoute;
      }
    }
  }

  const explicitOptima = hasAny(q, ['optima', 'comarch erp', 'comarch']);
  const implicitOptima = hasAny(q, ['tranag', 'traelem', 'kontrahenci', 'towary', 'sprint', 'wydruk', 'funkcja dodatkowa']);
  const hasOptimaContext = explicitOptima || implicitOptima;
  const isOptimaProductKb = (name) => name.startsWith('Comarch') && !name.includes('CommunityNews') && !name.includes('Betterfly');
  if (hasOptimaContext && explicitOptima) {
    for (const r of routeScores) {
      if (isOptimaProductKb(r.primaryKb)) {
        r.score += 3;
        if (!r.matched.includes('explicite comarch/optima')) {
          r.matched.push('explicite comarch/optima');
        }
      }
    }
    routeScores.sort(routeCompare);
    primary = routeScores[0];
  }
  if (hasOptimaContext) {
    const topTaxbell = routeScores.find((r) => r.primaryKb.startsWith('Taxbell'));
    const topOptima = routeScores.find((r) => isOptimaProductKb(r.primaryKb));
    if (topTaxbell && topOptima && topTaxbell.score > 0 && topTaxbell.score <= (topOptima.score + 2)) {
      primary = topOptima;
    }
  }
  if (hasNewsContext) {
    const communityRoute = routeScores.find((route) => route.primaryKb === 'ComarchCommunityNews');
    if (communityRoute && communityRoute.score > 0) {
      const currentScore = primary?.score || 0;
      const currentIsProductSpecific = primary && ['ComarchBetterflyReference', 'ComarchOptimaReference'].includes(primary.primaryKb);
      if (!primary || currentScore <= communityRoute.score + 1 || currentIsProductSpecific) {
        primary = communityRoute;
      }
    }
  }

  const blended = [];
  for (const rule of BLENDED_RULES) {
    if (rule.test({ q, routeScores })) {
      const found = routing.blendedRoutes.find((entry) => entry.case === rule.case);
      if (found) blended.push(found);
    }
  }

  if (!primary || primary.score === 0) {
    if (hasAny(q, ['przerwa techniczna', 'nowa wersja', 'planowane wersje', 'news', 'spolecznosc', 'aktualnosci', 'publiczne', 'premiera', 'serwisowa', 'awaria systemu'])) {
      primary = routing.routes.find((route) => route.primaryKb === 'ComarchCommunityNews');
    } else if (hasAny(q, ['betterfly', 'api2', 'token', 'bearer'])) {
      primary = routing.routes.find((route) => route.primaryKb === 'ComarchBetterflyReference');
    } else if (hasAny(q, ['funkcja dodatkowa', 'fd', 'com'])) {
      primary = routing.routes.find((route) => route.primaryKb === 'ComarchOptimaAdditionalFunctions');
    } else if (hasAny(q, ['sprint', 'wydruk', 'genrap', 'raport'])) {
      primary = routing.routes.find((route) => route.primaryKb === 'ComarchOptimaSprint');
    } else if (hasAny(q, ['sql', 'join', 'schema', 'table', 'tabela', 'trigger', 'procedure', 'view'])) {
      primary = routing.routes.find((route) => route.primaryKb === 'ComarchOptimaSchema');
    } else {
      primary = routing.routes.find((route) => route.primaryKb === 'ComarchOptimaReference');
    }
  }

  const supportSet = new Set(primary.supportKbs || []);
  for (const blend of blended) {
    if (blend.primaryKb === primary.primaryKb) {
      for (const kb of blend.supportKbs || []) supportSet.add(kb);
    }
  }

  return {
    question,
    normalizedQuestion: q,
    primaryRoute: primary,
    blendedRoutes: blended,
    supportKbs: [...supportSet],
    routeScores: routeScores.slice(0, 6),
  };
}

export function buildResponse(result, routing, allowedNamespaces) {
  const kbDetails = allowedNamespaces?.size
    ? Object.fromEntries(Object.entries(KB_DETAILS).filter(([ns]) => allowedNamespaces.has(ns)))
    : KB_DETAILS;
  const primaryKb = result.primaryRoute.primaryKb;
  const supportKbs = result.supportKbs.filter((kb) => kb !== primaryKb && (!allowedNamespaces?.size || allowedNamespaces.has(kb)));
  const primaryDetails = kbDetails[primaryKb] || {};
  const supportDetails = supportKbs.map((kb) => ({ kb, ...(kbDetails[kb] || {}) }));

  return {
    assistant: routing.assistantName,
    version: routing.version,
    question: result.question,
    directAnswer: `Primary route: ${primaryKb}${supportKbs.length ? `; support: ${supportKbs.join(', ')}` : ''}.`,
    primaryKb: {
      name: primaryKb,
      projectId: primaryDetails.projectId || null,
      namespace: primaryDetails.namespace || '',
      summary: primaryDetails.summary || '',
      artifacts: primaryDetails.artifacts || [],
    },
    supportKbs: supportDetails.map((entry) => ({
      name: entry.kb,
      projectId: entry.projectId || null,
      namespace: entry.namespace || '',
      summary: entry.summary || '',
      artifacts: entry.artifacts || [],
    })),
    matchedIntent: result.primaryRoute.intent,
    matchedKeywords: result.primaryRoute.matched || [],
    blendedRoutes: result.blendedRoutes,
    topRoutes: result.routeScores.map((route) => ({
      intent: route.intent,
      primaryKb: route.primaryKb,
      score: route.score,
      matchedKeywords: route.matched,
    })),
    answerContract: routing.answerContract,
  };
}

export function renderMarkdown(response) {
  const lines = [
    `Question: ${response.question}`,
    '',
    `Primary KB: ${response.primaryKb.name} (project ${response.primaryKb.projectId}, namespace ${response.primaryKb.namespace})`,
  ];
  if (response.primaryKb.summary) {
    lines.push(`Summary: ${response.primaryKb.summary}`);
  }
  if (response.supportKbs.length) {
    lines.push('');
    lines.push(`Support KBs: ${response.supportKbs.map((item) => item.name).join(', ')}`);
  }
  if (response.matchedKeywords.length) {
    lines.push('');
    lines.push(`Matched keywords: ${response.matchedKeywords.join(', ')}`);
  }
  if (response.primaryKb.artifacts.length) {
    lines.push('');
    lines.push('Primary artifacts:');
    for (const artifact of response.primaryKb.artifacts) {
      lines.push(`- ${artifact}`);
    }
  }
  if (response.supportKbs.length) {
    lines.push('');
    lines.push('Support artifacts:');
    for (const kb of response.supportKbs) {
      for (const artifact of kb.artifacts || []) {
        lines.push(`- ${kb.name}: ${artifact}`);
      }
    }
  }
  if (response.blendedRoutes.length) {
    lines.push('');
    lines.push(`Blended routes: ${response.blendedRoutes.map((item) => item.case).join(', ')}`);
  }
  lines.push('');
  lines.push(`Answer contract: ${response.answerContract.join(', ')}`);
  return lines.join('\n');
}

function printHelp() {
  console.log(`Usage:
  node scripts/erp_knowledge_assistant.mjs "your question"
  node scripts/erp_knowledge_assistant.mjs --json "your question"

Behavior:
  - classifies the question
  - picks one primary KB
  - adds support KBs when needed
  - returns suggested artifacts to inspect first
`);
}

export function loadRouting() {
  return JSON.parse(fs.readFileSync(ROUTING_PATH, 'utf8'));
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const filtered = args.filter((arg) => arg !== '--json');
  const question = filtered.join(' ').trim();

  if (!question || filtered.includes('--help') || filtered.includes('-h')) {
    printHelp();
    process.exit(question ? 0 : 1);
  }

  const routing = loadRouting();
  const result = classifyQuestion(question, routing);
  const response = buildResponse(result, routing);

  if (asJson) {
    process.stdout.write(JSON.stringify(response, null, 2) + '\n');
    return;
  }

  process.stdout.write(renderMarkdown(response) + '\n');
}

const ENTRY_FILE = process.argv[1] ? path.resolve(process.argv[1]) : '';
const MODULE_FILE = fileURLToPath(import.meta.url);

if (ENTRY_FILE === MODULE_FILE) {
  main();
}
