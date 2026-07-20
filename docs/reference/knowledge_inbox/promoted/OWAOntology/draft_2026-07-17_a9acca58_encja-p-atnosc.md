# Encja: Płatność
- draftId: `draft_2026-07-17_a9acca58_encja-p-atnosc`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:45.595Z`
- tags: `OWA`, `ontologia`, `optima`, `platnosc`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Płatność

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.Platnosc`
- Aliasy: `BnkZdarzenia`, `Payment`, `BankEvent`

## Opis biznesowy
Płatności w Comarch Optima są reprezentowane przez zdarzenia bankowe (`CDN.BnkZdarzenia`). Każda płatność ma kierunek (wpłata/wypłata), podlega rozliczeniu z rozrachunkami (`CDN.KsiRozrachunki`) i jest powiązana z kontrahentem, rachunkiem bankowym oraz dokumentem źródłowym. Płatności mogą być realizowane przelewem SEPA, z podzieloną płatnością (Split Payment) oraz podlegać windykacji.

## Reguły biznesowe
- Płatność ma kierunek: 0 (neutralny), 1 (wpłata), -1 (wypłata) — `CK_BZd_Kierunek`
- Kwota płatności > 0 — `CK_BZd_Kwota`
- Kwota rozliczona >= 0 — `CK_BZd_KwotaRoz`, `CK_BZd_KwotaRozSys`
- Płatność rozlicza rozrachunki — flagi `BZd_Rozliczono`, `BZd_Rozliczono2`
- Obsługa Split Payment — `BZd_SplitPay`, `BZd_SplitPayKwotaVAT`
- Płatność może być oznaczona jako przelew SEPA — `BZd_PrzelewSEPA`
- Płatność może podlegać zajęciu komorniczemu — `BZd_KomornikZajecieWynagr`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Zdarzenia bankowe | CDN | BnkZdarzenia | Potwierdzona | MSSQL CDN_TEST (13 wierszy) |
| Rachunki bankowe | CDN | BnkRachunki | Potwierdzona | FK BZd_BRaID |
| Banki | CDN | BnkNazwy | Potwierdzona | FK BZd_BNaID |
| Rachunki US | CDN | UrzRachunki | Potwierdzona | FK BZd_URaID |
| Definicje dokumentów | CDN | DokDefinicje | Potwierdzona | FK BZd_DDfID |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Zweryfikowane pola | Status |
|---|---|---|---|
| READ | list_payments | id, fullNumber, externalNumber, entityId, documentDate, dueDate, amount, systemAmount, isSettled, updatedAt | Potwierdzone |
| WRITE | pay_document | POST /api/v1/settlements/pay/{id} | Potwierdzone |
| WRITE | settle_payment | POST /api/v1/workflow/payment/settle | Potwierdzone |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | BZd_BZdID | Unikalny identyfikator zdarzenia bankowego (int, IDENTITY) | Potwierdzony | MSSQL |
| FK | BZd_BRaID | FK do BnkRachunki.BRa_BRaID | Potwierdzony | MSSQL FK |
| FK | BZd_BNaID | FK do BnkNazwy.BNa_BNaId | Potwierdzony | MSSQL FK |
| FK | BZd_URaID | FK do UrzRachunki.URa_URaId | Potwierdzony | MSSQL FK |
| FK | BZd_PodmiotTyp + BZd_PodmiotID | FK do PodmiotyView | Potwierdzony | MSSQL FK |

## Kluczowe pola MSSQL
| Kolumna | Typ | Opis |
|---|---|---|
| BZd_Kwota | decimal(15,2) | Kwota płatności (waluta płatności) |
| BZd_KwotaSys | decimal(15,2) | Kwota płatności (waluta systemowa) |
| BZd_KwotaRoz | decimal(15,2) | Kwota już rozliczona |
| BZd_KwotaRozSys | decimal(15,2) | Kwota rozliczona systemowa |
| BZd_Kierunek | smallint | 0=neutralny, 1=wpłata, -1=wypłata |
| BZd_DataDok | datetime | Data dokumentu |
| BZd_Termin | datetime | Termin płatności |
| BZd_DataReal | datetime | Data realizacji |
| BZd_Rozliczono | smallint | Status rozliczenia (1) |
| BZd_Rozliczono2 | smallint | Status rozliczenia (2) |
| BZd_Stan | smallint | Stan dokumentu |
| BZd_Waluta | varchar(3) | Kod waluty |
| BZd_SplitPay | tinyint | Podzielona płatność |
| BZd_PrzelewSEPA | tinyint | Przelew SEPA |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| rozlicza | Platnosc | Rozrachunek | N:M | BnkZdarzenia → KsiRozrachunki |
| dotyczy_kontrahenta | Platnosc | Kontrahent | N:1 | BnkZdarzenia → PodmiotyView |
| z_rachunku | Platnosc | RachunekBankowy | N:1 | BnkZdarzenia → BnkRachunki |
| przez_bank | Platnosc | Bank | N:1 | BnkZdarzenia → BnkNazwy |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | Pelny schemat 91 kolumn + klucze + indeksy |
| OptimaMCP | list_payments (zweryfikowane) | API READ |
| OptimaMCP | pay_document, settle_payment | API WRITE |

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15