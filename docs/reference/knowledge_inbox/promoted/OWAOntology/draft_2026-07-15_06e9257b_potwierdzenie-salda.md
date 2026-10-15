# Encja: Potwierdzenie Salda PS
- draftId: `draft_2026-07-15_06e9257b_potwierdzenie-salda`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-22T14:41:10.753Z`
- tags: `OWA`, `ontologia`, `optima`, `potwierdzenie-salda`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 33 drafts from dashboard
## Content
# Encja: Potwierdzenie Salda PS

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni`
- Identyfikator ontologiczny: `OWAOntology.PotwierdzenieSalda`
- Aliasy: `BalanceConfirmation`, `PS`

## Opis biznesowy
Potwierdzenie salda (PS) w Comarch Optima to dokument księgowy służący do potwierdzenia stanu rozrachunków z kontrahentem na dany dzień. Dokument jest wysyłany do kontrahenta w celu uzgodnienia wzajemnych należności i zobowiązań. Potwierdzenie salda jest generowane na podstawie otwartych rozrachunków (`CDN.KsiRozrachunki`) i może być elementem procesu inwentaryzacji należności.

## Reguły biznesowe
- PS generowane jest dla konkretnego kontrahenta na określony dzień bilansowy
- Zawiera zestawienie wszystkich otwartych rozrachunków
- Służy do uzgadniania sald z kontrahentami (inwentaryzacja należności)
- Może być wysłane w formie wydruku lub elektronicznie

## Źródła danych
| Rola źródła | Schemat | Tabela | Status | Dowód |
|---|---|---|---|---|
| Rozrachunki źródłowe | CDN | KsiRozrachunki | Potwierdzona | MSSQL |
| Dane kontrahenta | CDN | Kontrahenci | Potwierdzona | MSSQL |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_balance_confirmation | POST /api/v1/tax/balance-confirmation | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| Naturalny | Numer dokumentu PS | Numer potwierdzenia salda | Potwierdzony |
| FK | — | FK do kontrahenta | Oczekuje potwierdzenia |
| FK | — | FK do rozrachunków | Oczekuje potwierdzenia |

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
