# Encja: Korekta zbiorcza FA
- draftId: `draft_2026-07-17_941acb19_encja-korekta-zbiorcza-fa`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:26.002Z`
- tags: `OWA`, `ontologia`, `optima`, `korekta-zbiorcza-fa`, `do-weryfikacji`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Korekta zbiorcza FA

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni`
- Identyfikator ontologiczny: `OWAOntology.KorektaZbiorczaFA`
- Aliasy: `KorektaZbiorcza`, `FAKZ`, `CorrectionBatch`

## Opis biznesowy
Korekta zbiorcza FA to specjalny dokument korygujący obejmujący wiele faktur sprzedaży jednocześnie. Używany do globalnych korekt wartościowych lub formalnych dla zestawu dokumentów sprzedażowych. W Optimie prawdopodobnie bazuje na standardowym modelu dokumentu handlowego (`TraNag`, `TraElem`) z dodatkowym workflow i regułami transformacji.

## Reguły biznesowe
- Koryguje wiele dokumentów źródłowych jednocześnie
- Dotyczy dokumentów sprzedaży (FA)
- Może generować skutki VAT i rozrachunkowe
- Prawdopodobnie tworzy relacje w tabeli `CDN.TraRelacje` lub odpowiedniku [UNKNOWN]
- Workflow może być zbliżony do `create_sales_correction`, ale dla wielu źródeł [UNKNOWN]

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Dokument handlowy | CDN | TraNag | Pośrednio potwierdzona | Model nadrzędny |
| Pozycje dokumentu | CDN | TraElem | Pośrednio potwierdzona | Model nadrzędny |
| Relacje dokumentów | CDN | TraRelacje / DokumentRelacje | Niepotwierdzona | Do ustalenia |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| WRITE | [brak dedykowanego endpointu] | — | Niepotwierdzone |
| WRITE | create_sales_correction | POST /api/v1/sales/correction | Pośrednio powiązane |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | [UNKNOWN] | ID dokumentu korekty zbiorczej | Oczekuje potwierdzenia |
| FK | [UNKNOWN] | Referencje do wielu dokumentów źródłowych | Oczekuje potwierdzenia |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| koryguje_dokumenty | KorektaZbiorczaFA | FakturaSprzedazy | N:M | Przez tabelę relacji |
| generuje_rozrachunki | KorektaZbiorczaFA | Rozrachunek | 1:N | Przez workflow sprzedażowy |
| wpływa_na_vat | KorektaZbiorczaFA | RejestrVAT | 1:N | Przez zapis VAT |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| OptimaMCP | create_sales_correction | API WRITE dla korekt FS |
| Ontologia nadrzędna | Dokument handlowy | Model bazowy |

## Otwarte problemy
- [UNKNOWN: czy korekta zbiorcza ma własny typ dokumentu w TraNag]
- [UNKNOWN: jak modelowane są relacje do wielu dokumentów źródłowych]
- [UNKNOWN: czy istnieje osobny endpoint MCP lub workflow]
- [UNKNOWN: skutki magazynowe i VAT zależne od typu korekty]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15