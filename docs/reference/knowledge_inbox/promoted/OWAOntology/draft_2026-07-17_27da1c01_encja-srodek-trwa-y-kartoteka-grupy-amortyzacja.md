# Encja: Środek trwały (kartoteka, grupy, amortyzacja)
- draftId: `draft_2026-07-17_27da1c01_encja-srodek-trwa-y-kartoteka-grupy-amortyzacja`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.833Z`
- tags: `OWA`, `ontologia`, `optima`, `srodek-trwaly`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Środek trwały (kartoteka, grupy, amortyzacja)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (tabela potwierdzona w MSSQL, pola zweryfikowane przez MCP)
- Identyfikator ontologiczny: `OWAOntology.SrodekTrwaly`
- Aliasy: `ST`, `FixedAsset`, `Asset`, `ŚrodkiTrwałe`, `Trwale`

## Opis biznesowy
Środek trwały to składnik majątku firmy o przewidywanym okresie użytkowania powyżej 1 roku i wartości przekraczającej ustalony próg. Kartoteka umożliwia rejestrację, grupowanie (klasyfikacja KŚT/GUS), naliczanie amortyzacji (liniowa, degresywna), ewidencję zmian wartości (ulepszenia, przeszacowania) oraz likwidację.

## Reguły biznesowe
- Każdy środek trwały podlega klasyfikacji wg `SrT_Kategoria` / `SrT_KRST` (KŚT)
- Amortyzacja naliczana wg metody (`SrT_Metoda` — podatkowa / `SrT_MetodaBil` — bilansowa), stawki (`SrT_Stawka` / `SrT_StawkaBil`), współczynnika (`SrT_Wspolczynnik`)
- `SrT_Sezonowy` = 1 oznacza amortyzację sezonową (tylko w wybranych miesiącach)
- `SrT_ZawieszenieAmo*` blokuje naliczanie amortyzacji podatkowej/bilansowej
- `SrT_WBudowie` = 1 — środek w budowie, nie podlega amortyzacji
- `SrT_Stan` określa stan: 0=aktywny, 1=zlikwidowany, 2=sprzedany (do potwierdzenia)
- Wartość początkowa: `SrT_WartoscBilan` (bilansowa) / `SrT_WartoscKoszt` (kosztowa)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Główna kartoteka | CDN | Trwale | **Potwierdzona** | `mssql_describe_table` CDN.Trwale → PK=SrT_SrTID, 69 kolumn |
| Historia | CDN | TrwaleHist | **Potwierdzona** | `mssql_list_tables` |
| Części składowe | CDN | TrwaleCzesci | **Potwierdzona** | `mssql_list_tables` |
| Atrybuty rozszerzone | CDN | TrwaleAtrybuty | **Potwierdzona** | `mssql_list_tables` |
| Powiązania | CDN | TrwalePowiazania | **Potwierdzona** | `mssql_list_tables` |
| Miejsca użytkowania | CDN | TrwaleMiejscaUzytkowania | **Potwierdzona** | `mssql_list_tables` |
| Osoby odpowiedzialne | CDN | TrwaleOsobyOdpowiedzialne | **Potwierdzona** | `mssql_list_tables` |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | SrT_SrTID (int, IDENTITY) | Klucz główny środka trwałego | Potwierdzony | `mssql_describe_table` |
| AK | SrT_NrInwent (varchar(20)) | Numer inwentarzowy | Potwierdzony | `mssql_describe_table`, indeks unikalny |
| AK | SrT_KodKreskowy (varchar(128)) | Kod kreskowy | Potwierdzony | `mssql_describe_table`, indeks unikalny |
| AK | (SrT_Typ, SrT_Grupa, SrT_Lp) | Klucz alternatywny: typ+grupa+lp | Potwierdzony | `mssql_describe_table`, indeks SrTLp |

## Pola i mapowanie API ↔ MSSQL
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | MCP (list_fixed_assets) |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | Trwale | SrT_SrTID | int (IDENTITY) | NO | PK | ID środka trwałego | `id` |
| 2 | CDN | Trwale | SrT_NrInwent | varchar(20) | NO | AK | Numer inwentarzowy | `inventoryNumber` |
| 3 | CDN | Trwale | SrT_Nazwa | nvarchar(256) | NO | | Nazwa środka trwałego | `name` |
| 4 | CDN | Trwale | SrT_WartoscBilan | decimal(15,2) | NO | | Wartość początkowa bilansowa | `initialValue` |
| 5 | CDN | Trwale | SrT_Stawka | decimal(5,2) | NO | | Stawka amortyzacji podatkowa (%) | `depreciationRate` |
| 6 | CDN | Trwale | SrT_DataZak | datetime | NO | | Data przyjęcia/nabycia | `acquisitionDate` |
| 7 | CDN | Trwale | SrT_Dokument | varchar(30) | NO | | Numer dokumentu OT/PT | `serialNumber` |
| 8 | CDN | Trwale | SrT_KatID | int | YES | FK→Kategorie | ID grupy (kategorii) | `groupId` |
| 9 | CDN | Trwale | SrT_Kategoria | varchar(50) | NO | | Nazwa grupy/kategorii | `groupName` |
| 10 | CDN | Trwale | SrT_Stan | tinyint | NO | | Stan: 0=aktywny, 1+ = nieaktywny | `isActive` |
| 11 | CDN | Trwale | SrT_TS_Mod | datetime | NO | | Ostatnia modyfikacja | `updatedAt` |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| należy_do_grupy | SrodekTrwaly | GrupaTowarowa (Kategorie) | N:1 | FK | SrT_KatID → Kat_KatID | Potwierdzona | `mssql_describe_table` FK_SrTKategoria |
| przypisany_do | SrodekTrwaly | Pracownik | N:1 | FK | SrT_PrcID → PRA_PraId | Potwierdzona | `mssql_describe_table` FK_SrTPracownik |
| ma_historię | SrodekTrwaly | TrwaleHist | 1:N | referencyjna | SrT_SrTID → TrwaleHist | Potwierdzona | `mssql_list_tables` |
| ma_części | SrodekTrwaly | TrwaleCzesci | 1:N | referencyjna | SrT_SrTID → TrwaleCzesci | Potwierdzona | `mssql_list_tables` |
| powiązany_z_dokumentem | SrodekTrwaly | DokumentHandlowy | N:M | przez TrwalePowiazania | SrT_SrTID + DokTyp + DokID | Potwierdzona | `mssql_list_tables` |

## Endpointy OptimaMCP

### Odczyt (READ)
| Narzędzie MCP | Opis | Status |
|---|---|---|
| `list_fixed_assets` | Lista środków trwałych z JOIN Grupy (5 rekordów testowych) | Zweryfikowane |
| `list_trwale` | Lista z tabeli CDN.Trwale | Zweryfikowane |
| `get_asset_value` | Wartość środka: początkowa − umorzenie | Zweryfikowane |
| `get_depreciation_schedule` | Harmonogram odpisów amortyzacyjnych | Zweryfikowane |

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `create_fixed_asset` | Tworzy nowy środek trwały (name, inventoryNumber, purchase_date?, value?) |
| `depreciate_asset` | Generuje odpis amortyzacyjny dla środka |
| `depreciation_calculate` | Nalicza amortyzację |
| `depreciation_generate` | Generuje odpisy amortyzacyjne |
| `depreciation_generate_single` | Generuje amortyzację dla pojedynczego środka |
| `depreciation_close_period` | Zamyka okres amortyzacji |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL | mssql_describe_table | CDN.Trwale (69 kolumn) | Pełny schemat tabeli |
| MSSQL | mssql_list_tables | CDN (Trwale*) | Tabele pomocnicze |
| MCP | list_fixed_assets | 5 rekordów testowych | Mapowanie pól API↔MSSQL |
| MCP | OptimaMCP tools | Moduł środków trwałych | Operacje odczytu/zapisu |
| Wiedza domenowa | Analityk | Comarch Optima ERP | Moduł środków trwałych |

## Otwarte problemy i konflikty
- `serialNumber` w MCP mapuje się na `SrT_Dokument` (numer dokumentu OT/PT), nie na osobne pole — do potwierdzenia
- Wartości stanu (`SrT_Stan`) — 0=aktywny, 1=zlikwidowany, 2=sprzedany — niepotwierdzone przez dane testowe
- Endpointy WRITE nie zostały wywołane — nie zweryfikowano formatu payloadu

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.Trwale (PK=SrT_SrTID)
- [x] Pola zweryfikowane przez MCP list_fixed_assets (5 rekordów)
- [x] Tabele pomocnicze potwierdzone (TrwaleHist, TrwaleCzesci, ...)
- [x] Endpointy MCP odczytu zweryfikowane
- [ ] Endpointy MCP zapisu do przetestowania
- [ ] Wartości stanu do potwierdzenia na danych rzeczywistych