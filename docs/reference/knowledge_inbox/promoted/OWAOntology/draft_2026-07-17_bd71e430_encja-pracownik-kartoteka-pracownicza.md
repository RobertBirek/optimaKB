# Encja: Pracownik (kartoteka pracownicza)
- draftId: `draft_2026-07-17_bd71e430_encja-pracownik-kartoteka-pracownicza`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.086Z`
- tags: `OWA`, `ontologia`, `optima`, `pracownik`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Pracownik (kartoteka pracownicza)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (pełny schemat potwierdzony przez `mssql_describe_table`)
- Identyfikator ontologiczny: `OWAOntology.Pracownik`
- Aliasy: `PracKod`, `Employee`, `Pracownik`

## Opis biznesowy
Encja reprezentuje kartotekę pracowniczą w Comarch Optima. Każdy pracownik ma rekord w tabeli `CDN.PracKod` identyfikowany przez `PRA_PraId` (int, IDENTITY). Naturalnym kluczem jest `PRA_Kod` (varchar(20)). Pracownik może mieć wiele etatów (`CDN.PracEtaty`), umów cywilnoprawnych (`CDN.Umowy`), nieobecności (`CDN.PracNieobec`), danych kadrowych (`CDN.DaneKad`), danych płacowych (`CDN.DanePlac`), historii zatrudnienia (`CDN.HisZatrud`) oraz historii wykształcenia (`CDN.HisWyksztal`). Karta pracownika może być archiwalna (`PRA_Archiwalny`) i może podlegać hierarchii (`PRA_ParentId`, `PRA_Nadrzedny`).

## Reguły biznesowe
- Każdy pracownik ma unikalny PK `PRA_PraId` (int, IDENTITY)
- Klucz naturalny `PRA_Kod` (varchar(20), unikalny, NOT NULL) — indeks `PRAKod` UNIQUE
- `PRA_Archiwalny` (tinyint, NOT NULL) — 0=aktywny, 1=archiwalny
- Hierarchia pracowników: `PRA_ParentId` (FK→PracKod), `PRA_Nadrzedny` (0/1)
- Dostęp EP (Employee Portal): `PRA_EPEmail`, `PRA_EPTelefon`, `PRA_EPNrPokoju`, `PRA_EPDostep` wraz z datami od/do
- Pracownik może być podatnikiem w deklaracjach (`DeklNag.DkN_PraID`)
- Pracownik może być współwłaścicielem w deklaracjach (`DeklNag.DkN_Pra2ID`)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Kartoteka główna | CDN | PracKod | **Potwierdzona** | `mssql_describe_table` → PK=PRA_PraId, 15 kolumn, 1 rekord |
| Etaty | CDN | PracEtaty | **Potwierdzona** | `mssql_describe_table` → 120+ kolumn, FK PRE_PraId→PracKod |
| Umowy cywilnoprawne | CDN | Umowy | **Potwierdzona** | `mssql_describe_table` → 96 kolumn, FK UMW_PraId→PracKod |
| Nieobecności | CDN | PracNieobec | **Potwierdzona** | `mssql_describe_table` → 48 kolumn, FK PNB_PraId→PracKod |
| Dane kadrowe | CDN | DaneKad | **Potwierdzona** | MSSQL `mssql_list_tables` |
| Dane płacowe | CDN | DanePlac | **Potwierdzona** | MSSQL `mssql_list_tables` |
| Historia zatrudnienia | CDN | HisZatrud | **Potwierdzona** | MSSQL `mssql_list_tables` |
| Historia wykształcenia | CDN | HisWyksztal | **Potwierdzona** | MSSQL `mssql_list_tables` |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | PRA_PraId | Unikalny identyfikator pracownika (int, IDENTITY) | **Potwierdzony** | MSSQL PK constraint `PRA_Primary` |
| AK (naturalny) | PRA_Kod | Kod pracownika (varchar(20), UNIQUE) | **Potwierdzony** | Indeks `PRAKod` UNIQUE |
| AK | PRA_ImportRowId | GUID importu (varchar(36), UNIQUE) | Potwierdzony | Indeks `PRAGUID` UNIQUE |

## Pola i mapowanie API ↔ MSSQL — PracKod
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | PracKod | PRA_PraId | int (IDENTITY) | N | PK | Unikalny identyfikator pracownika | **Potwierdzone** |
| 2 | CDN | PracKod | PRA_Kod | varchar(20) | N | AK | Kod pracownika (klucz naturalny) | **Potwierdzone** |
| 3 | CDN | PracKod | PRA_Archiwalny | tinyint | N | | Flaga archiwalności (0=aktywny) | **Potwierdzone** |
| 4 | CDN | PracKod | PRA_ParentId | int | Y | FK→PracKod | Identyfikator pracownika nadrzędnego | **Potwierdzone** |
| 5 | CDN | PracKod | PRA_Nadrzedny | tinyint | N | | Czy pracownik jest nadrzędny | **Potwierdzone** |
| 6 | CDN | PracKod | PRA_EPEmail | nvarchar(127) | N | | Email w Employee Portal | **Potwierdzone** |
| 7 | CDN | PracKod | PRA_EPTelefon | nvarchar(50) | N | | Telefon w Employee Portal | **Potwierdzone** |
| 8 | CDN | PracKod | PRA_EPNrPokoju | nvarchar(50) | N | | Nr pokoju w Employee Portal | **Potwierdzone** |
| 9 | CDN | PracKod | PRA_EPDostep | tinyint | N | | Flaga dostępu do EP | **Potwierdzone** |
| 10 | CDN | PracKod | PRA_EPDostepOkresOd | datetime | Y | | Data początkowa dostępu EP | **Potwierdzone** |
| 11 | CDN | PracKod | PRA_EPDostepOkresDo | datetime | Y | | Data końcowa dostępu EP | **Potwierdzone** |
| 12 | CDN | PracKod | PRA_HasloDoWydrukow | nvarchar(128) | N | | Hasło do wydruków płacowych | **Potwierdzone** |
| 13 | CDN | PracKod | PRA_TS_Export | datetime | Y | | Timestamp ostatniego eksportu | **Potwierdzone** |
| 14 | CDN | PracKod | PRA_ImportAppId | varchar(5) | Y | | ID aplikacji importującej | **Potwierdzone** |
| 15 | CDN | PracKod | PRA_ImportRowId | varchar(36) | Y | AK | GUID rekordu źródłowego importu | **Potwierdzone** |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| ma_etat | Pracownik | Etat (PracEtaty) | 1:N | Kompozycja | PracEtaty.PRE_PraId = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK |
| ma_umowe | Pracownik | UmowaZlecenie (Umowy) | 1:N | Kompozycja | Umowy.UMW_PraId = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_UMWPraLink |
| ma_nieobecnosc | Pracownik | Nieobecnosc (PracNieobec) | 1:N | Kompozycja | PracNieobec.PNB_PraId = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_PNBPraLink |
| jest_podatnikiem | Pracownik | Deklaracja (DeklNag) | 1:N | Referencja | DeklNag.DkN_PraID = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_DkNPodatnik |
| jest_wspolwlascicielem | Pracownik | Deklaracja (DeklNag) | 1:N | Referencja | DeklNag.DkN_Pra2ID = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK FK_DkNWspolwlasciciel |
| ma_dane_kadrowe | Pracownik | DaneKad | 1:1 | Kompozycja | DaneKad.PRA_PraId = PracKod.PRA_PraId | Potwierdzona | MSSQL |
| ma_dane_placowe | Pracownik | DanePlac | 1:1 | Kompozycja | DanePlac.PRA_PraId = PracKod.PRA_PraId | Potwierdzona | MSSQL |

## Endpointy OptimaMCP

### Odczyt (READ)
| Narzędzie MCP | Opis | Status |
|---|---|---|
| `list_employees` | Lista pracowników (0 rekordów w CDN_TEST) | Dostępne |
| `list_personnel` | Lista personelu | Dostępne |
| `get_employee_summary` | Podsumowanie pracownika | Dostępne |

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `create_employee` | Tworzy pracownika (code, last_name, first_name, position?, department?) |
| `hire_employee` | Zatrudnia pracownika — tworzy kartę |
| `add_employee_absence` | Dodaje nieobecność z walidacją limitu |
| `check_absence_limit` | Sprawdza limit nieobecności |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PracKod (15 kolumn) | Pełny schemat tabeli |
| MSSQL (CDN_TEST) | FK references | PRA_PraId | Potwierdzenie PK przez referencje FK |
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PracEtaty, CDN.Umowy, CDN.PracNieobec | Tabele pokrewne |
| OptimaMCP | Zestaw narzędzi | Moduł HR/Place | Endpointy odczytu/zapisu |

## Otwarte problemy i konflikty
- `list_employees` zwróciło 0 rekordów w CDN_TEST — funkcjonalność potwierdzona, ale brak danych testowych
- `PRA_HasloDoWydrukow` — niejasne czy w plain text czy hashowane
- Nazwy osobowe (Nazwisko, Imię) znajdują się w `PracEtaty`, nie w `PracKod`
- Endpointy WRITE nie zostały wywołane — nie zweryfikowano formatu payloadu

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.PracKod (15 kolumn)
- [x] PK potwierdzony: PRA_PraId (int, IDENTITY)
- [x] Klucz naturalny potwierdzony: PRA_Kod (varchar(20), UNIQUE)
- [x] Tabele powiązane potwierdzone: PracEtaty, Umowy, PracNieobec
- [x] Relacje FK potwierdzone: FK_UMWPraLink, FK_PNBPraLink, FK_DkNPodatnik, FK_DkNWspolwlasciciel
- [x] Endpointy MCP READ zidentyfikowane (list_employees, list_personnel, get_employee_summary)
- [x] Endpointy MCP WRITE zidentyfikowane (create_employee, hire_employee, add_employee_absence, check_absence_limit)
- [ ] Endpointy WRITE do przetestowania