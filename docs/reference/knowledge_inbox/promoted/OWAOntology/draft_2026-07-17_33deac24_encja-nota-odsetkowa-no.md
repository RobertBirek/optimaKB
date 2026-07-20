# Encja: Nota Odsetkowa NO
- draftId: `draft_2026-07-17_33deac24_encja-nota-odsetkowa-no`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.185Z`
- tags: `OWA`, `ontologia`, `optima`, `nota-odsetkowa`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Nota Odsetkowa NO

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.NotaOdsetkowa`
- Aliasy: `NotyOdsNag`, `NotyOdsElem`, `InterestNote`

## Opis biznesowy
Nota odsetkowa (NO) w Comarch Optima nalicza odsetki od przeterminowanych należności. Dokument składa się z nagłówka (`CDN.NotyOdsNag`) i elementów (`CDN.NotyOdsElem`). Nota odsetkowa jest wystawiana na kontrahenta, ma określoną stopę odsetek (`NON_OdsetkiStopa`) i typ naliczania (`NON_OdsetkiTyp`). Po zaksięgowaniu generuje dekret (`NON_DekId`) i może mieć wersję wstępną (`NON_PreDekId`). Nota podlega standardowej numeracji dokumentów Optimy.

## Reguły biznesowe
- Odsetki naliczane od kwoty przeterminowanej — `NON_RazemOdsetki`
- Stopa odsetek — `NON_OdsetkiStopa` (decimal 7,2)
- Typ naliczania odsetek — `NON_OdsetkiTyp` (tinyint)
- Nota ma kwotę dokumentu (`NON_RazemKwota`) i kwotę odsetek (`NON_RazemOdsetki`)
- Kwota systemowa przechowywana osobno — `NON_RazemKwotaSys`, `NON_RazemOdsetkiSys`
- Obsługa walut — `NON_Waluta`, `NON_KursNumer`, `NON_KursL`, `NON_KursM`
- Nota może być buforem — `NON_Bufor` (smallint)
- Generuje dekret księgowy — `NON_DekId` → `DekretyNag`

## Źródła danych
| Rola źródła | Schemat | Tabela | PK | Stan | Dowód |
|---|---|---|---|---|---|
| Nagłówki not odsetkowych | CDN | NotyOdsNag | NON_NONId (int, IDENTITY) | Potwierdzona | MSSQL |
| Elementy not odsetkowych | CDN | NotyOdsElem | — | Do potwierdzenia | — |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_interest_note | POST /api/v1/tax/interest-note | Potwierdzone |
| WRITE | settlement_interest_note | POST /api/v1/settlements/interest-note | Potwierdzone |

## Identyfikatory — NotyOdsNag
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | NON_NONId | Unikalny identyfikator noty (int, IDENTITY) | Potwierdzony |
| FK | NON_DDfId | FK do DokDefinicje.DDf_DDfID | Potwierdzony |
| FK | NON_PodmiotTyp + NON_PodmiotID | FK do PodmiotyView | Potwierdzony |
| FK | NON_KatID | FK do Kategorie.Kat_KatID | Potwierdzony |
| FK | NON_FPlId | FK do FormyPlatnosci.FPl_FPlId | Potwierdzony |

## Kluczowe pola MSSQL — NotyOdsNag
| Kolumna | Typ | Opis |
|---|---|---|
| NON_NONId | int (PK, IDENTITY) | ID noty |
| NON_Bufor | smallint | Status bufora |
| NON_NumerNr | int | Numer kolejny |
| NON_NumerString | varchar(31) | Seria numeru |
| NON_NumerPelny | nvarchar(30) (computed) | Pełny numer |
| NON_DataDok | datetime | Data dokumentu |
| NON_OdsetkiTyp | tinyint | Typ naliczania odsetek |
| NON_OdsetkiStopa | decimal(7,2) | Stopa odsetek |
| NON_RazemKwota | decimal(15,2) | Kwota dokumentu (waluta) |
| NON_RazemKwotaSys | decimal(15,2) | Kwota dokumentu (systemowa) |
| NON_RazemOdsetki | decimal(15,2) | Odsetki (waluta) |
| NON_RazemOdsetkiSys | decimal(15,2) | Odsetki (systemowa) |
| NON_Termin | datetime | Termin płatności |
| NON_Waluta | varchar(3) | Kod waluty |
| NON_KursL | decimal(15,4) | Kurs waluty (licznik) |
| NON_KursM | decimal(5,0) | Kurs waluty (mianownik) |
| NON_DekId | int | FK do DekretyNag |
| NON_PreDekId | int | FK do wstępnego dekretu |
| NON_Uwagi | nvarchar(254) | Uwagi |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| dotyczy_kontrahenta | NotaOdsetkowa | Kontrahent | N:1 | NotyOdsNag → PodmiotyView |
| generuje_dekret | NotaOdsetkowa | DekretKsiegowy | 1:1 | NotyOdsNag.NON_DekId → DekretyNag |
| uzywa_formy_platnosci | NotaOdsetkowa | FormaPlatnosci | N:1 | NotyOdsNag.NON_FPlId → FormyPlatnosci |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | Pełny schemat NotyOdsNag (36 kolumn, 5 FK, 9 indeksów) |
| OptimaMCP | create_interest_note, settlement_interest_note | API WRITE |

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15