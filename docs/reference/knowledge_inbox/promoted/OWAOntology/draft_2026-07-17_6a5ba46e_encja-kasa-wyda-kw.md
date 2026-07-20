# Encja: Kasa Wyda (KW)
- draftId: `draft_2026-07-17_6a5ba46e_encja-kasa-wyda-kw`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:48.189Z`
- tags: `OWA`, `ontologia`, `optima`, `kasa-wyda`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Kasa Wyda (KW)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (MCP + MSSQL potwierdzają strukturę; dane testowe dla BZd_Kierunek = -1)
- Identyfikator ontologiczny: `OWAOntology.KasaWyda`
- Aliasy: `KW`, `Wypłata`, `CashOut`, `CashWithdrawal`, `WypłataZKasy`

## Opis biznesowy
Kasa Wyda (KW) to dokument wypłaty gotówkowej z kasy firmowej. KW dokumentuje wydanie środków pieniężnych — dla kontrahenta (zapłata za fakturę), pracownika (zaliczka) lub innego podmiotu. W Comarch Optima KW jest dokumentem handlowym (`CDN.TraNag`), który po zatwierdzeniu generuje zdarzenie bankowe w `CDN.BnkZdarzenia` (kierunek wypływu = -1). KW zmniejsza stan kasy.

## Reguły biznesowe
- KW identyfikowana przez definicję dokumentu (`DDf_DDfID`) — typ zależny od konfiguracji firmy
- Generuje zdarzenie bankowe w `CDN.BnkZdarzenia` z `BZd_Kierunek` = -1 (wypływ)
- Wymaga wskazania rachunku bankowego kasy (`BZd_BRaID`)
- Podlega rozliczeniu (`BZd_Rozliczono`)
- Dane testowe CDN_TEST pokazują wypłaty dla `BZd_DDfID` = 43 (wynagrodzenia) oraz 11 (FZ — zapłata za fakturę zakupu)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek KW | CDN | TraNag | Potwierdzona | MSSQL — dokument handlowy z typem KW |
| Pozycje KW | CDN | TraElem | Potwierdzona | MSSQL — JOIN przez TrE_TrNId |
| Zdarzenie bankowe | CDN | BnkZdarzenia | Potwierdzona | MSSQL — BZd_Kierunek = -1 (rekordy 4 i 5) |
| MCP write | — | create_cash_withdrawal | Potwierdzony | OptimaMCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | TrN_TrNID | Identyfikator dokumentu (współdzielony z TraNag) | Potwierdzony |
| FK | TrN_DDfId | FK do definicji typu KW | Potwierdzony |
| FK (zdarzenie) | BZd_BZdID | Identyfikator zdarzenia bankowego | Potwierdzony |
| FK (zdarzenie) | BZd_DokumentID + BZd_DokumentTyp | Wskazanie na źródłowy dokument KW | Potwierdzony |

## Pola i mapowanie — BnkZdarzenia (kontekst KW)
| # | Kolumna | Typ SQL | Opis biznesowy | Status |
|---:|---|---|---|---|
| 1 | BZd_Kierunek | smallint | -1 = wypływ (KW); CHECK: IN (1,0,-1) | Potwierdzone |
| 2 | BZd_BRaID | int | FK → BnkRachunki (konto bankowe kasy) | Potwierdzone |
| 3 | BZd_KwotaSys | decimal(15,2) | Kwota wypłaty w walucie systemowej; CHECK > 0 | Potwierdzone |
| 4 | BZd_KwotaRozSys | decimal(15,2) | Kwota już rozliczona w walucie systemowej; CHECK >= 0 | Potwierdzone |
| 5 | BZd_Opis | nvarchar(254) | Opis: "Wypłata: E/2025/04/1" lub "Dok.: 12345 (Faktura zakupu)" | Potwierdzone |
| 6 | BZd_Rozliczono | smallint | 0=otwarte, 1=rozliczone | Potwierdzone |
| 7 | BZd_Termin | datetime | Termin zapłaty | Potwierdzone |
| 8 | BZd_FPlId | int | FK → FormyPlatnosci (forma płatności) | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| generuje_zdarzenie | KasaWyda | BnkZdarzenia | 1:1 | Referencja | TraNag.TrN_TrNID → BnkZdarzenia.BZd_DokumentID (przez BZd_DokumentTyp) | Potwierdzona |
| wypłacona_dla | KasaWyda | Kontrahent | N:1 | Referencja | BnkZdarzenia.BZd_PodmiotID → Kontrahenci.Knt_KntId | Potwierdzona |
| księgowana_z | KasaWyda | BnkRachunki | N:1 | Referencja | BnkZdarzenia.BZd_BRaID → BnkRachunki.BRa_BRaID | Potwierdzona |
| rozlicza_fakturę | KasaWyda | FakturaZakupu | N:1 | Referencja | BnkZdarzenia.BZd_PrwID → TraNag.TrN_TrNID (BZd_PrwTyp=1) | Potwierdzona |

## Endpointy OptimaMCP
- **create_cash_withdrawal** (WRITE): tworzy dokument KW z wypłatą gotówkową — generuje TraNag + BnkZdarzenia

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.BnkZdarzenia | Struktura zdarzeń bankowych |
| MSSQL (CDN_TEST) | mssql_sample_data | CDN.BnkZdarzenia | Próbka: BZdID=4 (wypłata wynagrodzenia E/2025/04/1, -572.01), BZdID=5 (zapłata za FZ 12345, -1230) |
| OptimaMCP | narzędzia MCP | create_cash_withdrawal | Endpoint API |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI] Dokładny kod `DDf_DDfID` dla KW — zależny od konfiguracji firmy
- [UNKNOWN] Czy KW może być dokumentem źródłowym dla deklaracji podatkowych?

## Walidacja
- [x] Struktura BnkZdarzenia potwierdzona w MSSQL
- [x] Dane testowe potwierdzają BZd_Kierunek = -1 dla wypłat (rekordy 4, 5)
- [x] MCP endpoint create_cash_withdrawal potwierdzony
- [ ] Kod DDf_DDfID dla KW do potwierdzenia
- [ ] Automatyczne księgowanie KW do potwierdzenia