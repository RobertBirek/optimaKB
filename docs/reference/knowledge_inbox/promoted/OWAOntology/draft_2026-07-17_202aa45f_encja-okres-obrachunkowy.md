# Encja: Okres obrachunkowy
- draftId: `draft_2026-07-17_202aa45f_encja-okres-obrachunkowy`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.396Z`
- tags: `OWA`, `ontologia`, `optima`, `okres-obrachunkowy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Okres obrachunkowy

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.OkresObrachunkowy`
- Aliasy: `OkresyObrach`, `AccountingPeriod`, `FiscalPeriod`

## Opis biznesowy
Okres obrachunkowy w Comarch Optima definiuje ramy czasowe dla księgowań w danym roku obrotowym. Każdy okres ma symbol (np. "2025-01"), datę otwarcia (`OOb_DataOtw`), długość w miesiącach (`OOb_Dlugosc`) oraz datę końcową (`OOb_DataKoncowa`). Okres może zostać zamknięty (`OOb_DataZam`), co blokuje dalsze księgowania. Do okresu przypisane są dzienniki dla rozrachunków (`OOb_DziIdRK`) i kompensat (`OOb_DziIdKomp`). Okresy są powiązane z dziennikami relacją CASCADE DELETE.

## Reguły biznesowe
- Okres ma stan (`OOb_Stan`) — otwarty/zamknięty
- Zamknięcie okresu (`OOb_DataZam`) blokuje nowe księgowania
- Okres może mieć ciągłą numerację dokumentów (`OOb_CiaglaNumeracjaDC`)
- Domyślnie data księgowania RK i kompensat z daty dokumentu (`OOb_DataKsiRk=1`)
- Zaliczki uproszczone (`OOb_ZaliczkiUproszczone`) — tryb uproszczony
- Usunięcie okresu powoduje CASCADE DELETE dzienników (Dzienniki.Dzi_OObId → OkresyObrach)

## Źródła danych
| Rola źródła | Schemat | Tabela | PK | Stan | Dowód |
|---|---|---|---|---|---|
| Okresy obrachunkowe | CDN | OkresyObrach | OOb_OObID (int, IDENTITY) | Potwierdzona | MSSQL |
| Dzienniki | CDN | Dzienniki | Dzi_DziId | Potwierdzona | FK Dzi_OObId |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_journal_period | POST /api/v1/journal-periods | Potwierdzone |
| WRITE | accounting_close_period | POST /api/v1/accounting/period/close | Potwierdzone |

## Identyfikatory — OkresyObrach
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | OOb_OObID | Unikalny identyfikator okresu (int, IDENTITY) | Potwierdzony |
| Naturalny | OOb_Symbol | Symbol okresu (varchar 5, np. "2025-01") | Potwierdzony |
| FK | OOb_DziIdRK | FK do Dzienniki (dziennik RK) | Potwierdzony |
| FK | OOb_DziIdKomp | FK do Dzienniki (dziennik kompensat) | Potwierdzony |

## Kluczowe pola MSSQL — OkresyObrach
| Kolumna | Typ | Opis |
|---|---|---|
| OOb_OObID | int (PK, IDENTITY) | ID okresu |
| OOb_Symbol | varchar(5) | Symbol (unikalny) |
| OOb_DataOtw | datetime | Data otwarcia |
| OOb_Dlugosc | smallint | Długość w miesiącach |
| OOb_DataKoncowa | datetime | Data końcowa |
| OOb_DataZam | datetime (nullable) | Data zamknięcia (null=otwarty) |
| OOb_Stan | smallint | Stan okresu |
| OOb_CiaglaNumeracjaDC | int | Ciągła numeracja dokumentów |
| OOb_ZaliczkiUproszczone | int | Tryb uproszczony |
| OOb_DziIdRK | int (nullable) | Dziennik rozrachunków |
| OOb_DziIdKomp | int (nullable) | Dziennik kompensat |
| OOb_DataKsiRk | smallint | Data księgowania RK |
| OOb_DataKsiKomp | smallint | Data księgowania kompensat |
| OOb_Opis | nvarchar(254) | Opis okresu |
| OOb_TypZOiS | nvarchar(10) (nullable) | Typ ZOiS |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| zawiera_dzienniki | OkresObrachunkowy | Dziennik | 1:N | Dzienniki.Dzi_OObId = OkresyObrach.OOb_OObID |
| zawiera_dekrety | OkresObrachunkowy | DekretKsiegowy | 1:N | Przez Dzienniki |
| poprzedza | OkresObrachunkowy | OkresObrachunkowy | 1:1 | Chronologicznie po dacie |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | Pełny schemat (25 kolumn, 3 indeksy unikalne) |
| OptimaMCP | create_journal_period, accounting_close_period | API WRITE |

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15