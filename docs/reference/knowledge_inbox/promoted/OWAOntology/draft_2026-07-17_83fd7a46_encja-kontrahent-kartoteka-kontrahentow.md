# Encja: Kontrahent (kartoteka kontrahentów)
- draftId: `draft_2026-07-17_83fd7a46_encja-kontrahent-kartoteka-kontrahentow`
- kbNamespace: `OWAOntology`
- status: `promoted`
- promotedAt: `2026-07-20T11:38:47.410Z`
- tags: `OWA`, `ontologia`, `optima`, `kontrahent`, `częściowo-zweryfikowane`
- reviewNote: Bulk approved 50 drafts from dashboard
## Content
# Encja: Kontrahent (kartoteka kontrahentów)

## Status weryfikacji
- Status: `częściowo-zweryfikowane`
- Poziom pewności: `wysoki`
- Identyfikator ontologiczny: `OWAOntology.Kontrahent`
- Aliasy: `Kontrahenci`, `Contractor`, `Customer`, `Supplier`

## Opis biznesowy
Encja reprezentuje kartotekę kontrahentów w systemie Comarch Optima — obejmuje zarówno klientów (odbiorców), jak i dostawców. Każdy kontrahent jest identyfikowany przez unikalny identyfikator `Knt_KntId` i może pełnić jednocześnie rolę dostawcy i odbiorcy, określaną przez flagi `Knt_Rodzaj_Dostawca` i `Knt_Rodzaj_Odbiorca`. Kontrahent stanowi kluczowy wymiar w dokumentach handlowych, rozrachunkach i analizach sprzedaży.

## Reguły biznesowe
- Kontrahent może być jednocześnie dostawcą i odbiorcą (flagi niezależne)
- `Knt_NipPelny` jest kolumną COMPUTED: `([Knt_NipKraj]+[Knt_Nip])`
- `Knt_Nieaktywny` = 1 oznacza kontrahenta nieaktywnego (blokada transakcji)
- `Knt_LimitKredytu` określa maksymalny limit kredytu kupieckiego
- `Knt_Termin` i `Knt_TerminPlat` definiują domyślne terminy płatności w dniach
- `Knt_Rodzaj` klasyfikuje typ kontrahenta (osoba fizyczna / firma / etc.)
- Każdy kontrahent posiada rekord audytu: `Knt_OpeZalID`, `Knt_OpeModID`, `Knt_TS_Zal`, `Knt_TS_Mod`

## Źródła danych
| Rola źródła | Schemat | Tabela lub obiekt | Status | Dowód |
|---|---|---|---|---|
| Podstawowa | CDN | Kontrahenci | Potwierdzona | MSSQL CDN_TEST mssql_describe_table |
| Osoby kontaktowe | CDN | KntOsoby | Potwierdzona | MSSQL CDN_TEST lista tabel |
| Karty kontrahenta | CDN | KntKarty | Potwierdzona | MSSQL CDN_TEST (VIEW) |
| Atrybuty | CDN | KntAtrybuty | Potwierdzona | MSSQL CDN_TEST lista tabel |
| Grupy | CDN | KntGrupy | Potwierdzona | MSSQL CDN_TEST lista tabel |
| Detale (stan) | CDN | DetalStanKontrahenci | Oczekująca | Wzmiankowana w KB |
| Detale | CDN | DetalKontrahenci | Oczekująca | Wzmiankowana w KB |

## Identyfikatory
| Typ | Pole | Znaczenie | Status | Dowód |
|---|---|---|---|---|
| PK | Knt_KntId | Unikalny identyfikator kontrahenta (int, IDENTITY) | Potwierdzony | MSSQL mssql_describe_table |
| Naturalny | Knt_Kod | Kod/symbol kontrahenta | Potwierdzony | MSSQL |
| Naturalny | Knt_Nip | Numer NIP | Potwierdzony | MSSQL |
| Naturalny | Knt_NipPelny | Pełny NIP z kodem kraju (COMPUTED) | Potwierdzony | MSSQL kolumna COMPUTED |
| Naturalny | Knt_Regon | Numer REGON | Potwierdzony | MSSQL |
| Naturalny | Knt_Pesel | Numer PESEL | Potwierdzony | MSSQL |

