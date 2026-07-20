# Encja: Kompensata
- draftId: `draft_2026-07-17_05de1ce8_encja-kompensata`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.605Z`
- tags: `OWA`, `ontologia`, `optima`, `kompensata`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Kompensata

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.Kompensata`
- Aliasy: `KompensatyNag`, `KompensatyElem`, `Compensation`

## Opis biznesowy
Kompensata w Comarch Optima umożliwia wzajemne potrącenie należności i zobowiązań między kontrahentami. Gdy ten sam podmiot jest jednocześnie dłużnikiem i wierzycielem, kompensata pozwala rozliczyć oba rozrachunki bez przepływu środków pieniężnych. Nagłówek (`CDN.KompensatyNag`) zawiera dane ogólne, a elementy (`CDN.KompensatyElem`) wskazują konkretne rozrachunki objęte kompensatą. Kompensata może być powiązana z dekretem księgowym (KPN_DekID).

## Reguły biznesowe
- Kompensata rozlicza co najmniej dwa rozrachunki o przeciwnych znakach
- Nagłówek przechowuje konta Winien/Ma — `KPN_KontoWn`, `KPN_KontoMa`
- Kwota kompensaty `KPN_RazemKwotaRoz` (decimal 15,2)
- Numeracja dokumentu: `KPN_NumerNr` + `KPN_NumerString` → `KPN_NumerPelny` (computed)
- Numer obcy `KPN_NumerObcy` ma priorytet nad numerem własnym
- Kompensata jest przypisana do kategorii (`KPN_KatID` → `Kategorie`)
- Kompensata generuje dekret księgowy (`KPN_DekID` → `DekretyNag`)

## Źródła danych
| Rola źródła | Schemat | Tabela | PK | Stan | Dowód |
|---|---|---|---|---|---|
| Nagłówki kompensat | CDN | KompensatyNag | KPN_KPNID (int, IDENTITY) | Potwierdzona | MSSQL |
| Elementy kompensat | CDN | KompensatyElem | — | Potwierdzona | MSSQL CDN_TEST |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | settlement_compensate | POST /api/v1/settlements/compensate | Potwierdzone |

## Identyfikatory — KompensatyNag
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | KPN_KPNID | Unikalny identyfikator kompensaty (int, IDENTITY) | Potwierdzony |
| FK | KPN_DDfID | FK do DokDefinicje.DDf_DDfID | Potwierdzony |
| FK | KPN_PodmiotTyp + KPN_PodmiotID | FK do PodmiotyView | Potwierdzony |
| FK | KPN_KatID | FK do Kategorie.Kat_KatID | Potwierdzony |

## Kluczowe pola MSSQL — KompensatyNag
| Kolumna | Typ | Opis |
|---|---|---|
| KPN_KPNID | int (PK, IDENTITY) | ID kompensaty |
| KPN_NumerNr | int | Numer kolejny |
| KPN_NumerString | varchar(31) | Seria numeru |
| KPN_NumerPelny | nvarchar(30) (computed) | Pełny numer dokumentu |
| KPN_NumerObcy | nvarchar(256) | Numer obcy (nadrzędny) |
| KPN_DataDok | datetime | Data dokumentu |
| KPN_Waluta | varchar(3) | Kod waluty |
| KPN_KontoWn | varchar(50) | Konto Winien |
| KPN_KontoMa | varchar(50) | Konto Ma |
| KPN_RazemKwotaRoz | decimal(15,2) | Kwota kompensaty |
| KPN_DekID | int | FK do DekretyNag |
| KPN_PreDekID | int | FK do wstępnego dekretu |
| KPN_Opis | nvarchar(256) | Opis kompensaty |
| KPN_Kategoria | varchar(50) | Kod kategorii |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| kompensuje | KompensataElem | Rozrachunek | N:M | KompensatyElem → KsiRozrachunki |
| generuje_dekret | KompensataNag | DekretKsiegowy | 1:1 | KompensatyNag.KPN_DekID → DekretyNag |
| dotyczy_kontrahenta | KompensataNag | Kontrahent | N:1 | KompensatyNag → PodmiotyView |
| zawiera_elementy | KompensataNag | KompensataElem | 1:N | KompensatyElem → KompensatyNag |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | Pełny schemat KompensatyNag (32 kolumny, 4 FK, 9 indeksów) |
| OptimaMCP | settlement_compensate | API WRITE |

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15