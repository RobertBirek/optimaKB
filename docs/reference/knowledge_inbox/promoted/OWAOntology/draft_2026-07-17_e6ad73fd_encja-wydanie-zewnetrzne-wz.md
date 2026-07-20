# Encja: Wydanie Zewnętrzne (WZ)
- draftId: `draft_2026-07-17_e6ad73fd_encja-wydanie-zewnetrzne-wz`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.926Z`
- tags: `OWA`, `ontologia`, `optima`, `wydanie-zewnetrzne`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Wydanie Zewnętrzne (WZ)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.WydanieZewnetrzne`
- Aliasy: `WZ`, `GoodsIssue`, `IssueDocument`

## Opis biznesowy
Wydanie Zewnętrzne (WZ) w Comarch Optima to dokument magazynowy potwierdzający fizyczne wydanie towaru z magazynu do odbiorcy. Zmniejsza stan magazynowy i może stanowić etap pośredni między zamówieniem odbiorcy (RO) a fakturą sprzedaży (FS). W praktyce workflow często przebiega jako `RO → WZ → FS` lub `RO → WZ + FS` przy pełnej realizacji. WZ opiera się na modelu dokumentu handlowo-magazynowego (`TraNag`, `TraElem`) z przypisaniem magazynu źródłowego/docelowego i skutkiem ilościowym.

## Reguły biznesowe
- WZ zmniejsza stan magazynowy
- WZ jest dokumentem magazynowym, ale może być powiązane z procesem sprzedaży
- Może być utworzone bezpośrednio (`create_goods_issue`) lub przez workflow z RO (`fulfill_order`, `complete_order`)
- Może być powiązane z fakturą sprzedaży jako dokument źródłowy
- Każda pozycja WZ odnosi się do towaru i magazynu
- WZ może mieć korektę lub zwrot w odrębnym workflow [UNKNOWN szczegóły]

## Źródła danych
| Rola źródła | Schemat | Tabela | Status | Dowód |
|---|---|---|---|---|
| Nagłówek dokumentu | CDN | TraNag | Pośrednio potwierdzona | Model nadrzędny dokumentów |
| Pozycje dokumentu | CDN | TraElem | Pośrednio potwierdzona | Model nadrzędny dokumentów |
| Relacje workflow | CDN | TraRelacje / DokumentRelacje | Częściowo potwierdzona | Ontologia relacji |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | create_goods_issue | POST /api/v1/warehouse/issue | Potwierdzone |
| WRITE | fulfill_order | POST /api/v1/workflow/order/fulfill | Potwierdzone |
| WRITE | complete_order | POST /api/v1/workflow/order/complete | Potwierdzone |
| READ | get_warehouse_doc | GET /api/v1/warehouse-docs/{id} | Potwierdzone |
| READ | list_warehouse_docs | — | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | [UNKNOWN: TrN_TrNID?] | ID dokumentu WZ | Do potwierdzenia |
| FK | [UNKNOWN] | FK do magazynu | Do potwierdzenia |
| FK | [UNKNOWN] | FK do dokumentu źródłowego RO | Częściowo potwierdzone |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| wydaje_z_magazynu | WydanieZewnetrzne | Magazyn | N:1 | Przez pola magazynowe TraNag |
| zawiera_towar | WydanieZewnetrzne | Towar | N:M | Przez TraElem |
| realizuje_zamowienie | WydanieZewnetrzne | RezerwacjaOdbiorcy | N:1 / N:M | Przez workflow RO→WZ |
| poprzedza_fakture | WydanieZewnetrzne | FakturaSprzedazy | 1:N / 1:1 | Przez workflow WZ→FS |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| OptimaMCP | create_goods_issue | API WRITE dla WZ |
| OptimaMCP | fulfill_order, complete_order | Workflow RO→WZ / RO→WZ+FS |
| OptimaMCP | get_warehouse_doc, list_warehouse_docs | API READ dokumentów magazynowych |
| Ontologia nadrzędna | Dokument handlowy / magazynowy | Model TraNag/TraElem |

## Otwarte problemy
- [UNKNOWN: dokładny typ dokumentu WZ w TraNag]
- [UNKNOWN: jednoznaczne mapowanie kolumn magazynowych i kontrahenta]
- [UNKNOWN: czy WZ ma własny byt w tabelach poza TraNag/TraElem]
- [UNKNOWN: pełna relacja korekt/zwrotów WZ]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15