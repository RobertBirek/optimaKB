# Encja: Ponaglenie Zapłaty PON
- draftId: `draft_2026-07-17_64d0571f_encja-ponaglenie-zap-aty-pon`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.298Z`
- tags: `OWA`, `ontologia`, `optima`, `ponaglenie-zaplaty`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Ponaglenie Zapłaty PON

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni`
- Identyfikator ontologiczny: `OWAOntology.PonaglenieZaplaty`
- Aliasy: `PaymentReminder`, `PON`

## Opis biznesowy
Ponaglenie zapłaty (PON) w Comarch Optima to dokument windykacyjny wysyłany do kontrahenta w przypadku przeterminowania płatności. System może automatycznie generować ponaglenia zgodnie ze schematami windykacji (`CDN.SchematyWindykacji`, `CDN.SchematWindykacjiEtapy`). Ponaglenie może zawierać zestawienie przeterminowanych dokumentów, naliczone odsetki oraz wezwanie do zapłaty.

## Reguły biznesowe
- Ponaglenie generowane na podstawie przeterminowanych rozrachunków
- Schemat windykacji określa kolejność i częstotliwość ponagleń
- Może być powiązane ze zdarzeniem bankowym (`CDN.BnkZdarzenia`) — `Bzd_WindykacjaSchematId`
- Każdy etap schematu windykacji ma przypisany szablon dokumentu
- Ponaglenie może zawierać naliczone odsetki karne

## Źródła danych
| Rola źródła | Schemat | Tabela | Status | Dowód |
|---|---|---|---|---|
| Schematy windykacji | CDN | SchematyWindykacji | Potwierdzona | MSSQL (1 wiersz) |
| Etapy windykacji | CDN | SchematWindykacjiEtapy | Potwierdzona | MSSQL (3 wiersze) |
| Zdarzenia bankowe | CDN | BnkZdarzenia | Potwierdzona | Kolumna Bzd_WindykacjaSchematId |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_payment_reminder | POST /api/v1/tax/payment-reminder | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| Naturalny | Numer PON | Numer ponaglenia | Potwierdzony |
| FK | — | FK do kontrahenta | Oczekuje potwierdzenia |
| FK | — | FK do schematu windykacji | Oczekuje potwierdzenia |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| dotyczy_kontrahenta | PonaglenieZaplaty | Kontrahent | N:1 | Przez FK |
| według_schematu | PonaglenieZaplaty | SchematWindykacji | N:1 | Przez FK |
| dotyczy_rozrachunkow | PonaglenieZaplaty | Rozrachunek | N:M | Przez listę |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| OptimaMCP | create_payment_reminder | API WRITE potwierdzone |
| MSSQL (CDN_TEST) | mssql_list_tables | SchematyWindykacji, SchematWindykacjiEtapy |

## Otwarte problemy
- [UNKNOWN: dedykowana tabela PON — Ponaglenia? Windykacje?]
- [UNKNOWN: pełny schemat tabeli — wymaga mssql_describe_table po identyfikacji]
- [UNKNOWN: czy PON ma powiązanie z BnkZdarzenia przez Bzd_WindykacjaSchematId?]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15