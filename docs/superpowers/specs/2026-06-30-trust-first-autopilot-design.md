# Trust-First Autopilot Design

> Automated risk-aware pipeline operations for the ERP KB dashboard.

**Goal:** System autonomicznie ogranicza ryzyko, throttle'uje lub freezuje
pipeline gdy jakość spada, a operator widzi głównie wyjątki i blokady zamiast
statystyk i konfiguracji.

**Architecture:** Rozszerzenie istniejących mechanizmów `learning state`,
`auto-draft`, `auto-reroute`, `alertów` i `quality gates` bez nowego
subsystemu. Wszystkie decyzje autopilota są audytowane i odwracalne.

**Tech Stack:** Node.js (exisiting dashboard), React (exisiting SPA),

---

## Behaviors

### 1. Auto-freeze per KB/domain

Gdy learning state wykazuje:

- **FP rate > 15%** dla KB → freeze auto-draft dla tej KB
- **Acceptance rate < 25%** dla KB przy ≥5 reviewed → freeze auto-draft dla KB
- **Noise penalty > 0.5** dla domeny → freeze domeny (kandydaty z tej domeny
  nie mogą być auto-draftowane dla żadnej KB)

Freeze oznacza:
- auto-draft nie tworzy nowych draftów z tej KB/domain
- reszta pipeline (discovery, monitorowanie, alerty) działa normalnie
- kandydaty z tej KB/domain wciąż zbierane i dostępne w Sources

Istniejące ręczne overide operatora (ustawione przez panel learning) mają
pierwszeństwo przed auto-freeze.

### 2. Auto-throttle (przed freeze)

Zanim dojdzie do freeze, system może zaostrzyć próg confidence:

- **FP rate 10-15%** → threshold confidence rośnie o 0.03
- **Acceptance rate 25-40%** przy ≥3 reviewed → threshold +0.02
- **Domain noise penalty 0.3-0.5** → threshold +0.02 dla kandydatów z tej
  domeny

Threshold boost kumuluje się, ale nie przekracza 0.98.

Gdy system wraca do normy, threshold wraca do baseline w tempie -0.01 na
każdy dzień z dobrymi wynikami (FP rate ≤8%, acceptance ≥50%).

### 3. Auto-reject safe cases

System automatycznie odrzuca (REJECT) tylko oczywiste złe przypadki:

- Duplikaty wykryte przez istniejący mechanizm dedup
- Kandydaty z domain objętej freeze (bezpośrednio, bez ręcznej decyzji)
- Kandydaty z confidence < 0.1 i bez żadnego z: `official`/`professional` tier,
  istniejący poprawny reroute pair w learning state, pozytywne accept notes
  w prompt memory

Auto-reject zapisuje `operatorDecision` z źródłem `autopilot`.

Nie ma auto-reject dla przypadków granicznych — te idą do operatora.

### 4. Auto-recovery

System może sam zdjąć freeze lub złagodzić throttle.

Warunki powrotu do normy:

- **Dla KB freeze:** 7 dni z FP rate ≤8% i acceptance ≥50% (minimum 3
  reviewed w tym okresie) → auto-unfreeze
- **Dla domain freeze:** 14 dni bez żadnego noise signal z tej domeny →
  auto-unfreeze
- **Dla throttle:** threshold wraca -0.01/dzień przy dobrych wynikach

Recovery jest wolniejsze niż freeze — system nie oscyluje.

### 5. Exception-only operator flow

Dashboard eksponuje operatorowi głównie:

- **Overview:** podsumowanie autopilota: aktywne freeze/throttle, liczba
  wstrzymanych KB, ostatnie działania autopilota, przyciski do przejścia
- **Sources:** osobna sekcja "Wymaga decyzji" tylko dla przypadków
  nieobjętych auto-decyzją + lista blokad
- **Automation:** historia działań autopilota: freeze, throttle, recovery

## Data Model

Stan autopilota przechowywany w nowym pliku:
`data/dashboard/learning/autopilot_state.json`

