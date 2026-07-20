# Encja: Dokument księgowy (PK/BO/WB)
- draftId: `draft_2026-07-17_ebd9a989_encja-dokument-ksiegowy-pk-bo-wb`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:34:02.634Z`
- tags: `OWA`, `ontologia`, `optima`, `dokument-ksiegowy`, `częściowo-zweryfikowane`
- reviewNote: Approved from inbox row
## Content
# Encja: Dokument księgowy (PK/BO/WB)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki` (struktury MSSQL potwierdzone; tabele DekretyNag, DekretyElem, KsiDokNag, KsiDokElem)
- Identyfikator ontologiczny: `OWAOntology.DokumentKsiegowy`
- Aliasy: `PK`, `BO`, `WB`, `PolecenieKsiegowania`, `BilansOtwarcia`, `WyciagBankowy`, `AccountingDocument`, `JournalEntry`

## Opis biznesowy
Dokument księgowy PK/BO/WB to podstawowa encja w module księgowym Comarch Optima. Reprezentuje zapis księgowy — pojedynczą operację księgową zdefiniowaną przez dekret (Winien/Ma). Występuje w trzech głównych wariantach:
- **PK** (Polecenie Księgowania) — ręczny lub automatyczny dokument księgowy
- **BO** (Bilans Otwarcia) — zapis sald początkowych na początek roku obrotowego
- **WB** (Wyciąg Bankowy) — zapis operacji bankowych z wyciągu

W MSSQL dokument księgowy jest rozbity na 4 tabele: `CDN.DekretyNag` (nagłówek dekretu), `CDN.DekretyElem` (elementy dekretu — linie Wn/Ma), `CDN.KsiDokNag` (nagłówek dokumentu księgowego), `CDN.KsiDokElem` (elementy dokumentu księgowego).

## Reguły biznesowe
- Każdy dokument księgowy ma nagłówek (`CDN.KsiDokNag`) i elementy (`CDN.KsiDokElem`)
- Każdy dokument jest przypisany do dziennika (`DeN_DziId`) i okresu obrachunkowego (`DeN_OObId`)
- Elementy dekretu definiują konta Wn (Debit) i Ma (Credit) z kwotami
- Kwoty w nagłówku: `DeN_KwotaWn` = suma Winien, `DeN_KwotaMa` = suma Ma — muszą się bilansować
- Dokument może być buforem (`DeN_Bufor` = 1) przed finalnym zapisem
- Storno (`DeN_Storno`) pozwala na korektę zapisów
- Numeracja per dziennik (`DeN_NrDziennika`) i per księga (`DeN_NrKsiegi`)
- `KsiDokElem` wiąże się z `DekretyElem` przez `KDE_DeEID`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Nagłówek dekretu | CDN | DekretyNag | Potwierdzona | MSSQL — 51 kolumn, 0 wierszy |
| Elementy dekretu | CDN | DekretyElem | Potwierdzona | MSSQL — 32 kolumny, 0 wierszy |
| Nagłówek dok. księgowego | CDN | KsiDokNag | Potwierdzona | MSSQL — 41 kolumn, 0 wierszy |
| Elementy dok. księgowego | CDN | KsiDokElem | Potwierdzona | MSSQL — 16 kolumn, 0 wierszy |
| MCP read | — | list_dekretynag, list_dekretyelem | Potwierdzony | OptimaMCP |
| MCP write | — | create_accounting_document, accounting_post, accounting_decree, accounting_cancel, accounting_repost, accounting_close_period | Potwierdzony | OptimaMCP |

## Identyfikatory
| Typ | Pole | Znaczenie | Status |
|---|---|---|---|
| PK | DeN_DeNId | Identyfikator nagłówka dekretu (IDENTITY) | Potwierdzony |
| PK | DeE_DeEId | Identyfikator elementu dekretu (IDENTITY) | Potwierdzony |
| PK | KDN_KDNId | Identyfikator nagłówka dokumentu księgowego (IDENTITY) | Potwierdzony |
| PK | KDE_KDEId | Identyfikator elementu dokumentu księgowego (IDENTITY) | Potwierdzony |
| FK | DeE_DeNId | FK → DekretyNag (element należy do dekretu) | Potwierdzony |
| FK | KDE_KDNId | FK → KsiDokNag (element należy do dokumentu) | Potwierdzony |
| FK | KDE_DeEID | FK → DekretyElem (powiązanie elementu z dekretem) | Potwierdzony |

## Pola i mapowanie — DekretyNag (nagłówek)
| # | Kolumna | Typ SQL | Nullable | Opis biznesowy | Status |
|---:|---|---|---|---|---|
| 1 | DeN_DeNId | int | N | PK — identyfikator dekretu | Potwierdzone |
| 2 | DeN_Typ | int | N | Typ dekretu | Potwierdzone |
| 3 | DeN_OObId | int | N | FK → OkresyOb (okres obrachunkowy) | Potwierdzone |
| 4 | DeN_DziId | int | N | FK → Dzienniki (dziennik księgowy) | Potwierdzone |
| 5 | DeN_Bufor | tinyint | N | 1=bufor, 0=zatwierdzony | Potwierdzone |
| 6 | DeN_Storno | tinyint | Y | 1=storno | Potwierdzone |
| 7 | DeN_DataDok | datetime | N | Data dokumentu | Potwierdzone |
| 8 | DeN_DataOpe | datetime | N | Data operacji | Potwierdzone |
| 9 | DeN_KwotaWn | decimal(15,2) | N | Suma Winien | Potwierdzone |
| 10 | DeN_KwotaMa | decimal(15,2) | N | Suma Ma | Potwierdzone |
| 11 | DeN_Dokument | varchar(256) | N | Numer/opis dokumentu źródłowego | Potwierdzone |
| 12 | DeN_IdentKsieg | varchar(50) | N | Identyfikator księgowy | Potwierdzone |
| 13 | DeN_NrDziennika | int | N | Numer w dzienniku | Potwierdzone |

