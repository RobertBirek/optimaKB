# Content Cleaning Report — 30 June 2026

## Zakres
Full czyszczenie boilerplate z discovery candidates, inbox drafts, promoted
drafts i export CSV we wszystkich KB dokumentowych (z wyłączeniem Schema,
BusinessSemantics, UniversalKnowledge).

## Wykonane kroki

### 1. Skan
- `scripts/scan_content_garbage.mjs` — skanuje discovery, inbox, promoted, exporty
- Raport: `docs/reference/Content_Cleaning_Scan_Report.json`

### 2. Konfiguracja wzorców
- Plik: `data/dashboard/cleaning/patterns.json`
- 9 wzorców drop-line: `Summary:`, `Automated source-discovery draft.`,
  `Review this draft before promotion.`, `Source list scan draft.`,
  `Search For Wyszukaj`, `Jak możemy Ci pomóc?`, `Nazwa: Wzór standard`,
  `[edytuj]`, `Strona N / Page N`
- 3 wzorce inline: `REKLAMA`, `Infor`, `Shutterstock`

### 3. Czyszczenie
- Discovery candidates: 112/167 wyczyszczone
- Pending inbox drafts: 110/118 wyczyszczone
- Promoted drafts: 96/97 wyczyszczone
- Export CSV: 30/112 plików z czyszczonymi kolumnami content

### 4. Rebuild (OpenSPG builder)
| KB | Rebuild | Status |
|---|---|---|
| ComarchCommunityNews | project 11 | FINISH (6 jobów) |
| ComarchOptimaReference | project 8 | FINISH (8 jobów) |
| ComarchOptimaAdditionalFunctions | project 6 | Błąd entity mapping — wymaga poprawki profilu |
| ComarchOptimaSprint | project 7 | Wymaga ponowienia |
| ComarchOptimaPartnerTechnical | project 9 | Wymaga ponowienia |
| ComarchBetterflyReference | project 10 | Wymaga obsłużenia stale joba |
| TaxbellLegalReference | project 12 | Nie rebuildowany |
| TaxbellPayrollHRReference | project 13 | Nie rebuildowany |
| TaxbellAccountingVATReference | project 14 | Nie rebuildowany |

## Narzędzia
- `scripts/scan_content_garbage.mjs` — skaner wzorców śmieci
- `scripts/clean_content_garbage.mjs` — czyścik (wielopoziomowy)
- `data/dashboard/cleaning/patterns.json` — konfiguracja wzorców
