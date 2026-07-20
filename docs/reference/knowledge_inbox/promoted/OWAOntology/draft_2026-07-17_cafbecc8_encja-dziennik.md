# Encja: Dziennik
- draftId: `draft_2026-07-17_cafbecc8_encja-dziennik`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.556Z`
- tags: `OWA`, `ontologia`, `optima`, `dziennik`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Dziennik

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.Dziennik`
- Aliasy: `Dzienniki`, `Journal`, `Book`

## Opis biznesowy
Dziennik w Comarch Optima to rejestr księgowy zawierający chronologicznie uporządkowane zapisy księgowe (dekrety). Każdy dziennik jest przypisany do okresu obrachunkowego (`CDN.OkresyObrach`) przez klucz obcy `Dzi_OObId`. Dziennik identyfikowany jest przez symbol (`Dzi_Symbol`) i nazwę (`Dzi_Nazwa`). Usunięcie okresu obrachunkowego powoduje kaskadowe usunięcie wszystkich jego dzienników (CASCADE DELETE).

## Reguły biznesowe
- Każdy dziennik należy do dokładnie jednego okresu obrachunkowego
- Dziennik ma unikalny symbol w ramach okresu (indeks `Dzi_OObId + Dzi_Symbol`)
- Dziennik zawiera chronologicznie uporządkowane dekrety
- Symbol dziennika — maks. 20 znaków
- Nazwa dziennika — maks. 50 znaków
- Usunięcie okresu → CASCADE DELETE wszystkich dzienników

## Źródła danych
| Rola źródła | Schemat | Tabela | PK | Stan | Dowód |
|---|---|---|---|---|---|
| Dzienniki | CDN | Dzienniki | Dzi_DziId (int, IDENTITY) | Potwierdzona | MSSQL |
| Okresy obrachunkowe | CDN | OkresyObrach | OOb_OObID | Potwierdzona | FK CASCADE |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Status |
|---|---|---|
| READ | list_journal_entries (pośrednio) | Powiązanie przez Dzienniki → DekretyNag |

## Identyfikatory — Dzienniki
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | Dzi_DziId | Unikalny identyfikator dziennika (int, IDENTITY) | Potwierdzony |
| Naturalny | Dzi_Symbol | Symbol dziennika (varchar 20) | Potwierdzony |
| FK | Dzi_OObId | FK do OkresyObrach.OOb_OObID (CASCADE) | Potwierdzony |

## Kluczowe pola MSSQL — Dzienniki
| Kolumna | Typ | Opis |
|---|---|---|
| Dzi_DziId | int (PK, IDENTITY) | ID dziennika |
| Dzi_Symbol | varchar(20) | Symbol dziennika |
| Dzi_Nazwa | varchar(50) | Nazwa dziennika |
| Dzi_OObId | int | FK do OkresyObrach (CASCADE DELETE) |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| należy_do_okresu | Dziennik | OkresObrachunkowy | N:1 | Dzienniki.Dzi_OObId = OkresyObrach.OOb_OObID |
| zawiera_dekrety | Dziennik | DekretKsiegowy | 1:N | DekretyNag → Dzienniki |
| uzywany_przez_RK | Dziennik | OkresObrachunkowy | 1:1 | OkresyObrach.OOb_DziIdRK = Dzienniki.Dzi_DziId |
| uzywany_przez_kompensaty | Dziennik | OkresObrachunkowy | 1:1 | OkresyObrach.OOb_DziIdKomp = Dzienniki.Dzi_DziId |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | Pełny schemat (14 kolumn, 1 FK CASCADE, 2 indeksy) |
| OptimaKB | OpenSPG | ComarchOptimaSchema (relacje) |

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15