# Encja: Rejestr VAT
- draftId: `draft_2026-07-17_1ba6ca02_encja-rejestr-vat`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:42:25.412Z`
- tags: `OWA`, `ontologia`, `optima`, `rejestr-vat`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Rejestr VAT

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.RejestrVAT`
- Aliasy: `VatNag`, `VATRegister`, `VatRejestr`

## Opis biznesowy
Rejestr VAT w Comarch Optima to ewidencja zakupów i sprzedaży dla celów podatku VAT. Tabela `CDN.VatNag` przechowuje wpisy rejestru, każdy z typem (`VaN_Typ`) i rodzajem (`VaN_Rodzaj`). Wpisy są grupowane według rejestru (`VaN_Rejestr`) i okresu rozliczeniowego (`VaN_RokMies` — format YYYYMM). Rejestr zawiera dane kontrahenta (zdublowane w polach VaN_Knt*), kwoty netto/VAT/brutto, dane dotyczące kursów walut, oraz znaczniki dla różnych reżimów VAT (metoda kasowa, VAT 7, VAT UE, VAT 27, JPK_FA). Wpis może być powiązany z dokumentem handlowym (`VaN_TrnID` → `TraNag`) i dekretem księgowym (`VaN_DekID` → `DekretyNag`).

## Reguły biznesowe
- Wpis rejestru ma typ i rodzaj (`VaN_Typ`, `VaN_Rodzaj`)
- Okres rozliczeniowy — `VaN_RokMies` (YYYYMM)
- Wpis zawiera pełne dane adresowe kontrahenta (zdublowane)
- Rejestr rozróżnia zakup (`VaN_WartoscZak`) i sprzedaż
- Obsługa różnych reżimów: metoda kasowa, VAT 7, VAT UE, VAT 27, JPK_FA
- Korekta VAT — `VaN_KorektaVAT`
- Wpis finalny — `VaN_Finalny`
- Wpis może być oznaczony jako eksport — `VaN_Export`
- Obsługa małego podatnika — `VaN_MalyPod`, rolnika — `VaN_Rolnik`
- Rozliczono/zapłacono — `VaN_Rozliczono`, `VaN_Zaplacono`

## Źródła danych
| Rola źródła | Schemat | Tabela | PK | Stan | Dowód |
|---|---|---|---|---|---|
| Rejestr VAT | CDN | VatNag | VaN_VaNID (int, IDENTITY) | Potwierdzona | MSSQL |
| Dokumenty handlowe | CDN | TraNag | — | Potwierdzona | FK VaN_TrnID |
| Dekrety księgowe | CDN | DekretyNag | — | Potwierdzona | FK VaN_DekID |

## Endpointy OptimaMCP
| Kierunek | Narzędzie MCP | Endpoint API | Status |
|---|---|---|---|
| READ | list_vat_registers | — | Potwierdzone |
| READ | list_vat_lines | — | Potwierdzone |
| READ | list_vat_codes | — | Potwierdzone |
| WRITE | create_vat_register | POST /api/v1/vat-registers | Potwierdzone |
| WRITE | create_vat_sales_register | POST /api/v1/tax/sales-register | Potwierdzone |
| WRITE | create_vat_purchase_register | POST /api/v1/tax/purchase-register | Potwierdzone |

## Identyfikatory — VatNag
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | VaN_VaNID | Unikalny identyfikator wpisu (int, IDENTITY) | Potwierdzony |
| FK | VaN_TrnID | FK do TraNag (dokument źródłowy) | Potwierdzony |
| FK | VaN_DekID | FK do DekretyNag (dekret księgowy) | Potwierdzony |
| FK | VaN_PodmiotTyp + VaN_PodID | FK do PodmiotyView (kontrahent) | Potwierdzony |
| FK | VaN_KatID | FK do Kategorie.Kat_KatID | Potwierdzony |

## Kluczowe pola MSSQL — VatNag
| Kolumna | Typ | Opis |
|---|---|---|
| VaN_VaNID | int (PK, IDENTITY) | ID wpisu |
| VaN_Typ | smallint | Typ dokumentu |
| VaN_Rodzaj | tinyint | Rodzaj |
| VaN_Rejestr | nvarchar(20) | Nazwa rejestru |
| VaN_RokMies | int | Rok/miesiąc (YYYYMM) |
| VaN_Lp | int | Liczba porządkowa |
| VaN_DataObowiazkuPodatkowego | datetime | Data obowiązku podatkowego |
| VaN_DataPrawaOdliczenia | datetime | Data prawa odliczenia |
| VaN_Dokument | nvarchar(256) | Numer dokumentu |
| VaN_RazemNetto | decimal(15,2) | Suma netto |
| VaN_RazemVAT | decimal(15,2) | Suma VAT |
| VaN_RazemBrutto | decimal(15,2) | Suma brutto |
| VaN_KwotaNKUP | decimal(15,2) | Kwota NKUP |
| VaN_VATNKUP | decimal(15,2) | VAT NKUP |
| VaN_Waluta | varchar(3) | Kod waluty |
| VaN_KursL | decimal(15,4) | Kurs licznik |
| VaN_KursM | decimal(5,0) | Kurs mianownik |
| VaN_Zaplata | decimal(15,2) | Kwota zapłaty |
| VaN_MetodaKasowa | tinyint | Metoda kasowa |
| VaN_JPK_FA | tinyint | Znacznik JPK_FA |
| VaN_Korekta | tinyint | Czy korekta |
| VaN_Finalny | tinyint | Czy wpis finalny |
| VaN_Wewnetrzna | tinyint | Faktura wewnętrzna |
| VaN_Fiskalna | tinyint | Fiskalna |
| VaN_Zaplacono | tinyint | Czy zapłacono |

## Relacje ontologiczne
| Predykat | Źródło | Cel | Kardynalność | Warunek JOIN |
|---|---|---|---|---|
| dotyczy_kontrahenta | RejestrVAT | Kontrahent | N:1 | VatNag.VaN_PodID → PodmiotyView |
| pochodzi_z_dokumentu | RejestrVAT | TraNag | N:1 | VatNag.VaN_TrnID → TraNag |
| generuje_dekret | RejestrVAT | DekretKsiegowy | 1:1 | VatNag.VaN_DekID → DekretyNag |
| zawiera_linie | RejestrVAT | VatElem | 1:N | VatElem → VatNag |

## Pochodzenie wiedzy
| Typ źródła | Narzędzie | Zakres |
|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | Pełny schemat VatNag (122 kolumny) |
| OptimaMCP | list_vat_registers, list_vat_lines, list_vat_codes | API READ |
| OptimaMCP | create_vat_register, create_vat_sales_register, create_vat_purchase_register | API WRITE |

## Otwarte problemy
- [UNKNOWN: struktura VatElem — tabela elementów rejestru VAT]
- [UNKNOWN: znaczenie kodów VaN_Typ i VaN_Rodzaj]
- [UNKNOWN: relacja między VaN_VanOrgId a oryginalnym wpisem]

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Data ostatniej aktualizacji: 2026-07-15