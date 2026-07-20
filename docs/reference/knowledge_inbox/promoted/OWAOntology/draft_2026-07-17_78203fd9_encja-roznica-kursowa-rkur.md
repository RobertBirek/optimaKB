# Encja: Różnica kursowa RKUR
- draftId: `draft_2026-07-17_78203fd9_encja-roznica-kursowa-rkur`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.217Z`
- tags: `OWA`, `ontologia`, `optima`, `roznica-kursowa`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Różnica kursowa RKUR

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni`
- Identyfikator ontologiczny: `OWAOntology.RoznicaKursowa`
- Aliasy: `ExchangeDifference`, `RKUR`

## Opis biznesowy
Różnica kursowa (RKUR) w Comarch Optima to dokument księgowy powstający w wyniku zmiany kursu waluty między dniem powstania zobowiązania/należności a dniem jej uregulowania. Różnice kursowe są naliczane automatycznie przy rozliczaniu płatności w walutach obcych. Dokument RKUR księguje dodatnie lub ujemne różnice kursowe zgodnie z przepisami o rachunkowości i podatku dochodowym.

## Reguły biznesowe
- Różnica kursowa powstaje gdy kurs z dnia zapłaty różni się od kursu z dnia zarachowania
- Dodatnie różnice kursowe → przychody finansowe
- Ujemne różnice kursowe → koszty finansowe
- Naliczane automatycznie przy rozliczaniu płatności walutowych
- Mogą być naliczane metodą podatkową lub bilansową
- RKUR może być powiązany z konkretną płatnością i rozrachunkiem
- System przechowuje kursy w `BnkZdarzenia` (BZd_KursNumer, BZd_KursL, BZd_KursM)

## Źródła danych
| Rola źródła | Schemat | Tabela | Status | Dowód |
|---|---|---|---|---|
| Zdarzenia bankowe (kursy) | CDN | BnkZdarzenia | Potwierdzona | MSSQL |
| Rozrachunki | CDN | KsiRozrachunki | Potwierdzona | MSSQL |
| Kursy walut | CDN | [Do ustalenia] | Oczekuje | — |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_exchange_difference | POST /api/v1/tax/exchange-difference | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| Naturalny | Numer RKUR | Numer dokumentu różnicy kursowej | Potwierdzony |
| FK | — | FK do płatności (BnkZdarzenia) | Oczekuje potwierdzenia |
| FK | — | FK do rozrachunku | Oczekuje potwierdzenia |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| wynika_z_platnosci | RoznicaKursowa | Platnosc | N:1 | Przez BnkZdarzenia |
| dotyczy_rozrachunku | RoznicaKursowa | Rozrachunek | N:1 | Przez FK |
| dotyczy_kontrahenta | RoznicaKursowa | Kontrahent | N:1 | Przez FK |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| OptimaMCP | create_exchange_difference | API WRITE potwierdzone |
| MSSQL (CDN_TEST) | mssql_describe_table (BnkZdarzenia) | Dane kursowe w zdarzeniach |

## Otwarte problemy
- [UNKNOWN: dedykowana tabela RKUR — RozniceKursowe? Kursy?]
- [UNKNOWN: pełny schemat — wymaga mssql_describe_table po identyfikacji]
- [UNKNOWN: czy RKUR jest automatycznie generowany przy rozliczeniu, czy ręcznie?]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15