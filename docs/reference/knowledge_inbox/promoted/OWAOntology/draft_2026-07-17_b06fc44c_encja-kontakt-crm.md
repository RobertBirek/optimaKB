# Encja: Kontakt CRM
- draftId: `draft_2026-07-17_b06fc44c_encja-kontakt-crm`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.453Z`
- tags: `OWA`, `ontologia`, `optima`, `kontakt-crm`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Kontakt CRM

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (tabela potwierdzona w MSSQL, klucze i FK zweryfikowane, endpointy MCP zidentyfikowane)
- Identyfikator ontologiczny: `OWAOntology.KontaktCRM`
- Aliasy: `CRMKontakt`, `CRMContact`, `CRM Kontakt`, `Wątek CRM`

## Opis biznesowy
Kontakt CRM reprezentuje pojedynczą interakcję (spotkanie, telefon, mail) w module CRM Comarch Optima. Każdy kontakt jest przypisany do podmiotu (kontrahenta, pracownika, urzędu) i/lub osoby kontaktowej. Posiada temat, opis, priorytet, etap realizacji oraz dane opiekuna. Wspiera przypomnienia automatyczne (mail/SMS), planowanie cykliczne oraz dokumenty powiązane.

## Reguły biznesowe
- Każdy kontakt należy do wątku (`CRK_WatekId`) — wątki grupują powiązane kontakty
- `CRK_Zadanie` = 1 oznacza, że kontakt jest zadaniem (nie tylko notatką)
- Etap realizacji (`CRK_EtapRealizacji`) śledzi postęp (0=nowy, 1=w trakcie, 2=wykonany — do potwierdzenia)
- `CRK_Wykonano` (decimal 5,2) — procent wykonania 0..100
- Priorytet: `CRK_Priorytet` (0=niski, 1=normalny, 2=wysoki)
- `CRK_Anulowany` = 1 — kontakt anulowany
- `CRK_Bufor` = 1 — kontakt w buforze (szkic)
- Kontakt może mieć nadrzędny (`CRK_ParId` → CRK_CRKId) — hierarchia zadań
- Przypomnienia: `CrK_AutomatycznePrzypomnienia` (dla kontaktów), `CrK_AutomatycznePrzypomnieniaOpe` (dla opiekuna)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Główna tabela kontaktów | CDN | CRMKontakty | **Potwierdzona** | `mssql_describe_table` → PK=CRK_CRKId, 76 kolumn |
| Dokumenty CRM | CDN | CRMDokumenty | **Potwierdzona** | `mssql_describe_table` → FK CRD_CRKId→CRMKontakty |
| Uczestnicy kontaktu | CDN | CrmUczestnicy | **Potwierdzona** | `mssql_describe_table` → CrU_CrKId→CRMKontakty |
| Kontakty cykliczne | CDN | CrmKontaktyCykl | **Potwierdzona** | `mssql_list_tables` |
| Widok kontaktów | CDN | CrmKontaktyView | **Potwierdzona** | `mssql_list_tables` |
| Widok osób | CDN | CrmOsobyView | **Potwierdzona** | `mssql_list_tables` |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | CRK_CRKId (int, IDENTITY) | Klucz główny kontaktu CRM | Potwierdzony | `mssql_describe_table`, CRK_Primary |
| AK | (CRK_NumerString, CRK_NumerNr, CRK_Anulowany) | Numer dokumentu | Potwierdzony | `mssql_describe_table`, indeks CRKNumer |
| AK | CRK_NumerPelny (nvarchar, COMPUTED) | Pełny numer (string+int) | Potwierdzony | `mssql_describe_table`, indeks CRKNumerPelny |

## Pola i mapowanie API ↔ MSSQL
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy |
|---:|---|---|---|---|---|---|---|
| 1 | CDN | CRMKontakty | CRK_CRKId | int (IDENTITY) | NO | PK | ID kontaktu |
| 2 | CDN | CRMKontakty | CRK_WatekId | int | NO | | ID wątku nadrzędnego |
| 3 | CDN | CRMKontakty | CRK_DDfId | int | NO | FK→DokDefinicje | Definicja dokumentu CRM |
| 4 | CDN | CRMKontakty | CRK_PodID | int | YES | FK→PodmiotyView | ID podmiotu (kontrahent/pracownik/urząd) |
| 5 | CDN | CRMKontakty | CRK_PodmiotTyp | smallint | YES | FK→PodmiotyView | Typ podmiotu |
| 6 | CDN | CRMKontakty | CRK_OsobaId | int | YES | FK→KntOsoby | ID osoby kontaktowej |
| 7 | CDN | CRMKontakty | CRK_Temat | nvarchar(255) | NO | | Temat kontaktu |
| 8 | CDN | CRMKontakty | CRK_Opis | nvarchar(MAX) | NO | | Opis kontaktu |
| 9 | CDN | CRMKontakty | CRK_DataDok | datetime | NO | | Data dokumentu |
| 10 | CDN | CRMKontakty | CRK_Priorytet | tinyint | NO | | Priorytet: 0=niski, 1=normalny, 2=wysoki |
| 11 | CDN | CRMKontakty | CRK_Zadanie | tinyint | NO | | Czy kontakt jest zadaniem |
| 12 | CDN | CRMKontakty | CRK_Wykonano | decimal(5,2) | NO | | Procent wykonania (0..100) |
| 13 | CDN | CRMKontakty | CRK_EtapRealizacji | int | YES | | Etap realizacji |
| 14 | CDN | CRMKontakty | CRK_OpiekunId | int | YES | | ID opiekuna |
| 15 | CDN | CRMKontakty | CRK_Cykl | int | NO | | Czy kontakt jest cykliczny |
| 16 | CDN | CRMKontakty | CRK_Anulowany | int | NO | | Czy anulowany |
| 17 | CDN | CRMKontakty | CRK_Bufor | smallint | NO | | Czy w buforze (szkic) |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| dotyczy_podmiotu | KontaktCRM | PodmiotFirma | N:1 | FK | CRK_PodID→Pod_PodId, CRK_PodmiotTyp→Pod_PodmiotTyp | Potwierdzona |
| dotyczy_osoby | KontaktCRM | OsobaKontaktowa (KntOsoby) | N:1 | FK | CRK_OsobaId→KnO_KnOId | Potwierdzona |
| ma_definicję | KontaktCRM | DefinicjaDokumentu (DokDefinicje) | N:1 | FK | CRK_DDfId→DDf_DDfID | Potwierdzona |
| ma_nadrzędny | KontaktCRM | KontaktCRM | N:1 | FK | CRK_ParId→CRK_CRKId | Potwierdzona |
| ma_dokumenty | KontaktCRM | DokumentCRM (CRMDokumenty) | 1:N | FK (CASCADE) | CRK_CRKId→CRD_CRKId | Potwierdzona |
| ma_uczestników | KontaktCRM | UczestnikCRM (CrmUczestnicy) | 1:N | referencyjna | CRK_CRKId→CrU_CrKId | Potwierdzona |

## Endpointy OptimaMCP

### Odczyt (READ)
| Narzędzie MCP | Opis | Status |
|---|---|---|
| `list_contractors` (z parametrami) | Lista kontrahentów — dane podmiotów | Istnieje |
| `list_contractor_contacts` | Lista osób kontaktowych | Istnieje |

### Zapis (WRITE — NIE WYWOŁANO)
| Narzędzie MCP | Opis |
|---|---|
| `create_crm_contact` | Tworzy kontakt CRM |
| `create_crm_contact_generic` | Tworzy Kontakt CRM (ogólny) |
| `create_email` | Wysyła email (powiązane z kontaktem) |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL | mssql_describe_table | CDN.CRMKontakty (76 kolumn) | Pełny schemat z FK i indeksami |
| MSSQL | mssql_describe_table | CDN.CRMDokumenty, CDN.CrmUczestnicy | Tabele powiązane |
| MCP | OptimaMCP tools | Moduł CRM | Endpointy odczytu/zapisu |

## Otwarte problemy i konflikty
- Endpointy WRITE nie zostały wywołane — nie zweryfikowano formatu payloadu
- Wartości słownikowe (Priorytet, EtapRealizacji, Obsluga) nie potwierdzone na danych testowych
- Brak dedykowanego endpointu MCP `list_crm_contacts` — dane CRM dostępne przez ogólne listy

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL: CDN.CRMKontakty (PK=CRK_CRKId)
- [x] Klucze obce zweryfikowane (PodmiotyView, KntOsoby, DokDefinicje, self-reference CRK_ParId)
- [x] Tabele powiązane potwierdzone (CRMDokumenty, CrmUczestnicy)
- [ ] Endpointy MCP zapisu do przetestowania
- [ ] Wartości słownikowe do potwierdzenia