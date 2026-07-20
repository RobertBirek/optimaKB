# Encja: Faktura Proforma (FPF)
- draftId: `draft_2026-07-17_b857aef5_encja-faktura-proforma-fpf`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.777Z`
- tags: `OWA`, `ontologia`, `optima`, `faktura-proforma`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Faktura Proforma (FPF)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.FakturaProforma`
- Aliasy: `FPF`, `Proforma`, `ProformaInvoice`

## Opis biznesowy
Faktura Proforma (FPF) w Comarch Optima jest dokumentem handlowym o charakterze ofertowo-przedpłatowym, który nie stanowi jeszcze dokumentu księgowego ani magazynowego. Służy do wezwania do zapłaty przed realizacją sprzedaży. Z proformy można wygenerować fakturę zaliczkową (`advance_invoice_from_proforma`) lub dalsze dokumenty sprzedażowe w zależności od procesu. Dokument prawdopodobnie opiera się na modelu `TraNag`/`TraElem` z odrębnym typem dokumentu.

## Reguły biznesowe
- FPF nie wpływa bezpośrednio na stany magazynowe
- FPF nie stanowi wpisu księgowego ani VAT
- Może poprzedzać fakturę zaliczkową
- Z FPF można wygenerować FA zaliczkową przez dedykowany workflow
- Może być wystawiona dla kontrahenta i zawierać pozycje towarowe/usługowe

## Źródła danych
| Rola źródła | Schemat | Tabela | Status | Dowód |
|---|---|---|---|---|
| Nagłówek dokumentu | CDN | TraNag | Pośrednio potwierdzona | Model nadrzędny |
| Pozycje dokumentu | CDN | TraElem | Pośrednio potwierdzona | Model nadrzędny |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_proforma | POST /api/v1/sales/proforma | Potwierdzone |
| WRITE | advance_invoice_from_proforma | POST /api/v1/workflow/proforma/advance | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | [UNKNOWN: TrN_TrNID?] | ID dokumentu FPF | Do potwierdzenia |
| FK | [UNKNOWN] | FK do kontrahenta | Pośrednio potwierdzone |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| dotyczy_kontrahenta | FakturaProforma | Kontrahent | N:1 | Przez model dokumentu handlowego |
| zawiera_pozycje | FakturaProforma | Towar | N:M | Przez TraElem |
| poprzedza_zaliczke | FakturaProforma | FakturaZaliczkowa | 1:N / 1:1 | Workflow proforma→advance |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| OptimaMCP | create_proforma | API WRITE |
| OptimaMCP | advance_invoice_from_proforma | Workflow FPF→FA zaliczkowa |
| Ontologia nadrzędna | Dokument handlowy | Model TraNag/TraElem |

## Otwarte problemy
- [UNKNOWN: dokładny typ dokumentu FPF w TraNag]
- [UNKNOWN: czy proforma trafia do osobnych tabel pomocniczych]
- [UNKNOWN: jak przechowywana jest relacja do dokumentu zaliczkowego]
- [UNKNOWN: czy FPF może być bezpośrednio konwertowana do FS]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15