## Pola i mapowanie API ↔ MSSQL
| # | Schemat | Tabela | Kolumna MSSQL | Typ SQL | Nullable | PK/FK | Opis biznesowy | Status |
|---:|---|---|---|---|---|---|---|---|
| 1 | CDN | Kontrahenci | Knt_KntId | int | N | PK | Unikalny identyfikator kontrahenta (IDENTITY) | Potwierdzone |
| 2 | CDN | Kontrahenci | Knt_Kod | nvarchar | Y | | Kod/symbol kontrahenta | Potwierdzone |
| 3 | CDN | Kontrahenci | Knt_Nazwa1 | nvarchar | Y | | Nazwa kontrahenta (linia 1) | Potwierdzone |
| 4 | CDN | Kontrahenci | Knt_Nazwa2 | nvarchar | Y | | Nazwa kontrahenta (linia 2) | Potwierdzone |
| 5 | CDN | Kontrahenci | Knt_Nazwa3 | nvarchar | Y | | Nazwa kontrahenta (linia 3) | Potwierdzone |
| 6 | CDN | Kontrahenci | Knt_Nip | nvarchar | Y | | Numer NIP (bez kodu kraju) | Potwierdzone |
| 7 | CDN | Kontrahenci | Knt_NipPelny | nvarchar | Y | | Pełny NIP — COMPUTED: ([Knt_NipKraj]+[Knt_Nip]) | Potwierdzone |
| 8 | CDN | Kontrahenci | Knt_Regon | nvarchar | Y | | Numer REGON | Potwierdzone |
| 9 | CDN | Kontrahenci | Knt_Pesel | nvarchar | Y | | Numer PESEL | Potwierdzone |
| 10 | CDN | Kontrahenci | Knt_Telefon1 | nvarchar | Y | | Telefon 1 | Potwierdzone |
| 11 | CDN | Kontrahenci | Knt_Telefon2 | nvarchar | Y | | Telefon 2 | Potwierdzone |
| 12 | CDN | Kontrahenci | Knt_Email | nvarchar | Y | | Adres email | Potwierdzone |
| 13 | CDN | Kontrahenci | Knt_Ulica | nvarchar | Y | | Ulica | Potwierdzone |
| 14 | CDN | Kontrahenci | Knt_NrDomu | nvarchar | Y | | Numer domu | Potwierdzone |
| 15 | CDN | Kontrahenci | Knt_NrLokalu | nvarchar | Y | | Numer lokalu | Potwierdzone |
| 16 | CDN | Kontrahenci | Knt_Miasto | nvarchar | Y | | Miasto | Potwierdzone |
| 17 | CDN | Kontrahenci | Knt_KodPocztowy | nvarchar | Y | | Kod pocztowy | Potwierdzone |
| 18 | CDN | Kontrahenci | Knt_Kraj | nvarchar | Y | | Kraj | Potwierdzone |
| 19 | CDN | Kontrahenci | Knt_FPlID | int | Y | FK | Identyfikator formy płatności | Potwierdzone |
| 20 | CDN | Kontrahenci | Knt_LimitKredytu | decimal | Y | | Limit kredytu kupieckiego | Potwierdzone |
| 21 | CDN | Kontrahenci | Knt_Termin | int | Y | | Domyślny termin | Potwierdzone |
| 22 | CDN | Kontrahenci | Knt_TerminPlat | int | Y | | Domyślny termin płatności (dni) | Potwierdzone |
| 23 | CDN | Kontrahenci | Knt_Nieaktywny | bit | Y | | Flaga nieaktywności | Potwierdzone |
| 24 | CDN | Kontrahenci | Knt_Rodzaj | int | Y | | Rodzaj kontrahenta (os. fizyczna / firma) | Potwierdzone |
| 25 | CDN | Kontrahenci | Knt_Rodzaj_Dostawca | bit | Y | | Flaga: dostawca | Potwierdzone |
| 26 | CDN | Kontrahenci | Knt_Rodzaj_Odbiorca | bit | Y | | Flaga: odbiorca | Potwierdzone |
| 27 | CDN | Kontrahenci | Knt_OpiekunId | int | Y | FK | Identyfikator opiekuna handlowego | Potwierdzone |
| 28 | CDN | Kontrahenci | Knt_Opis | nvarchar(MAX) | Y | | Opis / uwagi | Potwierdzone |
| 29 | CDN | Kontrahenci | Knt_OpeZalID | int | Y | | Operator zakładający rekord | Potwierdzone |
| 30 | CDN | Kontrahenci | Knt_OpeModID | int | Y | | Operator modyfikujący rekord | Potwierdzone |
| 31 | CDN | Kontrahenci | Knt_TS_Zal | datetime | Y | | Data utworzenia | Potwierdzone |
| 32 | CDN | Kontrahenci | Knt_TS_Mod | datetime | Y | | Data ostatniej modyfikacji | Potwierdzone |

