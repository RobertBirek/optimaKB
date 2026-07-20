# Encja: Plan kont
- draftId: `draft_2026-07-17_980c219d_encja-plan-kont`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.125Z`
- tags: `OWA`, `ontologia`, `optima`, `plan-kont`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Plan kont

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.PlanKont`
- Aliasy: `ChartOfAccounts`, `PlanKont`, `Konta`

## Opis biznesowy
Plan kont w Comarch Optima to struktura hierarchiczna wszystkich kont księgowych używanych przez firmę. Zbudowany jest na podstawie tabeli `CDN.Konta` i widoku `CDN.KontaAnView`. Plan kont dzieli się na konta syntetyczne (nadrzędne) i analityczne (szczegółowe), tworząc drzewo kont. Plan kont jest powiązany z okresami obrachunkowymi (`CDN.OkresyObrach`) oraz dziennikami (`CDN.Dzienniki`).

## Reguły biznesowe
- Plan kont jest globalny dla bazy firmy
- Konta syntetyczne agregują konta analityczne
- Każde konto ma unikalny numer/symbol w ramach planu
- Konta podlegają ograniczeniom księgowym (`CDN.KontaZakazy`)
- Plan kont jest używany przez wszystkie moduły księgowe (KH, KPiR, VAT)
- Przynajmniej jedno konto musi istnieć do prowadzenia księgowości

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Konta | CDN | Konta | Potwierdzona | MSSQL |
| Widok analityczny | CDN | KontaAnView | Potwierdzony | MSSQL (VIEW) |
| Ograniczenia | CDN | KontaZakazy | Potwierdzona | MSSQL |
| Okresy obrachunkowe | CDN | OkresyObrach | Potwierdzona | MSSQL |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Status |
|---|---|---|
| READ | list_chart_of_accounts | Potwierdzone |
| READ | list_konta (id, name, description) | Potwierdzone |

## Struktura hierarchiczna
- Konta syntetyczne: poziom nadrzędny (np. "201 — Rozrachunki z odbiorcami")
- Konta analityczne: poziom szczegółowy (np. "201-001 — Kontrahent X")
- Widok `KontaAnView` udostępnia zagregowany widok kont analitycznych
- Relacja nadrzędny-podrzędny może być realizowana przez samoodwołujący się FK w `Konta`

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| zawiera_konto | PlanKont | KontoKsiegowe | 1:N | Kompozycja |
| uzywany_w_okresie | PlanKont | OkresObrachunkowy | N:M | Przez Dzienniki |
| podlega_ograniczeniom | KontoKsiegowe | KontaZakaz | 1:N | KontaZakazy → Konta |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_list_tables | CDN.Konta, CDN.KontaAnView, CDN.KontaZakazy |
| OptimaMCP | list_chart_of_accounts, list_konta | API READ |
| OptimaKB | OpenSPG | ComarchOptimaSchema (relacje) |

## Otwarte problemy
- [UNKNOWN: czy Konta ma kolumnę FK do siebie (samoodwołanie hierarchiczne)?]
- [UNKNOWN: struktura KontaAnView — które kolumny zawiera?]
- [UNKNOWN: różnica między list_chart_of_accounts a list_konta w API]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15