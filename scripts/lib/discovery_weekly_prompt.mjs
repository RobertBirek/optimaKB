#!/usr/bin/env node

function sortQueryStats(items) {
  return [...items].sort((left, right) => (
    Number(right.lastCorpusDuplicateCount || 0) - Number(left.lastCorpusDuplicateCount || 0)
    || Number(right.emptyRuns || 0) - Number(left.emptyRuns || 0)
    || Number(left.lastResultCount || 0) - Number(right.lastResultCount || 0)
    || String(left.id || '').localeCompare(String(right.id || ''))
  ));
}

function compactObjectEntries(record, mapper, limit) {
  return Object.fromEntries(
    Object.entries(record || {})
      .slice(0, limit)
      .map(([key, value]) => [key, mapper(value, key)]),
  );
}

export function compactWeeklyPlannerContext(context = {}) {
  const queryStats = sortQueryStats(context.queryStats || []).slice(0, 12).map((query) => ({
    id: query.id,
    kbNamespace: query.kbNamespace,
    source: query.source,
    lastResultCount: Number(query.lastResultCount || 0),
    lastCorpusDuplicateCount: Number(query.lastCorpusDuplicateCount || 0),
    emptyRuns: Number(query.emptyRuns || 0),
    enabled: query.enabled !== false,
  }));

  const candidateStats = compactObjectEntries(
    context.candidateStats,
    (stats) => ({
      total: Number(stats?.total || 0),
      pending: Number(stats?.pending || 0),
      drafted: Number(stats?.drafted || 0),
      corpusDuplicates: Number(stats?.corpusDuplicates || 0),
      operatorReviewed: Number(stats?.operatorReviewed || 0),
      operatorRejected: Number(stats?.operatorRejected || 0),
      recentReasons: (stats?.recentReasons || []).slice(0, 3),
    }),
    16,
  );

  const byQueryEntries = sortQueryStats(
    Object.entries(context.feedback?.byQuery || {}).map(([id, stats]) => ({
      id,
      ...(stats || {}),
    })),
  ).slice(0, 20);

  return {
    candidateStats,
    queryStats,
    feedback: {
      overall: context.feedback?.overall || {},
      calibration: context.feedback?.calibration || {},
      byKb: compactObjectEntries(
        context.feedback?.byKb,
        (stats) => ({
          reviewed: Number(stats?.reviewed || 0),
          accepted: Number(stats?.accepted || 0),
          rejected: Number(stats?.rejected || 0),
          agreement: stats?.agreement ?? null,
          falsePositives: Number(stats?.falsePositives || 0),
          falseNegatives: Number(stats?.falseNegatives || 0),
        }),
        16,
      ),
      byTier: compactObjectEntries(
        context.feedback?.byTier,
        (stats) => ({
          reviewed: Number(stats?.reviewed || 0),
          accepted: Number(stats?.accepted || 0),
          rejected: Number(stats?.rejected || 0),
          agreement: stats?.agreement ?? null,
        }),
        8,
      ),
      byAction: compactObjectEntries(
        context.feedback?.byAction,
        (stats) => ({
          reviewed: Number(stats?.reviewed || 0),
          accepted: Number(stats?.accepted || 0),
          rejected: Number(stats?.rejected || 0),
          agreement: stats?.agreement ?? null,
        }),
        8,
      ),
      byQuery: Object.fromEntries(byQueryEntries.map((stats) => [stats.id, {
        reviewed: Number(stats.reviewed || 0),
        duplicates: Number(stats.duplicates || 0),
        accepted: Number(stats.accepted || 0),
        rejected: Number(stats.rejected || 0),
        agreement: stats.agreement ?? null,
        falsePositives: Number(stats.falsePositives || 0),
        falseNegatives: Number(stats.falseNegatives || 0),
      }])),
      recentNotes: (context.feedback?.recentNotes || []).slice(0, 6),
    },
    learning: {
      overall: context.learning?.overall || {},
      byKbNamespace: compactObjectEntries(
        context.learning?.byKbNamespace,
        (stats) => ({
          reviewed: Number(stats?.reviewed || 0),
          baseThreshold: stats?.baseThreshold ?? null,
          tunedBaseline: stats?.tunedBaseline ?? null,
          windowFpRate: stats?.windowFpRate ?? null,
          windowSize: Number(stats?.windowSize || 0),
        }),
        12,
      ),
      highlights: context.learning?.highlights || {},
    },
    reports: (context.reports || []).slice(0, 5).map((report) => ({
      path: report.path,
      generatedAt: report.generatedAt,
      overall: report.overall,
    })),
  };
}

export function buildWeeklyPlannerPrompt(policy, context) {
  const compactContext = compactWeeklyPlannerContext(context);
  return [
    'Tworz zwiezle tygodniowe zapytania do wyszukiwania internetowego dla wskazanych baz wiedzy.',
    'Zwroc tylko JSON: {"queries":[{"kbNamespace":"...","query":"...","includeDomains":["..."],"reason":"..."}]}',
    `Nie zwracaj wiecej niz ${policy.generatedQueriesPerKb} zapytan na KB.`,
    'Preferuj aktualna dokumentacje oficjalna, zmiany prawne, release notes i niepokryte tematy operacyjne.',
    'Uwzgledniaj feedback operatorow, aby unikac wzorcow z powtarzajacymi sie false positive lub odrzuceniami.',
    'Preferuj luki i slabo pokryte tematy; nie powtarzaj tylko zapytan z wysokim wspolczynnikiem duplikatow lub odrzucen.',
    'Nie wymyslaj domen spoza profilu.',
    'Wszystkie pola tekstowe, w tym query i reason, zapisuj po polsku.',
    `Current operational context: ${JSON.stringify(compactContext)}`,
    JSON.stringify(policy.profiles.map((profile) => ({
      kbNamespace: profile.kbNamespace,
      mode: profile.mode,
      topics: profile.topics,
      domains: [...(profile.domains || []), ...(profile.communityDomains || []), ...(profile.professionalDomains || [])],
    }))),
  ].join('\n');
}
