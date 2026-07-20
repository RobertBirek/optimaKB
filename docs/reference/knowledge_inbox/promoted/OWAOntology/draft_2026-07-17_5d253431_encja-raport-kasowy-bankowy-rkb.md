# Encja: Raport Kasowy/Bankowy (RKB)
- draftId: `draft_2026-07-17_5d253431_encja-raport-kasowy-bankowy-rkb`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.521Z`
- tags: `OWA`, `ontologia`, `optima`, `raport-kasowy-bankowy`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Raport Kasowy/Bankowy (RKB)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `średni` (MCP potwierdza endpoint; struktura MSSQL częściowo przez BnkZdarzenia i BnkRaporty)
- Identyfikator ontologiczny: `OWAOntology.RaportKasowyBankowy`
- Aliasy: `RKB`, `CashReport`, `BankReport`, `RaportKasowy`, `RaportBankowy`

## Opis biznesowy
Raport Kasowy/Bankowy (RKB) to dokument zbiorczy grupujący operacje kasowe (KP, KW) lub bankowe dla wybranego rachunku w danym okresie. RKB służy do okresowego podsumowania wpłat i wypłat, wyznaczenia salda początkowego i końcowego oraz stanowi podstawę do rozliczeń kasowych. W Comarch Optima RKB jest powiązany z kontem bankowym (`CDN.BnkRachunki`) i grupuje zdarzenia (`CDN.BnkZdarzenia`). Dane z RKB trafiają do tabel raportów bankowych (`CDN.BnkRaporty`).

## Reguły biznesowe
- RKB grupuje zdarzenia bankowe (`CDN.BnkZdarzenia`) dla konkretnego rachunku (`BZd_BRaID`)
- Określa saldo początkowe (BO) i saldo końcowe (BZ)
- Zawiera listę wpłat (KP, wpływy) i wypłat (KW, wypływy)
- Każdy RKB jest przypisany do rachunku bankowego (kasy lub konta bankowego)
- Dane w CDN_TEST: `CDN.BnkRaporty` (2 wiersze), `CDN.BnkRozKwoty` (1 wiersz)

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Raporty bankowe | CDN | BnkRaporty | Potwierdzona | MSSQL — 2 wiersze |
| Kwoty rozliczeń | CDN | BnkRozKwoty | Potwierdzona | MSSQL — 1 wiersz |
| Relacje rozliczeń | CDN | BnkRozRelacje | Potwierdzona | MSSQL — 2 wiersze |
| Zdarzenia | CDN | BnkZdarzenia | Potwierdzona | MSSQL — 13 wierszy |
| MCP write | — | create_cash_report | Potwierdzony | OptimaMCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK (zdarzenia) | BZd_BZdID | Identyfikator zdarzenia bankowego | Potwierdzony |
| FK | BZd_BRaID | FK → BnkRachunki (rachunek którego dotyczy raport) | Potwierdzony |
| Grupujący | BZd_DataDok | Data dokumentu — używana do grupowania w raporcie | Potwierdzony |
| Grupujący | BZd_Kierunek | 1=wpływ, -1=wypływ — używane do kategoryzacji | Potwierdzony |

## Pola i mapowanie — kluczowe kolumny
| # | Tabela | Kolumna | Typ SQL | Opis biznesowy | Status |
|---:|---|---|---|---|---|
| 1 | BnkZdarzenia | BZd_BRaID | int | Rachunek bankowy/kasowy raportu | Potwierdzone |
| 2 | BnkZdarzenia | BZd_Kierunek | smallint | 1=wpływ, -1=wypływ | Potwierdzone |
| 3 | BnkZdarzenia | BZd_KwotaSys | decimal(15,2) | Kwota w walucie systemowej | Potwierdzone |
| 4 | BnkZdarzenia | BZd_Rozliczono | smallint | Status rozliczenia (0/1) | Potwierdzone |
| 5 | BnkZdarzenia | BZd_DataDok | datetime | Data dokumentu źródłowego | Potwierdzone |
| 6 | BnkZdarzenia | BZd_DataReal | datetime | Data rzeczywista operacji | Potwierdzone |
| 7 | BnkRaporty | BRa_BRaID | int | PK raportu bankowego | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| grupuje_zdarzenia | RaportKasowyBankowy | BnkZdarzenia | 1:N | Agregacja | BnkZdarzenia.BZd_BRaID → BnkRachunki.BRa_BRaID (filtrowane po zakresie dat) | Potwierdzona |
| dotyczy_rachunku | RaportKasowyBankowy | KontoBankowe | N:1 | Referencja | BnkZdarzenia.BZd_BRaID → BnkRachunki.BRa_BRaID | Potwierdzona |
| zawiera_KP | RaportKasowyBankowy | KasaPrzyjmie | 1:N | Agregacja | BZd_Kierunek=1 | Potwierdzona |
| zawiera_KW | RaportKasowyBankowy | KasaWyda | 1:N | Agregacja | BZd_Kierunek=-1 | Potwierdzona |

## Endpointy OptimaMCP
- **create_cash_report** (WRITE): tworzy raport kasowy/bankowy grupujący KP/KW dla zadanego okresu

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.BnkZdarzenia | Zdarzenia bankowe |
| MSSQL (CDN_TEST) | mssql_list_tables | CDN.BnkRaporty, CDN.BnkRozKwoty, CDN.BnkRozRelacje | Tabele wspierające raporty |
| OptimaMCP | narzędzia MCP | create_cash_report | Endpoint API |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI] Dokładna struktura tabeli `CDN.BnkRaporty` — poza `mssql_list_tables` nie zbadana `mssql_describe_table`
- [WYMAGA WERYFIKACJI] Mechanizm wyznaczania salda początkowego (BO) — czy jest przechowywany czy liczony?
- [UNKNOWN] Czy RKB jest dokumentem księgowym (PK), czy tylko raportem pomocniczym?

## Walidacja
- [x] MCP endpoint create_cash_report potwierdzony
- [x] Istnienie tabel BnkRaporty, BnkRozKwoty, BnkRozRelacje potwierdzone
- [x] Relacja z BnkZdarzenia potwierdzona przez FK BZd_BRaID
- [ ] Pełna struktura BnkRaporty do potwierdzenia
- [ ] Mechanizm sald BO/BZ do wyjaśnienia