## Pola i mapowanie — DekretyElem (elementy dekretu)
| # | Kolumna | Typ SQL | Nullable | Opis biznesowy | Status |
|---:|---|---|---|---|---|
| 1 | DeE_KontoWn | varchar(50) | N | Konto Winien (debit) | Potwierdzone |
| 2 | DeE_KontoMa | varchar(50) | N | Konto Ma (credit) | Potwierdzone |
| 3 | DeE_Kwota | decimal(15,2) | N | Kwota elementu | Potwierdzone |
| 4 | DeE_KwotaWal | decimal(15,2) | N | Kwota w walucie | Potwierdzone |
| 5 | DeE_Waluta | varchar(3) | N | Kod waluty | Potwierdzone |
| 6 | DeE_DokumentId + DeE_DokumentTyp | int+smallint | Y | Powiązanie z dokumentem źródłowym (FZ/FS/KP/KW) | Potwierdzone |
| 7 | DeE_BZdId | int | Y | FK → BnkZdarzenia (jeśli z wyciągu bankowego) | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status |
|---|---|---|---|---|---|---|
| ma_elementy | DekretyNag | DekretyElem | 1:N | Kompozycja | DekretyElem.DeE_DeNId = DekretyNag.DeN_DeNId (CASCADE) | Potwierdzona |
| ma_elementy | KsiDokNag | KsiDokElem | 1:N | Kompozycja | KsiDokElem.KDE_KDNId = KsiDokNag.KDN_KDNId (CASCADE) | Potwierdzona |
| odwzorowuje | KsiDokElem | DekretyElem | N:1 | Referencja | KsiDokElem.KDE_DeEID = DekretyElem.DeE_DeEId | Potwierdzona |
| dotyczy_kontrahenta | DekretyNag | Kontrahent | N:1 | Referencja | DekretyNag.DeN_PodmiotId → PodmiotyView.Pod_PodId | Potwierdzona |
| z_dokumentu | DekretyElem | DokumentHandlowy | N:1 | Referencja | DekretyElem.DeE_DokumentId + DeE_DokumentTyp → TraNag | Potwierdzona |
| z_operacji_bankowej | DekretyElem | BnkZdarzenia | N:1 | Referencja | DekretyElem.DeE_BZdId = BnkZdarzenia.BZd_BZdID | Potwierdzona |

## Endpointy OptimaMCP
- **list_dekretynag** (READ): lista nagłówków dekretów księgowych
- **list_dekretyelem** (READ): lista elementów dekretów księgowych
- **create_accounting_document** (WRITE): tworzy dokument księgowy z liniami Winien/Ma
- **accounting_post** (WRITE): księguje dokument do KH
- **accounting_decree** (WRITE): automatyczna dekretacja dokumentu
- **accounting_cancel** (WRITE): anuluje księgowanie dokumentu
- **accounting_repost** (WRITE): przeksięgowuje dekret
- **accounting_close_period** (WRITE): zamyka okres KH

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.DekretyNag | Struktura nagłówka dekretu (51 kolumn) |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.DekretyElem | Struktura elementów dekretu (32 kolumny) |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.KsiDokNag | Struktura nagłówka dokumentu (41 kolumn) |
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.KsiDokElem | Struktura elementów dokumentu (16 kolumn) |
| OptimaMCP | narzędzia MCP | 6 endpointów | Read + write |

## Otwarte problemy i konflikty
- [WYMAGA WERYFIKACJI] Wzajemna relacja DekretyNag ↔ KsiDokNag — czy to dwie reprezentacje tego samego, czy osobne encje? (KDN_DekID wskazuje na dekret, ale w CDN_TEST obie tabele mają 0 wierszy)
- [UNKNOWN] Czym różni się PK od WB na poziomie struktury MSSQL? Czy tylko wartością `DeN_Typ`?
- [UNKNOWN] Mechanizm automatycznego księgowania (accounting_decree) — jakie schematy dekretacji istnieją?

## Walidacja
- [x] Wszystkie 4 tabele MSSQL potwierdzone przez mssql_describe_table
- [x] Klucze obce potwierdzone (DeE_DeNId → DeN_DeNId z CASCADE, KDE_KDNId → KDN_KDNId z CASCADE)
- [x] Wszystkie 6 endpointów MCP potwierdzonych
- [ ] Różnica PK vs BO vs WB na poziomie danych do potwierdzenia
- [ ] Testy na danych CDN_TEST — obecnie 0 wierszy w każdej tabeli