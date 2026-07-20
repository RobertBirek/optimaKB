# Encja: Etat / Zatrudnienie
- draftId: `draft_2026-07-17_50e9fce6_encja-etat-zatrudnienie`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.959Z`
- tags: `OWA`, `ontologia`, `optima`, `etat-zatrudnienie`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Etat / Zatrudnienie

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (pełny schemat potwierdzony przez `mssql_describe_table`)
- Identyfikator ontologiczny: `OWAOntology.EtatZatrudnienie`
- Aliasy: `PracEtaty`, `Employment`, `Etat`, `Zatrudnienie`

## Opis biznesowy
Etat reprezentuje stosunek pracy pracownika w Comarch Optima. Każdy etat przechowuje dane osobowe, adresowe (stałego zameldowania, korespondencyjny, zamieszkania), dane dokumentu tożsamości, parametry wynagrodzenia (stawka, wymiar etatu), informacje podatkowe (koszty uzyskania, ulgi, urząd skarbowy), składki ZUS oraz parametry umowy o pracę. Tabela `CDN.PracEtaty` jest jedną z największych w systemie — zawiera ponad 120 kolumn.

## Reguły biznesowe
- Każdy etat należy do jednego pracownika (`PRE_PraId` → `PracKod.PRA_PraId`)
- Data rozpoczęcia: `PRE_DataOd`, data zakończenia: `PRE_DataDo`
- Daty zatrudnienia: `PRE_ZatrudnionyOd`, `PRE_ZatrudnionyDo`
- Wymiar etatu: `PRE_ETAWymiar` (np. 1/1, 1/2), stawka `PRE_ETAStawka`
- Koszty uzyskania: `PRE_PODMnoznikKoszty`, `PRE_PODProcKosztyUzysk`
- Ulga podatkowa: `PRE_PODMnoznikUlga`, `PRE_UlgaMnoznikL`, `PRE_UlgaMnoznikM`
- Urząd skarbowy: `PRE_PODUrzSkarbId`
- Dane adresowe w trzech wariantach: Meldunkowy (MLD), Korespondencyjny (KOR), Zamieszkania (ZAM)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Podstawowa | CDN | PracEtaty | **Potwierdzona** | `mssql_describe_table` → PK=PRE_PreId, 120+ kolumn, 0 rekordów |
| Pracownik | CDN | PracKod | **Potwierdzona** | FK PRE_PraId → PracKod.PRA_PraId |
| Działy | CDN | Dzialy | Potwierdzona | FK PRE_DzlId → Dzialy |
| Centra kosztów | CDN | — | Potwierdzona | FK PRE_CntId |
| Kalendarze | CDN | Kalendarze | Potwierdzona | FK PRE_KalId |
| Formy płatności | CDN | FormyPlatnosci | Potwierdzona | FK PRE_FplId |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | PRE_PreId | Unikalny identyfikator etatu (int, IDENTITY) | **Potwierdzony** | MSSQL PK `PRE_Primary` |
| FK | PRE_PraId | Identyfikator pracownika | **Potwierdzony** | MSSQL FK |

## Kluczowe pola PracEtaty
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | PracEtaty | PRE_PreId | int (IDENTITY) | N | PK | Identyfikator etatu |
| 2 | CDN | PracEtaty | PRE_PraId | int | N | FK→PracKod | Identyfikator pracownika |
| 3 | CDN | PracEtaty | PRE_Kod | varchar(20) | N | | Kod etatu |
| 4 | CDN | PracEtaty | PRE_Nazwisko | nvarchar(40) | N | | Nazwisko |
| 5 | CDN | PracEtaty | PRE_Imie1 | nvarchar(30) | N | | Pierwsze imię |
| 6 | CDN | PracEtaty | PRE_Pesel | nvarchar(11) | N | | PESEL |
| 7 | CDN | PracEtaty | PRE_DataOd | datetime | N | | Data rozpoczęcia okresu |
| 8 | CDN | PracEtaty | PRE_DataDo | datetime | N | | Data zakończenia okresu |
| 9 | CDN | PracEtaty | PRE_ETARodzajZatrudnienia | int | N | | Rodzaj zatrudnienia |
| 10 | CDN | PracEtaty | PRE_ETAStawka | decimal(15,2) | N | | Stawka wynagrodzenia |
| 11 | CDN | PracEtaty | PRE_ETAWymiar | tinyint | N | | Wymiar etatu |
| 12 | CDN | PracEtaty | PRE_RachunekNr | nvarchar(51) | N | | Numer rachunku bankowego |
| 13 | CDN | PracEtaty | PRE_WypNaKonto | tinyint | N | | Wypłata na konto (0/1) |
| 14 | CDN | PracEtaty | PRE_PODMnoznikKoszty | decimal(15,2) | N | | Mnożnik kosztów uzyskania |
| 15 | CDN | PracEtaty | PRE_PODMnoznikUlga | decimal(15,2) | N | | Mnożnik ulgi podatkowej |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| nalezydo_pracownika | Etat | Pracownik | N:1 | FK | PracEtaty.PRE_PraId = PracKod.PRA_PraId | **Potwierdzona** | MSSQL FK |
| przypisany_do_dzialu | Etat | Dzial | N:1 | FK | PracEtaty.PRE_DzlId = Dzialy.DZL_DzlId | Potwierdzona | MSSQL schema |
| ma_forme_platnosci | Etat | FormaPlatnosci | N:1 | FK | PracEtaty.PRE_FplId = FormyPlatnosci.FPl_FPlId | Potwierdzona | MSSQL schema |

## Endpointy OptimaMCP

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `create_employment` | Tworzy dokument płacowy — Etat (E) |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | `mssql_describe_table` | CDN.PracEtaty (120+ kolumn) | Pełny schemat tabeli |
| OptimaMCP | Zestaw narzędzi | create_employment | Endpoint zapisu |

## Otwarte problemy i konflikty
- [UNKNOWN: pola słownikowe `PRE_ETARodzajZatrudnienia`, `PRE_TypPracownika` — kody do rozszyfrowania]
- Brak endpointu READ dla etatów — tylko `create_employment` (WRITE)
- Dane osobowe (nazwisko, imię, PESEL) powtórzone w PracEtaty — czy są synchronizowane z PracKod?

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.PracEtaty (120+ kolumn)
- [x] PK potwierdzony: PRE_PreId (int, IDENTITY)
- [x] FK potwierdzony: PRE_PraId → PracKod.PRA_PraId
- [x] Endpoint MCP WRITE zidentyfikowany: create_employment
- [ ] Endpoint WRITE do przetestowania
- [ ] Wartości słownikowe do rozszyfrowania