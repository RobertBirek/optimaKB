# Encja: Lista płac
- draftId: `draft_2026-07-17_786b52cb_encja-lista-p-ac`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:48.126Z`
- tags: `OWA`, `ontologia`, `optima`, `lista-plac`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Lista płac

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (pełny schemat potwierdzony przez `mssql_describe_table`)
- Identyfikator ontologiczny: `OWAOntology.ListaPlac`
- Aliasy: `ListyPlac`, `Payroll`, `PayrollList`, `ListaPłac`

## Opis biznesowy
Lista płac reprezentuje zbiorcze zestawienie wynagrodzeń pracowników za dany okres rozliczeniowy. Każda lista płac jest identyfikowana przez `LPL_LplId` i ma przypisany miesiąc (`LPL_Miesiac`) oraz rok (`LPL_Rok`). Lista płac może być zamknięta (`LPL_Zamknieta` — data zamknięcia) i może zostać zaksięgowana (`LPL_Zaksiegowana`). System wspiera różne kategorie list (`LPL_Kategoria`), w tym listy tymczasowe (`LPL_Tymczasowi`) i listy dla pracowników oddelegowanych (`LPL_Oddelegowani`). Numer listy jest generowany z funkcji `FN_NUMERPELNY`. Lista może mieć rodzica (`LPL_ParentId`) — np. korekta listy. Może być też powiązana z deklaracją (`LPL_DekId`) i deklaracją korygującą (`LPL_PreDekId`).

## Reguły biznesowe
- Każda lista płac obejmuje jeden miesiąc i rok: `LPL_Miesiac` + `LPL_Rok`
- `LPL_DataOd` / `LPL_DataDo` — okres rozliczeniowy listy
- `LPL_DataDanych` — data graniczna danych uwzględnianych na liście
- `LPL_Zamknieta` — data zamknięcia (NOT NULL = lista zamknięta)
- `LPL_Zaksiegowana` (tinyint) — 1 = lista zaksięgowana w KH
- Hierarchia list: `LPL_ParentId` → `ListyPlac.LPL_LplId` (korekty)
- Listy tymczasowe: `LPL_Tymczasowi` = 1 → lista dla pracowników tymczasowych
- Oddelegowanie: `LPL_Oddelegowani` = 1 → lista dla oddelegowanych
- Waluta listy: `LPL_Waluta`, kurs: `LPL_DataKur`, `LPL_KursNumer`, `LPL_KursL`, `LPL_KursM`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Podstawowa | CDN | ListyPlac | **Potwierdzona** | `mssql_describe_table` → PK=LPL_LplId, 55 kolumn, 1 rekord |
| Dokumenty definicje | CDN | DokDefinicje | Potwierdzona | FK LPL_DdfId → DokDefinicje |
| Działy | CDN | Dzialy | Potwierdzona | FK LPL_DzlId → Dzialy |
| Formy płatności | CDN | FormyPlatnosci | Potwierdzona | FK LPL_FplId → FormyPlatnosci |
| Zakłady | CDN | Zaklady | Potwierdzona | FK LPL_ZakId → Zaklady |
| Typy wypłat | CDN | TypWyplata | Potwierdzona | `mssql_list_tables` (337 rekordów) |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | LPL_LplId | Unikalny identyfikator listy płac (int, IDENTITY) | **Potwierdzony** | MSSQL PK `LPL_Primary` |
| AK | LPL_NumerPelny | Pełny numer listy (COMPUTED) | **Potwierdzony** | COMPUTED + indeks `LPLNumerPelny` UNIQUE |
| AK | LPL_Symbol | Symbol listy płac (varchar(5)) | Potwierdzony | MSSQL |

## Kluczowe pola ListyPlac
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | ListyPlac | LPL_LplId | int (IDENTITY) | N | PK | Identyfikator listy płac |
| 2 | CDN | ListyPlac | LPL_Miesiac | smallint | N | | Miesiąc (1-12) |
| 3 | CDN | ListyPlac | LPL_Rok | int | N | | Rok |
| 4 | CDN | ListyPlac | LPL_DataOd | datetime | N | | Data początkowa okresu |
| 5 | CDN | ListyPlac | LPL_DataDo | datetime | N | | Data końcowa okresu |
| 6 | CDN | ListyPlac | LPL_DataDanych | datetime | Y | | Data graniczna danych |
| 7 | CDN | ListyPlac | LPL_DataDok | datetime | N | | Data dokumentu |
| 8 | CDN | ListyPlac | LPL_Nazwa | nvarchar(128) | N | | Nazwa listy |
| 9 | CDN | ListyPlac | LPL_NumerPelny | nvarchar(30) | Y | AK | Pełny numer (COMPUTED) |
| 10 | CDN | ListyPlac | LPL_Zamknieta | datetime | Y | | Data zamknięcia listy |
| 11 | CDN | ListyPlac | LPL_Zaksiegowana | tinyint | N | | Status zaksięgowania (0/1) |
| 12 | CDN | ListyPlac | LPL_Kategoria | int | N | | Kategoria listy |
| 13 | CDN | ListyPlac | LPL_Tymczasowi | tinyint | N | | Lista dla tymczasowych (0/1) |
| 14 | CDN | ListyPlac | LPL_Symbol | varchar(5) | N | | Symbol listy |
| 15 | CDN | ListyPlac | LPL_DekId | int | Y | | ID deklaracji powiązanej |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| nalezy_do_dzialu | ListaPlac | Dzial | N:1 | FK | ListyPlac.LPL_DzlId = Dzialy.DZL_DzlId | **Potwierdzona** | MSSQL FK FK_LPLDzlLink |
| ma_forme_platnosci | ListaPlac | FormaPlatnosci | N:1 | FK | ListyPlac.LPL_FplId = FormyPlatnosci.FPl_FPlId | **Potwierdzona** | MSSQL FK FK_LPLFormaPlatnosci |
| jest_korekta | ListaPlac | ListaPlac | N:1 | Hierarchia | ListyPlac.LPL_ParentId = ListyPlac.LPL_LplId | **Potwierdzona** | MSSQL FK FK_LPLParent |
| powiazana_z_deklaracja | ListaPlac | Deklaracja | N:1 | Referencja | ListyPlac.LPL_DekId → DeklNag | Potwierdzona | MSSQL indeks LPlDekrety |
| nalezy_do_zakladu | ListaPlac | Zaklad | N:1 | FK | ListyPlac.LPL_ZakId = Zaklady.Zak_ZakID | **Potwierdzona** | MSSQL FK FK_LPLZakLink |

## Endpointy OptimaMCP

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `payroll_calculate` | Kalkuluje płace |
| `payroll_close` | Zamyka listę płac |
| `payroll_correct` | Koryguje wypłatę |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.ListyPlac (55 kolumn, 1 rekord) | Pełny schemat tabeli |
| MSSQL (CDN_TEST) | FK constraints | FK_LPLDzlLink, FK_LPLFormaPlatnosci, FK_LPLParent, FK_LPLZakLink | Relacje |
| OptimaMCP | Zestaw narzędzi | payroll_calculate, payroll_close, payroll_correct | Endpointy zapisu |

## Otwarte problemy i konflikty
- `LPL_Kategoria` (int) — słownik kategorii list do rozszyfrowania
- `LPL_MiesiecyWstecz` — niejasne zastosowanie (korekty historyczne?)
- Relacja z TypWyplata nie jest bezpośrednim FK — prawdopodobnie przez tabelę pośrednią
- `LPL_KPRId` — powiązanie z rejestrem KPiR, struktura do zbadania
- `LPL_Oddelegowani` — obsługa list dla pracowników oddelegowanych z osobną walutą i dietą

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.ListyPlac (55 kolumn, 1 rekord)
- [x] PK potwierdzony: LPL_LplId (int, IDENTITY)
- [x] Kolumna COMPUTED zidentyfikowana: LPL_NumerPelny
- [x] FK potwierdzone: FK_LPLDzlLink, FK_LPLFormaPlatnosci, FK_LPLParent, FK_LPLZakLink
- [x] Endpointy MCP WRITE zidentyfikowane: payroll_calculate, payroll_close, payroll_correct
- [ ] Endpointy WRITE do przetestowania
- [ ] Tabela TypWyplata — struktura i relacja do zbadania