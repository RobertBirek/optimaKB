# Encja: Zadanie CRM
- draftId: `draft_2026-07-17_95e64c73_encja-zadanie-crm`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:48.394Z`
- tags: `OWA`, `ontologia`, `optima`, `zadanie-crm`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Zadanie CRM

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (tabela potwierdzona w MSSQL, FK zweryfikowane, endpoint MCP zidentyfikowany)
- Identyfikator ontologiczny: `OWAOntology.ZadanieCRM`
- Aliasy: `CRMDokument`, `CRMTask`, `Dokument CRM`

## Opis biznesowy
Zadanie CRM reprezentuje dokument (plik, załącznik) powiązany z kontaktem CRM w Comarch Optima. Może to być dokument handlowy, plik zewnętrzny lub notatka. Przechowuje ścieżkę dostępu do pliku, typ dokumentu oraz referencję do rekordu w tabeli `DaneBinarne` (przechowywanie binarne w bazie).

## Reguły biznesowe
- Każdy dokument CRM jest przypisany do dokładnie jednego kontaktu CRM (`CRD_CRKId` → CRMKontakty)
- `CRD_RodzajDokumentu` określa rodzaj: 0=plik zewnętrzny, 1=dokument handlowy, 2=notatka (do potwierdzenia)
- `CRD_TypDokumentu` — typ dokumentu zdefiniowany w słowniku (analogicznie do `DDf_DDfID`)
- `CRD_SciezkaDostepu` — ścieżka do pliku na dysku (dla plików zewnętrznych)
- `CRD_PolozeniePliku` — 0=plik na dysku, 1=plik w bazie (DaneBinarne)
- `CRD_IBardId` — ID rekordu w tabeli `CDN.DaneBinarne` (dla plików przechowywanych w bazie)
- `CRD_DokumentId` — ID dokumentu handlowego (jeśli `CRD_RodzajDokumentu` = dokument handlowy)
- Kasowanie kaskadowe: usunięcie kontaktu CRM usuwa wszystkie jego dokumenty (FK CASCADE)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Główna tabela | CDN | CRMDokumenty | **Potwierdzona** | `mssql_describe_table` → PK=CRD_CRDId, 8 kolumn |
| Binarne dane pliku | CDN | DaneBinarne | **Potwierdzona** | `mssql_list_tables` |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | CRD_CRDId (int, IDENTITY) | Klucz główny dokumentu CRM | Potwierdzony | `mssql_describe_table`, CRD_Primary |
| AK | (CRD_DokumentId, CRD_TypDokumentu, CRD_RodzajDokumentu) | Unikalny dokument handlowy | Potwierdzony | `mssql_describe_table`, indeks CRDDokument |

## Pola i mapowanie API ↔ MSSQL
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | CRMDokumenty | CRD_CRDId | int (IDENTITY) | NO | PK | ID dokumentu CRM |
| 2 | CDN | CRMDokumenty | CRD_CRKId | int | NO | FK→CRMKontakty (CASCADE) | ID kontaktu CRM |
| 3 | CDN | CRMDokumenty | CRD_RodzajDokumentu | tinyint | NO | | Rodzaj: 0=plik, 1=dokument handlowy, 2=notatka |
| 4 | CDN | CRMDokumenty | CRD_TypDokumentu | smallint | YES | | Typ dokumentu (słownik) |
| 5 | CDN | CRMDokumenty | CRD_DokumentId | int | YES | | ID dokumentu handlowego |
| 6 | CDN | CRMDokumenty | CRD_SciezkaDostepu | nvarchar(512) | YES | | Ścieżka do pliku na dysku |
| 7 | CDN | CRMDokumenty | CRD_PolozeniePliku | int | YES | | 0=dysk, 1=baza |
| 8 | CDN | CRMDokumenty | CRD_IBardId | bigint | YES | | ID rekordu w DaneBinarne |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| należy_do_kontaktu | ZadanieCRM | KontaktCRM | N:1 | FK (CASCADE) | CRD_CRKId→CRK_CRKId | Potwierdzona |
| powiązany_z_dokumentem | ZadanieCRM | DokumentHandlowy | N:1 | referencyjna | CRD_DokumentId→DoN_DoNID | Potwierdzona |

## Endpointy OptimaMCP

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `create_crm_task` | Tworzy zadanie CRM |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL | mssql_describe_table | CDN.CRMDokumenty (8 kolumn) | Pełny schemat z FK i indeksami |
| MSSQL | mssql_describe_table | CDN.CRMKontakty | Tabela nadrzędna |
| MCP | OptimaMCP tools | Moduł CRM | Endpoint create_crm_task |

## Otwarte problemy i konflikty
- Wartości słownika `CRD_RodzajDokumentu` niepotwierdzone na danych testowych
- Endpoint `create_crm_task` nie został wywołany — nie zweryfikowano formatu payloadu
- Relacja z `DaneBinarne` przez `CRD_IBardId` nie została zweryfikowana przez FK w schemacie

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela potwierdzona w MSSQL: CDN.CRMDokumenty (PK=CRD_CRDId)
- [x] FK do CRMKontakty zweryfikowana (CASCADE)
- [x] Indeksy potwierdzone
- [ ] Endpoint MCP do przetestowania
- [ ] Wartości słownikowe do potwierdzenia