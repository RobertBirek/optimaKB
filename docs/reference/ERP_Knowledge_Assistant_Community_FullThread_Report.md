# ERP Knowledge Assistant Community Full Thread Report

Date: `2026-06-01`

## Purpose

This report validates the local assistant layer against full public thread
content from `spolecznosc.comarch.pl/question`, not just titles.

## Why this matters

The earlier community sanity check used only titles. That was useful, but still
too shallow for questions where the body carries the real signal:

- workflow vs configuration issues
- KSeF validation and permission errors
- VAT/JPK structural or compliance issues
- import/export operator questions

## Collection method

- Raw HTTP fetch of the community pages is not enough in this environment.
- The site is JS-driven and the plain response initially exposes mostly the
  shell plus loader.
- Full content for this pass was collected through a headless Chromium session
  after accepting the cookie banner.
- The assistant was then tested against `title + visible thread excerpt`.

## Important routing fix found during this pass

The first full-thread pass exposed a real routing defect:

- the short token `com` matched inside the brand name `Comarch`
- that pushed several ordinary Optima questions into
  `ComarchOptimaAdditionalFunctions`

The router was corrected in `scripts/erp_knowledge_assistant.mjs` so that short
tokens like `com`, `fd`, `sql`, `xml`, and similar are matched as bounded
tokens instead of naive substring hits where appropriate.

After that correction:

- the synthetic `200Q` benchmark still remained `200 PASS / 0 PARTIAL / 0 MISS`
- the real full-thread sample below became stable

## Sample size

- Full public threads tested: `8`

## Result summary

- `PASS` -> `8`
- `PARTIAL` -> `0`
- `MISS` -> `0`

## Tested threads

| # | Thread | Expected primary KB | Actual primary KB | Result |
| --- | --- | --- | --- | --- |
| 1 | `Preliminarz płatności` | `ComarchOptimaReference` | `ComarchOptimaReference` | `PASS` |
| 2 | `Jak odblokować wyeksportowane dokumenty?` | `ComarchOptimaReference` | `ComarchOptimaReference` | `PASS` |
| 3 | `nie można wysłac jpk-nie zgodne ze schematem xsd` | `ComarchOptimaSchema` | `ComarchOptimaSchema` | `PASS` |
| 4 | `KSEF nie działa` | `ComarchOptimaPartnerTechnical` | `ComarchOptimaPartnerTechnical` | `PASS` |
| 5 | `Import danych kadrowych z pliku kedu` | `ComarchOptimaReference` | `ComarchOptimaReference` | `PASS` |
| 6 | `format listy na dokumentach` | `ComarchOptimaReference` | `ComarchOptimaReference` | `PASS` |
| 7 | `Wysyłanie faktur do KSeF - błąd` | `ComarchOptimaPartnerTechnical` | `ComarchOptimaPartnerTechnical` | `PASS` |
| 8 | `Rejestr sprzedaży polska faktura w EUR różnice groszowe w VAT` | `ComarchOptimaSchema` | `ComarchOptimaSchema` | `PASS` |

## Notes per class

### 1. Operational usage / how-to questions

Examples:

- `Preliminarz płatności`
- `Jak odblokować wyeksportowane dokumenty?`
- `Import danych kadrowych z pliku kedu`

Observed behavior:

- `ComarchOptimaReference` is the correct first route.
- This is the safest KB for product-usage questions without immediate signs of
  SQL, FD, Sprint, or partner-only technical assets.

### 2. KSeF technical problem threads

Examples:

- `KSEF nie działa`
- `Wysyłanie faktur do KSeF - błąd`

Observed behavior:

- `ComarchOptimaPartnerTechnical` is the right current primary KB.
- These questions benefit from partner-only technical assets, dictionaries,
  message catalogs, and KSeF-related materials more than from generic product
  docs.

### 3. Structural / compliance / data-shape issues

Examples:

- `nie można wysłac jpk-nie zgodne ze schematem xsd`
- `Rejestr sprzedaży polska faktura w EUR różnice groszowe w VAT`

Observed behavior:

- `ComarchOptimaSchema` is the right current primary KB.
- These threads are closer to structural understanding, field semantics, and
  data-shape reasoning than to ordinary product usage guidance.

## Source threads

- `Preliminarz płatności`
  - `https://spolecznosc.comarch.pl/question/preliminarz-platnosci-77037`
- `Jak odblokować wyeksportowane dokumenty?`
  - `https://www.spolecznosc.comarch.pl/question/jak-odblokowac-wyeksportowane-dokumenty-8057`
- `nie można wysłac jpk-nie zgodne ze schematem xsd`
  - `https://www.spolecznosc.comarch.pl/question/nie-mozna-wyslac-jpk-nie-zgodne-ze-schematem-xsd-44851`
- `KSEF nie działa`
  - `https://www.spolecznosc.comarch.pl/question/ksef-nie-dziala-77547`
- `Import danych kadrowych z pliku kedu`
  - `https://www.spolecznosc.comarch.pl/question/Import-danych-kadrowych-z-pliku-kedu-60423`
- `format listy na dokumentach`
  - `https://spolecznosc.comarch.pl/question/format-listy-na-dokumentach-34497`
- `Wysyłanie faktur do KSeF - błąd`
  - `https://spolecznosc.comarch.pl/question/wysylanie-faktur-do-ksef-blad-78367`
- `Rejestr sprzedaży polska faktura w EUR różnice groszowe w VAT`
  - `https://spolecznosc.comarch.pl/question/rejestr-sprzedazy-polska-faktura-w-eur-roznice-groszowe-w-vat-72704`

## Conclusion

The assistant layer now behaves correctly on a small but real full-thread sample
from public Comarch community questions.

The most important outcome is not just the `8/8 PASS`, but the discovered and
fixed routing defect:

- short token matching must be token-aware
- otherwise `com` collides with `Comarch` and poisons real-world routing

This report is now the strongest public validation artifact for the local
assistant layer, stronger than the title-only pass and more realistic than the
synthetic 100Q/200Q packs.
