# ERP Knowledge Assistant Community Questions Report

Date: `2026-06-01`

## Purpose

This report validates the local assistant layer against real question titles
published by users on `spolecznosc.comarch.pl/question`, instead of only using
the synthetic 100Q and 200Q packs.

## Scope and limitation

- This pass used real community question titles and URLs discovered from the
  public community site.
- The test was title-level only.
- It did not rely on full question bodies, because the community site is partly
  JS-driven and the search-result path gives reliable titles and links faster
  than full thread parsing.
- Because of that, this report is stricter than a synthetic benchmark but still
  weaker than a full post-body evaluation.

## Sample size

- Real community titles tested: `10`

## Result summary

- Plausible route: `10/10`
- Clear false-positive route to unrelated KB family: `0/10`
- Betterfly false positives on Optima questions: `0/10`

Distribution of selected primary KB:

- `ComarchOptimaReference` -> `6`
- `ComarchOptimaPartnerTechnical` -> `2`
- `ComarchOptimaSchema` -> `2`

Interpretation:

- Short operational/end-user titles tend to fall back to
  `ComarchOptimaReference`, which is acceptable and usually the safest route.
- KSeF problem titles are correctly pushed toward
  `ComarchOptimaPartnerTechnical`.
- Titles with strong structural or compliance hints like `VAT` and `schema XSD`
  are correctly pushed toward `ComarchOptimaSchema`.
- The assistant does not leak Optima titles into `ComarchBetterflyReference`.

## Tested titles

| # | Community title | Primary KB | Comment |
| --- | --- | --- | --- |
| 1 | `Preliminarz płatności` | `ComarchOptimaReference` | Good safe default for short operational title. |
| 2 | `Jak odblokować wyeksportowane dokumenty?` | `ComarchOptimaReference` | Good safe default for end-user workflow issue. |
| 3 | `nie można wysłac jpk-nie zgodne ze schematem xsd` | `ComarchOptimaSchema` | Plausible structural/compliance route due `schema/xsd`. |
| 4 | `KSEF nie działa` | `ComarchOptimaPartnerTechnical` | Good route; partner/KSeF technical layer is the strongest current KB. |
| 5 | `Import danych kadrowych z pliku kedu` | `ComarchOptimaReference` | Good default for product-usage/import workflow question. |
| 6 | `format listy na dokumentach` | `ComarchOptimaReference` | Good default for UI/documentation-style question. |
| 7 | `Pozycja cennika nie może być wykasowana.` | `ComarchOptimaReference` | Good default for troubleshooting/product behavior. |
| 8 | `Wysyłanie faktur do KSeF - błąd` | `ComarchOptimaPartnerTechnical` | Good route; KSeF-specific issue. |
| 9 | `Zaliczka kasa fiskalna` | `ComarchOptimaReference` | Good default for business-process question. |
| 10 | `Rejestr sprzedaży polska faktura w EUR różnice groszowe w VAT` | `ComarchOptimaSchema` | Plausible route due strong `VAT` signal. |

## Source list

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
- `Pozycja cennika nie może być wykasowana.`
  - `https://spolecznosc.comarch.pl/question/pozycja-cennika-nie-moze-byc-wykasowana-6922`
- `Wysyłanie faktur do KSeF - błąd`
  - `https://spolecznosc.comarch.pl/question/wysylanie-faktur-do-ksef-blad-78367`
- `Zaliczka kasa fiskalna`
  - `https://spolecznosc.comarch.pl/question/zaliczka-kasa-fiskalna-54737`
- `Rejestr sprzedaży polska faktura w EUR różnice groszowe w VAT`
  - `https://spolecznosc.comarch.pl/question/rejestr-sprzedazy-polska-faktura-w-eur-roznice-groszowe-w-vat-72704`

## Conclusion

The assistant layer behaves sensibly on real public Optima community question
titles. The current routing is conservative in the right direction:

- vague product questions -> `ComarchOptimaReference`
- KSeF technical questions -> `ComarchOptimaPartnerTechnical`
- structure/compliance hints -> `ComarchOptimaSchema`

The next stronger validation step is not more synthetic data. It is a second
real-world pass on full question bodies or on internal operator questions.
