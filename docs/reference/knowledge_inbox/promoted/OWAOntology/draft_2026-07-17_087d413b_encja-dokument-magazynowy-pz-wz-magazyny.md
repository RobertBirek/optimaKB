# Encja: Dokument magazynowy (PZ, WZ, magazyny)
- draftId: `draft_2026-07-17_087d413b_encja-dokument-magazynowy-pz-wz-magazyny`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.895Z`
- tags: `OWA`, `ontologia`, `optima`, `dokument-magazynowy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Dokument magazynowy (PZ, WZ, magazyny)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.DokumentMagazynowy`
- Aliasy: `PZ`, `WZ`, `Magazyny`, `WarehouseDocument`, `StockMovement`

## Opis biznesowy
Encja dokumentu magazynowego obejmuje magazyny (`CDN.Magazyny`), stany magazynowe (`CDN.TwrIlosci`, `CDN.TwrZasoby`) oraz dokumenty przyjęcia (PZ) i wydania (WZ), które są rejestrowane jako szczególne typy dokumentów handlowych w `CDN.TraNag`. Magazyny stanowią fizyczne i logiczne miejsca przechowywania towarów, a dokumenty PZ/WZ zmieniają stany magazynowe — przyjęcie zwiększa dostępną ilość, wydanie zmniejsza.

## Reguły biznesowe
- Każdy magazyn identyfikowany przez `Mag_MagId` (int, IDENTITY), kodowany przez `Mag_Kod`
- Stan magazynowy towaru w magazynie przechowywany w `CDN.TwrIlosci` (TwI_Ilosc)
- Zasoby (`CDN.TwrZasoby`) uwzględniają dodatkowe wymiary (partia, data ważności)
- PZ (Przyjęcie Zewnętrzne) i WZ (Wydanie Zewnętrzne) są typami dokumentów w `TraNag` — ich kody `DDf_Typ` wymagają potwierdzenia
- Dokument magazynowy w buforze (`TrN_Bufor` = 1) nie zmienia stanów magazynowych
- Anulowanie dokumentu magazynowego (`TrN_Anulowany` = 1) odwraca zmiany stanów

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Magazyny | CDN | Magazyny | Potwierdzona | MSSQL CDN_TEST |
| Stany magazynowe | CDN | TwrIlosci | Potwierdzona | MSSQL CDN_TEST |
| Zasoby | CDN | TwrZasoby | Potwierdzona | MSSQL CDN_TEST |
| Dokumenty PZ/WZ | CDN | TraNag (+ TraElem) | Potwierdzona | MSSQL — przez typ dokumentu |
| Definicje typów | CDN | DokDefinicje | Potwierdzona | MSSQL |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK (magazyn) | Mag_MagId | Identyfikator magazynu (int, IDENTITY) | Potwierdzony | MSSQL |
| Naturalny | Mag_Kod | Kod magazynu | Potwierdzony | MSSQL |
| FK | TwI_TwrId | FK do Towary | Potwierdzony | MSSQL |
| FK | TwI_MagId | FK do Magazyny | Potwierdzony | MSSQL |
| FK | TwZ_TwrId | FK do Towary | Potwierdzony | MSSQL |
| FK | TwZ_MagId | FK do Magazyny | Potwierdzony | MSSQL |

## Pola i mapowanie API ↔ MSSQL — Magazyny
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | Magazyny | Mag_MagId | int | N | PK | Unikalny identyfikator magazynu (IDENTITY) | Potwierdzone |
| 2 | CDN | Magazyny | Mag_Kod | nvarchar | Y | | Kod magazynu | Potwierdzone |
| 3 | CDN | Magazyny | Mag_Nazwa | nvarchar | Y | | Nazwa magazynu | Potwierdzone |

## Pola i mapowanie API ↔ MSSQL — TwrIlosci (stany)
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | TwrIlosci | TwI_TwrId | int | N | FK | FK do Towary | Potwierdzone |
| 2 | CDN | TwrIlosci | TwI_MagId | int | N | FK | FK do Magazyny | Potwierdzone |
| 3 | CDN | TwrIlosci | TwI_Ilosc | decimal | Y | | Ilość w magazynie | Potwierdzone |

## Pola i mapowanie API ↔ MSSQL — TwrZasoby (zasoby)
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | TwrZasoby | TwZ_TwrId | int | N | FK | FK do Towary | Potwierdzone |
| 2 | CDN | TwrZasoby | TwZ_MagId | int | N | FK | FK do Magazyny | Potwierdzone |
| 3 | CDN | TwrZasoby | TwZ_Ilosc | decimal | Y | | Ilość zasobu | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| przechowuje_towar | Magazyn | Towar | N:M | Asocjacja | Przez TwrIlosci (TwI_MagId, TwI_TwrId) | Potwierdzona | MSSQL FK |
| ma_zasob | Magazyn | TwrZasob | 1:N | Kompozycja | TwrZasoby.TwZ_MagId = Magazyny.Mag_MagId | Potwierdzona | MSSQL FK |
| jest_dokumentem | DokumentMagazynowy | TraNag | IS_A | Dziedziczenie | TraNag.TrN_DDfId → DokDefinicje (typ PZ/WZ) | Potwierdzona | MSSQL |

## Endpointy OptimaMCP
[NOT EXPOSED BY MCP: brak narzędzi OptimaMCP w dostępnym zestawie]

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.Magazyny | Schemat magazynów |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.TwrIlosci | Schemat stanów |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.TwrZasoby | Schemat zasobów |
| OptimaKB | OpenSPG | ComarchOptimaSchema | Relacje i struktura |

## Otwarte problemy i konflikty
- [UNKNOWN: kody typów dokumentów dla PZ i WZ w DokDefinicje — do potwierdzenia]
- [UNKNOWN: czy istnieją osobne tabele dla PZ/WZ, czy tylko TraNag + typ?]
- [UNKNOWN: różnice między TwrIlosci a TwrZasoby — wpływ partii, rezerwacji]
- [UNKNOWN: czy Optima używa modelu FIFO/LIFO i gdzie jest to konfigurowane]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabele potwierdzone w MSSQL (Magazyny, TwrIlosci, TwrZasoby)
- [x] Klucze główne potwierdzone (Mag_MagId)
- [x] Relacje FK potwierdzone
- [ ] Kody typów PZ/WZ do potwierdzenia
- [ ] Struktura dodatkowych wymiarów zasobów (partia, data ważności) do analizy
- [ ] API/MCP endpoints — brak dostępnych narzędzi