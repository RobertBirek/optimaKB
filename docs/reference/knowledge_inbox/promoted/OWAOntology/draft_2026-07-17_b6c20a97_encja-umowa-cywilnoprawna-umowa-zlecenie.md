# Encja: Umowa cywilnoprawna / Umowa zlecenie
- draftId: `draft_2026-07-17_b6c20a97_encja-umowa-cywilnoprawna-umowa-zlecenie`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:48.254Z`
- tags: `OWA`, `ontologia`, `optima`, `umowa-zlecenie`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Umowa cywilnoprawna / Umowa zlecenie

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (pełny schemat potwierdzony przez `mssql_describe_table`)
- Identyfikator ontologiczny: `OWAOntology.UmowaZlecenie`
- Aliasy: `Umowy`, `UmowaCywilnoprawna`, `UmowaZlecenie`, `UmowaDzielo`, `Umowa`

## Opis biznesowy
Umowa cywilnoprawna reprezentuje umowę zlecenie, umowę o dzieło lub inną umowę cywilnoprawną zawartą z pracownikiem w Comarch Optima. Każda umowa należy do jednego pracownika (`UMW_PraId` → `PracKod.PRA_PraId`). Umowa definiuje typ ubezpieczenia (`UMW_TyuId` → `TytUbezp`), wartość brutto/netto, składki ZUS (emerytalna, rentowa, chorobowa, wypadkowa, zdrowotna) z datami obowiązywania, koszty uzyskania przychodu, stawkę podatku, oraz parametry przekroczenia limitu rocznego. Numer umowy jest generowany z funkcji skalarnej `FN_NUMERPELNY`.

## Reguły biznesowe
- Każda umowa należy do jednego pracownika (`UMW_PraId` → `PracKod.PRA_PraId`, FK CASCADE)
- Numer umowy: `UMW_NumerString` + `UMW_NumerNr` → COMPUTED `UMW_NumerPelny`
- Wartość umowy: `UMW_Wartosc`, `UMW_Brutto`, `UMW_Splacono`
- `UMW_WgBrutto` = 1 → kwota liczona od brutto
- Składki ZUS definiowane flagami: `UMW_JestEmerytal`, `UMW_JestRentowe`, `UMW_JestChorobowe`, `UMW_JestWypad`
- Okresy składek: odrębne daty `Od`/`Do` dla emerytalnej, rentowej, chorobowej, zdrowotnej
- Przekroczenie rocznej podstawy: `UMW_PrzekroczRok`, `UMW_PrzekroczMiesiac`, `UMW_PrzekroczKwota`
- `UMW_Rodzaj` (nvarchar(127)) — typ umowy (np. "Umowa zlecenie", "Umowa o dzieło")
- `UMW_KodZawodu` (varchar(7)) — kod zawodu do ZUS

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Podstawowa | CDN | Umowy | **Potwierdzona** | `mssql_describe_table` → PK=UMW_UmwId, 96 kolumn, 0 rekordów |
| Dodatki do umów | CDN | DodatkiUmowy | **Potwierdzona** | `mssql_list_tables` |
| Typy umów | CDN | TytUmowy | **Potwierdzona** | `mssql_list_tables` |
| Umowy B2B | CDN | UmowyB2B | Potwierdzona | `mssql_list_tables` |
| Tytuły ubezpieczenia | CDN | TytUbezp | Potwierdzona | FK UMW_TyuId → TytUbezp |
| Definicje dokumentów | CDN | DokDefinicje | Potwierdzona | FK UMW_DdfId → DokDefinicje |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | UMW_UmwId | Unikalny identyfikator umowy (int, IDENTITY) | **Potwierdzony** | MSSQL PK `UMW_Primary` |
| AK | UMW_NumerPelny | Numer pełny umowy (COMPUTED) | **Potwierdzony** | COMPUTED + indeks `UmwNumerPelny` UNIQUE |
| FK | UMW_PraId | Identyfikator pracownika | **Potwierdzony** | MSSQL FK `FK_UMWPraLink` (CASCADE) |

## Kluczowe pola Umowy
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | Umowy | UMW_UmwId | int (IDENTITY) | N | PK | Identyfikator umowy |
| 2 | CDN | Umowy | UMW_PraId | int | N | FK→PracKod | Identyfikator pracownika |
| 3 | CDN | Umowy | UMW_NumerPelny | nvarchar(30) | Y | AK | Pełny numer umowy (COMPUTED) |
| 4 | CDN | Umowy | UMW_DataDok | datetime | N | | Data dokumentu |
| 5 | CDN | Umowy | UMW_DataOd | datetime | N | | Data obowiązywania od |
| 6 | CDN | Umowy | UMW_DataDo | datetime | N | | Data obowiązywania do |
| 7 | CDN | Umowy | UMW_Wartosc | decimal(15,2) | N | | Wartość umowy netto |
| 8 | CDN | Umowy | UMW_Brutto | decimal(15,2) | N | | Wartość brutto |
| 9 | CDN | Umowy | UMW_Rodzaj | nvarchar(127) | N | | Rodzaj umowy (np. zlecenie, dzieło) |
| 10 | CDN | Umowy | UMW_StawkaPodatku | decimal(15,2) | N | | Stawka podatku |
| 11 | CDN | Umowy | UMW_KosztyKwota | decimal(15,2) | N | | Koszty uzyskania (kwota) |
| 12 | CDN | Umowy | UMW_KosztyProc | decimal(15,2) | N | | Koszty uzyskania (%) |
| 13 | CDN | Umowy | UMW_JestZUS | tinyint | N | | Podlega składkom ZUS |
| 14 | CDN | Umowy | UMW_TyuId | int | N | FK→TytUbezp | Tytuł ubezpieczenia |
| 15 | CDN | Umowy | UMW_KodZawodu | varchar(7) | Y | | Kod zawodu dla ZUS |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| nalezydo_pracownika | Umowa | Pracownik | N:1 | FK | Umowy.UMW_PraId = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_UMWPraLink (CASCADE) |
| ma_tytul_ubezpieczenia | Umowa | TytulUbezpieczenia | N:1 | FK | Umowy.UMW_TyuId = TytUbezp.TYU_TyuId | **Potwierdzona** | MSSQL FK FK_UMWTyuLink |
| ma_dodatki | Umowa | DodatkiUmowy | 1:N | Kompozycja | DodatkiUmowy → Umowy | Potwierdzona | MSSQL |
| powiazana_z_lista_plac | Umowa | ListaPlac | N:1 | Referencja | Umowy.UMW_ListaPlacSymbol | Potwierdzona | MSSQL indeks UMWLPLink |

## Endpointy OptimaMCP

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `create_contract_hr` | Tworzy dokument płacowy — Umowa Zlecenie (U) |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.Umowy (96 kolumn) | Pełny schemat tabeli |
| MSSQL (CDN_TEST) | FK constraints | FK_UMWPraLink, FK_UMWTyuLink, FK_UMWDdfLink, FK_UMWDzlLink | Relacje |
| OptimaMCP | Zestaw narzędzi | create_contract_hr | Endpoint zapisu |

## Otwarte problemy i konflikty
- `UMW_Rodzaj` jako nvarchar(127) bez osobnej tabeli słownikowej
- `UMW_KodZawodu` nullable — nie zawsze wymagane
- `UMW_Splacona` = 1 gdy umowa całkowicie rozliczona — do potwierdzenia
- Brak endpointu READ dla umów
- UmowyB2B — osobna tabela dla kontraktów B2B, do sprawdzenia czy współdzieli schemat

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.Umowy (96 kolumn)
- [x] PK potwierdzony: UMW_UmwId (int, IDENTITY)
- [x] Kolumna COMPUTED zidentyfikowana: UMW_NumerPelny = FN_NUMERPELNY([UMW_NumerNr],[UMW_NumerString])
- [x] FK potwierdzone: FK_UMWPraLink (PracKod, CASCADE), FK_UMWTyuLink (TytUbezp)
- [x] Endpoint MCP WRITE zidentyfikowany: create_contract_hr
- [ ] Endpoint WRITE do przetestowania
- [ ] Tabela UmowyB2B do zbadania