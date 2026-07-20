# Encja: Deklaracja PIT
- draftId: `draft_2026-07-17_fcbb3b0d_encja-deklaracja-pit`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.668Z`
- tags: `OWA`, `ontologia`, `optima`, `deklaracja-pit`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Deklaracja PIT

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (wszystkie tabele potwierdzone przez `mssql_describe_table`)
- Identyfikator ontologiczny: `OWAOntology.DeklaracjaPIT`
- Aliasy: `DeklNag`, `DeklaracjaPodatkowa`, `PIT`, `TaxDeclaration`

## Opis biznesowy
Deklaracja PIT reprezentuje deklarację podatkową generowaną w Comarch Optima. System używa jednolitej struktury `CDN.DeklNag` (nagłówek) + `CDN.DeklElem` (elementy/pozycje) dla wszystkich typów deklaracji: PIT-11, PIT-4R, PIT-8A, PIT-8B, PIT-8C, PIT-40, PIT-R, IFT-1, a także deklaracji ZUS (DRA, RCA, RSA). Nagłówek zawiera dane podatnika (`DkN_PraID` → `PracKod`) lub kontrahenta (`DkN_KntId` → `Kontrahenci`), typ deklaracji (`DkN_TypDeklar`), okres (`DkN_RokMiesiac`), kwotę (COMPUTED), stan (zablokowana, finalna) oraz szczegóły e-deklaracji (referencja, status, podpis, UPO, operator). Tabele pomocnicze `CDN.PozDeklPIT` (91 rekordów) i `CDN.PozDeklZUS` (59 rekordów) definiują możliwe pozycje deklaracji.

## Reguły biznesowe
- Każda deklaracja ma nagłówek (`DeklNag`) i elementy (`DeklElem`)
- `DkN_TypDeklar` określa rodzaj deklaracji (PIT, ZUS, itp.)
- `DkN_RokMiesiac` — okres w formacie RRRRMM
- `DkN_Kwota` jest COMPUTED — wyliczana z `DeklElem`
- `DkN_Finalna` jest COMPUTED — wyznacza czy deklaracja jest ostateczna
- `DkN_Zablokowana` — 1 = zablokowana przed edycją
- Hierarchia deklaracji: `DkN_ParentId` dla korekt
- E-deklaracja: pola `DkN_EDekl_*` śledzą proces wysyłki do systemu e-Deklaracje MF
- Deklaracja może dotyczyć pracownika (`DkN_PraID`) lub kontrahenta (`DkN_KntId`)
- Współwłaściciel: `DkN_Pra2ID` → `PracKod`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek deklaracji | CDN | DeklNag | **Potwierdzona** | `mssql_describe_table` → PK=DkN_DkNID, 51 kolumn |
| Elementy deklaracji | CDN | DeklElem | **Potwierdzona** | `mssql_describe_table` → PK=DkE_DkEID, FK→DeklNag (CASCADE) |
| Wiersze tekstowe | CDN | DeklStr | **Potwierdzona** | `mssql_describe_table` → PK=DKS_DksId, FK→DeklNag (CASCADE) |
| Pozycje PIT | CDN | PozDeklPIT | **Potwierdzona** | `mssql_describe_table` → 91 rekordów definicji |
| Pozycje ZUS | CDN | PozDeklZUS | **Potwierdzona** | `mssql_describe_table` → 59 rekordów definicji |
| Kategorie deklaracji | CDN | DeklKedu | Potwierdzona | FK DkN_DkkId → DeklKedu |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | DkN_DkNID | Unikalny identyfikator deklaracji (int, IDENTITY) | **Potwierdzony** | MSSQL PK `DkN_Primary` |
| AK | DkN_PraID + DkN_KntId + DkN_TypDeklar + DkN_RokMiesiac + DkN_Data + DkN_Numer + DkN_ParentId + DkN_ConstNIP | Klucz unikalny podatnika | **Potwierdzony** | Indeks `DkNPodatnik` UNIQUE |
| AK | DkN_TypDeklar + DkN_RokMiesiac + DkN_Data + DkN_Numer + ... | Klucz unikalny okresu | **Potwierdzony** | Indeks `DkNRokMies` UNIQUE |
| FK | DkN_PraID | Identyfikator pracownika-podatnika | **Potwierdzony** | MSSQL FK FK_DkNPodatnik |
| FK | DkN_KntId | Identyfikator kontrahenta | **Potwierdzony** | MSSQL FK FK_DkNKontrahent |

## Kluczowe pola DeklNag
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | DeklNag | DkN_DkNID | int (IDENTITY) | N | PK | Identyfikator deklaracji |
| 2 | CDN | DeklNag | DkN_TypDeklar | smallint | N | | Typ deklaracji (PIT/ZUS) |
| 3 | CDN | DeklNag | DkN_RokMiesiac | int | N | | Okres (RRRRMM) |
| 4 | CDN | DeklNag | DkN_Data | datetime | Y | | Data deklaracji |
| 5 | CDN | DeklNag | DkN_Numer | int | N | | Numer deklaracji |
| 6 | CDN | DeklNag | DkN_PraID | int | Y | FK→PracKod | Identyfikator podatnika |
| 7 | CDN | DeklNag | DkN_KntId | int | Y | FK→Kontrahenci | Identyfikator kontrahenta |
| 8 | CDN | DeklNag | DkN_Kwota | decimal(15,2) | Y | COMPUTED | Kwota deklaracji |
| 9 | CDN | DeklNag | DkN_Finalna | int | Y | COMPUTED | Czy deklaracja jest finalna |
| 10 | CDN | DeklNag | DkN_Zablokowana | tinyint | N | | Status blokady |
| 11 | CDN | DeklNag | DkN_EDekl_RefID | nvarchar(240) | Y | | Referencja e-Deklaracji |
| 12 | CDN | DeklNag | DkN_EDekl_Status | int | Y | | Status wysyłki e-Deklaracji |
| 13 | CDN | DeklNag | DkN_EDekl_DataWyslania | datetime | Y | | Data wysłania |
| 14 | CDN | DeklNag | DkN_EDekl_DataOdebraniaUPO | datetime | Y | | Data UPO |
| 15 | CDN | DeklNag | DkN_Wersja | tinyint | N | | Wersja deklaracji |

## Struktura DeklElem (pozycje deklaracji)
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | Opis biznesowy |
|---:|---|---|---|---|---|---|
| 1 | CDN | DeklElem | DkE_DkEID | int (IDENTITY) | N | Identyfikator elementu |
| 2 | CDN | DeklElem | DkE_DkNID | int | N | FK→DeklNag (CASCADE) |
| 3 | CDN | DeklElem | DkE_Numer | int | N | Numer pozycji |
| 4 | CDN | DeklElem | DkE_WartoscL | decimal(15,2) | N | Wartość (licznik) |
| 5 | CDN | DeklElem | DkE_WartoscM | decimal(5,0) | N | Wartość (mianownik) |
| 6 | CDN | DeklElem | DkE_WartoscTekst | nvarchar(MAX) | N | Wartość tekstowa |
| 7 | CDN | DeklElem | DkE_Opis | nvarchar(254) | N | Opis pozycji |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| dotyczy_pracownika | Deklaracja | Pracownik | N:1 | FK | DeklNag.DkN_PraID = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_DkNPodatnik |
| dotyczy_kontrahenta | Deklaracja | Kontrahent | N:1 | FK | DeklNag.DkN_KntId = Kontrahenci.Knt_KntId | **Potwierdzona** | MSSQL FK FK_DkNKontrahent |
| ma_elementy | Deklaracja | DeklElem | 1:N | Kompozycja | DeklElem.DkE_DkNID = DeklNag.DkN_DkNID | **Potwierdzona** | MSSQL FK FK_DkEDeklNag (CASCADE) |
| ma_wiersze_tekstowe | Deklaracja | DeklStr | 1:N | Kompozycja | DeklStr.DKS_DknId = DeklNag.DkN_DkNID | **Potwierdzona** | MSSQL FK FK_DKSDknLink (CASCADE) |
| jest_korekta | Deklaracja | Deklaracja | N:1 | Hierarchia | DeklNag.DkN_ParentId = DeklNag.DkN_DkNID | Potwierdzona | MSSQL indeks DKNParentId |
| powiazana_z_lista_plac | ListaPlac | Deklaracja | N:1 | Referencja | ListyPlac.LPL_DekId = DeklNag.DkN_DkNID | Potwierdzona | MSSQL indeks LPlDekrety |

## Endpointy OptimaMCP

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `declaration_generate` | Generuje deklarację podatkową |
| `declaration_pit11` | Generuje PIT-11 |
| `declaration_pit4r` | Generuje PIT-4R |
| `declaration_sign` | Podpisuje deklarację |
| `declaration_send` | Wysyła deklarację do systemu e-Deklaracje |
| `declaration_dra` | Generuje deklarację ZUS DRA |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.DeklNag (51 kolumn) | Pełny schemat nagłówka |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.DeklElem (7 kolumn) | Pełny schemat elementów |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.DeklStr (4 kolumny) | Pełny schemat wierszy tekstowych |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PozDeklPIT (91 rekordów) | Definicje pozycji PIT |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PozDeklZUS (59 rekordów) | Definicje pozycji ZUS |
| OptimaMCP | Zestaw narzędzi | declaration_* | Endpointy generowania i wysyłki |

## Otwarte problemy i konflikty
- `DkN_TypDeklar` — wartości liczbowe odpowiadające typom deklaracji do rozszyfrowania
- `DkN_Kwota` jest COMPUTED z funkcji `KWOTADEKLARACJI` — logika funkcji nieznana
- `DkN_Finalna` jest COMPUTED z funkcji `DEKLFINALNA` — logika funkcji nieznana
- Jedna struktura `DeklNag` obsługuje zarówno PIT jak i ZUS — rozróżnienie przez `DkN_TypDeklar`
- Deklaracje ZUS (DRA/RCA/RSA) i PIT (11/4R/8A/8C/IFT) współdzielą tę samą tabelę

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela nagłówkowa potwierdzona: CDN.DeklNag (51 kolumn)
- [x] Tabela elementów potwierdzona: CDN.DeklElem (7 kolumn)
- [x] Tabela wierszy potwierdzona: CDN.DeklStr (4 kolumny)
- [x] Tabela definicji PIT potwierdzona: CDN.PozDeklPIT (91 rekordów)
- [x] FK potwierdzone: FK_DkNPodatnik, FK_DkNKontrahent, FK_DkEDeklNag, FK_DKSDknLink
- [x] Endpointy MCP WRITE zidentyfikowane: 6 endpointów declaration_*
- [ ] Endpointy WRITE do przetestowania
- [ ] Funkcje COMPUTED do zbadania (KWOTADEKLARACJI, DEKLFINALNA)