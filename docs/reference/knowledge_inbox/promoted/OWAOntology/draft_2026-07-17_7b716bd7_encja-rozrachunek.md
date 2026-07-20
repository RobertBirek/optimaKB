# Encja: Rozrachunek
- draftId: `draft_2026-07-17_7b716bd7_encja-rozrachunek`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.280Z`
- tags: `OWA`, `ontologia`, `optima`, `rozrachunek`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Rozrachunek

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.Rozrachunek`
- Aliasy: `KsiRozrachunki`, `Settlement`, `Receivable`, `Payable`

## Opis biznesowy
Rozrachunki w Comarch Optima reprezentują należności i zobowiązania wynikające z dokumentów handlowych. Każdy dokument (faktura sprzedaży, faktura zakupu) generuje odpowiedni rozrachunek — należność po stronie odbiorcy lub zobowiązanie wobec dostawcy. Rozrachunki są kompensowane przez płatności (`CDN.BnkZdarzenia`), a wiele rozrachunków może być wzajemnie potrącanych (kompensaty — `CDN.KompensatyNag`, `CDN.KompensatyElem`).

## Reguły biznesowe
- Każdy dokument handlowy generuje rozrachunek (należność dla FS, zobowiązanie dla FZ)
- Rozrachunek ma stan: otwarty, częściowo rozliczony, rozliczony
- Płatności (`BnkZdarzenia`) rozliczają rozrachunki
- Kompensaty (`KompensatyNag` + `KompensatyElem`) umożliwiają wzajemne potrącenia należności i zobowiązań
- Rozrachunek jest zawsze powiązany z kontrahentem i dokumentem źródłowym

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Rozrachunki | CDN | KsiRozrachunki | Potwierdzona | MSSQL CDN_TEST |
| Zdarzenia bankowe | CDN | BnkZdarzenia | Potwierdzona | MSSQL CDN_TEST |
| Kompensaty (nagłówki) | CDN | KompensatyNag | Potwierdzona | MSSQL CDN_TEST |
| Kompensaty (elementy) | CDN | KompensatyElem | Potwierdzona | MSSQL CDN_TEST |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| READ | list_overdue | — | Potwierdzone |
| READ | get_settlement_status | — | Potwierdzone |
| READ | get_receivables_aging | — | Potwierdzone |
| READ | get_payables_aging | — | Potwierdzone |
| READ | get_receivables_detail | — | Potwierdzone |
| WRITE | settlement_clear | POST /api/v1/settlements/clear | Potwierdzone |
| WRITE | settlement_unclear | POST /api/v1/settlements/unclear | Potwierdzone |
| WRITE | settlement_compensate | POST /api/v1/settlements/compensate | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | KsR_KsRId | Identyfikator rozrachunku | Do ustalenia | — |
| FK | [UNKNOWN] | FK do TraNag (dokument źródłowy) | Do ustalenia | MSSQL JOIN path |
| FK | [UNKNOWN] | FK do Kontrahenci | Do ustalenia | MSSQL JOIN path |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| pochodzi_z_dokumentu | Rozrachunek | TraNag | N:1 | Referencja | KsiRozrachunki → TraNag | Potwierdzona |
| dotyczy_kontrahenta | Rozrachunek | Kontrahent | N:1 | Referencja | KsiRozrachunki → Kontrahenci | Potwierdzona |
| rozliczany_przez | Rozrachunek | BnkZdarzenie | N:M | Asocjacja | BnkZdarzenia → KsiRozrachunki | Potwierdzona |
| kompensowany_w | Rozrachunek | KompensataElem | 1:N | Asocjacja | KompensatyElem → KsiRozrachunki | Potwierdzona |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_list_tables | CDN.* | Potwierdzenie istnienia tabel |
| OptimaMCP | MCP tools | list_overdue, get_settlement_status | API READ zweryfikowane |
| OptimaMCP | MCP tools | settlement_clear, settlement_unclear, settlement_compensate | API WRITE zweryfikowane |
| OptimaKB | OpenSPG | ComarchOptimaSchema | JOIN paths i relacje |
| OptimaKB | OpenSPG | ComarchOptimaBusinessSemantics | Reguły biznesowe |

## Otwarte problemy
- [UNKNOWN: pełna lista kolumn KsiRozrachunki — wymaga mssql_describe_table]
- [UNKNOWN: klucz główny KsiRozrachunki — do potwierdzenia (KsR_KsRId?)]
- [UNKNOWN: mechanizm częściowego rozliczania — czy istnieje tabela rozliczeń cząstkowych?]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona (KsiRozrachunki)
- [x] Tabele powiązane potwierdzone (BnkZdarzenia, KompensatyNag, KompensatyElem)
- [x] MCP READ endpoints potwierdzone (list_overdue, get_settlement_status, get_receivables_aging, get_payables_aging, get_receivables_detail)
- [x] MCP WRITE endpoints potwierdzone (settlement_clear, settlement_unclear, settlement_compensate)
- [ ] Pełny schemat KsiRozrachunki do pobrania (mssql_describe_table)
- [ ] Klucz główny i FK do ustalenia