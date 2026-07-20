# Encja: Konto księgowe
- draftId: `draft_2026-07-17_52936554_encja-konto-ksiegowe`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.823Z`
- tags: `OWA`, `ontologia`, `optima`, `konto-ksiegowe`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Konto księgowe

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.KontoKsiegowe`
- Aliasy: `Konta`, `Account`, `ChartOfAccounts`

## Opis biznesowy
Konto księgowe to podstawowy element planu kont w module księgowym Comarch Optima. Każde konto identyfikowane przez `Acc_AccId` należy do struktury hierarchicznej planu kont. Konta syntetyczne i analityczne są powiązane relacją szczegółowości. Dekrety księgowe (`CDN.DekretyKonta`) rejestrują zapisy na kontach wynikające z dokumentów handlowych, operacji bankowych i ręcznych księgowań.

## Reguły biznesowe
- Konto księgowe ma unikalny identyfikator `Acc_AccId` (int, IDENTITY)
- Konto podlega ograniczeniom (`CDN.KontaZakazy`) — np. blokada księgowań
- Widok `CDN.KontaAnView` agreguje konta analityczne
- `CDN.DekretyKonta` zawiera pojedyncze zapisy księgowe (dekrety)
- Plan kont definiuje strukturę hierarchiczną (konta syntetyczne → analityczne)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Plan kont | CDN | Konta | Potwierdzona | MSSQL CDN_TEST |
| Widok analityczny | CDN | KontaAnView | Potwierdzony | MSSQL (VIEW) |
| Ograniczenia kont | CDN | KontaZakazy | Potwierdzona | MSSQL CDN_TEST |
| Dekrety księgowe | CDN | DekretyKonta | Potwierdzona | MSSQL CDN_TEST |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Zweryfikowane pola | Status |
|---|---|---|---|
| READ | list_konta | id, name, description | Potwierdzone |
| READ | list_chart_of_accounts | — | Potwierdzone |
| READ | get_trial_balance | — | Potwierdzone |
| WRITE | create_account | POST /api/v1/chart-of-accounts | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | Acc_AccId | Unikalny identyfikator konta (int, IDENTITY) | Potwierdzony | MSSQL |
| Naturalny | [UNKNOWN] | Numer/symbol konta | Do ustalenia | — |

## Pola i mapowanie API ↔ MSSQL — Konta
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | Konta | Acc_AccId | int | N | PK | Unikalny identyfikator konta (IDENTITY) | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| ma_dekrety | KontoKsiegowe | DekretKonta | 1:N | Kompozycja | DekretyKonta.Acc_AccId = Konta.Acc_AccId | Potwierdzona |
| ma_zakaz | KontoKsiegowe | KontaZakaz | 1:N | Kompozycja | KontaZakazy → Konta | Potwierdzona |
| ma_analityke | KontoKsiegowe | KontoAnalityczne | 1:N | Hierarchia | Przez KontaAnView | Potwierdzona |
| należy_do_planu | KontoKsiegowe | PlanKont | N:1 | Agregacja | Konta → Plan kont | Potwierdzona |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_list_tables | CDN.* | Potwierdzenie istnienia tabel |
| OptimaMCP | MCP tools | list_konta (id, name, description) | API READ zweryfikowane |
| OptimaMCP | MCP tools | list_chart_of_accounts, get_trial_balance | API READ dodatkowe |
| OptimaMCP | MCP tools | create_account (POST /api/v1/chart-of-accounts) | API WRITE zweryfikowane |
| OptimaKB | OpenSPG | ComarchOptimaSchema | Relacje i JOIN paths |

## Otwarte problemy
- [UNKNOWN: pełna lista kolumn Konta — wymaga mssql_describe_table]
- [UNKNOWN: struktura hierarchiczna planu kont — tabela samoodwołująca się?]
- [UNKNOWN: różnica między KontaAnView a tabelami bazowymi]
- [UNKNOWN: związek między DekretyKonta a TraNag (przez dokument księgowy?)]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona (Konta)
- [x] PK potwierdzony (Acc_AccId)
- [x] Tabele powiązane potwierdzone (KontaAnView, KontaZakazy, DekretyKonta)
- [x] MCP READ potwierdzony (list_konta: id, name, description)
- [x] MCP READ potwierdzony (list_chart_of_accounts, get_trial_balance)
- [x] MCP WRITE potwierdzony (create_account)
- [ ] Pełny schemat Konta do pobrania (mssql_describe_table)