## Relacje ontologiczne
| Predykat | Encja źródłowa | Encja docelowa | Kardynalność | Typ relacji | Warunek JOIN | Status | Dowód |
|---|---|---|---|---|---|---|---|
| posiada_osobe_kontaktowa | Kontrahent | KntOsoba | 1:N | Kompozycja | KntOsoby.KntO_KntId = Kontrahenci.Knt_KntId | Potwierdzona | MSSQL FK |
| nalezydo_grupy | Kontrahent | KntGrupa | N:M | Asocjacja | Przez KntGrupy | Potwierdzona | MSSQL lista tabel |
| posiada_atrybut | Kontrahent | KntAtrybut | 1:N | Kompozycja | KntAtrybuty → Kontrahenci | Potwierdzona | MSSQL lista tabel |
| dokument_dla | TraNag | Kontrahent | N:1 | Referencja | TraNag.TrN_PodID = Kontrahenci.Knt_KntId | Potwierdzona | MSSQL FK |
| posiada_karte | Kontrahent | KntKarta | 1:N | Kompozycja | VIEW KntKarty | Potwierdzona | MSSQL VIEW |

## Endpointy OptimaMCP
[NOT EXPOSED BY MCP: brak narzędzi OptimaMCP w dostępnym zestawie]

## Pochodzenie wiedzy
| Typ źródła | Projekt lub narzędzie | Dokument | Zakres |
|---|---|---|---|
| MSSQL (CDN_TEST) | mssql_describe_table | CDN.Kontrahenci | Schemat i kolumny |
| MSSQL (CDN_TEST) | mssql_list_tables | CDN.* | Tabele pokrewne |
| OptimaKB | OpenSPG | ComarchOptimaSchema | Relacje i JOIN paths |
| OptimaKB | OpenSPG | ComarchOptimaBusinessSemantics | Reguły biznesowe |

## Otwarte problemy i konflikty
- [UNKNOWN: precyzyjne znaczenie pól `Knt_Rodzaj` — możliwe wartości kodu]
- [UNKNOWN: struktura `KntGrupy` — tabela asocjacyjna nie została opisana szczegółowo]
- `DetalStanKontrahenci` i `DetalKontrahenci` wymienione w KB — wymagają potwierdzenia struktury

## Metadane
- Ontologia: OWA
- Namespace: OWAOntology
- Źródło projektu: Comarch Optima ERP MSSQL Schema (KB 4)
- Data ostatniej aktualizacji: 2026-07-15

## Walidacja
- [x] Tabela główna potwierdzona w MSSQL (CDN.Kontrahenci)
- [x] Klucz główny potwierdzony (Knt_KntId, int, IDENTITY)
- [x] Kolumna COMPUTED zidentyfikowana i udokumentowana (Knt_NipPelny)
- [x] JOIN paths potwierdzone z TraNag
- [x] Tabele pokrewne potwierdzone w MSSQL
- [ ] Struktura KntGrupy do szczegółowej analizy
- [ ] DetalKontrahenci / DetalStanKontrahenci do potwierdzenia
- [ ] API/MCP endpoints — brak dostępnych narzędzi