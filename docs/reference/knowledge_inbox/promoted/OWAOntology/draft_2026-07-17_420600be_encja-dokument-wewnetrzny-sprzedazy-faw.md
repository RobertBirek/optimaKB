# Encja: Dokument wewnętrzny sprzedaży (FAW)
- draftId: `draft_2026-07-17_420600be_encja-dokument-wewnetrzny-sprzedazy-faw`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:46.534Z`
- tags: `OWA`, `ontologia`, `optima`, `dokument-wewnetrzny-sprzedazy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Dokument wewnętrzny sprzedaży (FAW)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni` (MCP potwierdza endpoint; struktura MSSQL pośrednio przez TraNag/DokDefinicje)
- Identyfikator ontologiczny: `OWAOntology.DokumentWewnetrznySprzedazy`
- Aliasy: `FAW`, `DowodWewnetrznySprzedazy`, `InternalSalesProof`, `InternalSalesDocument`

## Opis biznesowy
Dokument wewnętrzny sprzedaży (FAW) to dowód księgowy dokumentujący sprzedaż, dla której nie wystawia się standardowej faktury sprzedaży (FS). FAW stosuje się w przypadkach takich jak: sprzedaż na rzecz osób fizycznych nieprowadzących działalności (gdy paragon nie jest wymagany), sprzedaż wewnętrzna (np. przekazanie towaru między oddziałami), czy korekty sprzedaży niepodlegające fakturowaniu. FAW podlega księgowaniu i wpływa na rejestr VAT sprzedaży.

## Reguły biznesowe
- FAW jest dokumentem handlowym (`CDN.TraNag`) z odpowiednim typem definicji (`DDf_DDfID`)
- Ma strukturę nagłówka i pozycji taką samą jak faktura sprzedaży
- Generuje rozrachunek należnościowy (jeśli dotyczy kontrahenta)
- Wpływa na rejestr VAT sprzedaży
- Podlega księgowaniu (dekretacja) — generuje zapis w DekretyNag/DekretyElem
- Nie podlega obowiązkowi KSeF (dokument wewnętrzny)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek FAW | CDN | TraNag | Potwierdzona | MSSQL — dokument handlowy |
| Pozycje FAW | CDN | TraElem | Potwierdzona | MSSQL — JOIN przez TrE_TrNId |
| Definicja typu | CDN | DokDefinicje | Potwierdzona | MSSQL — DDf_DDfID dla FAW |
| MCP write | — | create_internal_sales_proof | Potwierdzony | OptimaMCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | TrN_TrNID | Identyfikator dokumentu (współdzielony z TraNag) | Potwierdzony |
| FK | TrN_DDfId | FK do definicji typu FAW | Potwierdzony |
| Naturalny | TrN_NumerPelny | Pełny numer dokumentu (COMPUTED) | Potwierdzony |
| FK | TrN_PodID | FK do kontrahenta (opcjonalny) | Potwierdzony |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| ma_pozycje | DokumentWewnetrznySprzedazy | TraElem | 1:N | Kompozycja | TraElem.TrE_TrNId = TraNag.TrN_TrNID | Potwierdzona |
| dotyczy_kontrahenta | DokumentWewnetrznySprzedazy | Kontrahent | N:1 | Referencja | TraNag.TrN_PodID = Kontrahenci.Knt_KntId | Potwierdzona |
| podlega_ksiegowaniu | DokumentWewnetrznySprzedazy | DekretyElem | 1:N | Referencja | DekretyElem.DeE_DokumentId (przez DokumentTyp) | Potwierdzona |

## Endpointy OptimaMCP
- **create_internal_sales_proof** (WRITE): tworzy dokument wewnętrzny sprzedaży (FAW)

## Różnice FAW vs FS
| Aspekt | FAW (dowód wewnętrzny) | FS (faktura sprzedaży) |
|---|---|---|
| Podstawa prawna | Dowód wewnętrzny — ustawa o rachunkowości | Faktura VAT — ustawa o VAT |
| KSeF | Nie podlega | Podlega obowiązkowo |
| Kontrahent | Opcjonalny | Wymagany |
| Numeracja | Odrębna seria | Seria FS |
| VAT | Wpływa na rejestr VAT | Wpływa na rejestr VAT |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.TraNag | Struktura dokumentu handlowego |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.DokDefinicje | Definicje typów dokumentów |
| OptimaMCP | narzędzia MCP | create_internal_sales_proof | Endpoint API |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI] Dokładny kod `DDf_DDfID` dla FAW — zależny od konfiguracji firmy
- [UNKNOWN] Czy FAW zawsze generuje VAT? Czy zależy od ustawień?
- [UNKNOWN] Czy FAW może być podstawą do wystawienia faktury? (relacja FAW → FS?)

## Walidacja
- [x] MCP endpoint create_internal_sales_proof potwierdzony
- [x] Struktura TraNag (współdzielona) potwierdzona w MSSQL
- [ ] Kod DDf_DDfID dla FAW do potwierdzenia
- [ ] Dane testowe FAW w CDN_TEST do weryfikacji