```json
{
  "version": 1,
  "updatedAt": "2026-06-30T...",
  "frozenKbNamespaces": {
    "ComarchCommunityNews": {
      "frozenAt": "2026-06-30T...",
      "reason": "fp_rate_high",
      "fpRate": 0.18,
      "threshold": 0.15
    }
  },
  "frozenDomains": {
    "spam.example.com": {
      "frozenAt": "2026-06-30T...",
      "reason": "noise_penalty_high",
      "noisePenalty": 0.6
    }
  },
  "throttledThresholds": {
    "ComarchCommunityNews": {
      "boost": 0.05,
      "since": "2026-06-30T..."
    }
  },
  "recoveryCounters": {
    "ComarchCommunityNews": {
      "goodDays": 3,
      "requiredDays": 7
    }
  }
}
```

## Implementation Points

### Backend (new file: `scripts/lib/dashboard_autopilot.mjs`)

Functions:
- `loadAutopilotState()` → state object
- `saveAutopilotState(state)` → void
- `evaluateAutopilotDecisions(learningState, discoveryState)` → decisions
  - returns `{ freezeKb: [], freezeDomain: [], throttle: [], recovery: [] }`
- `applyAutopilotDecisions(decisions)` → applied state
  - calls `saveAutopilotState`, writes audit, updates learning state
- `autopilotSummary(state)` → string for UI report

No new cron. `evaluateAutopilotDecisions` is called inline during daily
discovery run, before auto-draft.

### Backend (changes in exisiting files)

- `scripts/run_dashboard_discovery.mjs` — call `evaluateAutopilotDecisions`
  after discovery but before auto-draft, pass result to `runAutoDraft`
- `scripts/lib/dashboard_automation.mjs` — expose thresholds adjusted by
  throttle to `triggerAutomationForDraft` / `adjudication`
- `scripts/lib/feedback_learning.mjs` — minor: expose helper for FP/accept
  rate calculations
- `scripts/erp_kb_dashboard_server.mjs` — new endpoint
  `GET /api/automation/autopilot` for state

### Frontend (changes in exisiting components)

- `src/Overview.jsx` — add autopilot summary section (active freezes,
  throttles, last actions)
- `src/SourcesPage.jsx` — add "Wymaga decyzji" filter that shows only cases
  not auto-resolved, plus list of active freeze blocks
- `src/AutomationPage.jsx` — add history section for autopilot actions with
  reasons

### Auto-reject integration

- `src/SourcesPage.jsx` / `discoverySummary` — filter out auto-rejected
  candidates from default view, but keep them accessible with filter
- `scripts/lib/dashboard_discovery.mjs` — `applyAutopilotDecisions` handles
  auto-reject by setting `operatorDecision` with `source: 'autopilot'`

## Edge Cases & Safety

- **Operator override:** ręczne odblokowanie KB/domain w panelu learning ma
  pierwszeństwo przed auto-freeze przez 48h albo do następnej anomalii
- **Recovery reset:** jeśli po rozpoczęciu recovery pojawi się nowa anomalia,
  counter wraca do zera
- **Kaskada freeze:** jeśli KB jest we freeze z powodu FP rate, a potem
  pojawia się też noise penalty na jej głównej domenie, freeze pozostaje
  — nie ma podwójnego blokowania
- **Throttle vs freeze:** jeśli KB jest jednocześnie throttled i frozen,
  freeze ma pierwszeństwo; throttle resetuje się

## Test Scenarios

1. KB z FP rate 18% → freeze auto-draft; po 7 dniach dobrych wyników →
   unfreeze
2. Domain z noise penalty 0.6 → freeze domain; kandydaty z tej domeny
   nie idą do auto-draft
3. KB z FP rate 12% → throttle +0.03; po 3 dniach normy → -0.01/dzień
4. Kandydat z confidence 0.05 z noise domain → auto-reject (REJECT)
5. Kandydat z confidence 0.85 z noise domain → manual review, nie
   auto-reject
6. Operator ręcznie odblokowuje KB w panelu → freeze nierespektowany
   przez 48h
7. Wszystkie działania autopilota pojawiają się w audit logu
8. Działania autopilota widoczne w `GET /api/automation/autopilot`
