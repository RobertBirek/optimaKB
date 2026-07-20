# Encja: Dokument wewnętrzny zakupu (FZWFZ)
- draftId: `draft_2026-07-17_1d5b0a54_encja-dokument-wewnetrzny-zakupu-fzwfz`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.476Z`
- tags: `OWA`, `ontologia`, `optima`, `dokument-wewnetrzny-zakupu`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Dokument wewnętrzny zakupu (FZWFZ)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni` (MCP potwierdza endpoint; struktura MSSQL pośrednio przez TraNag/DokDefinicje)
- Identyfikator ontologiczny: `OWAOntology.DokumentWewnetrznyZakupu`
- Aliasy: `FZWFZ`, `DowodWewnetrznyZakupu`, `InternalPurchaseProof`, `InternalPurchaseDocument`

## Opis biznesowy
Dokument wewnętrzny zakupu (FZWFZ) to dowód księgowy dokumentujący zakup towarów lub usług, dla których kontrahent nie wystawił faktury zakupu (FZ), lub gdy z przyczyn formalnych nie można jej uznać za dokument zewnętrzny. FZWFZ stosuje się w przypadkach takich jak: zakup od osoby fizycznej nieprowadzącej działalności (np. umowa zlecenie, zakup surowców wtórnych), import usług bez faktury, czy korekty kosztów wewnętrznych. FZWFZ podlega księgowaniu i wpływa na rejestr VAT zakupu.

## Reguły biznesowe
- FZWFZ jest dokumentem handlowym (`CDN.TraNag`) z odpowiednim typem definicji (`DDf_DDfID`)
- Ma strukturę nagłówka i pozycji taką samą jak faktura zakupu (FZ)
- Generuje rozrachunek zobowiązaniowy (jeśli dotyczy kontrahenta)
- Wpływa na rejestr VAT zakupu (RVZ)
- Podlega księgowaniu (dekretacja) — generuje zapis w DekretyNag/DekretyElem
- Nie podlega obowiązkowi KSeF (dokument wewnętrzny)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek FZWFZ | CDN | TraNag | Potwierdzona | MSSQL — dokument handlowy |
| Pozycje FZWFZ | CDN | TraElem | Potwierdzona | MSSQL — JOIN przez TrE_TrNId |
| Definicja typu | CDN | DokDefinicje | Potwierdzona | MSSQL — DDf_DDfID dla FZWFZ |
| MCP write | — | create_internal_purchase_proof | Potwierdzony | OptimaMCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | TrN_TrNID | Identyfikator dokumentu (współdzielony z TraNag) | Potwierdzony |
| FK | TrN_DDfId | FK do definicji typu FZWFZ | Potwierdzony |
| Naturalny | TrN_NumerPelny | Pełny numer dokumentu (COMPUTED) | Potwierdzony |
| FK | TrN_PodID | FK do kontrahenta (opcjonalny — może być osoba fizyczna) | Potwierdzony |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| ma_pozycje | DokumentWewnetrznyZakupu | TraElem | 1:N | Kompozycja | TraElem.TrE_TrNId = TraNag.TrN_TrNID | Potwierdzona |
| dotyczy_kontrahenta | DokumentWewnetrznyZakupu | Kontrahent | N:1 | Referencja | TraNag.TrN_PodID = Kontrahenci.Knt_KntId | Potwierdzona |
| podlega_ksiegowaniu | DokumentWewnetrznyZakupu | DekretyElem | 1:N | Referencja | DekretyElem.DeE_DokumentId (przez DokumentTyp) | Potwierdzona |

## Endpointy OptimaMCP
- **create_internal_purchase_proof** (WRITE): tworzy dokument wewnętrzny zakupu (FZWFZ)

## Różnice FZWFZ vs FZ
| Aspekt | FZWFZ (dowód wewnętrzny) | FZ (faktura zakupu) |
|---|---|---|
| Podstawa prawna | Dowód wewnętrzny — ustawa o rachunkowości | Faktura VAT — ustawa o VAT |
| Wystawca | Firma kupująca (dowód własny) | Dostawca (dokument obcy) |
| Numer obcy | Generowany wewnętrznie | Numer faktury dostawcy |
| VAT naliczony | Odliczenie możliwe (zależnie od rodzaju zakupu) | Odliczenie standardowe |
| Kontrahent | Opcjonalny — może być bez Knt_KntId | Wymagany |

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.TraNag | Struktura dokumentu handlowego |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.DokDefinicje | Definicje typów dokumentów |
| OptimaMCP | narzędzia MCP | create_internal_purchase_proof | Endpoint API |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI] Dokładny kod `DDf_DDfID` dla FZWFZ — zależny od konfiguracji firmy
- [UNKNOWN] Czy FZWFZ wymaga podania NIP kontrahenta do odliczenia VAT?
- [UNKNOWN] Czy FZWFZ może być podstawą do wystawienia FZ przez dostawcę?

## Walidacja
- [x] MCP endpoint create_internal_purchase_proof potwierdzony
- [x] Struktura TraNag (współdzielona) potwierdzona w MSSQL
- [ ] Kod DDf_DDfID dla FZWFZ do potwierdzenia
- [ ] Dane testowe FZWFZ w CDN_TEST do weryfikacji