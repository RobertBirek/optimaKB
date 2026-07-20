# Encja: Workflow dokumentu
- draftId: `draft_2026-07-17_4bc001c1_encja-workflow-dokumentu`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.220Z`
- tags: `OWA`, `ontologia`, `optima`, `workflow-dokumentu`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Workflow dokumentu

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (tabele potwierdzone w MSSQL, endpointy MCP zidentyfikowane i skatalogowane)
- Identyfikator ontologiczny: `OWAOntology.WorkflowDokumentu`
- Aliasy: `DokumentWorkflow`, `ProcesDokumentu`, `EtapyDokumentu`, `DocumentWorkflow`

## Opis biznesowy
Workflow dokumentu to abstrakcyjna encja reprezentująca proces obiegu dokumentu w Comarch Optima — od utworzenia (bufor/szkic), przez zatwierdzenie, zaksięgowanie, rozliczenie, aż po anulowanie. Każdy dokument (`DokNag`) może przechodzić przez zdefiniowane etapy (`DefEtapy`), a historia przejść jest rejestrowana. Relacje między dokumentami (np. RO→WZ, ZO→PZ→FZ) również są częścią tego procesu.

## Struktura procesu
```
[Bufor/Szkic] → [Zatwierdzony] → [Zaksięgowany] → [Rozliczony/Częściowo rozliczony] → [Anulowany/Zamknięty]
```
Każdy typ dokumentu ma własną definicję etapów (`DefEtapy`) i reguły przejść.

## Reguły biznesowe
- Każdy dokument w `DokNag` ma zestaw etapów procesu zdefiniowanych w `DokNagProcesEtapy`
- Etapy są przypisane do dokumentu przez `DnPr_DoNID` → `DoN_DoNID` (CASCADE)
- Historia zmian etapów zapisywana jest w `DokNagEtapyHistoria` → `DnEH_DoNID` → `DoN_DoNID` (CASCADE)
- Przejścia między etapami definiuje `DokNagEtapyKolejne` (`DnEK_DnPrID` → `DnEK_DnPrIDKolejny`)
- `DnE_Wykonany` = 1 — etap zaliczony, 0 — oczekujący
- `DnE_Obowiazkowy` = 1 — etap wymagany przed przejściem dalej
- Relacje między dokumentami (np. faktura powstała z zamówienia) przechowuje `DokRelacje`
- `DoR_Flaga` koduje typ relacji (0=powstanie, 1=korekta, 2=płatność — do potwierdzenia)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Definicje etapów (słownik) | CDN | DefEtapy | **Potwierdzona** | `mssql_describe_table` → PK=DEt_DEtId, 6 kolumn |
| Etapy dokumentu (przypisanie) | CDN | DokNagEtapy | **Potwierdzona** | `mssql_describe_table` → PK=DnE_DnEId, FK→DokNagProcesEtapy (CASCADE) |
| Historia przejść etapów | CDN | DokNagEtapyHistoria | **Potwierdzona** | `mssql_describe_table` → PK=DnEH_DnEHID, FK→DokNag (CASCADE) |
| Kolejne etapy (graf przejść) | CDN | DokNagEtapyKolejne | **Potwierdzona** | `mssql_describe_table` → PK=DnEK_DnEkID, ref DnPrID→DnPrIDKolejny |
| Proces etapy (na dokumencie) | CDN | DokNagProcesEtapy | **Potwierdzona** | `mssql_describe_table` → PK=DnPr_DnPrID, FK→DokNag (CASCADE) |
| Relacje między dokumentami | CDN | DokRelacje | **Potwierdzona** | `mssql_describe_table` → PK=DoR_DoRId, 9 kolumn |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | DnE_DnEId | ID etapu dokumentu | Potwierdzony |
| PK | DnEH_DnEHID | ID wpisu historii etapu | Potwierdzony |
| PK | DnPr_DnPrID | ID etapu procesu na dokumencie | Potwierdzony |
| PK | DEt_DEtId | ID definicji etapu (słownik) | Potwierdzony |
| PK | DoR_DoRId | ID relacji między dokumentami | Potwierdzony |

## Kluczowe pola — DokNagEtapy
| # | Kolumna MSSQL | Typ SQL | Opis biznesowy |
|---:|---|---|---|
| 1 | DnE_DnEId | int (IDENTITY) | PK etapu |
| 2 | DnE_DnPrID | int (FK→DokNagProcesEtapy) | ID procesu etapu |
| 3 | DnE_EtapID | int | ID definicji etapu (→DefEtapy) |
| 4 | DnE_Typ | int | Typ etapu |
| 5 | DnE_OpeId | int | Operator wykonujący |
| 6 | DnE_Wykonany | smallint | Czy etap wykonany |
| 7 | DnE_Obowiazkowy | tinyint | Czy etap wymagany |

## Kluczowe pola — DokRelacje
| # | Kolumna MSSQL | Typ SQL | Opis biznesowy |
|---:|---|---|---|
| 1 | DoR_ParentTyp | smallint | Typ dokumentu nadrzędnego |
| 2 | DoR_ParentId | int | ID dokumentu nadrzędnego |
| 3 | DoR_DokumentTyp | smallint | Typ dokumentu podrzędnego |
| 4 | DoR_DokumentId | int | ID dokumentu podrzędnego |
| 5 | DoR_Flaga | smallint | Typ relacji (powstanie/korekta/płatność) |

## Endpointy OptimaMCP

### Odczyt (READ)
| Narzędzie MCP | Opis | Status |
|---|---|---|
| `list_document_relations` | Lista relacji dokumentów (z DokRelacje) | Zweryfikowane |
| `get_document_timeline` | Historia dokumentu na osi czasu | Zweryfikowane |
| `list_documents` | Lista dokumentów (SEK) | Istnieje |

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis | Typ workflow |
|---|---|---|
| `sek_transition` | Przejście etapu SEK (zmiana stanu) | Ogólny |
| `complete_order` | Pełna realizacja RO → WZ+FS | Sprzedaż |
| `fulfill_order` | Realizacja RO → WZ | Sprzedaż |
| `invoice_order` | Fakturowanie RO → FS | Sprzedaż |
| `receive_purchase_order` | Przyjęcie ZO → PZ | Zakup |
| `invoice_purchase_order` | Fakturowanie ZO → FZ | Zakup |
| `return_receipt` | Zwrot PZ → PZKOR | Magazyn |
| `settlement_clear` | Rozlicza dokument | Finanse |
| `settlement_unclear` | Odrolowuje dokument | Finanse |
| `document_recalculate` | Przelicza dokument | Ogólny |
| `document_update_prices` | Aktualizuje ceny w dokumencie | Ogólny |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Status |
|---|---|---|---|---|---|
| ma_etapy | DokumentHandlowy (DokNag) | EtapProcesu (DokNagProcesEtapy) | 1:N | FK (CASCADE) | Potwierdzona |
| realizuje_etap | EtapProcesu | EtapDokumentu (DokNagEtapy) | 1:N | FK (CASCADE) | Potwierdzona |
| ma_historię | DokumentHandlowy | HistoriaEtapu (DokNagEtapyHistoria) | 1:N | FK (CASCADE) | Potwierdzona |
| pochodzi_z | DokumentHandlowy | DokumentHandlowy | N:N | przez DokRelacje | Potwierdzona |
| definiuje_etap | DefEtapy | EtapDokumentu | 1:N | referencyjna (DEt_DEtId→DnE_EtapID) | Potwierdzona |

## Typowe workflow wg typu dokumentu
| Typ workflow | Dokument startowy | Dokument wynikowy | Kluczowy endpoint MCP |
|---|---|---|---|
| Sprzedaż: RO→WZ→FS | Rezerwacja Odbiorcy (RO) | Wydanie Zewnętrzne (WZ) → Faktura Sprzedaży (FS) | `complete_order` |
| Sprzedaż: RO→WZ | RO | WZ | `fulfill_order` |
| Sprzedaż: RO→FS | RO | FS | `invoice_order` |
| Sprzedaż: FPF→FA | Faktura Proforma | Faktura Zaliczkowa | `advance_invoice_from_proforma` |
| Zakup: ZO→PZ→FZ | Zamówienie u Dostawcy (ZO) | Przyjęcie Zewnętrzne (PZ) → Faktura Zakupu (FZ) | `receive_purchase_order` + `invoice_purchase_order` |
| Korekta: FS→FSKOR | FS | Faktura Korygująca | `correct_invoice` |
| Rozliczenie | FS/FZ | — | `settlement_clear` |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL | mssql_describe_table | CDN.DokNagEtapy, DokNagEtapyHistoria, DokNagEtapyKolejne, DokNagProcesEtapy, DefEtapy, DokRelacje | Pełne schematy z FK |
| MCP | OptimaMCP tools | Workflow, Settlement, Document | 11 endpointów workflow |
| Wiedza domenowa | Analityk | Comarch Optima ERP | Cykl życia dokumentu |

## Otwarte problemy i konflikty
- Endpointy WRITE nie zostały wywołane — nie zweryfikowano formatu payloadu ani efektów
- Wartości `DoR_Flaga` dla typów relacji niepotwierdzone na danych testowych
- `list_document_relations` i `get_document_timeline` — niepotwierdzona zgodność pól z tabelami MSSQL
- Graf przejść (`DokNagEtapyKolejne`) nie ma zdefiniowanych FK w schemacie MSSQL — relacja opiera się na konwencji ID

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Wszystkie 6 tabel potwierdzonych w MSSQL
- [x] Klucze obce zweryfikowane (CASCADE na DokNag)
- [x] 11 endpointów MCP zidentyfikowanych i skatalogowanych
- [ ] Endpointy MCP zapisu do przetestowania
- [ ] Wartości słownikowe etapów do potwierdzenia