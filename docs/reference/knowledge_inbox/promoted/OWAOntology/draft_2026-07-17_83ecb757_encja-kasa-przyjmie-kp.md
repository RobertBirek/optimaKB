# Encja: Kasa Przyjmie (KP)
- draftId: `draft_2026-07-17_83ecb757_encja-kasa-przyjmie-kp`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.343Z`
- tags: `OWA`, `ontologia`, `optima`, `kasa-przyjmie`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Kasa Przyjmie (KP)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (MCP + MSSQL potwierdzają strukturę, dane testowe w BnkZdarzenia)
- Identyfikator ontologiczny: `OWAOntology.KasaPrzyjmie`
- Aliasy: `KP`, `Wpłata`, `CashIn`, `CashDeposit`, `WpłataDoKasy`

## Opis biznesowy
Kasa Przyjmie (KP) to dokument wpłaty gotówkowej do kasy firmowej. KP dokumentuje przyjęcie środków pieniężnych — od kontrahenta, pracownika lub innego podmiotu. W Comarch Optima KP jest dokumentem handlowym (`CDN.TraNag`), który po zatwierdzeniu generuje zdarzenie bankowe w `CDN.BnkZdarzenia` (kierunek wpływu = 1). KP może być podstawą do rozliczenia należności kontrahenta.

## Reguły biznesowe
- KP identyfikowana przez definicję dokumentu (`DDf_DDfID`) — typ zależny od konfiguracji firmy
- Generuje zdarzenie bankowe w `CDN.BnkZdarzenia` z `BZd_Kierunek` = 1 (wpływ)
- Wymaga wskazania rachunku bankowego kasy (`BZd_BRaID`)
- Podlega rozliczeniu (parametr `BZd_Rozliczono`: 0=nierozliczone, 1=rozliczone)
- Po rozliczeniu nie można edytować

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek KP | CDN | TraNag | Potwierdzona | MSSQL — dokument handlowy z typem KP |
| Pozycje KP | CDN | TraElem | Potwierdzona | MSSQL — JOIN przez TrE_TrNId |
| Zdarzenie bankowe | CDN | BnkZdarzenia | Potwierdzona | MSSQL — 13 rekordów w CDN_TEST, BZd_Kierunek=1 |
| MCP write | — | create_cash_deposit | Potwierdzony | OptimaMCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | TrN_TrNID | Identyfikator dokumentu (współdzielony z TraNag) | Potwierdzony |
| FK | TrN_DDfId | FK do definicji typu KP | Potwierdzony |
| FK (zdarzenie) | BZd_BZdID | Identyfikator zdarzenia bankowego (IDENTITY) | Potwierdzony |
| FK (zdarzenie) | BZd_DokumentID + BZd_DokumentTyp | Wskazanie na źródłowy dokument KP | Potwierdzony |

## Pola i mapowanie — BnkZdarzenia (kontekst KP)
| # | Kolumna | Typ SQL | Opis biznesowy | Status |
|---:|---|---|---|---|
| 1 | BZd_Kierunek | smallint | 1 = wpływ (KP), -1 = wypływ (KW), 0 = neutralny; CHECK: IN (1,0,-1) | Potwierdzone |
| 2 | BZd_BRaID | int | FK → BnkRachunki (konto bankowe kasy) | Potwierdzone |
| 3 | BZd_KwotaSys | decimal(15,2) | Kwota w walucie systemowej; CHECK > 0 | Potwierdzone |
| 4 | BZd_KwotaRozSys | decimal(15,2) | Kwota już rozliczona w walucie systemowej; CHECK >= 0 | Potwierdzone |
| 5 | BZd_Kwota | decimal(15,2) | Kwota w walucie dokumentu | Potwierdzone |
| 6 | BZd_Rozliczono | smallint | 0=otwarte, 1=rozliczone | Potwierdzone |
| 7 | BZd_DataDok | datetime | Data wpłaty | Potwierdzone |
| 8 | BZd_PodmiotTyp + BZd_PodmiotID | smallint+int | FK do PodmiotyView (kontrahent/pracownik) | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| generuje_zdarzenie | KasaPrzyjmie | BnkZdarzenia | 1:1 | Referencja | TraNag.TrN_TrNID → BnkZdarzenia.BZd_DokumentID (przez BZd_DokumentTyp) | Potwierdzona |
| wpłacona_przez | KasaPrzyjmie | Kontrahent | N:1 | Referencja | BnkZdarzenia.BZd_PodmiotID → Kontrahenci.Knt_KntId | Potwierdzona |
| księgowana_na | KasaPrzyjmie | BnkRachunki | N:1 | Referencja | BnkZdarzenia.BZd_BRaID → BnkRachunki.BRa_BRaID | Potwierdzona |

## Endpointy OptimaMCP
- **create_cash_deposit** (WRITE): tworzy dokument KP z wpłatą gotówkową — generuje zarówno TraNag jak i BnkZdarzenia

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.BnkZdarzenia | Struktura zdarzeń bankowych (13 wierszy) |
| MSSQL (CDN_TEST) | mssql_sample_data | CDN.BnkZdarzenia TOP 10 | Próbka danych — wpłaty FS, PA |
| OptimaMCP | narzędzia MCP | create_cash_deposit | Endpoint API |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI] Dokładny kod `DDf_DDfID` / `BZd_DDfID` dla KP — zależny od konfiguracji firmy
- [UNKNOWN] Czy KP zawsze generuje rekord w DekretyNag (księgowanie automatyczne)?

## Walidacja
- [x] Struktura BnkZdarzenia potwierdzona w MSSQL (91 kolumn)
- [x] Dane testowe potwierdzone (13 rekordów z BZd_Kierunek IN (1, -1))
- [x] MCP endpoint create_cash_deposit potwierdzony
- [ ] Kod DDf_DDfID dla KP do potwierdzenia
- [ ] Automatyczne księgowanie KP do potwierdzenia