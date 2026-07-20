# Encja: Potwierdzenie Salda (PS)
- draftId: `draft_2026-07-17_1b02dc6a_encja-potwierdzenie-salda-ps`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.265Z`
- tags: `OWA`, `ontologia`, `optima`, `potwierdzenie-salda`, `do-weryfikacji`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Potwierdzenie Salda (PS)

## Status weryfikacji
- Status: `wstępne`
- Poziom pewności: `średni`
- Identyfikator ontologiczny: `OWAOntology.PotwierdzenieSalda`
- Aliasy: `PS`, `BalanceConfirmation`, `SaldoConfirmation`

## Opis biznesowy
Potwierdzenie salda (PS) to dokument używany w procesie uzgadniania rozrachunków z kontrahentem. Zestawia bieżące należności i/lub zobowiązania wobec wybranego kontrahenta na określony dzień i służy do formalnego potwierdzenia poprawności salda. W systemie może być generowane na podstawie rozrachunków i danych kontrahenta. Dokument ma charakter raportowo-kontrolny, a nie stricte magazynowy.

## Reguły biznesowe
- Dotyczy jednego kontrahenta
- Obejmuje zestaw rozrachunków otwartych lub historycznych
- Generowane na określoną datę uzgodnienia
- Może być wykorzystywane audytowo i windykacyjnie
- Prawdopodobnie nie wpływa bezpośrednio na księgowania [UNKNOWN]

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Generowanie dokumentu | OptimaMCP | create_balance_confirmation | Potwierdzone | API WRITE |
| Rozrachunki źródłowe | CDN | Rozrachunki / należności | Pośrednio potwierdzone | Model biznesowy |
| Kontrahent | CDN | Kontrahenci / PodmiotyView | Pośrednio potwierdzone | Model biznesowy |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_balance_confirmation | POST /api/v1/tax/balance-confirmation | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | [UNKNOWN] | ID dokumentu potwierdzenia salda | Oczekuje potwierdzenia |
| FK | [UNKNOWN] | FK do kontrahenta | Oczekuje potwierdzenia |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| dotyczy_kontrahenta | PotwierdzenieSalda | Kontrahent | N:1 | Przez FK |
| zestawia | PotwierdzenieSalda | Rozrachunek | 1:N | Przez listę rozrachunków |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| OptimaMCP | create_balance_confirmation | API WRITE potwierdzone |
| MSSQL (CDN_TEST) | mssql_list_tables | Potwierdzenie istnienia powiązanych tabel |

## Otwarte problemy
- [UNKNOWN: dedykowana tabela PS — PotwierdzeniaSalda? Inwentaryzacja?]
- [UNKNOWN: pełny schemat tabeli — wymaga mssql_describe_table po identyfikacji nazwy]
- [UNKNOWN: czy PS generuje dekret księgowy?]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15